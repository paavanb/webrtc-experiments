export interface Peer<T> {
  send(message: T): void
}
