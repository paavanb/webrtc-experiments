import {EventEmitter} from 'events'

import {Wire} from 'bittorrent-protocol'

type Extensions = {dht: boolean; extended: boolean}

const {debug} = console

export default class CommunicationExtension extends EventEmitter {
  wire: Wire

  name: string

  constructor(wire: Wire) {
    super()
    this.wire = wire
    this.name = 'test_ext'
  }

  onHandshake = (infoHash: string, peerId: string, extensions: Extensions): void => {
    debug('onHandshake with: ', infoHash, peerId, extensions)
  }
}

// bittorrent-protocol errors if name is not on the prototype
CommunicationExtension.prototype.name = 'test_ext'
