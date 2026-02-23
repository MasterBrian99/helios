import { Generated, Insertable, Selectable, Updateable } from 'kysely';
import { CreatedAt } from './common/datetime';

export type MistakeType =
  | 'tactical_blunder'
  | 'positional_error'
  | 'calculation_error'
  | 'defensive_error'
  | 'time_trouble_error'
  | 'opening_error'
  | 'endgame_error';

export type Severity = 'inaccuracy' | 'mistake' | 'blunder';

export interface MistakeTable {
  mistakeId: Generated<string>;
  userId: string;
  gameId: string;
  positionId: string | null;
  mistakeType: MistakeType;
  severity: Severity;
  centipawnLoss: number | null;
  fen: string;
  movePlayed: string | null;
  bestMove: string | null;
  moveNumber: number | null;
  explanation: string | null;
  hasBeenReviewed: Generated<boolean>;
  createdAt: CreatedAt;
}

export type Mistake = Selectable<MistakeTable>;
export type MistakeCreate = Insertable<MistakeTable>;
export type MistakeUpdate = Updateable<MistakeTable>;
