import React, {useState, useEffect, useLayoutEffect, useCallback, useMemo} from 'react'

import {SwarmPeer} from '../../engine/types'
import {Dictionary} from '../../lib/types'
import {ListenerType} from '../../lib/MessageEventEmitter'
import shuffle from '../../lib/shuffle'
import clamp from '../../lib/clamp'
import fromEntries from '../../lib/fromEntries'
import usePrevious from '../../hooks/usePrevious'

import ClientPeerConnection from './game/peers/ClientPeerConnection'
import dealCards from './game/dealCards'
import {ClientId, GameState, ClientMessage, ClientMessagePayload, Round, Player} from './game/types'
import {WHITE_CARDS} from './data/white-cards-2.1'
import {BLACK_CARDS, getBlackCard} from './data/black-cards-2.1'

// Number of cards that players will start off with.
const STARTING_HAND_SIZE = 10

/**
 * Set up a listener on a ClientPeerConnection and push a cleanup function onto the given stack.
 */
function setupClientListener<K extends ClientMessage['type']>(
  peer: ClientPeerConnection,
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
  const [clientPeerCxns, setClientPeerCxns] = useState<ClientPeerConnection[]>([])
  const clientPeerMap: Dictionary<string, ClientPeerConnection> = useMemo(
    () => fromEntries(clientPeerCxns.map(clientPeer => [clientPeer.metadata.id, clientPeer])),
    [clientPeerCxns]
  )

  const [gameState, setGameState] = useState<GameState>(() => ({
    round: {status: 'limbo', czar: null},
    players: {},
    whiteDeck: shuffle(WHITE_CARDS),
    blackDeck: shuffle(BLACK_CARDS),
    sideEffects: [],
  }))
  const prevGameState = usePrevious(gameState)
  const round = useMemo(() => gameState.round, [gameState])
  const serfs = useMemo(
    () => clientPeerCxns.filter(peer => round.czar === null || peer.metadata.id !== round.czar),
    [clientPeerCxns, round.czar]
  )
  const czar = useMemo(
    () =>
      round.czar !== null ? clientPeerCxns.find(peer => peer.metadata.id === round.czar) : null,
    [clientPeerCxns, round.czar]
  )

  const sharePlayerState = useCallback(
    (clientId: ClientId): void => {
      const player = gameState.players[clientId]
      const peer = clientPeerMap[clientId]
      if (player && peer) peer.sharePlayerState(player)
    },
    [clientPeerMap, gameState.players]
  )

  const giveClientCard = useCallback(
    (client: ClientPeerConnection) => ({number}: ClientMessagePayload<'req-card'>) => {
      const numToGive = clamp(0, 10, number)
      setGameState(prevState => {
        const player: Player = prevState.players[client.metadata.id] ?? {hand: []}
        const [newDeck, newPlayer] = dealCards(prevState.whiteDeck, player, numToGive)

        return {
          ...prevState,
          whiteDeck: newDeck,
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

  // "Onboard" new peers into the game
  const manageAddedPeers = useCallback(
    (prev: SwarmPeer[], next: ClientPeerConnection[]) => {
      const prevIds = new Set(prev.map(p => p.metadata.id))
      const nextIds = new Set(next.map(p => p.metadata.id))

      const addedIds = new Set([...nextIds].filter(id => !prevIds.has(id)))
      const addedPeers = next.filter(peer => addedIds.has(peer.metadata.id))

      addedPeers.forEach(peer => {
        const playerState = gameState.players[peer.metadata.id]
        if (!playerState) {
          // All new players should receive a full hand
          giveClientCard(peer)({
            number: STARTING_HAND_SIZE,
          })
        } else {
          // A player has rejoined, notify them of their state again
          peer.sharePlayerState(playerState)
        }
      })
    },
    [gameState.players, giveClientCard]
  )

  const handleClientRequestCzar = useCallback(
    (client: ClientPeerConnection) => () => {
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
    (client: ClientPeerConnection) => ({cards}: ClientMessagePayload<'play-card'>) => {
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
    clientPeerCxns,
    czar,
    giveClientCard,
    handleClientPlayCard,
    handleClientRequestCzar,
    selectWinner,
    serfs,
  ])

  useLayoutEffect(() => {
    // Czar is undefined when we we cannot find a client with the matching id, implying we lost connection to it.
    if (czar === undefined) {
      setGameState(prevState => ({...prevState, czar: null}))
    }
  }, [czar])

  // manageClientPeers
  useLayoutEffect(() => {
    // Peers updated, we must re-register listeners by instantiating new ClientPeerConnection instances.
    if (peers !== prevPeers) {
      const newClientPeers = peers.map(peer => new ClientPeerConnection(peer))

      manageAddedPeers(prevPeers, newClientPeers)
      if (round.czar !== null) {
        const newCardCzar = newClientPeers.find(peer => peer.metadata.id === round.czar)
        // TODO This is very bad, we used to have a czar but they disappeared. How can this be communicated?
        if (!newCardCzar) setGameState(prevState => ({...prevState, round: {czar: null}}))
      }
      setClientPeerCxns(prev => {
        prev.forEach(peer => peer.destroy())
        return newClientPeers
      })
      setPrevPeers(peers)
    }
  }, [manageAddedPeers, peers, prevPeers, round.czar])

  /**
   * Manage resetting the round state after we have announced the winner to all participants.
   */
  // manageWinner
  useEffect(() => {
    if (round.czar != null && round.winner !== null) {
      setGameState(prevState => {
        // Deal all players back up to 10 cards
        const [newDeck, newPlayers] = Object.entries(prevState.players).reduce(
          (accum, entry) => {
            const [deck, players] = accum
            const [playerId, player] = entry
            if (player === undefined) return [deck, players]

            const numToGive = STARTING_HAND_SIZE - player.hand.length
            const [updatedDeck, updatedPlayer] = dealCards(deck, player, numToGive)
            return [updatedDeck, {...players, [playerId]: updatedPlayer}]
          },
          [prevState.whiteDeck, prevState.players]
        )
        return {
          ...prevState,
          whiteDeck: newDeck,
          round: {
            czar: null,
          },
          players: newPlayers,
        }
      })
    }
  }, [round])

  /**
   * Keep peers in sync with all round updates.
   */
  // manageRound
  useEffect(() => {
    clientPeerCxns.forEach(peer => peer.shareRoundState(round))
  }, [clientPeerCxns, round]) // NOTE This is a hint that perhaps the round should also contain player info.

  /**
   * Keep players in sync with all player updates.
   */
  // managePlayers
  useEffect(() => {
    const changedPlayers = Object.keys(gameState.players).filter(
      clientId => gameState.players[clientId] !== prevGameState.players[clientId]
    )
    changedPlayers.forEach(sharePlayerState)
  }, [clientPeerMap, gameState.players, prevGameState.players, sharePlayerState])

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
