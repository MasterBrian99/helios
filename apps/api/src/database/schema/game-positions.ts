import { Generated, Insertable, Selectable, Updateable } from 'kysely';
import { CreatedAt } from './common/datetime';

export type MoveQuality = 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface GamePositionTable {
  positionId: Generated<string>;
  gameId: string;
  moveNumber: number;
  fen: string;
  movePlayed: string | null;
  isUserMove: boolean | null;
  evalBefore: number | null;
  evalAfter: number | null;
  centipawnLoss: number | null;
  bestMove: string | null;
  bestMoveEval: number | null;
  moveQuality: MoveQuality | null;
  createdAt: CreatedAt;
}

export type GamePosition = Selectable<GamePositionTable>;
export type GamePositionCreate = Insertable<GamePositionTable>;
export type GamePositionUpdate = Updateable<GamePositionTable>;
