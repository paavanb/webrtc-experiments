import React, {useState, useCallback} from 'react'
import {
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
  Typography,
} from '@material-ui/core'
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

const chooseWinnerCss = css`
  width: 100%;
`

function printCards(cards: (WhiteCard | BlackCard)[]): string {
  return cards.map(({text}) => text).join(', ')
}

interface SubmissionProps {
  submissions: Dictionary<ClientId, CardId[]>
  onSelectWinner(clientId: ClientId): void
}

function Submissions(props: SubmissionProps): JSX.Element {
  const {submissions, onSelectWinner} = props
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [isSubmissionsRevealed, setIsSubmissionsRevealed] = useState(false)

  const revealSubmissions = useCallback(() => setIsSubmissionsRevealed(true), [])

  if (Object.keys(submissions).length === 0) {
    return <span>Waiting for submissions...</span>
  }

  if (!isSubmissionsRevealed) {
    const numSubmissions = Object.keys(submissions).length
    const txtSubmissions = numSubmissions === 1 ? 'submission' : 'submissions'
    return (
      <div>
        <div>
          Got {Object.keys(submissions).length} {txtSubmissions}...
        </div>
        <Button onClick={revealSubmissions} variant="contained" color="primary">
          Reveal All
        </Button>
      </div>
    )
  }

  return (
    <div>
      <Button
        onClick={() => selectedWinner !== null && onSelectWinner(selectedWinner)}
        disabled={selectedWinner === null}
        variant="contained"
        color="primary"
        css={chooseWinnerCss}
      >
        Choose Winner
      </Button>
      <List>
        {Object.entries(submissions).map((pair, index) => {
          const [peerClientId, cardIds] = pair
          if (cardIds === undefined) return undefined
          return (
            // eslint-disable-next-line react/no-array-index-key
            <ListItem key={index} button onClick={() => setSelectedWinner(peerClientId)}>
              <ListItemIcon>
                <Radio checked={peerClientId === selectedWinner} />
              </ListItemIcon>
              <ListItemText primary={printCards(cardIds.map(getWhiteCard))} />
            </ListItem>
          )
        })}
      </List>
    </div>
  )
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
  onSelectWinner(clientId: ClientId): void
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
          <Submissions submissions={submissions} onSelectWinner={onSelectWinner} />
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
