import React, {useState, useLayoutEffect, useEffect, useCallback} from 'react'

import {SwarmPeer} from '../../engine/types'
import {ListenerType} from '../../lib/MessageEventEmitter'

import ClientPeerConnection from './peers/ClientPeerConnection'
import {ClientMessage, ClientMessagePayload} from './types'

/**
 * Set up a listener on a ClientPeerConnection and push a cleanup function onto the given stack.
 */
function setupClientListener<K extends ClientMessage['type']>(
  peer: ClientPeerConnection,
  event: K,
  listener: ListenerType<ClientMessage, K>,
  cleanupStack: (() => void)[]
): void {
  peer.on(event, listener)
  cleanupStack.push(() => peer.off(event, listener))
}

interface GameServerProps {
  peers: SwarmPeer[]
}

/**
 * Component which assumes the role of the game server, coordinating a game for a set of clients.
 *
 */
export default function SensorServer(props: GameServerProps): JSX.Element {
  const {peers} = props
  const [prevPeers, setPrevPeers] = useState<SwarmPeer[]>([])
  const [clientPeerCxns, setClientPeerCxns] = useState<ClientPeerConnection[]>([])

  const [sensorState, setSensorState] = useState([0, 0, 0])

  const updateSensorState = useCallback(
    (_: ClientPeerConnection) => (data: ClientMessagePayload<'sensor-update'>) => {
      setSensorState(data.accel)
    },
    []
  )

  // manageClientPeers
  useLayoutEffect(() => {
    // Peers updated, we must re-register listeners by instantiating new ClientPeerConnection instances.
    if (peers !== prevPeers) {
      const newClientPeers = peers.map(peer => new ClientPeerConnection(peer))

      setClientPeerCxns(prev => {
        prev.forEach(peer => peer.destroy())
        return newClientPeers
      })
      setPrevPeers(peers)
    }
  }, [peers, prevPeers])

  useEffect(() => {
    // Store all the functions for cleaning up after attaching event listeners
    const cleanupStack: (() => void)[] = []
    clientPeerCxns.forEach(peerCxn => {
      setupClientListener(peerCxn, 'sensor-update', updateSensorState(peerCxn), cleanupStack)
    })

    return () => {
      cleanupStack.forEach(cleanupFn => cleanupFn())
    }
  }, [clientPeerCxns, updateSensorState])

  return (
    <div>
      <div>X: {sensorState[0]}</div>
      <div>Y: {sensorState[1]}</div>
      <div>Z: {sensorState[2]}</div>
    </div>
  )
}
