import {Dictionary} from '../lib/types'

export enum CardType {
  White = 0,
  Black = 1,
}

export interface WhiteCard {
  id: number
  text: string
}

export interface BlackCard {
  id: number
  text: string
  pick: 1 | 2
}

// Value uniquely identifying a client
type ClientId = string

export type CardId = number

interface ServerMessageMap {
  /**
   * The server is announcing the current round state. Sent to all players.
   */
  round: Round
  /**
   * The server is notifying the player of an update to their state.
   */
  player: Player
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
  'play-card': {cards: CardId[]}
}

export type CzarMessage<T extends keyof CzarMessageMap = keyof CzarMessageMap> = {
  type: T
} & CzarMessageMap[T]

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
      submissions: Record<ClientId, CardId[]>
      winner: ClientId | null
    }

export interface Player {
  // The white cards in the player's hand
  hand: CardId[]
}

/**
 * Represents the current state of the game.
 */
export interface GameState {
  round: Round
  players: Dictionary<ClientId, Player>
  whiteDeck: WhiteCard[]
  blackDeck: BlackCard[]
  // Represents the side-effects to run after a render cycle, e.g., for sending cards to a client.
  sideEffects: (() => void)[]
}
