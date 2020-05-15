import PeerConnection from '../../../engine/PeerConnection'
import {ServerMessage, ClientMessage} from '../types'

/**
 * Event emitter representing the game server.
 */
export default class ServerPeerConnection extends PeerConnection<ClientMessage, ServerMessage> {
  public sensorUpdate = (accel: [number, number, number]): void => {
    this.send({
      type: 'sensor-update',
      accel,
    })
  }
}
