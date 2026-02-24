import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Chess } from 'chess.js';
import { ChessEngineService } from '../../chess-engines';
import { MoveQuality } from '../../database/schema/game-positions';

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

export interface MoveAnalysis {
  moveNumber: number;
  fen: string;
  fenAfter: string;
  movePlayed: string;
  isUserMove: boolean;
  evalBefore: number | null;
  evalAfter: number | null;
  mateBefore: number | null;
  mateAfter: number | null;
  centipawnLoss: number | null;
  bestMove: string | null;
  bestMoveEval: number | null;
  moveQuality: MoveQuality;
  isCheck: boolean;
  isCapture: boolean;
  phase: GamePhase;
  materialBalance: number;
  pv: string[];
}

export interface GameAnalysisResult {
  positions: MoveAnalysis[];
  userAvgCentipawnLoss: number;
  opponentAvgCentipawnLoss: number;
  userAccuracy: number;
  opponentAccuracy: number;
  userBrilliants: number;
  userGreats: number;
  userBookMoves: number;
  userBlunders: number;
  userMistakes: number;
  userInaccuracies: number;
  totalMoves: number;
}

@Injectable()
export class MoveEvaluatorService {
  private readonly logger = new Logger(MoveEvaluatorService.name);
  private readonly analysisDepth: number;

  constructor(
    private readonly chessEngine: ChessEngineService,
    private readonly configService: ConfigService,
  ) {
    const rawDepth =
      this.configService.get<number>('ANALYSIS_ENGINE_DEPTH') ?? 20;
    this.analysisDepth = Math.min(25, Math.max(10, rawDepth));
  }

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
      let mateBefore: number | null = null;
      let bestMove: string | null = null;
      let bestMoveEval: number | null = null;
      let pv: string[] = [];

      try {
        const evaluationBefore = await this.chessEngine.analyzePosition(
          fenBefore,
          this.analysisDepth,
        );

        if (
          evaluationBefore.scoreType === 'mate' &&
          evaluationBefore.score !== null
        ) {
          mateBefore = evaluationBefore.score;
          evalBefore = this.chessEngine.scoreToCentipawns(
            evaluationBefore.score,
            evaluationBefore.scoreType,
          );
        } else if (evaluationBefore.score !== null) {
          evalBefore = evaluationBefore.score;
        }

        if (userColor === 'black' && evalBefore !== null) {
          evalBefore = -evalBefore;
        }
        bestMove = evaluationBefore.bestMove;
        bestMoveEval = evalBefore;
        pv = evaluationBefore.pv;
      } catch {
        this.logger.error(
          `Error evaluating position before move ${moveNumber}`,
        );
      }

      let movePlayed: string;
      let moveObj: ReturnType<typeof chess.move>;
      try {
        moveObj = chess.move(moveSan);
        movePlayed = moveObj.san;
      } catch {
        this.logger.error(`Invalid move ${moveSan} at position ${moveNumber}`);
        continue;
      }

      const fenAfter = chess.fen();
      let evalAfter: number | null = null;
      let mateAfter: number | null = null;

      try {
        const evaluationAfter = await this.chessEngine.analyzePosition(
          fenAfter,
          this.analysisDepth,
        );

        if (
          evaluationAfter.scoreType === 'mate' &&
          evaluationAfter.score !== null
        ) {
          mateAfter = evaluationAfter.score;
          evalAfter = this.chessEngine.scoreToCentipawns(
            evaluationAfter.score,
            evaluationAfter.scoreType,
          );
        } else if (evaluationAfter.score !== null) {
          evalAfter = evaluationAfter.score;
        }

        if (userColor === 'black' && evalAfter !== null) {
          evalAfter = -evalAfter;
        }
      } catch {
        this.logger.error(`Error evaluating position after move ${moveNumber}`);
      }

      if (evalBefore === null || evalAfter === null) {
        this.logger.warn(
          `Null engine eval at move ${moveNumber}; before=${evalBefore}, after=${evalAfter}, mateBefore=${mateBefore}, mateAfter=${mateAfter}`,
        );
      }

      const centipawnLoss = this.calculateCentipawnLoss(
        evalBefore,
        evalAfter,
        mateBefore,
        mateAfter,
      );
      const moveQuality = this.classifyMove(
        centipawnLoss,
        mateBefore,
        mateAfter,
      );
      const isCheck = chess.isCheck();
      const isCapture = moveObj.captured !== undefined;
      const phase = this.detectPhase(moveNumber, fenBefore);
      const materialBalance = this.calculateMaterialBalance(fenBefore);

      positions.push({
        moveNumber,
        fen: fenBefore,
        fenAfter,
        movePlayed,
        isUserMove,
        evalBefore,
        evalAfter,
        mateBefore,
        mateAfter,
        centipawnLoss:
          isUserMove && Number.isFinite(centipawnLoss)
            ? Math.max(0, centipawnLoss)
            : null,
        bestMove,
        bestMoveEval,
        moveQuality,
        isCheck,
        isCapture,
        phase,
        materialBalance,
        pv,
      });
    }

    return this.computeStatistics(positions);
  }

  detectPhase(moveNumber: number, fen: string): GamePhase {
    const chess = new Chess(fen);
    const board = chess.board();
    let pieceCount = 0;

    for (const row of board) {
      for (const square of row) {
        if (square) {
          pieceCount++;
        }
      }
    }

    if (moveNumber <= 10 && pieceCount >= 28) {
      return 'opening';
    }

    if (pieceCount <= 12 || moveNumber >= 40) {
      return 'endgame';
    }

    return 'middlegame';
  }

  calculateMaterialBalance(fen: string): number {
    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
      P: -1,
      N: -3,
      B: -3,
      R: -5,
      Q: -9,
      K: 0,
    };

    const chess = new Chess(fen);
    const board = chess.board();
    let balance = 0;

    for (const row of board) {
      for (const square of row) {
        if (square) {
          balance += pieceValues[square.type] * (square.color === 'w' ? 1 : -1);
        }
      }
    }

    return balance * 100;
  }

  private calculateCentipawnLoss(
    evalBefore: number | null,
    evalAfter: number | null,
    mateBefore: number | null,
    mateAfter: number | null,
  ): number {
    if (mateBefore !== null && mateAfter !== null) {
      if (mateBefore > 0 && mateAfter <= 0) {
        return 1000;
      }
      if (mateBefore > 0 && mateAfter > 0 && mateAfter > mateBefore) {
        return Math.min(500, (mateAfter - mateBefore) * 50);
      }
      if (mateBefore < 0 && mateAfter < 0 && mateAfter < mateBefore) {
        return 0;
      }
    }

    if (mateAfter !== null && mateAfter < 0) {
      return 1000;
    }

    if (evalBefore === null || evalAfter === null) {
      return 0;
    }

    const loss = evalBefore - evalAfter;
    return Math.max(0, loss);
  }

  classifyMove(
    centipawnLoss: number | null,
    mateBefore: number | null = null,
    mateAfter: number | null = null,
  ): MoveQuality {
    if (mateBefore !== null && mateAfter !== null) {
      if (mateBefore > 0 && mateAfter <= 0) return 'blunder';
      if (mateBefore > 0 && mateAfter > 0 && mateAfter > mateBefore) {
        return mateAfter - mateBefore >= 2 ? 'blunder' : 'mistake';
      }
    }

    if (centipawnLoss === null) return 'good';

    if (centipawnLoss >= 100) return 'blunder';
    if (centipawnLoss >= 50) return 'mistake';
    if (centipawnLoss >= 25) return 'inaccuracy';
    return 'good';
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

    const userBrilliants = userPositions.filter(
      (p) => p.moveQuality === 'brilliant',
    ).length;
    const userGreats = userPositions.filter(
      (p) => p.moveQuality === 'great',
    ).length;
    const userBookMoves = userPositions.filter(
      (p) => p.moveQuality === 'book',
    ).length;
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
      userBrilliants,
      userGreats,
      userBookMoves,
      userBlunders,
      userMistakes,
      userInaccuracies,
      totalMoves: positions.length,
    };
  }
}
