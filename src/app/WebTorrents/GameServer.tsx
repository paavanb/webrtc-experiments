import React, {useState, useEffect, useLayoutEffect, useCallback, useMemo} from 'react'

import {SwarmPeer} from '../../engine/types'
import ClientPeer from '../../game/peers/ClientPeer'
import {GameState, ClientMessage} from '../../game/types'
import {WHITE_CARDS} from '../../data/white-cards-2.1'
import {BLACK_CARDS} from '../../data/black-cards-2.1'
import {ListenerType} from '../../lib/MessageEventEmitter'
import shuffle from '../../lib/shuffle'
import clamp from '../../lib/clamp'
import fromEntries from '../../lib/fromEntries'

// Have to store as constants since `useAsyncSetState` does not accept a functional initializer
const SHUFFLED_WHITE_CARDS = shuffle(WHITE_CARDS)
const SHUFFLED_BLACK_CARDS = shuffle(BLACK_CARDS)

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

  const [gameState, setGameState] = useState<GameState>(() => ({
    round: {status: 'limbo', czar: null},
    players: fromEntries(peers.map(peer => [peer.metadata.id, {hand: []}])),
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
    // FIXME This is a side-effect running in render. Causing peers to be destroyed but reused.
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
      setGameState(prevState => {
        const prevCards = prevState.whiteDeck
        const [dealtCards, whiteDeck] = [prevCards.slice(0, numToGive), prevCards.slice(numToGive)]
        const playerHand = prevState.players[client.metadata.id].hand
        const newPlayer = {
          hand: [...playerHand, ...dealtCards.map(({id}) => id)],
        }

        return {
          ...prevState,
          whiteDeck,
          players: {...prevState.players, [client.metadata.id]: newPlayer},
          sideEffects: [...prevState.sideEffects, () => client.sharePlayer(newPlayer)],
        }
      })
    },
    []
  )

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
          }
          // The client attempted to usurp an existing czar, their state may be out of sync.
          return {
            ...prevState,
            sideEffects: [...prevState.sideEffects, () => client.shareRound(round)],
          }
        })
      }
    },
    [clientPeers, round]
  )

  const handleClientPlayCard = useCallback(
    (client: ClientPeer) => ({cards}: ClientMessage<'play-card'>) => {
      const clientId = client.metadata.id
      setGameState(prevState => {
        if (
          prevState.round.czar !== null && // There is an active round
          prevState.round.submissions[clientId] === undefined && // The client has not yet played any cards
          prevState.round.blackCard.pick === cards.length // The client has played the correct number of cards
        ) {
          const player = prevState.players[clientId]
          // Filter out the played cards from the player's hand
          const newHand = player.hand.filter(card => !cards.includes(card))
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
            sideEffects: [
              ...prevState.sideEffects,
              () => {
                client.sharePlayer(newPlayer)
              },
            ],
          }
        }
        // The client attempted to play a card outside of a round, their state may be out of sync.
        return {
          ...prevState,
          sideEffects: [
            ...prevState.sideEffects,
            () => {
              client.shareRound(round)
              client.sharePlayer(gameState.players[clientId])
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

    return () => {
      cleanupStack.forEach(cleanupFn => cleanupFn())
    }
  }, [clientPeers, giveClientCard, handleClientPlayCard, handleClientRequestCzar, serfs])

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
