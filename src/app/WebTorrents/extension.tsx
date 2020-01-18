import {EventEmitter} from 'events'
import * as bencode from 'bencode'

import {Wire} from 'bittorrent-protocol'

import log from '../../lib/log'

type Extensions = {dht: boolean; extended: boolean}

type Handshake = {
  m?: {
    test_ext?: number
  }
}

// Extension name
const EXT = 'test_ext'

function checkExtensionCompatibility(handshake: Handshake): void {
  if (!handshake.m || !handshake.m.test_ext)
    throw Error(`Peer does not support the extension '${EXT}'`)
  log('Compatible peer found.')
}

export default class CommunicationExtension extends EventEmitter {
  wire: Wire

  name: string

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
    checkExtensionCompatibility(handshake)
    this.send({hello: 'world'})
  }

  public onMessage = (buffer: Buffer): void => {
    if (!Buffer.isBuffer(buffer)) throw Error('Received non-buffer response.')

    const data: unknown = bencode.decode(buffer)
    log('Message Received: ', new TextDecoder('utf-8').decode(data.hello))
  }

  public send(data: unknown): void {
    log('Sending: ', data)
    this.wire.extended(EXT, data)
    log('Sent.')
  }
}

// bittorrent-protocol errors if name is not on the prototype
CommunicationExtension.prototype.name = EXT
