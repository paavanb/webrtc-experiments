import React, {useRef, useLayoutEffect, useCallback} from 'react'
import {css} from '@emotion/core'
import {useSpring, useSprings, animated, config} from 'react-spring'
import {useDrag} from 'react-use-gesture'

import {CardType, WhiteCard} from '../../game/types'
import Card from '../../components/Card'
import clamp from '../../lib/clamp'

const CARD_BUFFER = 4
const CARD_WIDTH = 200 + 2 * CARD_BUFFER
const CARD_VELOCITY_SNAP_THRESHOLD = 1
const FPS = 60

const containerCss = css({
  position: 'relative',
  width: '100%',
  height: 300,
  overflowX: 'visible',
  touchAction: 'none', // Prevent touch-and-drag from dragging the entire page
})

const handCss = css({
  position: 'absolute',
})

const cardCss = css({
  position: 'absolute',
  margin: `0 ${CARD_BUFFER}px`,
  willChange: 'transform',
})

interface PlayerHandProps {
  cards: WhiteCard[]
}

export default function PlayerHand(props: PlayerHandProps): JSX.Element {
  const {cards} = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const containerWidth = useRef(CARD_WIDTH)

  const totalCardsWidth = (cards.length - 1) * CARD_WIDTH
  const leftCardBound = Math.min(0, -(totalCardsWidth - containerWidth.current / 2 + CARD_WIDTH / 2)) // eslint-disable-line prettier/prettier
  const rightCardBound = containerWidth.current / 2 - CARD_WIDTH / 2

  // Springs to indicate the current card, i.e., appearing raised slightly
  const [currentCardStyleProps, setCurrentCardStyleSprings] = useSprings(cards.length, () => ({
    to: {
      scale: 1,
      y: 0,
      zIndex: 0,
      boxShadow: '0px 0px 0px 0px #000',
    },
  }))
  const [dragXProps, setDragXSpring] = useSpring(() => ({
    to: {
      x: rightCardBound,
    },
    onFrame: dragProps => {
      const {x} = dragProps as {x: number}
      // Make cards appear "selected" depending on their distance from the center
      setCurrentCardStyleSprings(i => {
        // Center of the card
        const cardPos = i * CARD_WIDTH + x
        const distFromCenter = Math.abs(cardPos - (containerWidth.current / 2 - CARD_WIDTH / 2))
        if (distFromCenter > CARD_WIDTH) {
          return {
            to: {
              scale: 1,
              y: 0,
              zIndex: 0,
              boxShadow: '0px 0px 0px 0px #000',
            },
          }
        }
        const proportion = 1 - distFromCenter / CARD_WIDTH

        return {
          to: {
            scale: 1 + 0.05 * proportion,
            y: -15 * proportion,
            zIndex: Math.round(10 * proportion),
            boxShadow: '0px 20px 5px 0px #999',
          },
        }
      })
    },
  }))

  const [cardSprings, setCardSprings] = useSprings(cards.length, () => ({
    from: {
      y: 0,
    },
  }))

  // Calculcate the closest "snap position" to a target position
  const getSnapPos = useCallback(
    (target: number) => {
      const normalizedPos = target - leftCardBound
      const normalizedSnapPos = Math.round(normalizedPos / CARD_WIDTH) * CARD_WIDTH
      const snapPos = normalizedSnapPos + leftCardBound
      return snapPos
    },
    [leftCardBound]
  )

  const cardDragEvents = useDrag(
    ({args: [cardIndex], movement: [, dy], down}) => {
      setCardSprings(i => {
        const isDraggingCard = down && i === cardIndex
        return {
          to: {
            // Drag selected card
            y: isDraggingCard ? dy : 0,
          },
          immediate: isDraggingCard,
        }
      })
    },
    {
      bounds: {top: -100, bottom: 100},
    }
  )

  const handDragEvents = useDrag(({vxvy: [vx], delta: [dx], down}) => {
    const isDragging = down
    const pos = dragXProps.x.getValue()
    if (isDragging) {
      setDragXSpring({
        to: {
          x: dragXProps.x.getValue() + dx,
        },
        config: {
          velocity: 0,
        },
        immediate: true,
      })
    } else if (Math.abs(vx) < CARD_VELOCITY_SNAP_THRESHOLD) {
      setDragXSpring({
        to: {
          x: clamp(leftCardBound, rightCardBound, getSnapPos(pos)),
        },
        immediate: false,
        config: {
          velocity: vx * FPS,
          ...config.default,
        },
      })
    } else {
      // User has stopped dragging, determine a target position mimicking inertia
      // and then snap to the closest card position.
      // Calculate target displacement using exponential decay function
      const lambda = 0.3
      // react-spring uses px/s, while useDrag uses px/frame @60fps
      const velocity = Math.sign(vx) * Math.max(Math.abs(vx) * FPS, 10) // Set lower bound to prevent singularity and provide "snapping" feel when the user lets go at low velocities
      // Exponential decay technically takes infinite time. The only way to solve for time
      // is to bound it by a final velocity > 0
      // Base eqs:
      // vf = vi * e^(-lambda * t)
      // t = -1 / lambda * ln (vf / vi)
      const targetVelocity = 1 * Math.sign(velocity)
      const displacement = velocity / lambda
      const target = pos + displacement
      const duration = -Math.log(targetVelocity / velocity) / lambda
      // Exponential decay function found by solving for t and normalizing to f: [0, 1] => [0, 1]
      // TODO Unsure why I have to multiply by 10, but it makes the initial velocity match up properly
      const easing = (t: number): number =>
        (-velocity / (lambda * displacement)) * (Math.exp(-lambda * (t * 10) * duration) - 1)

      setDragXSpring({
        to: {
          x: clamp(leftCardBound, rightCardBound, getSnapPos(target)),
        },
        immediate: false,
        config: {
          velocity,
          // Convert to ms
          duration: duration * 1000,
          easing,
        },
      })
    }
  })

  // manageContainerWidth
  useLayoutEffect(() => {
    if (containerRef.current && containerRef.current.clientWidth !== containerWidth.current) {
      containerWidth.current = containerRef.current.clientWidth
    }
  })

  return (
    <div ref={containerRef} css={containerCss}>
      <animated.div {...handDragEvents()} style={{x: dragXProps.x}} css={handCss}>
        {cards.map((card, cardIndex) => (
          <animated.div
            key={card.id}
            style={{
              x: cardIndex * CARD_WIDTH,
              y: cardSprings[cardIndex].y,
              ...currentCardStyleProps[cardIndex],
            }}
            css={cardCss}
          >
            <Card text={card.text} type={CardType.White} />
          </animated.div>
        ))}
      </animated.div>
    </div>
  )
}
