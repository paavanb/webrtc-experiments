import MessageEventEmitter from '../lib/MessageEventEmitter'

import {SwarmPeer, Message, PeerMetadata, SwarmCommExtension} from './types'

type GenericMessage = {type: string}

/**
 * Allow handling and sending messages to the given SwarmPeer instance.
 */
export default class MessagePeer<
  ResponseMessage extends GenericMessage,
  RequestMessage extends GenericMessage = ResponseMessage
> extends MessageEventEmitter<ResponseMessage> implements SwarmPeer {
  private readonly peer: SwarmPeer

  private _destroyed: boolean = false

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

  /**
   * Mark peer as destroyed and clean up all listeners. Idempotent.
   */
  public destroy = (): void => {
    this._destroyed = true // eslint-disable-line no-underscore-dangle

    // Listeners must be removed one by one (can't use ext.removeAllListeners()), since
    // many ClientPeers can be attached to the same extension
    this.ext.off('receive-message', this.handleMessage)
    this.removeAllListeners()
  }

  public get destroyed(): boolean {
    return this._destroyed // eslint-disable-line no-underscore-dangle
  }

  public send = (message: RequestMessage): void => {
    this.ext.send({
      type: 'data',
      data: message,
    })
  }

  private handleMessage = (_: unknown, message: Message): void => {
    this.assertAlive()
    if (message.type === 'data') {
      const clientMsg = message.data as ResponseMessage

      // TODO Fix ignore
      // @ts-ignore
      this.emit(clientMsg.type, clientMsg)
    }
  }

  private assertAlive = (): void => {
    if (this.destroyed) throw Error('Peer has been destroyed.')
  }
}
