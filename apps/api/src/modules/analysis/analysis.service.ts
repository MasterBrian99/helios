import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from '../../database/schema/db';
import { Game } from '../../database/schema/games';
import { Severity } from '../../database/schema/mistakes';
import { MoveEvaluatorService, MoveAnalysis } from './move-evaluator.service';
import { LlmExplainerService } from './llm-explainer.service';
import { AnalysisRepository } from './analysis.repository';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly moveEvaluatorService: MoveEvaluatorService,
    private readonly llmExplainerService: LlmExplainerService,
    private readonly analysisRepository: AnalysisRepository,
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

      const mistakes: Array<{
        positionId: string;
        analysis: MoveAnalysis;
      }> = [];

      for (const analysis of result.positions) {
        const position = await this.analysisRepository.createPosition(
          gameId,
          analysis,
        );

        if (
          analysis.isUserMove &&
          (analysis.moveQuality === 'mistake' ||
            analysis.moveQuality === 'blunder')
        ) {
          mistakes.push({
            positionId: position.positionId,
            analysis,
          });
        }
      }

      for (const { positionId, analysis } of mistakes) {
        const severity = this.getSeverity(analysis.moveQuality);
        const initialType = this.classifyMistakeType(
          analysis.centipawnLoss ?? 0,
        );

        const mistake = await this.analysisRepository.createMistake(
          userId,
          gameId,
          positionId,
          analysis.fen,
          analysis.movePlayed ?? '',
          analysis.bestMove,
          analysis.moveNumber,
          analysis.centipawnLoss ?? 0,
          severity,
          initialType,
        );

        const explanation = await this.llmExplainerService.explainMistake(
          analysis.fen,
          analysis.movePlayed ?? '',
          analysis.bestMove ?? '',
          analysis.centipawnLoss ?? 0,
          severity,
        );

        await this.analysisRepository.updateMistakeExplanation(
          mistake.mistakeId,
          explanation.explanation,
          explanation.mistakeType,
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

  private classifyMistakeType(centipawnLoss: number) {
    if (centipawnLoss >= 200) {
      return 'tactical_blunder' as const;
    }
    if (centipawnLoss >= 100) {
      return 'positional_error' as const;
    }
    return 'calculation_error' as const;
  }

  private async updateGameStats(
    gameId: string,
    result: Awaited<ReturnType<typeof this.moveEvaluatorService.analyzeGame>>,
  ): Promise<void> {
    await this.db
      .updateTable('games')
      .set({
        analyzed: true,
        analysisCompletedAt: new Date(),
        analysisEngine: 'stockfish-15',
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
