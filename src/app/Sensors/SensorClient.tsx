import React, {useState, useEffect, useLayoutEffect, useCallback, useMemo} from 'react'

import {SwarmPeer, PeerMetadata} from '../../engine/types'

import ServerPeerConnection from './peers/ServerPeerConnection'

interface GameClientProps {
  username: string
  serverPeer: SwarmPeer // The raw server peer this client will communicate with
  selfMetadata: PeerMetadata // Metadata representing the local client
}

/**
 * Component which assumes the role of the game client, responding and reacting to a server.
 */
export default function SensorClient(props: GameClientProps): JSX.Element {
  const {serverPeer} = props
  const [prevServerPeer, setPrevServerPeer] = useState<SwarmPeer | null>(null)
  const [serverPeerCxn, setServerPeerCxn] = useState(() => new ServerPeerConnection(serverPeer))
  const accelerometer = useMemo(() => new Accelerometer(), [])

  const readAccelerometer = useCallback(() => {
    const {x, y, z} = accelerometer
    if (x === undefined || y === undefined || z === undefined) {
      console.log('NO SENSOR ACCESS')
      return
    }
    serverPeerCxn.sensorUpdate([x, y, z])
  }, [accelerometer, serverPeerCxn])

  // manageServerPeerChange
  useLayoutEffect(() => {
    if (serverPeer !== prevServerPeer) {
      serverPeerCxn.destroy()
      setServerPeerCxn(new ServerPeerConnection(serverPeer))
      setPrevServerPeer(serverPeer)
    }
  }, [prevServerPeer, serverPeer, serverPeerCxn])

  useEffect(() => {
    accelerometer.addEventListener('reading', readAccelerometer)
    accelerometer.start()

    return () => {
      accelerometer.removeEventListener('reading', readAccelerometer)
      accelerometer.stop()
    }
  }, [accelerometer, readAccelerometer])

  return <></>
}
