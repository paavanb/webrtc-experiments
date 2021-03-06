import React, {useState, useLayoutEffect, useCallback, useMemo} from 'react'

import {SwarmPeer, PeerMetadata} from '../../engine/types'
import useReferentiallyStableState from '../../hooks/useReferentiallyStableState'

import {Round, Player, CompleteRound, WhiteCard, ClientId} from './game/types'
import ServerPeerConnection from './game/peers/ServerPeerConnection'
import {getWhiteCard} from './data/white-cards-2.1'
import {getBlackCard} from './data/black-cards-2.1'
import GamePage from './pages/game'

interface GameClientProps {
  username: string
  serverPeer: SwarmPeer // The raw server peer this client will communicate with
  selfMetadata: PeerMetadata // Metadata representing the local client
}

/**
 * Component which assumes the role of the game client, responding and reacting to a server.
 */
export default function GameClient(props: GameClientProps): JSX.Element {
  const {username, serverPeer, selfMetadata} = props
  const [prevServerPeer, setPrevServerPeer] = useState<SwarmPeer | null>(null)
  const [serverPeerCxn, setServerPeerCxn] = useState(() => new ServerPeerConnection(serverPeer))
  const [round, setRound] = useReferentiallyStableState<Round | null>(null)
  const [roundHistory, setRoundHistory] = useState<CompleteRound[]>([])
  const [player, setPlayer] = useReferentiallyStableState<Player>(() => ({hand: []}))

  const submissions = useMemo(() => (round && round.czar ? round.submissions : {}), [round])

  const playerHand = useMemo(() => player.hand.map(getWhiteCard), [player.hand])
  const czar = useMemo(() => round?.czar ?? null, [round])
  const blackCard = useMemo(() => (round?.czar ? getBlackCard(round.blackCard) : null), [round])

  const requestCzar = useCallback(() => {
    serverPeerCxn.requestCzar()
  }, [serverPeerCxn])

  const submitCards = useCallback(
    (cards: WhiteCard[]) => {
      serverPeerCxn.playCard(cards.map((c) => c.id))
    },
    [serverPeerCxn]
  )

  const updateRound = useCallback(
    (newRound: Round) => {
      // If a winner has been announced, save the round in history
      // Undefined check is necessary because nulls get serialized to undefined over the wire.
      if (newRound.czar != null && newRound.winner != null && newRound.winner !== undefined) {
        setRoundHistory((history) => [...history, newRound])
      }
      setRound(newRound)
    },
    [setRound]
  )

  const selectWinner = useCallback(
    (clientId: ClientId) => () => {
      serverPeerCxn.selectWinner(clientId)
    },
    [serverPeerCxn]
  )

  // manageServerPeerChange
  useLayoutEffect(() => {
    if (serverPeer !== prevServerPeer) {
      serverPeerCxn.destroy()
      setServerPeerCxn(new ServerPeerConnection(serverPeer))
      setPrevServerPeer(serverPeer)
    }
  }, [prevServerPeer, serverPeer, serverPeerCxn])

  /**
   * Register listeners onto the server.
   * Must be useLayoutEffect in order to register listeners before server emits events.
   */
  // manageServerPeerEvents
  useLayoutEffect(() => {
    serverPeerCxn.on('player', setPlayer)
    serverPeerCxn.on('round', updateRound)

    return () => {
      serverPeerCxn.off('player', setPlayer)
      serverPeerCxn.off('round', updateRound)
    }
  }, [serverPeerCxn, setPlayer, updateRound])

  return (
    <div>
      <GamePage
        username={username}
        blackCard={blackCard}
        czar={czar}
        submissions={submissions}
        clientId={selfMetadata.id}
        playerHand={playerHand}
        roundHistory={roundHistory}
        onSelectWinner={selectWinner}
        onRequestCzar={requestCzar}
        onSubmitCards={submitCards}
      />
    </div>
  )
}
