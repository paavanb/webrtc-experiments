import React from 'react'
import {List, ListItem, ListItemText, Typography} from '@material-ui/core'

import {CompleteRound} from '../../game/types'
import {getBlackCard} from '../../data/black-cards-2.1'
import {getWhiteCard} from '../../data/white-cards-2.1'

interface HistoryPageProps {
  roundHistory: CompleteRound[]
}

export default function HistoryPage(props: HistoryPageProps): JSX.Element {
  const {roundHistory} = props
  return (
    <section>
      <Typography variant="h5" component="h1">
        History
      </Typography>
      <List>
        {roundHistory.length === 0 && (
          <ListItem key={-1}>
            <ListItemText primary="No winners yet..." secondary="Play some rounds!" />
          </ListItem>
        )}
        {roundHistory.length > 0 &&
          roundHistory.map((historicalRound, index) => {
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
  )
}
