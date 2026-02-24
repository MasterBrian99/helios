import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from '../../database/schema/db';
import { Game } from '../../database/schema/games';
import {
  TacticalFeaturesJson,
  TacticalPattern,
  MoveClassification,
} from '../../database/schema/move-classifications';
import { MoveEvaluatorService, MoveAnalysis } from './move-evaluator.service';
import { LlmExplainerService } from './llm-explainer.service';
import { AnalysisRepository } from './analysis.repository';
import { ChessEngineService } from '../../chess-engines';
import {
  TacticalFeatureService,
  TacticalFeatures,
} from './tactical-feature.service';
import { MoveClassificationBuilderService } from './move-classification-builder.service';
import {
  MotifClassifierService,
  PatternAnalysis,
} from './motif-classifier.service';
import {
  SequenceMergerService,
  TacticalSequence,
} from './sequence-merger.service';

interface SequencePatternMapping {
  analysis: PatternAnalysis;
  sequenceStart: number;
  sequenceEnd: number;
  mateIn: number | null;
  difficulty: number | null;
}

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
    private readonly classificationBuilder: MoveClassificationBuilderService,
    private readonly sequenceMergerService: SequenceMergerService,
    private readonly motifClassifierService: MotifClassifierService,
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

      const featuresByMove = this.buildFeaturesByMove(userMistakes);
      const patternByMove = this.buildPatternByMove(result.positions);

      for (const mistake of userMistakes) {
        const features =
          featuresByMove.get(mistake.moveNumber) ??
          this.extractFeaturesForMove(mistake);
        const sequencePattern = patternByMove.get(mistake.moveNumber);
        await this.processMistake(
          mistake,
          gameId,
          userId,
          features,
          sequencePattern,
        );
      }

      await this.updateGameStats(gameId, result);

      this.logger.log(`Completed analysis for game ${gameId}`);
    } catch (error) {
      this.logger.error(`Error analyzing game ${gameId}: ${error}`);
      throw error;
    }
  }

  private async processMistake(
    mistake: MoveAnalysis,
    gameId: string,
    userId: string,
    features: TacticalFeatures,
    sequencePattern?: SequencePatternMapping,
  ): Promise<void> {
    const patternAnalysis =
      sequencePattern?.analysis ??
      this.buildFallbackPatternAnalysis(mistake, features);
    const classification = this.getClassification(mistake.moveQuality);

    const structuredMistake = this.classificationBuilder.build({
      fen: mistake.fen,
      movePlayed: mistake.movePlayed ?? '',
      bestMove: mistake.bestMove,
      phase: mistake.phase,
      engineEvaluation: {
        centipawnLoss: mistake.centipawnLoss ?? 0,
        mateBefore: mistake.mateBefore,
        mateAfter: mistake.mateAfter,
        evalBefore: mistake.evalBefore,
        evalAfter: mistake.evalAfter,
      },
      features,
      patternAnalysis,
      classification,
    });

    const explanation =
      await this.llmExplainerService.explainStructured(structuredMistake);

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

    await this.analysisRepository.createClassification(
      userId,
      gameId,
      null,
      mistake.fen,
      mistake.movePlayed ?? '',
      mistake.bestMove,
      mistake.moveNumber,
      mistake.centipawnLoss ?? 0,
      classification,
      explanation.mistakeType,
      explanation.explanation,
      patternAnalysis.pattern,
      sequencePattern?.mateIn ?? mateIn,
      sequencePattern?.sequenceStart ?? mistake.moveNumber,
      sequencePattern?.sequenceEnd ?? mistake.moveNumber,
      sequencePattern?.difficulty ?? difficulty,
      tacticalFeaturesJson,
      explanation.source,
      explanation.validationStatus,
      explanation.validationReason,
      explanation.analysisVersion,
    );

    await this.analysisRepository.upsertClassificationPattern(
      userId,
      explanation.mistakeType,
    );
  }

  private buildFallbackPatternAnalysis(
    mistake: MoveAnalysis,
    features: TacticalFeatures,
  ): PatternAnalysis {
    const pattern = this.detectPattern(mistake, features);
    return {
      pattern,
      description: pattern,
      difficulty: 50,
      keyPiece: null,
      isCheckmateRelated:
        pattern === 'missed_mate' || pattern === 'back_rank_mate',
    };
  }

  private extractFeaturesForMove(mistake: MoveAnalysis): TacticalFeatures {
    return this.tacticalFeatureService.extractFeatures(
      mistake.fen,
      mistake.fenAfter,
      mistake.movePlayed ?? '',
      mistake.moveNumber,
    );
  }

  private buildFeaturesByMove(
    moves: MoveAnalysis[],
  ): Map<number, TacticalFeatures> {
    const featuresByMove = new Map<number, TacticalFeatures>();

    for (const move of moves) {
      featuresByMove.set(move.moveNumber, this.extractFeaturesForMove(move));
    }

    return featuresByMove;
  }

  private buildPatternByMove(
    positions: MoveAnalysis[],
  ): Map<number, SequencePatternMapping> {
    const mapping = new Map<number, SequencePatternMapping>();
    const sequences = this.sequenceMergerService.mergeSequences(positions);

    for (const sequence of sequences) {
      this.addSequenceToMap(sequence, mapping);
    }

    return mapping;
  }

  private addSequenceToMap(
    sequence: TacticalSequence,
    mapping: Map<number, SequencePatternMapping>,
  ): void {
    const keyMove = sequence.keyMove;
    const features = this.tacticalFeatureService.extractFeatures(
      keyMove.fen,
      keyMove.fenAfter,
      keyMove.movePlayed ?? '',
      keyMove.moveNumber,
    );
    const analysis = this.motifClassifierService.classifySequence(
      sequence,
      features,
    );

    for (const position of sequence.positions) {
      if (!position.isUserMove) continue;
      if (
        position.moveQuality !== 'blunder' &&
        position.moveQuality !== 'mistake'
      ) {
        continue;
      }

      mapping.set(position.moveNumber, {
        analysis,
        sequenceStart: sequence.startMove,
        sequenceEnd: sequence.endMove,
        mateIn: sequence.mateIn,
        difficulty: sequence.difficulty,
      });
    }
  }

  async getAnalysisResults(gameId: string, userId: string) {
    const game = await this.getGame(gameId, userId);

    const positions = await this.analysisRepository.getPositionsByGame(gameId);
    const classifications =
      await this.analysisRepository.getClassificationsByGame(gameId);

    return {
      analysis: {
        gameId: game.id,
        analyzed: game.analyzed,
        analysisCompletedAt: game.analysisCompletedAt,
        totalMoves: game.totalMoves,
        userAccuracy: game.userAccuracy,
        opponentAccuracy: game.opponentAccuracy,
        userAvgCentipawnLoss: game.userAvgCentipawnLoss,
        userBrilliants: game.userBrilliants,
        userGreats: game.userGreats,
        userBookMoves: game.userBookMoves,
        userBlunders: game.userBlunders,
        userMistakes: game.userMistakes,
        userInaccuracies: game.userInaccuracies,
      },
      positions,
      classifications,
    };
  }

  async getClassificationsByGame(gameId: string, userId: string) {
    await this.getGame(gameId, userId);
    return this.analysisRepository.getClassificationsByGame(gameId);
  }

  async getUserClassificationPatterns(userId: string) {
    return this.analysisRepository.getClassificationPatterns(userId);
  }

  async getUserClassifications(userId: string, limit = 50, offset = 0) {
    return this.analysisRepository.getClassificationsByUser(
      userId,
      limit,
      offset,
    );
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
    await this.analysisRepository.deleteClassificationsByGame(gameId);
    await this.analysisRepository.deletePositionsByGame(gameId);
  }

  private getClassification(moveQuality: string): MoveClassification {
    const validClassifications: MoveClassification[] = [
      'brilliant',
      'great',
      'good',
      'book',
      'inaccuracy',
      'mistake',
      'blunder',
    ];
    if (validClassifications.includes(moveQuality as MoveClassification)) {
      return moveQuality as MoveClassification;
    }
    return 'good';
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
        userBrilliants: result.userBrilliants,
        userGreats: result.userGreats,
        userBookMoves: result.userBookMoves,
        userBlunders: result.userBlunders,
        userMistakes: result.userMistakes,
        userInaccuracies: result.userInaccuracies,
      })
      .where('id', '=', gameId)
      .execute();
  }
}
