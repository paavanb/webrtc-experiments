import PeerConnection from '../../engine/PeerConnection'
import {ServerMessage, ClientMessage, CardId, ClientId} from '../types'

/**
 * Event emitter representing the game server.
 */
export default class ServerPeer extends PeerConnection<ClientMessage, ServerMessage> {
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
