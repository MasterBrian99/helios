import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from '../../database/schema/db';
import { Game } from '../../database/schema/games';
import {
  Severity,
  TacticalFeaturesJson,
  TacticalPattern,
} from '../../database/schema/mistakes';
import { MoveEvaluatorService, MoveAnalysis } from './move-evaluator.service';
import { LlmExplainerService } from './llm-explainer.service';
import { AnalysisRepository } from './analysis.repository';
import { ChessEngineService } from '../../chess-engines';
import {
  TacticalFeatureService,
  TacticalFeatures,
} from './tactical-feature.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly moveEvaluatorService: MoveEvaluatorService,
    private readonly llmExplainerService: LlmExplainerService,
    private readonly analysisRepository: AnalysisRepository,
    private readonly chessEngineService: ChessEngineService,
    private readonly tacticalFeatureService: TacticalFeatureService,
  ) {}

  async queueGameAnalysis(
    gameId: string,
    userId: string,
  ): Promise<{ message: string; gameId: string }> {
    const game = await this.getGame(gameId, userId);

    if (game.analyzed) {
      return {
        message: 'Game has already been analyzed',
        gameId,
      };
    }

    return {
      message: 'Game analysis queued',
      gameId,
    };
  }

  async analyzeGame(gameId: string, userId: string): Promise<void> {
    this.logger.log(`Starting analysis for game ${gameId}`);

    const game = await this.getGame(gameId, userId);

    if (game.analyzed) {
      this.logger.log(`Game ${gameId} already analyzed, skipping`);
      return;
    }

    try {
      await this.deleteExistingAnalysis(gameId);

      const result = await this.moveEvaluatorService.analyzeGame(
        game.pgn,
        game.userColor as 'white' | 'black' | null,
      );

      const _userColor = game.userColor as 'white' | 'black' | null;

      for (const analysis of result.positions) {
        await this.analysisRepository.createPosition(gameId, analysis);
      }

      const userMistakes = result.positions.filter(
        (p) =>
          p.isUserMove &&
          (p.moveQuality === 'blunder' || p.moveQuality === 'mistake') &&
          p.mateAfter !== 0 &&
          p.mateBefore !== 0,
      );

      this.logger.log(`Found ${userMistakes.length} user mistakes`);

      for (const mistake of userMistakes) {
        const features = this.tacticalFeatureService.extractFeatures(
          mistake.fen,
          mistake.fen,
          mistake.movePlayed ?? '',
          mistake.moveNumber,
        );

        const pattern = this.detectPattern(mistake, features);
        const severity = this.getSeverity(mistake.moveQuality);

        const tacticalFeaturesJson: TacticalFeaturesJson = {
          isCheck: mistake.isCheck,
          isCapture: mistake.isCapture,
          kingExposed: features.kingExposed,
          backRankWeak: features.isBackRankExposed,
          materialSwing: features.materialSwing,
          phase: mistake.phase,
        };

        const mateIn = this.getMateDistance(mistake);
        const difficulty = this.calculateDifficulty(mistake, features);

        const explanation = await this.llmExplainerService.explainMistake(
          mistake.fen,
          mistake.movePlayed ?? '',
          mistake.bestMove ?? '',
          mistake.centipawnLoss ?? 0,
          severity,
        );

        await this.analysisRepository.createMistake(
          userId,
          gameId,
          null,
          mistake.fen,
          mistake.movePlayed ?? '',
          mistake.bestMove,
          mistake.moveNumber,
          mistake.centipawnLoss ?? 0,
          severity,
          explanation.mistakeType,
          explanation.explanation,
          pattern,
          mateIn,
          mistake.moveNumber,
          mistake.moveNumber,
          difficulty,
          tacticalFeaturesJson,
        );

        await this.analysisRepository.upsertMistakePattern(
          userId,
          explanation.mistakeType,
        );
      }

      await this.updateGameStats(gameId, result);

      this.logger.log(`Completed analysis for game ${gameId}`);
    } catch (error) {
      this.logger.error(`Error analyzing game ${gameId}: ${error}`);
      throw error;
    }
  }

  async getAnalysisResults(gameId: string, userId: string) {
    const game = await this.getGame(gameId, userId);

    const positions = await this.analysisRepository.getPositionsByGame(gameId);
    const mistakes = await this.analysisRepository.getMistakesByGame(gameId);

    return {
      analysis: {
        gameId: game.id,
        analyzed: game.analyzed,
        analysisCompletedAt: game.analysisCompletedAt,
        totalMoves: game.totalMoves,
        userAccuracy: game.userAccuracy,
        opponentAccuracy: game.opponentAccuracy,
        userAvgCentipawnLoss: game.userAvgCentipawnLoss,
        userBlunders: game.userBlunders,
        userMistakes: game.userMistakes,
        userInaccuracies: game.userInaccuracies,
      },
      positions,
      mistakes,
    };
  }

  async getMistakesByGame(gameId: string, userId: string) {
    await this.getGame(gameId, userId);
    return this.analysisRepository.getMistakesByGame(gameId);
  }

  async getUserMistakePatterns(userId: string) {
    return this.analysisRepository.getMistakePatterns(userId);
  }

  async getUserMistakes(userId: string, limit = 50, offset = 0) {
    return this.analysisRepository.getMistakesByUser(userId, limit, offset);
  }

  private detectPattern(
    mistake: MoveAnalysis,
    features: TacticalFeatures,
  ): TacticalPattern {
    if (
      mistake.mateBefore !== null &&
      mistake.mateBefore > 0 &&
      mistake.mateAfter !== null
    ) {
      if (mistake.mateAfter <= 0) {
        return 'missed_mate';
      }
      if (mistake.mateAfter > mistake.mateBefore) {
        return 'missed_mate';
      }
    }

    if (mistake.isCheck && features.isBackRankExposed) {
      return 'back_rank_mate';
    }

    if (
      features.kingExposed &&
      mistake.centipawnLoss !== null &&
      mistake.centipawnLoss >= 200
    ) {
      return 'defensive_collapse';
    }

    if (mistake.centipawnLoss !== null && mistake.centipawnLoss >= 300) {
      return 'material_blunder';
    }

    if (mistake.centipawnLoss !== null && mistake.centipawnLoss >= 100) {
      return 'hanging_piece';
    }

    if (mistake.centipawnLoss !== null && mistake.centipawnLoss >= 50) {
      return 'positional_error';
    }

    return 'calculation_error';
  }

  private getMateDistance(mistake: MoveAnalysis): number | null {
    if (mistake.mateBefore !== null && mistake.mateBefore > 0) {
      return mistake.mateBefore;
    }
    if (mistake.mateAfter !== null && mistake.mateAfter < 0) {
      return Math.abs(mistake.mateAfter);
    }
    return null;
  }

  private calculateDifficulty(
    mistake: MoveAnalysis,
    features: TacticalFeatures,
  ): number {
    let difficulty = 40;

    if (mistake.centipawnLoss !== null) {
      if (mistake.centipawnLoss >= 500) difficulty = 95;
      else if (mistake.centipawnLoss >= 300) difficulty = 80;
      else if (mistake.centipawnLoss >= 200) difficulty = 65;
      else if (mistake.centipawnLoss >= 100) difficulty = 50;
    }

    if (mistake.mateBefore !== null && mistake.mateBefore > 0) {
      difficulty = Math.min(100, 100 - mistake.mateBefore * 10);
    }

    if (features.kingExposed) difficulty += 5;
    if (mistake.isCheck) difficulty += 5;
    if (mistake.isCapture) difficulty += 5;

    return Math.min(100, Math.max(10, Math.round(difficulty)));
  }

  private async getGame(gameId: string, userId: string): Promise<Game> {
    const game = await this.db
      .selectFrom('games')
      .selectAll()
      .where('id', '=', gameId)
      .where('userId', '=', userId)
      .executeTakeFirst();

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  private async deleteExistingAnalysis(gameId: string): Promise<void> {
    await this.analysisRepository.deleteMistakesByGame(gameId);
    await this.analysisRepository.deletePositionsByGame(gameId);
  }

  private getSeverity(moveQuality: string): Severity {
    switch (moveQuality) {
      case 'blunder':
        return 'blunder';
      case 'mistake':
        return 'mistake';
      case 'inaccuracy':
        return 'inaccuracy';
      default:
        return 'mistake';
    }
  }

  private async updateGameStats(
    gameId: string,
    result: Awaited<ReturnType<typeof this.moveEvaluatorService.analyzeGame>>,
  ): Promise<void> {
    const engineName = this.chessEngineService.getEngineName();
    const engineType = this.chessEngineService.getEngineType();

    await this.db
      .updateTable('games')
      .set({
        analyzed: true,
        analysisCompletedAt: new Date(),
        analysisEngine: `${engineName}-${engineType}`,
        totalMoves: result.totalMoves,
        userAccuracy: result.userAccuracy,
        opponentAccuracy: result.opponentAccuracy,
        userAvgCentipawnLoss: result.userAvgCentipawnLoss,
        userBlunders: result.userBlunders,
        userMistakes: result.userMistakes,
        userInaccuracies: result.userInaccuracies,
      })
      .where('id', '=', gameId)
      .execute();
  }
}
