import MessageEventEmitter from '../../lib/MessageEventEmitter'
import {SwarmPeer, Message, PeerMetadata, SwarmCommExtension} from '../../engine/types'
import {ServerMessage, ClientMessage, CardId, ClientId} from '../types'

import {Peer} from './types'

/**
 * Event emitter representing the game server.
 */
export default class ServerPeer extends MessageEventEmitter<ServerMessage>
  implements SwarmPeer, Peer<ClientMessage> {
  public readonly peer: SwarmPeer

  public get metadata(): PeerMetadata {
    return this.peer.metadata
  }

  public get ext(): SwarmCommExtension {
    return this.peer.ext
  }

  private _destroyed: boolean = false

  constructor(peer: SwarmPeer) {
    super()
    this.peer = peer

    this.ext.on('receive-message', this.handleMessage)
  }

  public destroy = (): void => {
    this._destroyed = true // eslint-disable-line no-underscore-dangle
    this.ext.removeAllListeners()
    this.removeAllListeners()
  }

  public get destroyed(): boolean {
    return this._destroyed // eslint-disable-line no-underscore-dangle
  }

  public send = (message: ClientMessage): void => {
    this.peer.ext.send({
      type: 'data',
      data: message,
    })
  }

  private handleMessage = (_: unknown, message: Message): void => {
    this.assertAlive()
    if (message.type === 'data') {
      const serverMsg = message.data as ServerMessage
      this.emit(serverMsg.type, serverMsg)
    }
  }

  public requestCards = (quantity: number): void => {
    this.send({
      type: 'req-card',
      number: quantity,
    })
  }

  public requestCzar = (): void => {
    this.send({type: 'req-czar'})
  }

  public playCard = (cards: CardId[]): void => {
    this.send({
      type: 'play-card',
      cards,
    })
  }

  public selectWinner = (winner: ClientId): void => {
    this.send({type: 'select-winner', winner})
  }

  private assertAlive = (): void => {
    if (this.destroyed) throw Error('Peer has been destroyed.')
  }
}
