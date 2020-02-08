import TypedEventEmitter from '../../lib/TypedEventEmitter'
import {SwarmPeer, Message} from '../../engine/types'
import {ClientMessage, ServerMessage, Card} from '../types'

export interface ClientPeerEvents {
  'get-card': (client: ClientPeer, cardType: Card, num: number) => void
}

/**
 * Event emitter representing the game server.
 */
export default class ClientPeer extends TypedEventEmitter<ClientPeerEvents> {
  public readonly peer: SwarmPeer

  private destroyed: boolean = false

  constructor(peer: SwarmPeer) {
    super()
    this.peer = peer

    this.peer.ext.on('receive-message', this.handleMessage)
  }

  public destroy = (): void => {
    this.destroyed = true
    this.peer.ext.off('receive-message', this.handleMessage)
  }

  private handleMessage = (_: unknown, message: Message): void => {
    this.assertAlive()
    if (message.type === 'data') {
      const clientMsg = message.data as ClientMessage

      if (clientMsg.type === 'get-card') {
        this.emit('get-card', this, clientMsg.cardType, clientMsg.number)
      }
    }
  }

  public sendCards = (cards: number[]): void => {
    const msg: ServerMessage = {
      type: 'give-card',
      cards,
    }
    this.peer.ext.send({type: 'data', data: msg})
  }

  private assertAlive = (): void => {
    if (this.destroyed) throw Error('Peer has been destroyed.')
  }
}
