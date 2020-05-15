import {DistributiveOmit} from '../../lib/types'

// Value uniquely identifying a client
export type ClientId = string

type _ServerMessage = {
  type: 'dummy'
}

type ServerMessageTypes = _ServerMessage['type']

export type ServerMessage<T extends ServerMessageTypes = ServerMessageTypes> = Extract<
  _ServerMessage,
  {type: T}
>

export type ServerMessagePayload<T extends ServerMessageTypes> = DistributiveOmit<
  ServerMessage<T>,
  'type'
>

type _ClientMessage = {type: 'sensor-update'; accel: [number, number, number]}

type ClientMessageTypes = _ClientMessage['type']

export type ClientMessage<T extends ClientMessageTypes = ClientMessageTypes> = Extract<
  _ClientMessage,
  {type: T}
>

export type ClientMessagePayload<T extends ClientMessageTypes> = DistributiveOmit<
  ClientMessage<T>,
  'type'
>
