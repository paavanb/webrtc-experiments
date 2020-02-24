export enum CardType {
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

// Value uniquely identifying a client
type ClientId = string

export type ServerMessage =
  /*
   * The server is granting white cards to the player in response to `get-card`.
   * Sent only to a single player.
   */
  | {
      type: 'yield-card'
      cards: WhiteCard[]
    }
  /*
   * The server is announcing which player is the new Card Czar, including the black card
   * representing the round. Sent to all players.
   */
  | {
      type: 'new-czar'
      card: BlackCard
      clientId: ClientId
    }
  /*
   * The server is granting a single "Awesome Point" to the serf.
   */
  | {
      type: 'point'
    }
  /*
   * The server is notifying the Czar of a serf's submission.
   */
  | {
      type: 'card-submission'
      card: WhiteCard[]
    }

/*
 * A message sent by the current Card Czar. This is the player who is judging the round.
 */
type CzarMessage =
  /*
   * The player has chosen the winner's cards.
   */
  {
    type: 'select-winner'
    card: WhiteCard[]
  }

/*
 * Messages sent by players that are "serfs", i.e., not-czars. These are the players
 * which are competing against each other to win the round.
 */
type SerfMessage =
  /*
   * The player wishes to draw a `number` of white cards.
   */
  | {
      type: 'req-card'
      number: number
    }
  /*
   * The player wishes to become the Card Czar.
   */
  | {
      type: 'req-czar'
    }
  /*
   * The player wishes to play white cards in the current round.
   */
  | {
      type: 'play-card'
      cards: WhiteCard[]
    }

export type ClientMessage = SerfMessage | CzarMessage

export type Round =
  /**
   * Represents the period of time during which no round is being played and no player has volunteered as czar.
   */
  | {
      czar: null
    }
  | {
      czar: ClientId
      blackCard: BlackCard
      submissions: Record<ClientId, WhiteCard[]>
      winner: ClientId | null
    }

/**
 * Represents the current state of the game.
 */
export interface GameState {
  round: Round
  whiteDeck: WhiteCard[]
  blackDeck: BlackCard[]
}
