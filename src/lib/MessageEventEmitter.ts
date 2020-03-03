import {EventEmitter} from 'events'

import {DistributiveOmit} from './types'

type Message = {type: string}

// Type representing the "payload" of a message (i.e., keys other than 'type') for a given type
type MessagePayload<T extends Message, K extends T['type']> = DistributiveOmit<
  Extract<T, {type: K}>,
  'type'
>

export type ListenerType<T extends Message, K extends T['type']> = (
  data: MessagePayload<T, K>
) => void

export default class MessageEventEmitter<T extends Message> extends EventEmitter {
  public on = <K extends T['type']>(event: K, listener: ListenerType<T, K>): this =>
    super.on(event, listener)

  public once = <K extends T['type']>(event: K, listener: ListenerType<T, K>): this =>
    super.once(event, listener)

  public prependListener = <K extends T['type']>(event: K, listener: ListenerType<T, K>): this =>
    super.prependListener(event, listener)

  public prependOnceListener = <K extends T['type']>(
    event: K,
    listener: ListenerType<T, K>
  ): this => super.prependOnceListener(event, listener)

  public emit = <K extends T['type']>(event: K, message: MessagePayload<T, K>): boolean =>
    super.emit(event, message)

  public off = <K extends T['type']>(event: K, listener: ListenerType<T, K>): this =>
    super.off(event, listener)

  public removeListener = <K extends T['type']>(event: K, listener: ListenerType<T, K>): this =>
    super.removeListener(event, listener)

  public removeAllListeners = <K extends T['type']>(event?: K): this =>
    super.removeAllListeners(event)

  public listeners = <K extends T['type']>(event: K): Function[] => super.listeners(event)

  public listenerCount = <K extends T['type']>(event: K): number => super.listenerCount(event)

  public rawListeners = <K extends T['type']>(event: K): Function[] => super.rawListeners(event)
}
