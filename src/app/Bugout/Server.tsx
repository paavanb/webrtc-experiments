import * as React from 'react'

import Bugout from '../../lib/Bugout'
import useStableRef from '../../hooks/useStableRef'

export default function Server(): JSX.Element {
  // connect to server using its public address
  const b = useStableRef(() => new Bugout('b698b723-7062-4884-b36b-49ea53061380'))
  console.log('address: ', b.address())
  console.log('announcing...')

  b.register(
    'ping',
    (pk, args, cb) => {
      args.pong = true
      cb(args)
    },
    "Respond to ping with 'pong'."
  )

  b.on('connections', c => {
    console.log('connections:', c)
    if (c === 0) {
      console.log('ready')
    }
  })

  // log when a client sends a message
  b.on('message', (address, msg) => {
    console.log('message:', address, msg)
  })

  // log when a client makes an rpc call
  b.on('rpc', (address, call, args) => {
    console.log('rpc:', address, call, args)
  })

  // log when we see a new client address
  b.on('seen', address => {
    console.log('seen:', address)
  })

  return <span />
}
