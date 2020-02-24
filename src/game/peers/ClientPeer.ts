import TypedEventEmitter from '../../lib/TypedEventEmitter'
import {SwarmPeer, Message, PeerMetadata, SwarmCommExtension} from '../../engine/types'
import {ClientMessage, ServerMessage, WhiteCard, BlackCard} from '../types'

export interface ClientPeerEvents {
  'req-card': (num: number) => void
  'req-czar': () => void
}

/**
 * Event emitter representing the game client, wrapping a SwarmPeer.
 */
export default class ClientPeer extends TypedEventEmitter<ClientPeerEvents> implements SwarmPeer {
  private readonly peer: SwarmPeer

  public get metadata(): PeerMetadata {
    return this.peer.metadata
  }

  public get ext(): SwarmCommExtension {
    return this.peer.ext
  }

  private destroyed: boolean = false

  constructor(peer: SwarmPeer) {
    super()
    this.peer = peer

    this.peer.ext.on('receive-message', this.handleMessage)
  }

  public destroy = (): void => {
    this.destroyed = true
    this.ext.removeAllListeners()
    this.removeAllListeners()
  }

  private handleMessage = (_: unknown, message: Message): void => {
    this.assertAlive()
    if (message.type === 'data') {
      const clientMsg = message.data as ClientMessage

      if (clientMsg.type === 'get-card') {
        this.emit('get-card', clientMsg.number)
      }
    }
  }

  public sendCards = (cards: WhiteCard[]): void => {
    const msg: ServerMessage = {
      type: 'yield-card',
      cards,
    }
    this.ext.send({type: 'data', data: msg})
  }

  public announceCzar = (clientId: string, card: BlackCard): void => {
    const msg: ServerMessage = {
      type: 'announce-czar',
      clientId,
      card,
    }
    this.ext.send({type: 'data', data: msg})
  }

  private assertAlive = (): void => {
    if (this.destroyed) throw Error('Peer has been destroyed.')
  }
}
