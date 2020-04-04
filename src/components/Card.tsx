import React, {forwardRef, Ref} from 'react'
import {css, SerializedStyles} from '@emotion/core'

import {CardType} from '../game/types'

const cardCss = (cardType: CardType): SerializedStyles =>
  css({
    padding: 8,
    color: cardType === CardType.White ? 'black' : 'white',
    backgroundColor: cardType === CardType.White ? 'white' : 'black',
    width: 200,
    height: 280,
    fontFamily: 'Roboto, sans-serif',
    fontWeight: 'bold',
    fontSize: 18,
    border: '1px solid black',
    borderRadius: 5,
  })

type CardProps = {
  text: string
  type: CardType
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

function Card(props: CardProps, ref: Ref<HTMLDivElement>): JSX.Element {
  const {text, type, className, ...rest} = props
  return (
    <div className={className} ref={ref} css={cardCss(type)} {...rest}>
      {text}
    </div>
  )
}

export default forwardRef(Card)
