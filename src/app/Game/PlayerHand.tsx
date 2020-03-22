import * as React from 'react'
import {css} from '@emotion/core'

import {WhiteCard} from '../../game/types'
import Card from '../../components/Card'

const containerCss = css({
  position: 'relative',
  width: '100%',
})

const cardCss = css({
  position: 'absolute',
})

interface PlayerHandProps {
  cards: WhiteCard[]
}

export default function PlayerHand(props): JSX.Element {
  const {cards} = props

  return (
    <div css={containerCss}>

    </div>
  )
}
