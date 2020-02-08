import React, {useState, useLayoutEffect, useCallback} from 'react'

import {SwarmPeer} from '../../engine/types'
import ClientPeer from '../../game/peers/ClientPeer'

interface GameServerProps {
  peers: SwarmPeer[]
}

export default function GameServer(props: GameServerProps): JSX.Element {
  const {peers} = props
  const [prevPeers, setPrevPeers] = useState<SwarmPeer[]>([])
  const [cards, setCards] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9])

  const [clientPeers, setClientPeers] = useState<ClientPeer[]>([])

  if (peers !== prevPeers) {
    clientPeers.forEach(peer => peer.destroy())
    setClientPeers(peers.map(peer => new ClientPeer(peer)))
    setPrevPeers(peers)
  }

  const giveClientCard = useCallback(
    (client: ClientPeer) => {
      const card = cards.length > 0 ? [cards[0]] : []
      client.sendCards(card)
      setCards(prevCards => prevCards.slice(1))
    },
    [cards]
  )

  useLayoutEffect(() => {
    clientPeers.forEach(peer => peer.on('get-card', giveClientCard))

    return () => {
      clientPeers.forEach(peer => peer.off('get-card', giveClientCard))
    }
  }, [clientPeers, giveClientCard])

  return (
    <div>
      <div>I have {clientPeers.length} peers</div>
      <div>Cards: {cards.toString()}</div>
    </div>
  )
}
