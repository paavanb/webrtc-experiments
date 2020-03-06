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

  constructor(peer: SwarmPeer) {
    super()
    this.peer = peer

    this.peer.ext.on('receive-message', this.handleMessage)
  }

  public destroy = (): void => {
    this.peer.ext.off('receive-message', this.handleMessage)
  }

  public send = (message: ClientMessage): void => {
    this.peer.ext.send({
      type: 'data',
      data: message,
    })
  }

  private handleMessage = (_: unknown, message: Message): void => {
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
}
