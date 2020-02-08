import React, {useState, useLayoutEffect, useCallback} from 'react'

import {SwarmPeer} from '../../engine/types'
import ServerPeer from '../../game/peers/ServerPeer'

interface Player {
  username: string
}

interface GameClientProps {
  player: Player // The player that this client represents
  rawServerPeer: SwarmPeer // The raw server peer this client will communicate with
}

export default function GameClient(props: GameClientProps): JSX.Element {
  const {player, rawServerPeer} = props
  const [prevRawServerPeer, setPrevRawServerPeer] = useState<SwarmPeer | null>(null)
  const [serverPeer, setServerPeer] = useState<ServerPeer>(() => new ServerPeer(rawServerPeer))
  const [cards, setCards] = useState<number[]>([])

  if (rawServerPeer !== prevRawServerPeer) {
    serverPeer.destroy()
    setServerPeer(new ServerPeer(rawServerPeer))
    setPrevRawServerPeer(rawServerPeer)
  }

  const takeCards = useCallback((newCards: number[]) => {
    setCards(prevCards => [...prevCards, ...newCards])
  }, [])

  const requestCard = useCallback(() => {
    serverPeer.requestCard()
  }, [serverPeer])

  useLayoutEffect(() => {
    serverPeer.on('give-card', takeCards)

    return () => {
      serverPeer.off('give-card', takeCards)
    }
  }, [serverPeer, takeCards])

  return (
    <div>
      <div>My name is {player.username}</div>
      <div>Cards: {cards.toString()}</div>
      <button onClick={requestCard} type="button">
        Request a card.
      </button>
    </div>
  )
}
