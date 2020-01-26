import * as React from 'react'

import {SwarmPeer, PeerMetadata} from './types'
import {Message} from './messages'

interface ConnectionControllerProps {
  peer: SwarmPeer
  onLeaderSelect: (id: string) => void // The user has requested to join the given id's game
  onPeerLeaderChange: (peer: SwarmPeer, id: string) => void // The given peer has changed who they have joined
  getPeerMetadata: (id: string) => PeerMetadata | null
}

export default function ConnectionController(props: ConnectionControllerProps): JSX.Element {
  const {peer, onPeerLeaderChange, onLeaderSelect, getPeerMetadata} = props
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
    onLeaderSelect(metadata.id)
  }, [metadata.id, onLeaderSelect])

  const txtLeader = React.useMemo(() => {
    if (!metadata.leader) return "They're alone."
    const leaderMetadata = getPeerMetadata(metadata.leader)

    if (leaderMetadata) return `They've joined ${leaderMetadata.username}.`
    return `They've joined someone with id ${metadata.leader.slice(0, 6)}.`
  }, [getPeerMetadata, metadata.leader])
  return (
    <div>
      {metadata.username} ({metadata.id.slice(0, 6)}) has pinged me {numPings} times. {txtLeader}
      <button onClick={pingPeer} type="button">
        Ping
      </button>
      <button onClick={makeLeader} type="button">
        Join
      </button>
    </div>
  )
}
