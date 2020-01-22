import * as t from 'io-ts'

export const MessageCodec = t.union([
  t.type({
    type: t.literal('ping'),
  }),
  t.type({
    type: t.literal('message'),
    message: t.string,
  }),
])

export type Message = t.TypeOf<typeof MessageCodec>
