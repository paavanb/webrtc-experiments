import React, {useState, useEffect, useLayoutEffect, useCallback} from 'react'

import {SwarmPeer, PeerMetadata} from '../../engine/types'

import ServerPeerConnection from './peers/ServerPeerConnection'

interface AccelerometerProps {
  serverPeerConnection: ServerPeerConnection
}

function AccelerometerApp(props: AccelerometerProps): JSX.Element {
  const {serverPeerConnection} = props

  const readAccelerometer = useCallback(
    (evt: DeviceMotionEvent) => {
      const {acceleration} = evt
      if (acceleration === null) {
        console.log('NO SENSOR ACCESS')
        return
      }
      const {x, y, z} = acceleration
      serverPeerConnection.sensorUpdate([x, y, z])
    },
    [serverPeerConnection]
  )

  useEffect(() => {
    window.addEventListener('devicemotion', readAccelerometer)

    return () => {
      window.removeEventListener('devicemotion', readAccelerometer)
    }
  }, [readAccelerometer])

  return <></>
}

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

  // manageServerPeerChange
  useLayoutEffect(() => {
    if (serverPeer !== prevServerPeer) {
      serverPeerCxn.destroy()
      setServerPeerCxn(new ServerPeerConnection(serverPeer))
      setPrevServerPeer(serverPeer)
    }
  }, [prevServerPeer, serverPeer, serverPeerCxn])

  return <AccelerometerApp serverPeerConnection={serverPeerCxn} />
}
