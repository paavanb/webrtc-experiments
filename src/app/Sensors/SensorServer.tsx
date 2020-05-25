import React, {useState, useLayoutEffect, useEffect, useCallback} from 'react'

import {SwarmPeer} from '../../engine/types'
import {ListenerType} from '../../lib/MessageEventEmitter'

import ClientPeerConnection from './peers/ClientPeerConnection'
import {ClientMessage, ClientMessagePayload, Vector3D} from './types'
import Ball from './Ball'
import Position from './Position'

enum Canvas {
  width = 300,
  height = 300,
}

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

  const [sensorState, setSensorState] = useState([0, 0, 0] as Vector3D)

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
      {/*
      <Position accel={sensorState} boundX={[0, Canvas.width]} boundY={[0, Canvas.height]}>
        {position => <Ball position={position} width={Canvas.width} height={Canvas.height} />}
      </Position>
        */}
      <svg width={Canvas.width} height={Canvas.height}>
        <circle
          cx={sensorState[0] + Canvas.width / 2}
          cy={sensorState[1] + Canvas.height / 2}
          fill="red"
          r={1}
        />
        <line
          x1={0}
          y1={Canvas.height / 2}
          x2={Canvas.width}
          y2={Canvas.height / 2}
          stroke="black"
        />
        <line
          x1={Canvas.width / 2}
          y1={0}
          x2={Canvas.width / 2}
          y2={Canvas.height}
          stroke="black"
        />
      </svg>
    </div>
  )
}
