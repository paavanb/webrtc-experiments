import React, {useState, useLayoutEffect, useCallback, useMemo} from 'react'

import {SwarmPeer} from '../../engine/types'
import ClientPeer from '../../game/peers/ClientPeer'
import {GameState} from '../../game/types'
import WHITE_CARDS from '../../data/white-cards-2.1'
import BLACK_CARDS from '../../data/black-cards-2.1'
import shuffle from '../../lib/shuffle'
import clamp from '../../lib/clamp'

interface GameServerProps {
  peers: SwarmPeer[]
}

/**
 * Component which assumes the role of the game server, coordinating a game for a set of clients.
 */
export default function GameServer(props: GameServerProps): JSX.Element {
  const {peers} = props
  const [prevPeers, setPrevPeers] = useState<SwarmPeer[]>([])
  const [clientPeers, setClientPeers] = useState<ClientPeer[]>([])

  const [whiteCards, setWhiteCards] = useState(() => shuffle(WHITE_CARDS))
  const [blackCards, setBlackCards] = useState(() => shuffle(BLACK_CARDS))
  const [gameState, setGameState] = useState<GameState>(() => ({czar: null}))
  const serfs = useMemo(
    () => clientPeers.filter(peer => gameState.czar === null || peer.metadata.id !== gameState.czar),
    [gameState.czar, clientPeers]
  )

  // Peers updated, we must re-register listeners by instantiating new ClientPeer instances.
  if (peers !== prevPeers) {
    clientPeers.forEach(peer => peer.destroy())
    const newPeers = peers.map(peer => new ClientPeer(peer))

    if (gameState.czar !== null) {
      const newCardCzar = newPeers.find(peer => peer.metadata.id === gameState.czar)
      // TODO This is very bad, we used to have a czar but they disappeared. How can this be communicated?
      if (!newCardCzar) setGameState({czar: null})
    }
    setClientPeers(newPeers)
    setPrevPeers(peers)
  }

  const giveClientCard = useCallback(
    (client: ClientPeer) => (num: number) => {
      const numToGive = clamp(0, 10, num)

      // Send cards from within functional setter in order to guarantee consistency.
      setWhiteCards(prevCards => {
        const [dealtCards, deck] = [prevCards.slice(0, numToGive), prevCards.slice(numToGive)]
        client.sendCards(dealtCards)
        return deck
      })
    },
    []
  )

  const handleClientRequestCzar = useCallback(
    (client: ClientPeer) => () => {
      if (gameState.czar === null) {
        setCardCzar(client)

        setBlackCards(prevCards => {
          if (prevCards.length === 0) return prevCards
          const [czarCard, ...deck] = prevCards

          clientPeers.forEach(peer => peer.announceCzar(client.metadata.id, czarCard))
          return deck
        })
      }
    },
    [clientPeers]
  )

  // useLayoutEffect out of an abundance of caution.
  useLayoutEffect(() => {
    // Store all the functions for cleaning up after attaching event listeners
    const cleanupStack: (() => void)[] = []
    serfs.forEach(serf => {
      // TODO Simplify? This is a pain to repeat.
      const giveCard = giveClientCard(serf)
      serf.on('req-card', giveCard)
      cleanupStack.push(() => serf.off('req-card', giveCard))

      const handleRequestCzar = handleClientRequestCzar(serf)
      serf.on('req-czar', handleRequestCzar)
      cleanupStack.push(() => serf.off('req-czar', handleRequestCzar))
    })

    return () => {
      cleanupStack.forEach(cleanupFn => cleanupFn())
    }
  }, [clientPeers, giveClientCard, handleClientRequestCzar, serfs])

  return (
    <div>
      <h5>Server</h5>
      <div>I have {clientPeers.length} peers</div>
      <div>Cards: {whiteCards.toString()}</div>
    </div>
  )
}
