import React, {useState, useEffect, useLayoutEffect, useCallback, useMemo} from 'react'

import {SwarmPeer} from '../../engine/types'
import ClientPeer from '../../game/peers/ClientPeer'
import {GameState, ClientMessage, ClientMessagePayload, Round} from '../../game/types'
import {WHITE_CARDS} from '../../data/white-cards-2.1'
import {BLACK_CARDS, getBlackCard} from '../../data/black-cards-2.1'
import {Dictionary} from '../../lib/types'
import {ListenerType} from '../../lib/MessageEventEmitter'
import shuffle from '../../lib/shuffle'
import clamp from '../../lib/clamp'
import fromEntries from '../../lib/fromEntries'
import usePrevious from '../../hooks/usePrevious'

/**
 * Set up a listener on a ClientPeer and push a cleanup function onto the given stack.
 */
function setupClientListener<K extends ClientMessage['type']>(
  peer: ClientPeer,
  event: K,
  listener: ListenerType<ClientMessage, K>,
  cleanupStack: (() => void)[]
): void {
  peer.on(event, listener)
  cleanupStack.push(() => peer.off(event, listener))
}

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
  const clientPeerMap: Dictionary<string, ClientPeer> = useMemo(
    () => fromEntries(clientPeers.map(clientPeer => [clientPeer.metadata.id, clientPeer])),
    [clientPeers]
  )

  const [gameState, setGameState] = useState<GameState>(() => ({
    round: {status: 'limbo', czar: null},
    players: fromEntries(peers.map(peer => [peer.metadata.id, {hand: []}])),
    whiteDeck: shuffle(WHITE_CARDS),
    blackDeck: shuffle(BLACK_CARDS),
    sideEffects: [],
  }))
  const prevGameState = usePrevious(gameState)
  const round = useMemo(() => gameState.round, [gameState])
  const serfs = useMemo(
    () => clientPeers.filter(peer => round.czar === null || peer.metadata.id !== round.czar),
    [clientPeers, round.czar]
  )
  const czar = useMemo(
    () => (round.czar !== null ? clientPeers.find(peer => peer.metadata.id === round.czar) : null),
    [clientPeers, round.czar]
  )

  // Czar is undefined when we we cannot find a client with the matching id, implying we lost connection to it.
  if (czar === undefined) {
    setGameState(prevState => ({...prevState, czar: null}))
  }

  // Peers updated, we must re-register listeners by instantiating new ClientPeer instances.
  if (peers !== prevPeers) {
    const newPeers = peers.map(peer => new ClientPeer(peer))

    if (round.czar !== null) {
      const newCardCzar = newPeers.find(peer => peer.metadata.id === round.czar)
      // TODO This is very bad, we used to have a czar but they disappeared. How can this be communicated?
      if (!newCardCzar) setGameState(prevState => ({...prevState, round: {czar: null}}))
    }
    setClientPeers(prev => {
      // Technically a side-effect, but acceptable since destroy() is safe to run repeatedly.
      prev.forEach(peer => peer.destroy)
      return newPeers
    })
    setPrevPeers(peers)
  }

  const giveClientCard = useCallback(
    (client: ClientPeer) => ({number}: ClientMessagePayload<'req-card'>) => {
      const numToGive = clamp(0, 10, number)
      setGameState(prevState => {
        const prevCards = prevState.whiteDeck
        const [dealtCards, whiteDeck] = [prevCards.slice(0, numToGive), prevCards.slice(numToGive)]
        const playerHand = prevState.players[client.metadata.id]?.hand || []
        const newPlayer = {
          hand: [...playerHand, ...dealtCards.map(({id}) => id)],
        }

        return {
          ...prevState,
          whiteDeck,
          players: {...prevState.players, [client.metadata.id]: newPlayer},
        }
      })
    },
    []
  )

  const selectWinner = useCallback(({winner}: ClientMessagePayload<'select-winner'>) => {
    setGameState(prevState => ({
      ...prevState,
      round: {
        ...prevState.round,
        winner,
      },
    }))
  }, [])

  const handleClientRequestCzar = useCallback(
    (client: ClientPeer) => () => {
      if (round.czar === null) {
        setGameState(prevState => {
          if (prevState.round.czar === null) {
            // NOTE: We auto-repopulate the black card deck if we run out.
            // Not necessarily ideal without notifying the user.
            const prevBlackDeck =
              prevState.blackDeck.length > 0 ? prevState.blackDeck : shuffle(BLACK_CARDS)

            const [czarCard, ...blackDeck] = prevBlackDeck

            const newRound: Round = {
              czar: client.metadata.id,
              blackCard: czarCard.id,
              submissions: {},
              winner: null,
            }

            return {
              ...prevState,
              round: newRound,
              blackDeck,
            }
          }
          // The client attempted to usurp an existing czar, their state may be out of sync.
          return {
            ...prevState,
            sideEffects: [...prevState.sideEffects, () => client.shareRoundState(round)],
          }
        })
      }
    },
    [round]
  )

  const handleClientPlayCard = useCallback(
    (client: ClientPeer) => ({cards}: ClientMessagePayload<'play-card'>) => {
      const clientId = client.metadata.id
      setGameState(prevState => {
        if (
          prevState.round.czar != null && // There is an active round
          prevState.round.submissions[clientId] === undefined && // The client has not yet played any cards
          getBlackCard(prevState.round.blackCard).pick === cards.length // The client has played the correct number of cards
        ) {
          const player = prevState.players[clientId]
          const playerHand = player?.hand || []
          // Filter out the played cards from the player's hand
          const newHand = playerHand.filter(card => !cards.includes(card))
          const newPlayer = {
            ...player,
            hand: newHand,
          }

          return {
            ...prevState,
            round: {
              ...prevState.round,
              submissions: {
                ...prevState.round.submissions,
                [clientId]: cards,
              },
            },
            players: {
              ...prevState.players,
              [clientId]: newPlayer,
            },
          }
        }
        // The client attempted to play a card outside of a round, their state may be out of sync.
        return {
          ...prevState,
          sideEffects: [
            ...prevState.sideEffects,
            () => {
              client.shareRoundState(round)
              const player = gameState.players[clientId]
              if (player) client.sharePlayerState(player)
            },
          ],
        }
      })
    },
    [gameState.players, round]
  )

  // manageSerfEvents
  useEffect(() => {
    // Store all the functions for cleaning up after attaching event listeners
    const cleanupStack: (() => void)[] = []
    serfs.forEach(serf => {
      setupClientListener(serf, 'req-card', giveClientCard(serf), cleanupStack)
      setupClientListener(serf, 'req-czar', handleClientRequestCzar(serf), cleanupStack)
      setupClientListener(serf, 'play-card', handleClientPlayCard(serf), cleanupStack)
    })

    if (czar != null) {
      setupClientListener(czar, 'select-winner', selectWinner, cleanupStack)
    }

    return () => {
      cleanupStack.forEach(cleanupFn => cleanupFn())
    }
  }, [
    clientPeers,
    czar,
    giveClientCard,
    handleClientPlayCard,
    handleClientRequestCzar,
    selectWinner,
    serfs,
  ])

  /**
   * Manage resetting the round state after we have announced the winner to all participants.
   */
  // manageWinner
  useEffect(() => {
    if (round.czar != null && round.winner !== null) {
      setGameState(prevState => ({
        ...prevState,
        round: {
          czar: null,
        },
      }))
    }
  }, [round])

  /**
   * Keep peers in sync with all round updates.
   */
  // manageRound
  useEffect(() => {
    clientPeers.forEach(peer => peer.shareRoundState(round))
  }, [clientPeers, round]) // NOTE This is a hint that perhaps the round should also contain player info.

  /**
   * Keep players in sync with all player updates.
   */
  // managePlayers
  useEffect(() => {
    const changedPlayers = Object.keys(gameState.players).filter(
      clientId => gameState.players[clientId] !== prevGameState.players[clientId]
    )
    changedPlayers.forEach(clientId => {
      const player = gameState.players[clientId]
      const peer = clientPeerMap[clientId]
      if (player && peer) peer.sharePlayerState(player)
    })
  }, [clientPeerMap, gameState.players, prevGameState.players])

  // Safely run side effects. useLayoutEffect since we have to clear the sideEffects state after
  // running them, and don't want to incur the extra paint.
  // manageSideEffects
  useLayoutEffect(() => {
    const numSideEffects = gameState.sideEffects.length
    if (numSideEffects > 0) {
      gameState.sideEffects.forEach(effect => effect())
      setGameState(prevState => ({
        ...prevState,
        // Since sideEffects could have been added in the meantime, carefully only remove the ones we called.
        sideEffects: prevState.sideEffects.slice(numSideEffects),
      }))
    }
  }, [gameState.sideEffects])

  return <></>
}
