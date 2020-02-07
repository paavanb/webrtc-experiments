import * as React from 'react'

import {SwarmPeer, PeerMetadata, Message} from '../../engine/types'

import {GameMessage} from './types'

interface GameServerProps {
  peers: SwarmPeer
}

export default function GameServer(props: GameServerProps): JSX.Element {
  const {peers} = props
  const [cards, setCards] = React.useState([1, 2, 3])

  const giveCard = (peer: SwarmPeer): void => {}

  const handleMessage = React.useCallback((peer: SwarmPeer, message: GameMessage): void => {
    switch (message.type) {
      case 'get-card':
        giveCard(peer)
        break
      default:
    }
  }, [])

  const onReceiveMessage = React.useCallback(
    (peer: SwarmPeer, msg: Message): void => {
      if (msg.type === 'data') {
        handleMessage(peer, msg.message as GameMessage)
      }
    },
    [handleMessage]
  )

  return <div />
}
