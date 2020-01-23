import * as React from 'react'

import {SwarmPeer} from './types'
import {Message} from './messages'

interface ConnectionControllerProps {
  peer: SwarmPeer
}

export default function ConnectionController(props: ConnectionControllerProps): JSX.Element {
  const {peer} = props
  const {id, username, ext} = peer
  const [numPings, setNumPings] = React.useState(0)

  const onReceiveMessage = (data: Message): void => {
    if (data.type === 'ping') setNumPings(prevPings => prevPings + 1)
  }

  React.useEffect(() => {
    ext.on('receive-message', onReceiveMessage)

    return () => {
      ext.removeListener('receive-message', onReceiveMessage)
    }
  }, [ext])

  const pingPeer = React.useCallback(() => {
    ext.send({type: 'ping'})
  }, [ext])

  return (
    <div>
      {username} ({id.slice(0, 6)}) has pinged me {numPings} times
      <button onClick={pingPeer} type="button">
        Ping
      </button>
    </div>
  )
}
