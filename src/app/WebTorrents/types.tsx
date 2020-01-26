import TypedEventEmitter from '../../lib/TypedEventEmitter'

import {Message} from './messages'

export interface PeerMetadata {
  id: string
  username: string
  leader: string
}

export interface SwarmPeer {
  metadata: PeerMetadata
  ext: SwarmCommExtension
}

export interface SwarmCommEvents {
  'receive-message': (peer: PeerMetadata, msg: Message) => void
}

export interface SwarmCommExtension extends TypedEventEmitter<SwarmCommEvents> {
  send(message: Message): void
  setLeader(newLeaderPkHash: string): void
  name: string
  peer: PeerMetadata | null
}
