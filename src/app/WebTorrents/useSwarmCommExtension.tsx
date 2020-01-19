import {EventEmitter} from 'events'

import * as bencode from 'bencode'
import * as nacl from 'tweetnacl'
import {Wire} from 'bittorrent-protocol'

import log from '../../lib/log'
import useStableValue from '../../hooks/useStableValue'

const textDecoder = new TextDecoder('utf-8')

function encodeHandshake(data: unknown): Uint8Array {
  return new Uint8Array(Buffer.from(JSON.stringify(data)))
}

function decodeHandshake(data: Uint8Array): unknown {
  return JSON.parse(textDecoder.decode(data))
}

// Extension name
const EXT = 'swarm_comm_ext'

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

export interface SwarmCommExtension {
  send: (data: unknown) => void
  on: (event: 'peerAdd', cb: (publicKey: string, metadata: PeerMetadata) => void) => void
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
export default function useSwarmCommExtension(): SwarmCommExtension {
  const signKeyPair = useStableValue(() => nacl.sign.keyPair())

  const extension = useStableValue(() => {
    class CommunicationExtension extends EventEmitter implements SwarmCommExtension {
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
          this.emit('peerAdd', textDecoder.decode(publicKey), decodedMessage)
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
        log('Message Received: ', textDecoder.decode(data.message))
      }

      public send(data: unknown): void {
        log('Sending: ', data)
        this.wire.extended(EXT, data)
        log('Sent.')
      }
    }

    // bittorrent-protocol errors if name is not on the prototype
    CommunicationExtension.prototype.name = EXT

    return CommunicationExtension
  })

  return extension
}
