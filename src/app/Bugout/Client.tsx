import * as React from 'react'

import Bugout from '../../lib/Bugout'
import useStableRef from '../../hooks/useStableRef'

export default function Client() {
  // connect to server using its public address
  const b = useStableRef(() => new Bugout('b698b723-7062-4884-b36b-49ea53061380'))

  console.log(`My address is ${b.address()}`)
  console.log('Connecting to the server...\n(this can take a minute)')

  // wait for connection to the server
  b.on('server', () => {
    // ok, we're connected
    console.log('Connected to the server.')
    // make an RPC API call on the server and log the result
    b.rpc('ping', {Hello: 'world'}, something => console.log('response: ', something))
    // watch for {"Hello": "world", "pong": true} in the log below
    // show a simple UI for testing the server API
  })

  // also watch for other peers joining this server's swarm
  b.on('seen', something => console.log('seen: ', something))

  return <span />
}
