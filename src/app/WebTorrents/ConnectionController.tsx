import * as React from 'react'

import {SwarmCommExtension} from './useSwarmCommExtension'

interface ConnectionControllerProps {
  id: string
  swarmExt: SwarmCommExtension
}

export default function ConnectionController(props: ConnectionControllerProps): JSX.Element {
  const {id, swarmExt} = props
  const [numPings, setNumPings] = React.useState(0)

  const onReceiveMessage = (data: unknown): void => {
    if (typeof data === 'object') {
      // Messy, I know. We need a layer of abstraction responsible for decoding
      if (data && data.type && new TextDecoder('utf-8').decode(data.type) === 'ping') {
        setNumPings(prevPings => prevPings + 1)
      }
    }
  }

  React.useEffect(() => {
    swarmExt.on('receiveMessage', onReceiveMessage)

    return () => {
      swarmExt.removeListener('receiveMessage', onReceiveMessage)
    }
  }, [swarmExt])

  const pingPeer = React.useCallback(() => {
    swarmExt.send({type: 'ping'})
  }, [swarmExt])

  return (
    <div>
      {id.slice(0, 8)} has pinged me {numPings} times
      <button onClick={pingPeer} type="button">
        Ping
      </button>
    </div>
  )
}
