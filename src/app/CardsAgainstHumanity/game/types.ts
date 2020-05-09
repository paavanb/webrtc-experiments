import {Dictionary, DistributiveOmit} from '../../../lib/types'

/**
 * Due to limitations related to serializing to and from the wire, values sent as null
 * are dropped, making them indistinguishable from missing properties. The following
 * type must be used to represent `null` in any type intended to be transmitted over
 * the network.
 */
type Empty = null | undefined

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
export type ClientId = string

export type CardId = number

type _ServerMessage =
  /**
   * The server is announcing the current round state. Sent to all players.
   */
  | ({
      type: 'round'
    } & Round)
  /**
   * The server is notifying the player of an update to their state.
   */
  | ({
      type: 'player'
    } & Player)

type ServerMessageTypes = _ServerMessage['type']

export type ServerMessage<T extends ServerMessageTypes = ServerMessageTypes> = Extract<
  _ServerMessage,
  {type: T}
>

export type ServerMessagePayload<T extends ServerMessageTypes> = DistributiveOmit<
  ServerMessage<T>,
  'type'
>

/*
 * A message sent by the current Card Czar. This is the player who is judging the round.
 */
type CzarMessage = {
  /*
   * The player has chosen the winner's cards.
   */
  type: 'select-winner'
  winner: ClientId
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
      cards: CardId[]
    }

type _ClientMessage = CzarMessage | SerfMessage

type ClientMessageTypes = _ClientMessage['type']

export type ClientMessage<T extends ClientMessageTypes = ClientMessageTypes> = Extract<
  _ClientMessage,
  {type: T}
>

export type ClientMessagePayload<T extends ClientMessageTypes> = DistributiveOmit<
  ClientMessage<T>,
  'type'
>

export type CompleteRound = {
  czar: ClientId
  blackCard: CardId
  submissions: Dictionary<ClientId, CardId[]>
  winner: ClientId
}

export type Round =
  /**
   * Represents the period of time during which no round is being played and no player has volunteered as czar.
   */
  | {
      czar: Empty
    }
  | {
      czar: ClientId
      blackCard: CardId
      submissions: Dictionary<ClientId, CardId[]>
      winner: Empty
    }
  | CompleteRound

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
