import * as bencode from 'bencode'
import * as nacl from 'tweetnacl'
import {Wire} from 'bittorrent-protocol'
import {isRight} from 'fp-ts/lib/Either'

import log from '../../lib/log'
import hexdigest from '../../lib/hexdigest'
import useStableValue from '../../hooks/useStableValue'
import TypedEventEmitter from '../../lib/TypedEventEmitter'

import {Message, MessageCodec} from './messages'
import deepDecodeMessage from './deepDecodeMessage'

// Extension name
const EXT = 'swarm_comm_ext'

const textDecoder = new TextDecoder('utf-8')

function encodeHandshake(data: unknown): Uint8Array {
  return new Uint8Array(Buffer.from(JSON.stringify(data)))
}

function decodeHandshake(data: Uint8Array): unknown {
  return JSON.parse(textDecoder.decode(data))
}

type Extensions = {dht: boolean; extended: boolean}

interface SwarmExtendedHandshake {
  pk: Uint8Array // public-key
  sig: Uint8Array // signed message
}

interface SwarmHandshake extends SwarmExtendedHandshake {
  m?: {
    swarm_comm_ext?: number
  }
}

interface PeerMetadata {
  version: string // version of the code peer is running
}

export interface SwarmExtendedWire extends Wire {
  swarm_comm_ext: SwarmCommExtension
  extendedHandshake: SwarmExtendedHandshake
}

interface SwarmCommEvents {
  'receive-message': (data: Message) => void
}

export interface SwarmCommExtension extends TypedEventEmitter<SwarmCommEvents> {
  send(message: Message): void
  name: string
}

interface SwarmCommExtensionCtor {
  new (wire: Wire): SwarmCommExtension
}

export interface SwarmCommExtensionProps {
  onPeerAdd?: (ext: SwarmCommExtension, pkHash: string, metadata: PeerMetadata) => void
  onPeerDrop?: (ext: SwarmCommExtension, pkHash: string) => void
  onGenerateKey?: (pkHash: string) => void
}

function assertExtensionCompatibility(handshake: SwarmHandshake): void {
  if (!handshake.m || !handshake.m.swarm_comm_ext)
    throw Error(`Peer does not support the extension '${EXT}'`)
  log('Compatible peer found.')
}

/*
 * Responsible for:
 *  * Establish communication channels to peers
 *  * Signing and verifying messages
 *  * Keeping track of 'live' peers
 *  * Data-agnostic (after handshake)
 */
export default function useSwarmCommExtension(
  props: SwarmCommExtensionProps
): SwarmCommExtensionCtor {
  const {onPeerAdd, onGenerateKey, onPeerDrop} = props
  const signKeyPair = useStableValue(() => {
    const keypair = nacl.sign.keyPair()
    if (onGenerateKey) {
      hexdigest(keypair.publicKey).then(onGenerateKey)
    }
    return keypair
  })

  const extension = useStableValue(() => {
    class CommunicationExtension extends TypedEventEmitter<SwarmCommEvents>
      implements SwarmCommExtension {
      wire: SwarmExtendedWire

      name: 'swarm_comm_ext'

      constructor(wire: Wire) {
        super()
        this.wire = wire as SwarmExtendedWire // wire extension API guarantees this
        this.name = EXT

        // TODO Type handshake message (e.g., verify version numbers)
        const handshakeMessage = encodeHandshake('hello')
        this.wire.extendedHandshake = {
          ...this.wire.extendedHandshake,
          pk: signKeyPair.publicKey,
          sig: nacl.sign(handshakeMessage, signKeyPair.secretKey),
        }
        log('extendedHandshake data: ', this.wire.extendedHandshake)
      }

      public onHandshake = (infoHash: string, peerId: string, extensions: Extensions): void => {
        log('onHandshake with: ', infoHash, peerId, extensions)
      }

      public onExtendedHandshake = (handshake: SwarmHandshake): void => {
        log('onExtendedHandshake with: ', handshake)
        assertExtensionCompatibility(handshake)

        // Verify that the peer owns the public key that it claims to, by verifying the
        // signed message on the extended handshake
        const {pk: publicKey, sig: signature} = handshake

        const message = nacl.sign.open(signature, publicKey)
        if (message !== null) {
          const decodedMessage = decodeHandshake(message)
          hexdigest(publicKey).then(hash => {
            if (onPeerAdd) onPeerAdd(this, hash, decodedMessage as PeerMetadata)

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

        const data: unknown = bencode.decode(buffer)

        if (typeof data === 'object' && data !== null) {
          const decodedData = deepDecodeMessage(data as Record<string, unknown>)
          const messageEither = MessageCodec.decode(decodedData)

          if (isRight(messageEither)) {
            this.emit('receive-message', messageEither.right)
            log('Message recv:', messageEither.right)
          } else {
            log('Message failed validation: ', decodedData)
          }
        } else {
          log('Invalid message recv: ', data)
        }
      }

      public send(message: Message): void {
        log('Sending: ', message)
        try {
          this.wire.extended(EXT, message)
        } catch (e) {
          log('Send failed: ', e)
        }
      }
    }

    // bittorrent-protocol errors if name is not on the prototype
    CommunicationExtension.prototype.name = EXT

    return CommunicationExtension
  })

  return extension
}
