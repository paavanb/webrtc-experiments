import React, {useState, useEffect, useCallback, useMemo} from 'react'

import {SwarmPeer, PeerMetadata} from '../../engine/types'
import {WhiteCard, ServerMessage, Round} from '../../game/types'
import ServerPeer from '../../game/peers/ServerPeer'

interface Player {
  username: string
}

interface GameClientProps {
  player: Player // The player that this client represents
  rawServerPeer: SwarmPeer // The raw server peer this client will communicate with
  selfMetadata: PeerMetadata // Metadata representing the local client
}

/**
 * Component which assumes the role of the game client, responding and reacting to a server.
 */
export default function GameClient(props: GameClientProps): JSX.Element {
  const {player, rawServerPeer, selfMetadata} = props
  const [prevRawServerPeer, setPrevRawServerPeer] = useState<SwarmPeer | null>(null)
  const [serverPeer, setServerPeer] = useState<ServerPeer>(() => new ServerPeer(rawServerPeer))
  const [cards, setCards] = useState<WhiteCard[]>([])
  const [round, setRound] = useState<Round | null>(null)
  const czar = useMemo(() => round?.czar ?? null, [round])
  const isCzar = selfMetadata.id === czar

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

  // manageServerPeer
  useEffect(() => {
    serverPeer.on('yield-card', takeCards)
    serverPeer.on('round', setRound)

    return () => {
      serverPeer.off('yield-card', takeCards)
      serverPeer.off('round', setRound)
    }
  }, [serverPeer, takeCards])

  return (
    <div>
      <h5>Client</h5>
      <div>
        My name is {player.username}. {isCzar && "I'm the Czar."}
      </div>
      <span>Current round: {round?.czar ? round.blackCard.text : 'None.'}</span>
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
