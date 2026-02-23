import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from '../../database/schema/db';
import {
  GamePosition,
  GamePositionCreate,
} from '../../database/schema/game-positions';
import {
  Mistake,
  MistakeCreate,
  MistakeType,
  Severity,
} from '../../database/schema/mistakes';
import {
  MistakePattern,
  MistakePatternCreate,
} from '../../database/schema/mistake-patterns';
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

  async createMistake(
    userId: string,
    gameId: string,
    positionId: string | null,
    fen: string,
    movePlayed: string,
    bestMove: string | null,
    moveNumber: number,
    centipawnLoss: number,
    severity: Severity,
    mistakeType: MistakeType,
    explanation?: string,
  ): Promise<Mistake> {
    const mistake: MistakeCreate = {
      mistakeId: getUUID(),
      userId,
      gameId,
      positionId,
      mistakeType,
      severity,
      centipawnLoss,
      fen,
      movePlayed,
      bestMove,
      moveNumber,
      explanation: explanation ?? null,
    };

    const result = await this.db
      .insertInto('mistakes')
      .values(mistake)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async updateMistakeExplanation(
    mistakeId: string,
    explanation: string,
    mistakeType: MistakeType,
  ): Promise<void> {
    await this.db
      .updateTable('mistakes')
      .set({ explanation, mistakeType })
      .where('mistakeId', '=', mistakeId)
      .execute();
  }

  async upsertMistakePattern(
    userId: string,
    mistakeType: MistakeType,
  ): Promise<MistakePattern> {
    const existing = await this.db
      .selectFrom('mistakePatterns')
      .selectAll()
      .where('userId', '=', userId)
      .where('mistakeType', '=', mistakeType)
      .executeTakeFirst();

    if (existing) {
      const now = new Date().toISOString();
      const updated = await this.db
        .updateTable('mistakePatterns')
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

    const pattern: MistakePatternCreate = {
      patternId: getUUID(),
      userId,
      mistakeType,
      occurrenceCount: 1,
      priorityScore: null,
    };

    const result = await this.db
      .insertInto('mistakePatterns')
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

  async getMistakesByGame(gameId: string): Promise<Mistake[]> {
    return this.db
      .selectFrom('mistakes')
      .selectAll()
      .where('gameId', '=', gameId)
      .orderBy('moveNumber', 'asc')
      .execute();
  }

  async getMistakesByUser(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Mistake[]> {
    return this.db
      .selectFrom('mistakes')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();
  }

  async getMistakePatterns(userId: string): Promise<MistakePattern[]> {
    return this.db
      .selectFrom('mistakePatterns')
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

  async deleteMistakesByGame(gameId: string): Promise<void> {
    await this.db.deleteFrom('mistakes').where('gameId', '=', gameId).execute();
  }

  async getMistakeById(mistakeId: string): Promise<Mistake | undefined> {
    return this.db
      .selectFrom('mistakes')
      .selectAll()
      .where('mistakeId', '=', mistakeId)
      .executeTakeFirst();
  }

  async markMistakeReviewed(mistakeId: string): Promise<void> {
    await this.db
      .updateTable('mistakes')
      .set({ hasBeenReviewed: true })
      .where('mistakeId', '=', mistakeId)
      .execute();
  }
}
