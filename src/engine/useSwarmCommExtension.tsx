import * as bencode from 'bencode'
import * as nacl from 'tweetnacl'
import {Wire} from 'bittorrent-protocol'
import {isRight} from 'fp-ts/lib/Either'

import log from '../lib/log'
import hexdigest from '../lib/hexdigest'
import useStableValue from '../hooks/useStableValue'
import TypedEventEmitter from '../lib/TypedEventEmitter'

import deepDecodeMessage from './messages/deepDecodeMessage'
import {SwarmCommExtension, SwarmCommEvents, PeerMetadata, Message, MessageCodec} from './types'

// Extension name
export const EXT_NAME = 'swarm_comm_ext'

const NULL_BUF = Buffer.from([0x00])

function isNullValue(arr: Uint8Array): boolean {
  return arr.length === 1 && arr[0] === 0
}

const textDecoder = new TextDecoder('utf-8')

const textEncoder = new TextEncoder()

function encodeHandshake(data: unknown): Uint8Array {
  return new Uint8Array(Buffer.from(JSON.stringify(data)))
}

function decodeHandshake(data: Uint8Array): unknown {
  return JSON.parse(textDecoder.decode(data))
}

function assertExtensionCompatibility(handshake: SwarmHandshake): void {
  // TODO Extended handshake codec?
  if (!handshake.m || !handshake.m.swarm_comm_ext)
    throw Error(`Peer does not support the extension '${EXT_NAME}'`)
  log('Compatible peer found.')
}

type Extensions = {dht: boolean; extended: boolean}

interface SwarmExtendedHandshake {
  pk: Uint8Array // public-key
  sig: Uint8Array // signed message
  u: Uint8Array // username
  l: Uint8Array // Leader public-key, or x00 for none
}

interface SwarmHandshake extends SwarmExtendedHandshake {
  m?: {
    swarm_comm_ext?: number
  }
}

export interface SwarmExtendedWire extends Wire {
  swarm_comm_ext: SwarmCommExtension
  extendedHandshake: SwarmExtendedHandshake
}

interface SwarmCommExtensionCtor {
  (leaderPkHash: string | null): new (wire: Wire) => SwarmCommExtension
}

interface SwarmCommExtensionProps {
  username: string
  onPeerAdd?: (ext: SwarmCommExtension, metadata: PeerMetadata) => void
  onPeerDrop?: (ext: SwarmCommExtension, pkHash: string) => void
  signKeyPair: nacl.SignKeyPair
}

/*
 * Responsible for:
 *  * Establishing and Maintaining a communication channel with one peer
 *  * Signing and verifying messages
 *  * Data-agnostic (after handshake)
 */
export default function useSwarmCommExtension(
  props: SwarmCommExtensionProps
): SwarmCommExtensionCtor {
  const {onPeerAdd, onPeerDrop, username, signKeyPair} = props

  const extension = useStableValue(() => (leaderPkHash: string | null) => {
    class CommunicationExtension extends TypedEventEmitter<SwarmCommEvents>
      implements SwarmCommExtension {
      wire: SwarmExtendedWire

      name = EXT_NAME

      peer: PeerMetadata | null

      leaderPkHash: string | null

      constructor(wire: Wire) {
        super()
        this.wire = wire as SwarmExtendedWire // wire extension API guarantees this
        this.peer = null
        this.leaderPkHash = leaderPkHash

        // TODO Type handshake message (e.g., verify version numbers)
        const handshakeMessage = encodeHandshake('hello')

        this.wire.extendedHandshake = {
          ...this.wire.extendedHandshake,
          pk: signKeyPair.publicKey,
          sig: nacl.sign(handshakeMessage, signKeyPair.secretKey),
          u: textEncoder.encode(username),
          l: leaderPkHash === null ? NULL_BUF : textEncoder.encode(leaderPkHash),
        }
        log('extendedHandshake data: ', this.wire.extendedHandshake)
      }

      public onHandshake = (infoHash: string, peerId: string, extensions: Extensions): void => {
        log('onHandshake with: ', infoHash, peerId, extensions)
      }

      public onExtendedHandshake = (handshake: SwarmHandshake): void => {
        log('onExtendedHandshake with: ', handshake)
        try {
          assertExtensionCompatibility(handshake)
        } catch (e) {
          log('Incompatible peer found. Destroying...')
          this.wire.destroy()
          return
        }

        // Verify that the peer owns the public key that it claims to, by verifying the
        // signed message on the extended handshake
        const {pk: publicKey, sig: signature, u: uintPeerUsername, l: uintLeaderPkHash} = handshake

        const message = nacl.sign.open(signature, publicKey)
        if (message !== null) {
          const decodedMessage = decodeHandshake(message)

          hexdigest(publicKey).then(hash => {
            const peerMetadata = {
              id: hash,
              username: textDecoder.decode(uintPeerUsername),
              leader: isNullValue(uintLeaderPkHash) ? null : textDecoder.decode(uintLeaderPkHash),
            }
            this.peer = peerMetadata
            if (onPeerAdd) onPeerAdd(this, peerMetadata)

            this.wire.on('close', () => {
              if (onPeerDrop) onPeerDrop(this, hash)
              log('Wire closed with peer ', hash)
            })
          })
          log('Handshake succeeded. Message: ', decodedMessage)
        } else {
          log('Handshake failed: publickey verification failed.')
          // TODO Is this a memory leak? Does this extension get garbage collected when the wire is destroyed?
          this.wire.destroy()
        }
      }

      public onMessage = (buffer: Buffer): void => {
        if (!Buffer.isBuffer(buffer)) throw Error('Received non-buffer response.')
        // TODO Verify message signature
        const peer = this.peer as PeerMetadata
        const sender = peer.id.slice(0, 6)

        let data: unknown
        try {
          data = bencode.decode(buffer)
        } catch (e) {
          log(`Non-bencoded message received from ${sender}`)
          return
        }

        if (typeof data === 'object' && data !== null) {
          const decodedData = deepDecodeMessage(data as Record<string, unknown>)
          const messageEither = MessageCodec.decode(decodedData)

          if (isRight(messageEither)) {
            this.emit('receive-message', peer, messageEither.right)
            log(`Message recv: ${sender}:`, messageEither.right)
            log(`Message recv RAW: ${sender}:`, decodedData)
          } else {
            log(`Message failed validation: ${sender}:`, decodedData)
          }
        } else {
          log(`Invalid message recv: ${sender}: `, data)
        }
      }

      public send(message: Message): void {
        log('Sending: ', message)
        try {
          this.wire.extended(EXT_NAME, message)
        } catch (e) {
          log('Send failed: ', e)
        }
      }

      public setLeader(newLeaderPkHash: string): void {
        this.leaderPkHash = newLeaderPkHash
        this.send({
          type: 'metadata',
          metadata: {
            leader: this.leaderPkHash,
          },
        })
      }
    }

    // bittorrent-protocol errors if name is not on the prototype
    CommunicationExtension.prototype.name = EXT_NAME

    return CommunicationExtension
  })

  return extension
}
