import PeerConnection from '../../../engine/PeerConnection'
import {ClientMessage, ServerMessage} from '../types'

/**
 * Event emitter representing the game client, wrapping a SwarmPeer.
 */
export default class ClientPeerConnection extends PeerConnection<ServerMessage, ClientMessage> {}
