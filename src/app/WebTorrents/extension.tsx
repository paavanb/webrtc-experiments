import {EventEmitter} from 'events'
import * as bencode from 'bencode'

import {Wire} from 'bittorrent-protocol'

import log from '../../lib/log'

// Extension name
const EXT = 'swarm_comm_ext'

type Extensions = {dht: boolean; extended: boolean}

type Handshake = {
  m?: {
    swarm_comm_ext?: number
  }
}

function assertExtensionCompatibility(handshake: Handshake): void {
  if (!handshake.m || !handshake.m.swarm_comm_ext)
    throw Error(`Peer does not support the extension '${EXT}'`)
  log('Compatible peer found.')
}

export interface SwarmCommExtension {
  send: (data: unknown) => void
}

/*
 * Responsible for:
 *  * Establish communication channels to peers
 *  * Signing and verifying messages
 *  * Keeping track of 'live' peers
 *  * Data-agnostic (after handshake)
 */
export default function swarmCommunicationExtension() {
  class CommunicationExtension extends EventEmitter implements SwarmCommExtension {
    wire: Wire

    name: 'swarm_comm_ext'

    constructor(wire: Wire) {
      super()
      this.wire = wire
      this.name = EXT
    }

    public onHandshake = (infoHash: string, peerId: string, extensions: Extensions): void => {
      log('onHandshake with: ', infoHash, peerId, extensions)
    }

    public onExtendedHandshake = (handshake: Handshake): void => {
      log('onExtendedHandshake with: ', handshake)
      assertExtensionCompatibility(handshake)
    }

    public onMessage = (buffer: Buffer): void => {
      if (!Buffer.isBuffer(buffer)) throw Error('Received non-buffer response.')

      const data: unknown = bencode.decode(buffer)
      log('Message Received: ', new TextDecoder('utf-8').decode(data.message))
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
}
