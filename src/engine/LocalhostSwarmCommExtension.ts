import TypedEventEmitter from '../lib/TypedEventEmitter'

import {SwarmCommEvents, SwarmCommExtension, Message, PeerMetadata} from './types'
import {EXT_NAME} from './useSwarmCommExtension'

/**
 * A loopback interface mocking a bittorrent-protocol wire extension, allowing a peer
 * to communicate with itself.
 */
export default class LocalhostSwarmCommExtension extends TypedEventEmitter<SwarmCommEvents>
  implements SwarmCommExtension {
  peer: PeerMetadata

  name = EXT_NAME

  public constructor(metadata: PeerMetadata) {
    super()
    this.peer = metadata
  }

  public send = (message: Message): void => {
    this.emit('receive-message', this.peer, message)
  }

  public setLeader = (newLeaderPkHash: string): void => {
    const msg: Message = {
      type: 'metadata',
      metadata: {
        leader: newLeaderPkHash,
      },
    }
    this.emit('receive-message', this.peer, msg)
  }
}
