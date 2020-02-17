export enum Card {
  White = 0,
  Black = 1,
}

export interface WhiteCard {
  text: string
}

export interface BlackCard {
  text: string
  pick: 1 | 2
}

export type ServerMessage =
  | {
      type: 'give-card'
      cards: number[]
    }
  | {
      // Announced to everyone
      type: 'annouce-czar'
      card: Card
      clientId: string
    }
  | {
      type: 'give-point'
    }
  | {
      type: 'reveal-card'
      card: Card
    }

export type ClientMessage =
  | {
      // Serf
      type: 'get-card'
      cardType: Card
      number: number
    }
  | {
      // Serf
      type: 'get-czar'
    }
  | {
      // Serf
      type: 'play-card'
      cards: Card[]
    }
  | {
      // Czar
      type: 'select-winner'
      card: Card[]
    }
