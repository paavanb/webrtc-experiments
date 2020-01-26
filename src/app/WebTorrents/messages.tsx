import * as t from 'io-ts'

export const MessageCodec = t.union([
  t.type({
    type: t.literal('ping'),
  }),
  // Leader change event: "I have changed my pointer to the leader."
  t.type({
    type: t.literal('leader'),
    pkHash: t.string,
  }),
  t.type({
    type: t.literal('message'),
    message: t.string,
  }),
])

export type Message = t.TypeOf<typeof MessageCodec>
