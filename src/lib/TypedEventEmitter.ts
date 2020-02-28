import {EventEmitter} from 'events'

// TODO For some reason can't import Listener from 'events' even though it should be there
type Listener = (...args: unknown[]) => void

// Create base type off of interface with only string | symbol keys mapping to functions
// Approach inspired by https://github.com/bterlson/strict-event-emitter-types/issues/5
type Base<M> = {
  [Prop in Extract<keyof M, string | symbol>]: (...args: unknown[]) => void
}

type ListenerArgs<M, E extends keyof M> = M[E] extends (...args: infer A) => void ? A : never

type ListenerType<M, E extends keyof M> = (...args: ListenerArgs<M, E>) => void

/**
 * Type-safe EventEmitter class, which takes a type parameter representing the
 * event interface that the emitter supports.
 */
export default class TypedEventEmitter<Events> extends EventEmitter {
  public on = <K extends keyof Base<Events>>(event: K, listener: ListenerType<Events, K>): this =>
    super.on(event, listener as Listener)

  public once = <K extends keyof Base<Events>>(event: K, listener: ListenerType<Events, K>): this =>
    super.once(event, listener as Listener)

  public prependListener = <K extends keyof Base<Events>>(
    event: K,
    listener: ListenerType<Events, K>
  ): this => super.prependListener(event, listener as Listener)

  public prependOnceListener = <K extends keyof Base<Events>>(
    event: K,
    listener: ListenerType<Events, K>
  ): this => super.prependOnceListener(event, listener as Listener)

  public emit = <K extends keyof Base<Events>>(
    event: K,
    ...args: ListenerArgs<Events, K>
  ): boolean => super.emit(event, ...args)

  public off = <K extends keyof Base<Events>>(event: K, listener: ListenerType<Events, K>): this =>
    super.off(event, listener as Listener)

  public removeListener = <K extends keyof Base<Events>>(
    event: K,
    listener: ListenerType<Events, K>
  ): this => super.removeListener(event, listener as Listener)

  public removeAllListeners = <K extends keyof Base<Events>>(event?: K): this =>
    super.removeAllListeners(event)

  public listeners = <K extends keyof Base<Events>>(event: K): Function[] => super.listeners(event)

  public listenerCount = <K extends keyof Base<Events>>(event: K): number =>
    super.listenerCount(event)

  public rawListeners = <K extends keyof Base<Events>>(event: K): Function[] =>
    super.rawListeners(event)
}
