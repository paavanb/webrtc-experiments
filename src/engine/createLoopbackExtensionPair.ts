import TypedEventEmitter from '../lib/TypedEventEmitter'

import {SwarmCommEvents, SwarmCommExtension, Message, PeerMetadata} from './types'
import {EXT_NAME} from './useSwarmCommExtension'

/**
 * A mock bittorrent-protocol wire extension, allowing a peer to communicate with a fake remote.
 */
class MockSwarmCommExtension extends TypedEventEmitter<SwarmCommEvents>
  implements SwarmCommExtension {
  peer: PeerMetadata

  remote: MockSwarmCommExtension | null = null

  name = EXT_NAME

  public constructor(metadata: PeerMetadata) {
    super()
    this.peer = metadata
  }

  public send = (message: Message): void => {
    if (this.remote) this.remote.emit('receive-message', this.peer, message)
  }

  public setLeader = (newLeaderPkHash: string): void => {
    if (!this.remote) return

    const msg: Message = {
      type: 'metadata',
      metadata: {
        leader: newLeaderPkHash,
      },
    }
    this.remote.emit('receive-message', this.peer, msg)
  }
}

/**
 * Return two intertwined mock SwarmCommExtensions  send to each other, creating a
 * "loopback interface" allowing a peer to communicate with itself.
 */
export default function createLoopbackExtensionPair(
  metadata: PeerMetadata
): [MockSwarmCommExtension, MockSwarmCommExtension] {
  const mock1 = new MockSwarmCommExtension(metadata)
  const mock2 = new MockSwarmCommExtension(metadata)

  mock1.remote = mock2
  mock2.remote = mock1

  return [mock1, mock2]
}
