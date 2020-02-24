import TypedEventEmitter from '../../lib/TypedEventEmitter'
import {SwarmPeer, Message, PeerMetadata, SwarmCommExtension} from '../../engine/types'
import {ServerMessage, ClientMessage, WhiteCard} from '../types'

export interface ServerPeerEvents {
  'give-card': (cards: WhiteCard[]) => void
}

/**
 * Event emitter representing the game server.
 */
export default class ServerPeer extends TypedEventEmitter<ServerPeerEvents> implements SwarmPeer {
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

  private handleMessage = (_: unknown, message: Message): void => {
    if (message.type === 'data') {
      const serverMsg = message.data as ServerMessage

      if (serverMsg.type === 'give-card') {
        this.emit('give-card', serverMsg.cards)
      }
    }
  }

  public requestCard = (): void => {
    const msg: ClientMessage = {
      type: 'get-card',
      number: 1,
    }

    this.peer.ext.send({
      type: 'data',
      data: msg,
    })
  }
}
