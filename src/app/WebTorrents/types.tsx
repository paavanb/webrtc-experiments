import * as t from 'io-ts'

import TypedEventEmitter from '../../lib/TypedEventEmitter'

const PeerMetadataDefinition = {
  id: t.string,
  username: t.string,
  leader: t.union([t.string, t.null]),
}

export const PeerMetadataCodec = t.type(PeerMetadataDefinition)

export type PeerMetadata = t.TypeOf<typeof PeerMetadataCodec>

export const MessageCodec = t.union([
  t.type({
    type: t.literal('ping'),
  }),
  // Metadata change event: "My metadata has changed."
  t.type({
    type: t.literal('metadata'),
    metadata: t.partial(PeerMetadataDefinition),
  }),
  t.type({
    type: t.literal('message'),
    message: t.string,
  }),
])

export type Message = t.TypeOf<typeof MessageCodec>

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
