import React, {useState, useEffect, useLayoutEffect, useCallback, useMemo} from 'react'

import {SwarmPeer, PeerMetadata} from '../../engine/types'
import {
  Round,
  Player,
  CardId,
  CompleteRound,
  WhiteCard,
  BlackCard,
  ClientId,
} from '../../game/types'
import ServerPeer from '../../game/peers/ServerPeer'
import {getWhiteCard} from '../../data/white-cards-2.1'
import {getBlackCard} from '../../data/black-cards-2.1'
import useReferentiallyStableState from '../../hooks/useReferentiallyStableState'

import PlayerHand from './PlayerHand'

interface PlayerMetadata {
  username: string
}

interface GameClientProps {
  playerMetadata: PlayerMetadata // The player that this client represents
  rawServerPeer: SwarmPeer // The raw server peer this client will communicate with
  selfMetadata: PeerMetadata // Metadata representing the local client
}

function printCards(cards: (WhiteCard | BlackCard)[]): string {
  return cards.map(({text}) => text).join(', ')
}

/**
 * Component which assumes the role of the game client, responding and reacting to a server.
 */
export default function GameClient(props: GameClientProps): JSX.Element {
  const {playerMetadata, rawServerPeer, selfMetadata} = props
  const [prevRawServerPeer, setPrevRawServerPeer] = useState<SwarmPeer | null>(null)
  const [serverPeer, setServerPeer] = useState<ServerPeer>(() => new ServerPeer(rawServerPeer))
  const [round, setRound] = useReferentiallyStableState<Round | null>(null)
  const [roundHistory, setRoundHistory] = useState<CompleteRound[]>([])
  const [player, setPlayer] = useReferentiallyStableState<Player>(() => ({hand: []}))

  const submissions = useMemo(() => (round && round.czar ? round.submissions : {}), [round])
  const playerHand = useMemo(() => player.hand.map(getWhiteCard), [player.hand])
  const czar = useMemo(() => round?.czar ?? null, [round])
  const isCzar = selfMetadata.id === czar
  const isSerf = czar !== null && !isCzar

  const requestCard = useCallback(() => {
    serverPeer.requestCards(1)
  }, [serverPeer])

  const requestCzar = useCallback(() => {
    serverPeer.requestCzar()
  }, [serverPeer])

  const playCard = useCallback(
    (id: CardId) => () => {
      serverPeer.playCard([id])
    },
    [serverPeer]
  )

  const updateRound = useCallback(
    (newRound: Round) => {
      // If a winner has been announced, save the round in history
      // TODO Undefined check is necessary because nulls get serialized to undefined over the wire.
      if (newRound.czar != null && newRound.winner != null && newRound.winner !== undefined) {
        setRoundHistory(history => [...history, newRound])
      }
      setRound(newRound)
    },
    [setRound]
  )

  const selectWinner = useCallback(
    (clientId: ClientId) => () => {
      serverPeer.selectWinner(clientId)
    },
    [serverPeer]
  )

  // manageServerPeerChange
  useLayoutEffect(() => {
    if (rawServerPeer !== prevRawServerPeer) {
      serverPeer.destroy()
      setServerPeer(new ServerPeer(rawServerPeer))
      setPrevRawServerPeer(rawServerPeer)
    }
  }, [prevRawServerPeer, rawServerPeer, serverPeer])

  // manageServerPeerEvents
  useEffect(() => {
    serverPeer.on('player', setPlayer)
    serverPeer.on('round', updateRound)

    return () => {
      serverPeer.off('player', setPlayer)
      serverPeer.off('round', updateRound)
    }
  }, [serverPeer, setPlayer, updateRound])

  return (
    <div>
      <h5 css={{marginBottom: 5}}>Client</h5>
      <div>
        My name is {playerMetadata.username}. {isCzar && "I'm the Czar."}
      </div>
      <span>Current round: {round?.czar ? getBlackCard(round.blackCard).text : 'None.'}</span>
      {!isCzar ? (
        <div>
          <button onClick={requestCzar} type="button">
            Request Czar
          </button>
          <button onClick={requestCard} type="button">
            Request Card
          </button>
        </div>
      ) : (
        <div>
          <h5>Submissions</h5>
          <ul>
            {Object.keys(submissions).length === 0 && 'None.'}
            {Object.keys(submissions).map((clientId, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={index}>
                {printCards(submissions[clientId].map(getWhiteCard))}
                <button onClick={selectWinner(clientId)} type="button">
                  Select Winner
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div css={{marginTop: 24}}>
        <PlayerHand cards={playerHand} />
      </div>
      <section>
        <h5>History</h5>
        <ol>
          {roundHistory.length === 0
            ? 'None'
            : roundHistory.map((historicalRound, index) => {
                const blackCard = getBlackCard(historicalRound.blackCard)
                const winnersCards = historicalRound.submissions[historicalRound.winner].map(
                  getWhiteCard
                )
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={index}>
                    {blackCard.text} {winnersCards.map(({text}) => text).join(', ')}
                  </li>
                )
              })}
        </ol>
      </section>
    </div>
  )
}
