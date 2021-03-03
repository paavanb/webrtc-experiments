import React, {useState, useLayoutEffect, useCallback, useMemo} from 'react'
import {Button, List, ListItem, ListItemText, ListItemIcon, Typography} from '@material-ui/core'

import {SwarmPeer, PeerMetadata} from '../../engine/types'
import useReferentiallyStableState from '../../hooks/useReferentiallyStableState'

import PlayerCards from './PlayerCards'
import {Round, Player, CompleteRound, WhiteCard, BlackCard, ClientId} from './game/types'
import ServerPeerConnection from './game/peers/ServerPeerConnection'
import {getWhiteCard} from './data/white-cards-2.1'
import {getBlackCard} from './data/black-cards-2.1'

interface GameClientProps {
  username: string
  serverPeer: SwarmPeer // The raw server peer this client will communicate with
  selfMetadata: PeerMetadata // Metadata representing the local client
}

function printCards(cards: (WhiteCard | BlackCard)[]): string {
  return cards.map(({text}) => text).join(', ')
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
  const hasSubmittedCards = submissions[selfMetadata.id] !== undefined
  const submittedCards = submissions[selfMetadata.id]

  const playerHand = useMemo(() => player.hand.map(getWhiteCard), [player.hand])
  const czar = useMemo(() => round?.czar ?? null, [round])
  const blackCard = useMemo(() => (round?.czar ? getBlackCard(round.blackCard) : null), [round])
  const isCzar = selfMetadata.id === czar
  const isSerf = czar !== null && !isCzar

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
      <div>
        Username: <strong>{username}</strong>.
      </div>
      {!blackCard ? (
        <div>
          <Button onClick={requestCzar} variant="contained" color="secondary">
            Draw the next black card
          </Button>
        </div>
      ) : (
        <span>
          {isCzar ? 'I just drew: ' : 'Currently playing: '}
          <strong>{blackCard.text}</strong>
        </span>
      )}
      {submittedCards && (
        <div>
          You said: <strong>{submittedCards.map((id) => getWhiteCard(id).text).join(', ')}</strong>
        </div>
      )}
      {isCzar && (
        <div>
          <Typography variant="h6" component="h1">
            Submissions
          </Typography>
          {Object.keys(submissions).length === 0 ? (
            'Waiting for submissions...'
          ) : (
            <List>
              {Object.entries(submissions).map((pair, index) => {
                const [clientId, cardIds] = pair
                if (cardIds === undefined) return undefined
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Button onClick={selectWinner(clientId)} variant="contained" color="primary">
                        Winner
                      </Button>
                    </ListItemIcon>
                    <ListItemText primary={printCards(cardIds.map(getWhiteCard))} />
                  </ListItem>
                )
              })}
            </List>
          )}
        </div>
      )}
      <div css={{marginTop: 24}}>
        <PlayerCards
          cards={playerHand}
          onSelectCards={submitCards}
          cardsToPick={isSerf && !hasSubmittedCards && blackCard ? blackCard.pick : 0}
        />
      </div>
      {roundHistory.length > 0 && (
        <section>
          <Typography variant="h6" component="h1">
            History
          </Typography>
          <List>
            {roundHistory.map((historicalRound, index) => {
              const roundBlackCard = getBlackCard(historicalRound.blackCard)
              const cardIds = historicalRound.submissions[historicalRound.winner] as number[]
              const winnersCards = cardIds.map(getWhiteCard)
              return (
                // eslint-disable-next-line react/no-array-index-key
                <ListItem key={index}>
                  <ListItemText
                    primary={roundBlackCard.text}
                    secondary={winnersCards.map(({text}) => text).join(', ')}
                  />
                </ListItem>
              )
            })}
          </List>
        </section>
      )}
    </div>
  )
}
