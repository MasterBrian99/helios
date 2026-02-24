import { MoveQuality } from '../../../database/schema/game-positions';
import {
  ExplanationSource,
  ExplanationValidationStatus,
  MistakeType,
  MoveClassification,
} from '../../../database/schema/move-classifications';

export class PositionDto {
  positionId: string;
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
  createdAt: Date;
}

export class MoveClassificationDto {
  classificationId: string;
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
  explanationSource?: ExplanationSource | null;
  explanationValidationStatus?: ExplanationValidationStatus | null;
  explanationValidationReason?: string | null;
  analysisVersion?: string | null;
  hasBeenReviewed: boolean;
  createdAt: Date;
}

export class ClassificationPatternDto {
  patternId: string;
  mistakeType: MistakeType;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  priorityScore: number | null;
}

export class AnalysisResultDto {
  gameId: string;
  analyzed: boolean;
  analysisCompletedAt: Date | null;
  totalMoves: number | null;
  userAccuracy: number | null;
  opponentAccuracy: number | null;
  userAvgCentipawnLoss: number | null;
  userBrilliants: number;
  userGreats: number;
  userBookMoves: number;
  userBlunders: number;
  userMistakes: number;
  userInaccuracies: number;
}

export class GameAnalysisResponseDto {
  analysis: AnalysisResultDto;
  positions: PositionDto[];
  classifications: MoveClassificationDto[];
}

export class QueueAnalysisResponseDto {
  message: string;
  gameId: string;
}
