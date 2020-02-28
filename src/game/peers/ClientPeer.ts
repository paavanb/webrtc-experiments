import MessageEventEmitter from '../../lib/MessageEventEmitter'
import {SwarmPeer, Message, PeerMetadata, SwarmCommExtension} from '../../engine/types'
import {ClientMessage, ServerMessage, WhiteCard, Round} from '../types'

import {Peer} from './types'

/**
 * Event emitter representing the game client, wrapping a SwarmPeer.
 */
export default class ClientPeer extends MessageEventEmitter<ClientMessage>
  implements SwarmPeer, Peer<ServerMessage> {
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

  public send = (message: ServerMessage): void => {
    this.peer.ext.send({
      type: 'data',
      data: message,
    })
  }

  private handleMessage = (_: unknown, message: Message): void => {
    this.assertAlive()
    if (message.type === 'data') {
      const clientMsg = message.data as ClientMessage

      this.emit(clientMsg.type, clientMsg)
    }
  }

  public sendCards = (cards: WhiteCard[]): void => {
    this.send({
      type: 'yield-card',
      cards,
    })
  }

  public shareRound = (round: Round): void => {
    this.send({
      type: 'round',
      ...round,
    })
  }

  private assertAlive = (): void => {
    if (this.destroyed) throw Error('Peer has been destroyed.')
  }
}
