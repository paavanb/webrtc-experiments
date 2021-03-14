import React, {useState, useCallback, useEffect, useMemo} from 'react'
import {
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@material-ui/core'
import {css} from '@emotion/core'
import _ from 'lodash'

import intersperse from '../../../../lib/intersperse'
import {WhiteCard} from '../../game/types'

interface PlayerCardsProps {
  cards: WhiteCard[]
  onSelectCards: (cards: WhiteCard[]) => void
  // Number of cards to pick, 0 inclusive.
  cardsToPick: number
}

export default function PlayerCards(props: PlayerCardsProps): JSX.Element {
  const {cards, cardsToPick, onSelectCards} = props
  const [chosenCards, setChosenCards] = useState<number[]>([])

  const isPickingCards = useMemo(() => cardsToPick !== 0, [cardsToPick])

  const handleToggle = useCallback(
    (card: WhiteCard) => (_evt: MouseEvent<HTMLDivElement, MouseEvent>) => {
      setChosenCards((prevCards) => {
        console.log(prevCards)
        // If we pick more than we should, only take the last n cards. This allows us to
        // simulate radio buttons without a RadioGroup when cardsToPick === 1
        if (!prevCards.includes(card.id)) return _.takeRight([...prevCards, card.id], cardsToPick)
        return _.without(prevCards, card.id)
      })
    },
    [cardsToPick]
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
    // Remove cards that are no longer in the hand
    setChosenCards((prevCards) =>
      prevCards.filter((cardId) => !cards.find((card) => card.id === cardId))
    )
  }, [cards])

  return (
    <div>
      {isPickingCards && (
        <div>
          <span>You picked: </span>
          {/* Render n blanks, filling each blank with a chosen card if it exists. */}
          {intersperse<JSX.Element | string>(
            _.range(cardsToPick).map((idx) => {
              if (idx < chosenCards.length) {
                const match = cards.find((card) => card.id === chosenCards[idx])
                if (match) return <strong>{match.text}</strong>
              }
              return <span>___________</span>
            }),
            ', '
          )}
        </div>
      )}
      <div>
        {cardsToPick !== 0 && (
          <Button
            onClick={submitCards}
            variant="contained"
            color="primary"
            disabled={chosenCards.length !== cardsToPick}
          >
            Submit
          </Button>
        )}
      </div>
      <Typography variant="h5" component="h1">
        {!isPickingCards ? 'Your cards' : `Pick ${cardsToPick}`}
      </Typography>
      <List>
        {cards.map((card) => {
          const isChosen = chosenCards.includes(card.id)
          return (
            <ListItem key={card.id} button onClick={handleToggle(card)}>
              {cardsToPick > 0 && (
                <ListItemIcon>
                  {/* When only picking one card, make checkbox behave like radio buttons. */}
                  {/* We don't use radio buttons because we need to be able to unselect. */}
                  {/* As in the case when a player does not want to play from their hand, for whatever reason. */}
                  <Checkbox
                    checked={isChosen}
                    name={`${card.id}`}
                    disabled={cardsToPick > 1 && !isChosen && chosenCards.length === cardsToPick}
                  />
                </ListItemIcon>
              )}
              <ListItemText
                primary={card.text}
                primaryTypographyProps={isChosen ? {variant: 'h6'} : undefined}
              />
            </ListItem>
          )
        })}
      </List>
    </div>
  )
}
