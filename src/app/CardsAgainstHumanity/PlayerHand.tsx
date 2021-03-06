import React, {useRef, useLayoutEffect, useCallback, useEffect, useState} from 'react'
import {css} from '@emotion/core'
import {useSpring, useSprings, animated, config} from 'react-spring'
import {useDrag} from 'react-use-gesture'

import clamp from '../../lib/clamp'
import fromEntries from '../../lib/fromEntries'

import Card from './Card'
import {CardType, WhiteCard} from './game/types'

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
  borderRadius: 5, // Must match border radius of card for shadows to appear correctly
})

interface PlayerHandProps {
  cards: WhiteCard[]
  onSelectCard: (card: WhiteCard) => void
  canSelectCard: boolean
}

export default function PlayerHand(props: PlayerHandProps): JSX.Element {
  const {cards, onSelectCard, canSelectCard} = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const containerWidth = useRef(CARD_WIDTH)
  const isDraggingCard = useRef(false)

  const totalCardsWidth = (cards.length - 1) * CARD_WIDTH
  const leftCardBound = Math.min(0, -(totalCardsWidth - containerWidth.current / 2 + CARD_WIDTH / 2)) // eslint-disable-line prettier/prettier
  const rightCardBound = containerWidth.current / 2 - CARD_WIDTH / 2

  // Map from card index to index in hand, initially 1-1
  const [cardIndexMap, setCardIndexMap] = useState<Record<number, number>>(() =>
    fromEntries(cards.map((_, i) => [i, i]))
  )

  const removeCard = useCallback(
    (cardIndex: number) => {
      // Update card index map to remove thrown card and move all the following cards up one position
      setCardIndexMap(
        fromEntries(
          cards
            .map((_, index) => {
              if (index < cardIndex) return [index, index]
              if (index === cardIndex) return [index, undefined]

              return [index, index - 1]
            })
            .filter((pair): pair is [number, number] => pair[1] !== undefined) // filter out the undefineds, need type guard
        )
      )
    },
    [cards, setCardIndexMap]
  )

  const getCardDistanceFromCenter = useCallback(
    (cardIndex: number, handX: number): number | null => {
      const handIndex = cardIndexMap[cardIndex]
      if (handIndex === undefined) return null

      const cardPos = handIndex * CARD_WIDTH + handX
      const distFromCenter = Math.abs(cardPos - (containerWidth.current / 2 - CARD_WIDTH / 2))
      return distFromCenter
    },
    [cardIndexMap]
  )

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
  }))

  const updateCurrentCardStyleSprings = useCallback(
    (cardIndex?: number) => {
      const handX = dragXProps.x.getValue()
      // Make cards appear "selected" depending on their distance from the center
      setCurrentCardStyleSprings(i => {
        if (cardIndex !== undefined && i !== cardIndex) return {}
        // Center of the card
        const distFromCenter = getCardDistanceFromCenter(i, handX)

        const THRESHOLD = CARD_WIDTH / 2
        if (distFromCenter === null || distFromCenter > THRESHOLD) {
          return {
            to: {
              scale: 1,
              y: 0,
              zIndex: 0,
              boxShadow: '0px 0px 0px 0px #000',
            },
          }
        }
        const proportion = 1 - distFromCenter / THRESHOLD

        return {
          to: {
            scale: 1 + 0.05 * proportion,
            y: -10 * proportion,
            zIndex: Math.round(10 * proportion),
            boxShadow: '0px 4px 5px 0px #999',
          },
        }
      })
    },
    [dragXProps.x, getCardDistanceFromCenter, setCurrentCardStyleSprings]
  )

  // Springs for individual cards, controlling their x position
  const [cardXSprings, setCardXSprings] = useSprings(cards.length, index => ({
    from: {
      x: index * CARD_WIDTH,
    },
  }))

  // Springs for individual cards, controlling their y position
  const [cardYSprings, setCardYSprings] = useSprings(cards.length, () => ({
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
    ({args: [cardIndex], movement: [, dy], velocity, direction: [, yDir], down}) => {
      setCardYSprings(i => {
        if (i !== cardIndex) return {}

        isDraggingCard.current = down
        const THRESHOLD = 10
        const distFromCenter = getCardDistanceFromCenter(i, dragXProps.x.getValue())

        // Only allow swiping a card if it is sufficiently close to being the selected card
        if (distFromCenter === null || distFromCenter > THRESHOLD) {
          return {}
        }

        if (isDraggingCard.current) {
          return {
            to: {
              // Drag selected card
              y: isDraggingCard.current ? dy : 0,
            },
            immediate: true,
          }
        }

        const THROW_THRESHOLD = 0.7
        const isCardThrown = canSelectCard && yDir === -1 && velocity > THROW_THRESHOLD
        if (isCardThrown) {
          removeCard(cardIndex)
          return {
            to: {
              y: -2000, // "Throw" through the top edge of the screen
            },
            immediate: false,
            // Select card for submission
            onRest: () => {
              onSelectCard(cards[cardIndex])
            },
          }
        }
        return {
          to: {
            y: 0,
          },
          immediate: false,
        }
      })
    },
    {
      bounds: {top: -300, bottom: 100},
      axis: 'y',
    }
  )

  const handDragEvents = useDrag(
    ({vxvy: [vx], delta: [dx], down, cancel}) => {
      // Disable hand dragging if the player is dragging a card
      if (isDraggingCard.current) {
        if (cancel) cancel()
        return
      }

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
    },
    {axis: 'x'}
  )

  // manageContainerWidth
  useLayoutEffect(() => {
    if (containerRef.current && containerRef.current.clientWidth !== containerWidth.current) {
      containerWidth.current = containerRef.current.clientWidth
    }
  })

  // manageCardIndexMap
  useEffect(() => {
    // If the set of cards changes, reset the map to be 1-1
    setCardIndexMap(fromEntries(cards.map((_, i) => [i, i])))
  }, [cards, setCardXSprings])

  // manageCurrentCardStyles
  useEffect(() => {
    setDragXSpring({
      onFrame: () => updateCurrentCardStyleSprings(),
    })
    setCardXSprings(i => ({
      onFrame: () => updateCurrentCardStyleSprings(i),
    }))
  }, [updateCurrentCardStyleSprings, setDragXSpring, setCardXSprings])

  // manageCardXPosition
  useEffect(() => {
    // Update the position of all the cards if the index map changed
    // NOTE: Technically, there is no guarantee that the following cards will slide into place
    // before `onSelectCard` is called and causes the set of cards to update. This could cause
    // an animation discontinuity as the new set of cards "pops" into place.
    setCardXSprings(i => {
      const handIndex = cardIndexMap[i]
      if (handIndex !== undefined) return {x: cardIndexMap[i] * CARD_WIDTH}
      return {}
    })
  }, [setCardXSprings, cardIndexMap])

  return (
    <div ref={containerRef} css={containerCss}>
      <animated.div {...handDragEvents()} style={{x: dragXProps.x}} css={handCss}>
        {cards.map((card, cardIndex) => (
          <animated.div
            key={card.id}
            {...cardDragEvents(cardIndex)}
            style={{x: cardXSprings[cardIndex].x, y: cardYSprings[cardIndex].y}}
            css={cardCss}
          >
            <animated.div style={{...currentCardStyleProps[cardIndex]}}>
              <Card text={card.text} type={CardType.White} />
            </animated.div>
          </animated.div>
        ))}
      </animated.div>
    </div>
  )
}
