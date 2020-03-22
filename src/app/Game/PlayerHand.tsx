import React, {useRef, useState, useLayoutEffect, useMemo} from 'react'
import {css} from '@emotion/core'
import {useSprings, animated, config} from 'react-spring'
import {useDrag} from 'react-use-gesture'

import {CardType, WhiteCard} from '../../game/types'
import Card from '../../components/Card'

const containerCss = css({
  position: 'relative',
  width: '100%',
  height: 150,
  overflow: 'hidden',
})

const cardCss = css({
  position: 'absolute',
})

const CARD_WIDTH = 100

interface PlayerHandProps {
  cards: WhiteCard[]
}

export default function PlayerHand(props: PlayerHandProps): JSX.Element {
  const {cards} = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(CARD_WIDTH)
  const leftCardBound = useMemo(() => {
    const totalCardsWidth = cards.length * CARD_WIDTH
    return Math.min(0, -(totalCardsWidth - containerWidth))
  }, [cards.length, containerWidth])

  const [springs, set] = useSprings(cards.length, idx => ({
    opacity: 1,
    x: CARD_WIDTH * idx,
    config: config.default,
  }))
  const bind = useDrag(
    ({down, offset: [dx]}) => {
      set(i => ({
        x: down ? dx + i * CARD_WIDTH : dx + i * CARD_WIDTH,
      }))
    },
    {
      bounds: {left: leftCardBound, right: 0},
      rubberband: 0.15,
    }
  )

  // manageContainerWidth
  useLayoutEffect(() => {
    if (containerRef.current && containerRef.current.clientWidth !== containerWidth) {
      setContainerWidth(containerRef.current.clientWidth)
    }
  }, [containerWidth])

  return (
    <div {...bind()} ref={containerRef} css={containerCss}>
      {springs.map((style, idx) => (
        <animated.div css={cardCss} style={style}>
          <Card text={cards[idx].text} type={CardType.White} />
        </animated.div>
      ))}
    </div>
  )
}
