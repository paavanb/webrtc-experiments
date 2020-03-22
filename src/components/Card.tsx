import React, {forwardRef, Ref} from 'react'
import {css, SerializedStyles} from '@emotion/core'

import {CardType} from '../game/types'

const cardCss = (cardType: CardType): SerializedStyles =>
  css({
    padding: 8,
    backgroundColor: cardType === CardType.White ? 'white' : 'black',
    width: 100,
    height: 140,
    fontFamily: 'Roboto, sans-serif',
    fontWeight: 'bold',
    border: '1px solid black',
    borderRadius: 5,
  })

interface CardProps {
  text: string
  type: CardType
  className?: string
}

function Card(props: CardProps, ref: Ref<HTMLDivElement>): JSX.Element {
  const {text, type, className} = props
  return (
    <div className={className} ref={ref} css={cardCss(type)}>
      {text}
    </div>
  )
}

export default forwardRef(Card)
