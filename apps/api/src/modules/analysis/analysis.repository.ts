import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from '../../database/schema/db';
import {
  GamePosition,
  GamePositionCreate,
} from '../../database/schema/game-positions';
import {
  ExplanationSource,
  ExplanationValidationStatus,
  MoveClassificationRecord,
  MoveClassificationCreate,
  MistakeType,
  TacticalPattern,
  TacticalFeaturesJson,
  MoveClassification,
} from '../../database/schema/move-classifications';
import {
  ClassificationPattern,
  ClassificationPatternCreate,
} from '../../database/schema/classification-patterns';
import { getUUID } from '../../utils/uuid-gen';
import { MoveAnalysis } from './move-evaluator.service';

@Injectable()
export class AnalysisRepository {
  constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

  async createPosition(
    gameId: string,
    analysis: MoveAnalysis,
  ): Promise<GamePosition> {
    const position: GamePositionCreate = {
      positionId: getUUID(),
      gameId,
      moveNumber: analysis.moveNumber,
      fen: analysis.fen,
      movePlayed: analysis.movePlayed,
      isUserMove: analysis.isUserMove,
      evalBefore: analysis.evalBefore,
      evalAfter: analysis.evalAfter,
      centipawnLoss: analysis.centipawnLoss,
      bestMove: analysis.bestMove,
      bestMoveEval: analysis.bestMoveEval,
      moveQuality: analysis.moveQuality,
    };

    const result = await this.db
      .insertInto('gamePositions')
      .values(position)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async createClassification(
    userId: string,
    gameId: string,
    positionId: string | null,
    fen: string,
    movePlayed: string,
    bestMove: string | null,
    moveNumber: number,
    centipawnLoss: number,
    classification: MoveClassification,
    mistakeType: MistakeType | null,
    explanation?: string,
    tacticalPattern?: TacticalPattern | null,
    mateIn?: number | null,
    sequenceStart?: number | null,
    sequenceEnd?: number | null,
    difficulty?: number | null,
    tacticalFeatures?: TacticalFeaturesJson | null,
    explanationSource?: ExplanationSource | null,
    explanationValidationStatus?: ExplanationValidationStatus | null,
    explanationValidationReason?: string | null,
    analysisVersion?: string | null,
  ): Promise<MoveClassificationRecord> {
    const record: MoveClassificationCreate = {
      classificationId: getUUID(),
      userId,
      gameId,
      positionId,
      classification,
      mistakeType,
      centipawnLoss,
      fen,
      movePlayed,
      bestMove,
      moveNumber,
      explanation: explanation ?? null,
      explanationSource: explanationSource ?? null,
      explanationValidationStatus: explanationValidationStatus ?? null,
      explanationValidationReason: explanationValidationReason ?? null,
      analysisVersion: analysisVersion ?? null,
      tacticalPattern: tacticalPattern ?? null,
      mateIn: mateIn ?? null,
      sequenceStart: sequenceStart ?? null,
      sequenceEnd: sequenceEnd ?? null,
      difficulty: difficulty ?? null,
      tacticalFeatures: tacticalFeatures ?? null,
    };

    const result = await this.db
      .insertInto('moveClassifications')
      .values(record)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async upsertClassificationPattern(
    userId: string,
    mistakeType: MistakeType,
  ): Promise<ClassificationPattern> {
    const existing = await this.db
      .selectFrom('classificationPatterns')
      .selectAll()
      .where('userId', '=', userId)
      .where('mistakeType', '=', mistakeType)
      .executeTakeFirst();

    if (existing) {
      const now = new Date().toISOString();
      const updated = await this.db
        .updateTable('classificationPatterns')
        .set({
          occurrenceCount: existing.occurrenceCount + 1,
          lastOccurrence: now,
          updatedAt: now,
        })
        .where('patternId', '=', existing.patternId)
        .returningAll()
        .executeTakeFirstOrThrow();

      return updated;
    }

    const pattern: ClassificationPatternCreate = {
      patternId: getUUID(),
      userId,
      mistakeType,
      occurrenceCount: 1,
      priorityScore: null,
    };

    const result = await this.db
      .insertInto('classificationPatterns')
      .values(pattern)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async getPositionsByGame(gameId: string): Promise<GamePosition[]> {
    return this.db
      .selectFrom('gamePositions')
      .selectAll()
      .where('gameId', '=', gameId)
      .orderBy('moveNumber', 'asc')
      .execute();
  }

  async getClassificationsByGame(
    gameId: string,
  ): Promise<MoveClassificationRecord[]> {
    return this.db
      .selectFrom('moveClassifications')
      .selectAll()
      .where('gameId', '=', gameId)
      .orderBy('moveNumber', 'asc')
      .execute();
  }

  async getClassificationsByUser(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<MoveClassificationRecord[]> {
    return this.db
      .selectFrom('moveClassifications')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();
  }

  async getClassificationPatterns(
    userId: string,
  ): Promise<ClassificationPattern[]> {
    return this.db
      .selectFrom('classificationPatterns')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('occurrenceCount', 'desc')
      .execute();
  }

  async deletePositionsByGame(gameId: string): Promise<void> {
    await this.db
      .deleteFrom('gamePositions')
      .where('gameId', '=', gameId)
      .execute();
  }

  async deleteClassificationsByGame(gameId: string): Promise<void> {
    await this.db
      .deleteFrom('moveClassifications')
      .where('gameId', '=', gameId)
      .execute();
  }
}
