import TypedEventEmitter from '../../lib/TypedEventEmitter'

import {Message} from './messages'

export interface SwarmPeer {
  id: string
  username: string
  ext: SwarmCommExtension
}

export interface SwarmCommEvents {
  'receive-message': (data: Message) => void
}

export interface SwarmCommExtension extends TypedEventEmitter<SwarmCommEvents> {
  send(message: Message): void
  name: string
}
