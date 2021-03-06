import React, {useState, useCallback, useEffect} from 'react'
import {
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@material-ui/core'

import {WhiteCard} from './game/types'

interface PlayerCardsProps {
  cards: WhiteCard[]
  onSelectCards: (cards: WhiteCard[]) => void
  // Number of cards to pick, 0 inclusive.
  cardsToPick: number
}

export default function PlayerCards(props: PlayerCardsProps): JSX.Element {
  const {cards, cardsToPick, onSelectCards} = props
  const [chosenCards, setChosenCards] = useState<Set<number>>(new Set())

  const handleChange = useCallback(
    (card: WhiteCard) => (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      if (checked) {
        setChosenCards((prevCards) => {
          prevCards.add(card.id)
          return new Set(Array.from(prevCards))
        })
      } else {
        setChosenCards((prevCards) => {
          prevCards.delete(card.id)
          return new Set(Array.from(prevCards))
        })
      }
    },
    []
  )

  const submitCards = useCallback(() => {
    const cardsToSend = Array.from(chosenCards)
      .map((id) => cards.find((c) => c.id === id))
      .filter((c): c is WhiteCard => c !== undefined)
    if (cardsToSend.length === cardsToPick) {
      onSelectCards(cardsToSend.filter((c) => c !== undefined))
    }
  }, [cards, cardsToPick, chosenCards, onSelectCards])

  // Update chosen cards if hand updates
  useEffect(() => {
    setChosenCards((prevCards) => {
      prevCards.forEach((cardId) => {
        // Remove cards that are no longer in the hand
        if (!cards.find((c) => c.id === cardId)) prevCards.delete(cardId)
      })
      return new Set(Array.from(prevCards))
    })
  }, [cards])

  return (
    <div>
      <Typography variant="h5" component="h1">
        {cardsToPick === 0 ? 'Your cards' : `Pick ${cardsToPick}`}
      </Typography>
      <List>
        {cards.map((card) => (
          <ListItem key={card.id}>
            {cardsToPick > 0 && (
              <ListItemIcon>
                <Checkbox
                  checked={chosenCards.has(card.id)}
                  onChange={handleChange(card)}
                  name={`${card.id}`}
                />
              </ListItemIcon>
            )}
            <ListItemText primary={card.text} />
          </ListItem>
        ))}
      </List>
      <div>
        {cardsToPick !== 0 && (
          <Button
            onClick={submitCards}
            variant="contained"
            color="primary"
            disabled={chosenCards.size !== cardsToPick}
          >
            Submit
          </Button>
        )}
      </div>
    </div>
  )
}
