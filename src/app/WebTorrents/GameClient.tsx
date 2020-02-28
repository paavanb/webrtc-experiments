import React, {useState, useEffect, useCallback} from 'react'

import {SwarmPeer} from '../../engine/types'
import {WhiteCard, ServerMessage} from '../../game/types'
import ServerPeer from '../../game/peers/ServerPeer'

interface Player {
  username: string
}

interface GameClientProps {
  player: Player // The player that this client represents
  rawServerPeer: SwarmPeer // The raw server peer this client will communicate with
}

/**
 * Component which assumes the role of the game client, responding and reacting to a server.
 */
export default function GameClient(props: GameClientProps): JSX.Element {
  const {player, rawServerPeer} = props
  const [prevRawServerPeer, setPrevRawServerPeer] = useState<SwarmPeer | null>(null)
  const [serverPeer, setServerPeer] = useState<ServerPeer>(() => new ServerPeer(rawServerPeer))
  const [cards, setCards] = useState<WhiteCard[]>([])

  if (rawServerPeer !== prevRawServerPeer) {
    serverPeer.destroy()
    setServerPeer(new ServerPeer(rawServerPeer))
    setPrevRawServerPeer(rawServerPeer)
  }

  const takeCards = useCallback(({cards: newCards}: ServerMessage<'yield-card'>) => {
    setCards(prevCards => [...prevCards, ...newCards])
  }, [])

  const requestCard = useCallback(() => {
    serverPeer.requestCards(1)
  }, [serverPeer])

  const requestCzar = useCallback(() => {
    serverPeer.requestCzar()
  }, [serverPeer])

  useEffect(() => {
    serverPeer.on('yield-card', takeCards)

    return () => {
      serverPeer.off('yield-card', takeCards)
    }
  }, [serverPeer, takeCards])

  return (
    <div>
      <h5>Client</h5>
      <div>My name is {player.username}</div>
      <button onClick={requestCzar} type="button">
        Request Czar
      </button>
      <button onClick={requestCard} type="button">
        Request Card
      </button>
      <div>My hand: {cards.map(({text}) => text).toString()}</div>
    </div>
  )
}
