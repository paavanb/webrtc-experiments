import * as React from 'react'

import {SwarmPeer, Message} from '../../engine/types'

interface ConnectionControllerProps {
  peer: SwarmPeer
  onPeerLeaderChange: (peer: SwarmPeer, newLeaderId: string | null) => void // The given peer has changed who they have joined
}

/**
 * Manage connection to a peer, responding to any state updates.
 */
export default function ConnectionController(props: ConnectionControllerProps): JSX.Element {
  const {peer, onPeerLeaderChange} = props
  const {ext} = peer

  const onReceiveMessage = React.useCallback(
    (_, msg: Message): void => {
      if (msg.type === 'metadata' && msg.metadata.leader !== undefined)
        onPeerLeaderChange(peer, msg.metadata.leader === 0 ? null : msg.metadata.leader)
    },
    [onPeerLeaderChange, peer]
  )

  React.useEffect(() => {
    ext.on('receive-message', onReceiveMessage)

    return () => {
      ext.removeListener('receive-message', onReceiveMessage)
    }
  }, [ext, onReceiveMessage])
  return <></>
}
