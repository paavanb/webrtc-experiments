export enum Card {
  White = 0,
  Black = 1,
}

// Split into ServerMessage and ClientMessage?
export type GameMessage =
  | {
      type: 'get-card'
      cardType: Card
      number: number
    }
  | {
      type: 'give-card'
      cards: number[]
    }
