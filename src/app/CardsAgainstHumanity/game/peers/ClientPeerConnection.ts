import PeerConnection from '../../../../engine/PeerConnection'
import {ClientMessage, ServerMessage, Player, Round} from '../types'

/**
 * Event emitter representing the game client, wrapping a SwarmPeer.
 */
export default class ClientPeerConnection extends PeerConnection<ServerMessage, ClientMessage> {
  public sharePlayerState = (player: Player): void => {
    this.send({
      type: 'player',
      ...player,
    })
  }

  public shareRoundState = (round: Round): void => {
    // FIXME Nulls get dropped when sent over to the client! e.g., 'winner' field
    this.send({
      type: 'round',
      ...round,
    })
  }
}
