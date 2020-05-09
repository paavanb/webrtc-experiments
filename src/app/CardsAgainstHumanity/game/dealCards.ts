import shuffle from '../../../lib/shuffle'
import {WHITE_CARDS} from '../data/white-cards-2.1'

import {Player, WhiteCard} from './types'

/**
 * Deal white cards from a deck to a player, automatically reshuffling if necessary.
 */
export default function dealCards(
  deck: WhiteCard[],
  player: Player,
  numToGive: number
): [WhiteCard[], Player] {
  if (numToGive > deck.length) {
    const initialDealtCards = deck.map(card => card.id)
    const [newDeck, newPlayer] = dealCards(shuffle(WHITE_CARDS), player, numToGive - deck.length)

    return [
      newDeck,
      {
        ...newPlayer,
        hand: [...newPlayer.hand, ...initialDealtCards],
      },
    ]
  }

  const dealtCards = deck.slice(0, numToGive).map(card => card.id)
  const newDeck = deck.slice(numToGive)
  return [
    newDeck,
    {
      ...player,
      hand: [...player.hand, ...dealtCards],
    },
  ]
}
