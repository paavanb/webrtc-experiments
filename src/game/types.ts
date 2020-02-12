export enum Card {
  White = 0,
  Black = 1,
}

export type ServerMessage = {
  type: 'give-card'
  cards: number[]
}

export type ClientMessage = {
  type: 'get-card'
  cardType: Card
  number: number
}
