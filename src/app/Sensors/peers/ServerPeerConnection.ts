import PeerConnection from '../../../engine/PeerConnection'
import {ServerMessage, ClientMessage} from '../types'

/**
 * Event emitter representing the game server.
 */
export default class ServerPeerConnection extends PeerConnection<ClientMessage, ServerMessage> {
  public sensorUpdate = (
    accel: [number | null, number | null, number | null],
    interval: number
  ): void => {
    const [x, y, z] = accel
    this.send({
      type: 'sensor-update',
      accel: [x ?? 0, y ?? 0, z ?? 0],
      interval,
    })
  }
}
