import React, {useState, useEffect, useLayoutEffect, useCallback, useMemo} from 'react'

import {SwarmPeer} from '../../engine/types'
import ClientPeer from '../../game/peers/ClientPeer'
import {GameState, ClientMessage} from '../../game/types'
import WHITE_CARDS from '../../data/white-cards-2.1'
import BLACK_CARDS from '../../data/black-cards-2.1'
import shuffle from '../../lib/shuffle'
import clamp from '../../lib/clamp'
import log from '../../lib/log'

// Have to store as constants since `useAsyncSetState` does not accept a functional initializer
const SHUFFLED_WHITE_CARDS = shuffle(WHITE_CARDS)
const SHUFFLED_BLACK_CARDS = shuffle(BLACK_CARDS)

interface GameServerProps {
  peers: SwarmPeer[]
}

/**
 * Component which assumes the role of the game server, coordinating a game for a set of clients.
 *
 */
export default function GameServer(props: GameServerProps): JSX.Element {
  const {peers} = props
  const [prevPeers, setPrevPeers] = useState<SwarmPeer[]>([])
  const [clientPeers, setClientPeers] = useState<ClientPeer[]>([])

  // TODO Do we need async setstate?
  const [gameState, setGameState] = useState<GameState>(() => ({
    round: {status: 'limbo', czar: null},
    whiteDeck: SHUFFLED_WHITE_CARDS,
    blackDeck: SHUFFLED_BLACK_CARDS,
    sideEffects: [],
  }))
  const round = useMemo(() => gameState.round, [gameState])
  const serfs = useMemo(
    () => clientPeers.filter(peer => round.czar === null || peer.metadata.id !== round.czar),
    [clientPeers, round.czar]
  )

  // Peers updated, we must re-register listeners by instantiating new ClientPeer instances.
  if (peers !== prevPeers) {
    clientPeers.forEach(peer => peer.destroy())
    const newPeers = peers.map(peer => new ClientPeer(peer))

    if (round.czar !== null) {
      const newCardCzar = newPeers.find(peer => peer.metadata.id === round.czar)
      // TODO This is very bad, we used to have a czar but they disappeared. How can this be communicated?
      if (!newCardCzar) setGameState(prevState => ({...prevState, round: {czar: null}}))
    }
    setClientPeers(newPeers)
    setPrevPeers(peers)
  }

  const giveClientCard = useCallback(
    (client: ClientPeer) => ({number}: ClientMessage<'req-card'>) => {
      const numToGive = clamp(0, 10, number)
      log('Giving client cards.')
      setGameState(prevState => {
        const prevCards = prevState.whiteDeck
        const [dealtCards, whiteDeck] = [prevCards.slice(0, numToGive), prevCards.slice(numToGive)]
        return {
          ...prevState,
          whiteDeck,
          sideEffects: [...prevState.sideEffects, () => client.sendCards(dealtCards)],
        }
      })
    },
    []
  )

  const handleClientRequestCzar = useCallback(
    (client: ClientPeer) => () => {
      if (round.czar === null) {
        log('Setting new czar')
        setGameState(prevState => {
          // NOTE: We auto-repopulate the black card deck if we run out.
          // Not necessarily ideal without notifying the user.
          const prevBlackDeck =
            prevState.blackDeck.length > 0 ? prevState.blackDeck : shuffle(BLACK_CARDS)

          const [czarCard, ...blackDeck] = prevBlackDeck

          const newRound = {
            czar: client.metadata.id,
            blackCard: czarCard,
            submissions: {},
            winner: null,
          }

          return {
            ...prevState,
            round: newRound,
            blackDeck,
            sideEffects: [
              ...prevState.sideEffects,
              // Announce the czar and card to the entire group
              () => clientPeers.forEach(peer => peer.shareRound(newRound)),
            ],
          }
        })
      } else {
        log('Sharing round')
        clientPeers.forEach(peer => peer.shareRound(round))
      }
    },
    [clientPeers, round]
  )

  useEffect(() => {
    // Store all the functions for cleaning up after attaching event listeners
    const cleanupStack: (() => void)[] = []
    serfs.forEach(serf => {
      // TODO Simplify? This is a pain to repeat.
      const giveCard = giveClientCard(serf)
      serf.on('req-card', giveCard)
      // TODO We are screwing up the cleanup. If the client requests czar,
      // suddenly all future requests stop being handled. Something related to
      // the event handlers.
      //cleanupStack.push(() => serf.off('req-card', giveCard))

      const handleRequestCzar = handleClientRequestCzar(serf)
      serf.on('req-czar', handleRequestCzar)
      //cleanupStack.push(() => serf.off('req-czar', handleRequestCzar))
    })

    return () => {
      log('Unbound all.')
      cleanupStack.forEach(cleanupFn => cleanupFn())
    }
  }, [clientPeers, giveClientCard, handleClientRequestCzar, serfs])

  // Safely run side effects. useLayoutEffect since we have to clear the sideEffects state after
  // running them, and don't want to incur the extra paint.
  useLayoutEffect(() => {
    const numSideEffects = gameState.sideEffects.length
    if (numSideEffects > 0) {
      log('Flushing side effects.')
      gameState.sideEffects.forEach(effect => effect())
      setGameState(prevState => ({
        ...prevState,
        // Since sideEffects could have been added in the meantime, carefully only remove the ones we called.
        sideEffects: prevState.sideEffects.slice(numSideEffects),
      }))
    }
  }, [gameState.sideEffects])

  return (
    <div>
      <h5>Server</h5>
      <div>I have {clientPeers.length} peers</div>
      <div>
        I have {gameState.whiteDeck.length} white cards and {gameState.blackDeck.length} black
        cards.
      </div>
      <div style={{fontFamily: 'Monospace'}}>{JSON.stringify(gameState.round, null, 2)}</div>
    </div>
  )
}
