import React, {useState, useLayoutEffect, useCallback, useMemo} from 'react'

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
import ServerPeerConnection from '../../game/peers/ServerPeerConnection'
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
  const [serverPeerCxn, setServerPeerCxn] = useState(() => new ServerPeerConnection(rawServerPeer))
  const [round, setRound] = useReferentiallyStableState<Round | null>(null)
  const [roundHistory, setRoundHistory] = useState<CompleteRound[]>([])
  const [player, setPlayer] = useReferentiallyStableState<Player>(() => ({hand: []}))

  const submissions = useMemo(() => (round && round.czar ? round.submissions : {}), [round])
  const [selectedCards, setSelectedCards] = useState<number[]>([])
  const hasSubmittedCards = submissions[selfMetadata.id] !== undefined
  const submittedCards = submissions[selfMetadata.id]

  const playerHand = useMemo(
    () => player.hand.filter(id => !selectedCards.includes(id)).map(getWhiteCard),
    [player.hand, selectedCards]
  )
  const czar = useMemo(() => round?.czar ?? null, [round])
  const blackCard = useMemo(() => (round?.czar ? getBlackCard(round.blackCard) : null), [round])
  const isCzar = selfMetadata.id === czar
  const isSerf = czar !== null && !isCzar

  const requestCzar = useCallback(() => {
    serverPeerCxn.requestCzar()
  }, [serverPeerCxn])

  const selectCard = useCallback(
    (card: WhiteCard) => {
      setSelectedCards(prev => {
        if (
          isSerf &&
          !hasSubmittedCards &&
          blackCard &&
          prev.length < blackCard.pick // Only add selected card if we haven't already hit the pick limit of the black card
        ) {
          return [...prev, card.id]
        }
        return prev
      })
    },
    [blackCard, hasSubmittedCards, isSerf]
  )

  const submitCards = useCallback(
    (ids: CardId[]) => {
      serverPeerCxn.playCard(ids)
    },
    [serverPeerCxn]
  )

  const updateRound = useCallback(
    (newRound: Round) => {
      // If a winner has been announced, save the round in history
      // Undefined check is necessary because nulls get serialized to undefined over the wire.
      if (newRound.czar != null && newRound.winner != null && newRound.winner !== undefined) {
        setRoundHistory(history => [...history, newRound])
        // If the player had not submitted their cards yet, still reset
        setSelectedCards([])
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
    if (rawServerPeer !== prevRawServerPeer) {
      serverPeerCxn.destroy()
      setServerPeerCxn(new ServerPeerConnection(rawServerPeer))
      setPrevRawServerPeer(rawServerPeer)
    }
  }, [prevRawServerPeer, rawServerPeer, serverPeerCxn])

  // manageCardSubmit
  useLayoutEffect(() => {
    if (blackCard && selectedCards.length === blackCard.pick) {
      submitCards(selectedCards)
    }
  }, [blackCard, selectedCards, submitCards])

  // manageCardSubmitted
  useLayoutEffect(() => {
    // The server has acknowledged our submitted cards
    if (hasSubmittedCards && selectedCards.length) {
      setSelectedCards([])
    }
  }, [hasSubmittedCards, selectedCards.length])

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
      <div>
        My name is {playerMetadata.username}. {isCzar && "I'm the Czar."}
      </div>
      {!blackCard ? (
        <div>
          <button onClick={requestCzar} type="button">
            Request Czar
          </button>
        </div>
      ) : (
        <span>Current round: {blackCard.text}</span>
      )}
      {submittedCards && (
        <div>You said: {submittedCards.map(id => getWhiteCard(id).text).join(', ')}</div>
      )}
      {isCzar && (
        <div>
          <h5>Submissions</h5>
          <ul>
            {Object.keys(submissions).length === 0 && 'None.'}
            {Object.entries(submissions).map((pair, index) => {
              const [clientId, cardIds] = pair
              if (cardIds === undefined) return undefined
              return (
                // eslint-disable-next-line react/no-array-index-key
                <li key={index}>
                  {printCards(cardIds.map(getWhiteCard))}
                  <button onClick={selectWinner(clientId)} type="button">
                    Select Winner
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div css={{marginTop: 24}}>
        <PlayerHand
          cards={playerHand}
          onSelectCard={selectCard}
          canSelectCard={isSerf && !hasSubmittedCards}
        />
      </div>
      <section>
        <h5>History</h5>
        <ol>
          {roundHistory.length === 0
            ? 'None'
            : roundHistory.map((historicalRound, index) => {
                const roundBlackCard = getBlackCard(historicalRound.blackCard)
                const cardIds = historicalRound.submissions[historicalRound.winner] as number[]
                const winnersCards = cardIds.map(getWhiteCard)
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={index}>
                    {roundBlackCard.text} {winnersCards.map(({text}) => text).join(', ')}
                  </li>
                )
              })}
        </ol>
      </section>
    </div>
  )
}
