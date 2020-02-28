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

interface ServerMessageMap {
  /*
   * The server is granting white cards to the player in response to `get-card`.
   * Sent only to a single player.
   */
  'yield-card': {
    cards: WhiteCard[]
  }
  /*
   * The server is announcing which player is the new Card Czar, including the black card
   * representing the round. Sent to all players.
   */
  'new-czar': {
    card: BlackCard
    clientId: ClientId
  }
  /*
   * The server is granting a single "Awesome Point" to the serf.
   */
  point: {}
  /*
   * The server is notifying the Czar of a serf's submission.
   */
  'card-submission': {
    card: WhiteCard[]
  }
}

type ServerMessageTypes = keyof ServerMessageMap

export type ServerMessage<T extends ServerMessageTypes = ServerMessageTypes> = {
  type: T
} & ServerMessageMap[T]

/*
 * A message sent by the current Card Czar. This is the player who is judging the round.
 */
interface CzarMessageMap {
  /*
   * The player has chosen the winner's cards.
   */
  'select-winner': {card: WhiteCard[]}
}

export type CzarMessage<T extends keyof CzarMessageMap = keyof CzarMessageMap> = {
  type: T
} & CzarMessageMap[T]

/*
 * Messages sent by players that are "serfs", i.e., not-czars. These are the players
 * which are competing against each other to win the round.
 */
interface SerfMessageMap {
  /*
   * The player wishes to draw a `number` of white cards.
   */
  'req-card': {number: number}
  /*
   * The player wishes to become the Card Czar.
   */
  'req-czar': {}
  /*
   * The player wishes to play white cards in the current round.
   */
  'play-card': {cards: WhiteCard[]}
}

export type SerfMessage<T extends keyof SerfMessageMap> = {
  type: T
} & SerfMessageMap[T]

type ClientMessageMap = CzarMessageMap & SerfMessageMap

type ClientMessageTypes = keyof ClientMessageMap

export type ClientMessage<T extends ClientMessageTypes = ClientMessageTypes> = {
  type: T
} & ClientMessageMap[T]

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
  // Represents the side-effects to run after a render cycle, e.g., for sending cards to a client.
  sideEffects: (() => void)[]
}
