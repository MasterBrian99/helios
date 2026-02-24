import { Generated, Insertable, Selectable, Updateable } from 'kysely';
import { CreatedAt } from './common/datetime';

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export type MistakeType =
  | 'tactical_blunder'
  | 'positional_error'
  | 'calculation_error'
  | 'defensive_error'
  | 'time_trouble_error'
  | 'opening_error'
  | 'endgame_error';

export type ExplanationSource = 'llm' | 'deterministic_fallback';
export type ExplanationValidationStatus =
  | 'passed'
  | 'failed_then_fallback'
  | 'llm_unavailable';

export type TacticalPattern =
  | 'forced_mate'
  | 'queen_mating_attack'
  | 'back_rank_mate'
  | 'smothered_mate'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered_attack'
  | 'defensive_collapse'
  | 'king_hunt'
  | 'material_blunder'
  | 'positional_error'
  | 'missed_mate'
  | 'hanging_piece'
  | 'tactical_sequence'
  | 'defensive_error'
  | 'calculation_error';

export interface TacticalFeaturesJson {
  isCheck: boolean;
  isCapture: boolean;
  kingExposed: boolean;
  backRankWeak: boolean;
  materialSwing: number;
  phase: string;
}

export interface MoveClassificationTable {
  classificationId: Generated<string>;
  userId: string;
  gameId: string;
  positionId: string | null;
  classification: MoveClassification;
  mistakeType: MistakeType | null;
  centipawnLoss: number | null;
  fen: string;
  movePlayed: string | null;
  bestMove: string | null;
  moveNumber: number | null;
  explanation: string | null;
  explanationSource: ExplanationSource | null;
  explanationValidationStatus: ExplanationValidationStatus | null;
  explanationValidationReason: string | null;
  analysisVersion: string | null;
  hasBeenReviewed: Generated<boolean>;
  createdAt: CreatedAt;
  tacticalPattern: TacticalPattern | null;
  mateIn: number | null;
  sequenceStart: number | null;
  sequenceEnd: number | null;
  difficulty: number | null;
  tacticalFeatures: TacticalFeaturesJson | null;
}

export type MoveClassificationRecord = Selectable<MoveClassificationTable>;
export type MoveClassificationCreate = Insertable<MoveClassificationTable>;
export type MoveClassificationUpdate = Updateable<MoveClassificationTable>;
