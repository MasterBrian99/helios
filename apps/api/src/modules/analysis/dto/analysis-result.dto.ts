import { MoveQuality } from '../../../database/schema/game-positions';
import { MistakeType, Severity } from '../../../database/schema/mistakes';

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

export class MistakeDto {
  mistakeId: string;
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
  hasBeenReviewed: boolean;
  createdAt: Date;
}

export class MistakePatternDto {
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
  userBlunders: number;
  userMistakes: number;
  userInaccuracies: number;
}

export class GameAnalysisResponseDto {
  analysis: AnalysisResultDto;
  positions: PositionDto[];
  mistakes: MistakeDto[];
}

export class QueueAnalysisResponseDto {
  message: string;
  gameId: string;
}
