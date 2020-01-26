import * as React from 'react'

import {SwarmPeer} from './types'
import {Message} from './messages'

interface ConnectionControllerProps {
  peer: SwarmPeer
  onLeaderChange: (id: string) => void // The user has requested to join the given id's game
  onPeerLeaderChange: (peer: SwarmPeer, id: string) => void // The given peer has changed who they have joined
}

export default function ConnectionController(props: ConnectionControllerProps): JSX.Element {
  const {peer, onPeerLeaderChange, onLeaderChange} = props
  const {metadata, ext} = peer
  const [numPings, setNumPings] = React.useState(0)

  const onReceiveMessage = React.useCallback(
    (_, msg: Message): void => {
      if (msg.type === 'ping') setNumPings(prevPings => prevPings + 1)
      if (msg.type === 'leader') onPeerLeaderChange(peer, msg.pkHash)
    },
    [onPeerLeaderChange, peer]
  )

  React.useEffect(() => {
    ext.on('receive-message', onReceiveMessage)

    return () => {
      ext.removeListener('receive-message', onReceiveMessage)
    }
  }, [ext, onReceiveMessage])

  const pingPeer = React.useCallback(() => {
    ext.send({type: 'ping'})
  }, [ext])

  const makeLeader = React.useCallback(() => {
    onLeaderChange(metadata.id)
  }, [metadata.id, onLeaderChange])

  return (
    <div>
      {metadata.username} ({metadata.id.slice(0, 6)}) has pinged me {numPings} times. They&apos;ve
      joined {metadata.leader.slice(0, 6)}
      <button onClick={pingPeer} type="button">
        Ping
      </button>
      <button onClick={makeLeader} type="button">
        Join
      </button>
    </div>
  )
}
