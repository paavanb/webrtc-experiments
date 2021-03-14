import React from 'react'
import {Button, List, ListItem, ListItemIcon, ListItemText, Typography} from '@material-ui/core'
import {css} from '@emotion/core'

import {Dictionary} from '../../../../lib/types'
import {BlackCard, WhiteCard, ClientId, CardId, CompleteRound} from '../../game/types'
import {getWhiteCard} from '../../data/white-cards-2.1'

import PlayerCards from './PlayerCards'

const gameContainerCss = css`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const cardsContainerCss = css`
  margin-top: 24px;
  flex: 1;
  overflow: hidden;
`

const drawCardContainer = css`
  text-align: center;
  margin-top: 0.5rem;
`

function printCards(cards: (WhiteCard | BlackCard)[]): string {
  return cards.map(({text}) => text).join(', ')
}

interface GamePageProps {
  username: string
  blackCard: BlackCard | null
  czar: ClientId | null
  clientId: ClientId
  playerHand: WhiteCard[]
  submissions: Dictionary<ClientId, CardId[]>
  roundHistory: CompleteRound[]
  onRequestCzar(): void
  onSelectWinner(clientId: ClientId): () => void
  onSubmitCards(cards: WhiteCard[]): void
}

export default function GamePage(props: GamePageProps): JSX.Element {
  const {
    username,
    blackCard,
    playerHand,
    onRequestCzar,
    onSelectWinner,
    onSubmitCards,
    czar,
    submissions,
    clientId,
  } = props

  const submittedCards = submissions[clientId]
  const hasSubmittedCards = submittedCards !== undefined

  const isPlayingRound = czar != null
  const isCzar = clientId === czar
  const isSerf = isPlayingRound && !isCzar

  return (
    <div css={gameContainerCss}>
      <div>
        Username: <strong>{username}</strong>.
      </div>
      {!blackCard ? (
        <div css={drawCardContainer}>
          <Button onClick={onRequestCzar} variant="contained" color="secondary">
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
                const [peerClientId, cardIds] = pair
                if (cardIds === undefined) return undefined
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Button
                        onClick={onSelectWinner(peerClientId)}
                        variant="contained"
                        color="primary"
                      >
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
      <div css={cardsContainerCss}>
        <PlayerCards
          cards={playerHand}
          onSelectCards={onSubmitCards}
          cardsToPick={isSerf && !hasSubmittedCards && blackCard ? blackCard.pick : 0}
        />
      </div>
    </div>
  )
}
