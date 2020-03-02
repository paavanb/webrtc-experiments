import {EventEmitter} from 'events'

type Message = {type: string}

export type ListenerType<T extends Message, K extends T['type']> = (
  data: Extract<T, {type: K}>
) => void

type ListenerMessage<T extends Message, K extends T['type']> = Extract<T, {type: K}>

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

  public emit = <K extends T['type']>(event: K, message: ListenerMessage<T, K>): boolean =>
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
