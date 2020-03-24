import React, {useRef, useState, useLayoutEffect, useMemo} from 'react'
import {css} from '@emotion/core'
import {motion} from 'framer-motion'

import {CardType, WhiteCard} from '../../game/types'
import Card from '../../components/Card'

const containerCss = css({
  position: 'relative',
  width: '100%',
  height: 150,
  overflow: 'hidden',
})

const handCss = css({
  position: 'absolute',
  display: 'flex',
})

const cardCss = css({
  willChange: 'transform',
})

const CARD_WIDTH = 100

interface PlayerHandProps {
  cards: WhiteCard[]
}

export default function PlayerHand(props: PlayerHandProps): JSX.Element {
  const {cards} = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(CARD_WIDTH)
  const bufferWidth = CARD_WIDTH * 0.5
  const leftCardBound = useMemo(() => {
    const totalCardsWidth = cards.length * CARD_WIDTH
    return Math.min(0, -((totalCardsWidth + bufferWidth) - containerWidth)) // eslint-disable-line prettier/prettier
  }, [bufferWidth, cards.length, containerWidth])
  const rightCardBound = bufferWidth

  // TODO: Manage dragging of a single card (vertically)

  // manageContainerWidth
  useLayoutEffect(() => {
    if (containerRef.current && containerRef.current.clientWidth !== containerWidth) {
      setContainerWidth(containerRef.current.clientWidth)
    }
  }, [containerWidth])

  return (
    <div ref={containerRef} css={containerCss}>
      <motion.div
        drag="x"
        dragConstraints={{left: leftCardBound, right: rightCardBound}}
        css={handCss}
      >
        {cards.map(card => (
          <div css={cardCss}>
            <Card text={card.text} type={CardType.White} />
          </div>
        ))}
      </motion.div>
    </div>
  )
}
