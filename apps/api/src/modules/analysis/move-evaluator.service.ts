import { Injectable, Logger } from '@nestjs/common';
import { Chess } from 'chess.js';
import { StockfishService } from '../../stockfish/stockfish.service';
import { MoveQuality } from '../../database/schema/game-positions';

export interface MoveAnalysis {
  moveNumber: number;
  fen: string;
  movePlayed: string;
  isUserMove: boolean;
  evalBefore: number | null;
  evalAfter: number | null;
  centipawnLoss: number | null;
  bestMove: string | null;
  bestMoveEval: number | null;
  moveQuality: MoveQuality;
}

export interface GameAnalysisResult {
  positions: MoveAnalysis[];
  userAvgCentipawnLoss: number;
  opponentAvgCentipawnLoss: number;
  userAccuracy: number;
  opponentAccuracy: number;
  userBlunders: number;
  userMistakes: number;
  userInaccuracies: number;
  totalMoves: number;
}

@Injectable()
export class MoveEvaluatorService {
  private readonly logger = new Logger(MoveEvaluatorService.name);
  private readonly analysisDepth = 15;

  constructor(private readonly stockfishService: StockfishService) {}

  async analyzeGame(
    pgn: string,
    userColor: 'white' | 'black' | null,
  ): Promise<GameAnalysisResult> {
    const chess = new Chess();
    const moves = this.extractMoves(pgn);

    if (moves.length === 0) {
      throw new Error('No moves found in PGN');
    }

    const positions: MoveAnalysis[] = [];
    let moveNumber = 0;

    chess.reset();

    for (const moveSan of moves) {
      moveNumber++;
      const fenBefore = chess.fen();
      const isUserMove = this.isUserMove(moveNumber, userColor);

      let evalBefore: number | null = null;
      let bestMove: string | null = null;
      let bestMoveEval: number | null = null;

      try {
        const evaluationBefore = await this.stockfishService.analyzePosition(
          fenBefore,
          this.analysisDepth,
        );

        if (
          evaluationBefore.score !== null &&
          evaluationBefore.scoreType !== null
        ) {
          evalBefore = this.stockfishService.scoreToCentipawns(
            evaluationBefore.score,
            evaluationBefore.scoreType,
          );
          if (userColor === 'black') {
            evalBefore = -evalBefore;
          }
        }
        bestMove = evaluationBefore.bestMove;
        bestMoveEval = evalBefore;
      } catch {
        this.logger.error(
          `Error evaluating position before move ${moveNumber}`,
        );
      }

      let movePlayed: string;
      try {
        const move = chess.move(moveSan);
        movePlayed = move.san;
      } catch {
        this.logger.error(`Invalid move ${moveSan} at position ${moveNumber}`);
        continue;
      }

      const fenAfter = chess.fen();
      let evalAfter: number | null = null;

      try {
        const evaluationAfter = await this.stockfishService.analyzePosition(
          fenAfter,
          this.analysisDepth,
        );

        if (
          evaluationAfter.score !== null &&
          evaluationAfter.scoreType !== null
        ) {
          evalAfter = this.stockfishService.scoreToCentipawns(
            evaluationAfter.score,
            evaluationAfter.scoreType,
          );
          if (userColor === 'black') {
            evalAfter = -evalAfter;
          }
        }
      } catch {
        this.logger.error(`Error evaluating position after move ${moveNumber}`);
      }

      const centipawnLoss = this.calculateCentipawnLoss(evalBefore, evalAfter);

      const moveQuality = this.classifyMove(centipawnLoss);

      positions.push({
        moveNumber,
        fen: fenBefore,
        movePlayed,
        isUserMove,
        evalBefore,
        evalAfter,
        centipawnLoss: isUserMove ? centipawnLoss : null,
        bestMove,
        bestMoveEval,
        moveQuality,
      });
    }

    return this.computeStatistics(positions);
  }

  private extractMoves(pgn: string): string[] {
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
      return chess.history();
    } catch {
      this.logger.error('Error parsing PGN');
      return [];
    }
  }

  private isUserMove(
    moveNumber: number,
    userColor: 'white' | 'black' | null,
  ): boolean {
    if (!userColor) return false;
    const isWhiteMove = moveNumber % 2 === 1;
    return (
      (userColor === 'white' && isWhiteMove) ||
      (userColor === 'black' && !isWhiteMove)
    );
  }

  private calculateCentipawnLoss(
    evalBefore: number | null,
    evalAfter: number | null,
  ): number {
    if (evalBefore === null || evalAfter === null) {
      return 0;
    }

    const loss = evalBefore - evalAfter;
    return Math.max(0, loss);
  }

  classifyMove(centipawnLoss: number | null): MoveQuality {
    if (centipawnLoss === null) return 'good';

    if (centipawnLoss >= 100) return 'blunder';
    if (centipawnLoss >= 50) return 'mistake';
    if (centipawnLoss >= 25) return 'inaccuracy';
    return 'good';
  }

  calculateAccuracy(avgCentipawnLoss: number): number {
    return (
      Math.round(103.1668 * Math.exp(-0.04354 * avgCentipawnLoss) * 10) / 10
    );
  }

  private computeStatistics(positions: MoveAnalysis[]): GameAnalysisResult {
    const userPositions = positions.filter((p) => p.isUserMove);
    const opponentPositions = positions.filter((p) => !p.isUserMove);

    const userCPLValues = userPositions
      .map((p) => p.centipawnLoss)
      .filter((cpl): cpl is number => cpl !== null);

    const opponentCPLValues = opponentPositions
      .map((p) => {
        if (p.evalBefore === null || p.evalAfter === null) return null;
        return Math.max(0, -p.evalBefore - -p.evalAfter);
      })
      .filter((cpl): cpl is number => cpl !== null);

    const userAvgCentipawnLoss =
      userCPLValues.length > 0
        ? userCPLValues.reduce((a, b) => a + b, 0) / userCPLValues.length
        : 0;

    const opponentAvgCentipawnLoss =
      opponentCPLValues.length > 0
        ? opponentCPLValues.reduce((a, b) => a + b, 0) /
          opponentCPLValues.length
        : 0;

    const userBlunders = userPositions.filter(
      (p) => p.moveQuality === 'blunder',
    ).length;
    const userMistakes = userPositions.filter(
      (p) => p.moveQuality === 'mistake',
    ).length;
    const userInaccuracies = userPositions.filter(
      (p) => p.moveQuality === 'inaccuracy',
    ).length;

    return {
      positions,
      userAvgCentipawnLoss: Math.round(userAvgCentipawnLoss * 10) / 10,
      opponentAvgCentipawnLoss: Math.round(opponentAvgCentipawnLoss * 10) / 10,
      userAccuracy: this.calculateAccuracy(userAvgCentipawnLoss),
      opponentAccuracy: this.calculateAccuracy(opponentAvgCentipawnLoss),
      userBlunders,
      userMistakes,
      userInaccuracies,
      totalMoves: positions.length,
    };
  }
}
