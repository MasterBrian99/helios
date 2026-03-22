import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Chess } from 'chess.js';
import { MoveQuality } from 'src/database/schema/game-positions';
import { ChessEngineService } from 'src/chess-engines';
import { OpeningService } from '../service/opening.service';

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

interface MoveThresholds {
  miss: number;
  mistake: number;
  blunder: number;
}

interface RatingProfile {
  depth: number;
  thresholds: MoveThresholds;
}

interface ClassifyMoveInput {
  isBookMove: boolean;
  centipawnLoss: number | null;
  mateBefore: number | null;
  mateAfter: number | null;
  playedMoveUci: string;
  bestMove: string | null;
  moverEvalBefore: number | null;
  moverEvalAfter: number | null;
  materialDelta: number;
  isCapture: boolean;
  thresholds: MoveThresholds;
}

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
  private readonly maxAnalysisDepth: number;

  constructor(
    private readonly chessEngine: ChessEngineService,
    private readonly configService: ConfigService,
    private readonly openingBookService: OpeningService,
  ) {
    const configuredDepth =
      this.configService.get<number>('ANALYSIS_ENGINE_DEPTH') ?? 20;
    this.maxAnalysisDepth = Math.min(25, Math.max(10, configuredDepth));
  }

  async analyzeGame(
    pgn: string,
    userColor: 'white' | 'black' | null,
    userRating?: number | null,
  ): Promise<GameAnalysisResult> {
    const chess = new Chess();
    const moves = this.extractMoves(pgn);

    if (moves.length === 0) {
      throw new Error('No moves found in PGN');
    }

    const rating = this.resolveUserRating(userRating);
    const profile = this.getRatingProfile(rating);
    const analysisDepth = Math.max(
      10,
      Math.min(this.maxAnalysisDepth, profile.depth),
    );

    const positions: MoveAnalysis[] = [];
    let moveNumber = 0;
    let openingActive = true;

    chess.reset();

    for (const moveSan of moves) {
      moveNumber++;
      const fenBefore = chess.fen();
      const isUserMove = this.isUserMove(moveNumber, userColor);
      const moverColor = moveNumber % 2 === 1 ? 'white' : 'black';

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
      const isCheck = chess.isCheck();
      const isCapture = moveObj.captured !== undefined;
      const phase = this.detectPhase(moveNumber, fenBefore);
      const materialBalance = this.calculateMaterialBalance(fenBefore);

      const isBookMove =
        openingActive && this.openingBookService.isBookPosition(fenAfter);
      if (isBookMove) {
        positions.push({
          moveNumber,
          fen: fenBefore,
          fenAfter,
          movePlayed,
          isUserMove,
          evalBefore: null,
          evalAfter: null,
          mateBefore: null,
          mateAfter: null,
          centipawnLoss: null,
          bestMove: null,
          bestMoveEval: null,
          moveQuality: 'book',
          isCheck,
          isCapture,
          phase,
          materialBalance,
          pv: [],
        });
        continue;
      }

      openingActive = false;

      let evalBeforeRaw: number | null = null;
      let evalBefore: number | null = null;
      let mateBefore: number | null = null;
      let bestMove: string | null = null;
      let bestMoveUci: string | null = null;
      let bestMoveEval: number | null = null;
      let pv: string[] = [];

      try {
        const evaluationBefore = await this.chessEngine.analyzePosition(
          fenBefore,
          analysisDepth,
        );

        if (
          evaluationBefore.scoreType === 'mate' &&
          evaluationBefore.score !== null
        ) {
          mateBefore = evaluationBefore.score;
          evalBeforeRaw = this.chessEngine.scoreToCentipawns(
            evaluationBefore.score,
            evaluationBefore.scoreType,
          );
        } else if (evaluationBefore.score !== null) {
          evalBeforeRaw = evaluationBefore.score;
        }

        evalBefore =
          userColor === 'black' && evalBeforeRaw !== null
            ? -evalBeforeRaw
            : evalBeforeRaw;

        bestMoveUci = evaluationBefore.bestMove;
        bestMove = this.uciToSan(fenBefore, bestMoveUci) ?? bestMoveUci ?? null;
        bestMoveEval = evalBefore;
        pv = evaluationBefore.pv;
      } catch {
        this.logger.error(
          `Error evaluating position before move ${moveNumber}`,
        );
      }

      let evalAfterRaw: number | null = null;
      let evalAfter: number | null = null;
      let mateAfter: number | null = null;

      try {
        const evaluationAfter = await this.chessEngine.analyzePosition(
          fenAfter,
          analysisDepth,
        );

        if (
          evaluationAfter.scoreType === 'mate' &&
          evaluationAfter.score !== null
        ) {
          mateAfter = evaluationAfter.score;
          evalAfterRaw = this.chessEngine.scoreToCentipawns(
            evaluationAfter.score,
            evaluationAfter.scoreType,
          );
        } else if (evaluationAfter.score !== null) {
          evalAfterRaw = evaluationAfter.score;
        }

        evalAfter =
          userColor === 'black' && evalAfterRaw !== null
            ? -evalAfterRaw
            : evalAfterRaw;
      } catch {
        this.logger.error(`Error evaluating position after move ${moveNumber}`);
      }

      if (evalBefore === null || evalAfter === null) {
        this.logger.warn(
          `Null engine eval at move ${moveNumber}; before=${evalBefore}, after=${evalAfter}, mateBefore=${mateBefore}, mateAfter=${mateAfter}`,
        );
      }

      const userPerspectiveLoss = this.calculateCentipawnLoss(
        evalBefore,
        evalAfter,
        mateBefore,
        mateAfter,
      );

      const moverEvalBefore =
        evalBeforeRaw === null
          ? null
          : moverColor === 'white'
            ? evalBeforeRaw
            : -evalBeforeRaw;
      const moverEvalAfter =
        evalAfterRaw === null
          ? null
          : moverColor === 'white'
            ? evalAfterRaw
            : -evalAfterRaw;
      const moverCentipawnLoss = this.calculateCentipawnLoss(
        moverEvalBefore,
        moverEvalAfter,
        mateBefore,
        mateAfter,
      );

      const playedMoveUci = `${moveObj.from}${moveObj.to}${moveObj.promotion ?? ''}`;
      const materialDelta =
        this.calculateSideMaterial(fenAfter, moveObj.color) -
        this.calculateSideMaterial(fenBefore, moveObj.color);

      const moveQuality = this.classifyMove({
        isBookMove: false,
        centipawnLoss: Number.isFinite(moverCentipawnLoss)
          ? Math.max(0, moverCentipawnLoss)
          : null,
        mateBefore,
        mateAfter,
        playedMoveUci,
        bestMove: bestMoveUci,
        moverEvalBefore,
        moverEvalAfter,
        materialDelta,
        isCapture,
        thresholds: profile.thresholds,
      });

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
          isUserMove && Number.isFinite(userPerspectiveLoss)
            ? Math.max(0, userPerspectiveLoss)
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

  private calculateSideMaterial(fen: string, side: 'w' | 'b'): number {
    const values: Record<string, number> = {
      p: 100,
      n: 300,
      b: 300,
      r: 500,
      q: 900,
      k: 0,
    };

    const chess = new Chess(fen);
    const board = chess.board();
    let total = 0;

    for (const row of board) {
      for (const square of row) {
        if (square && square.color === side) {
          total += values[square.type] ?? 0;
        }
      }
    }

    return total;
  }

  private uciToSan(fen: string, uciMove: string | null): string | null {
    if (!uciMove || uciMove.length < 4) return null;

    try {
      const chess = new Chess(fen);
      const from = uciMove.slice(0, 2);
      const to = uciMove.slice(2, 4);
      const promotion =
        uciMove.length > 4
          ? (uciMove.slice(4, 5) as 'q' | 'r' | 'b' | 'n')
          : undefined;

      const move = chess.move({
        from,
        to,
        promotion,
      });

      return move?.san ?? null;
    } catch {
      return null;
    }
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

  classifyMove(input: ClassifyMoveInput): MoveQuality {
    if (input.isBookMove) return 'book';

    const bestMoveNormalized = input.bestMove?.trim() ?? '';
    const playedMoveNormalized = input.playedMoveUci.trim();
    const isExactBestMove =
      bestMoveNormalized.length > 0 &&
      playedMoveNormalized === bestMoveNormalized;

    const evalDrop =
      input.moverEvalBefore !== null && input.moverEvalAfter !== null
        ? input.moverEvalAfter - input.moverEvalBefore
        : 0;
    const keepsAdvantage = evalDrop >= -20;
    const isSacrifice = input.materialDelta <= -100 && !input.isCapture;
    const isComebackMove =
      input.moverEvalBefore !== null &&
      input.moverEvalAfter !== null &&
      input.moverEvalBefore <= -120 &&
      input.moverEvalAfter - input.moverEvalBefore >= 120;

    // If the played move exactly matches engine best move, never downgrade to
    // miss/mistake/blunder due evaluation instability.
    if (isExactBestMove) {
      if (
        (isSacrifice && keepsAdvantage) ||
        (input.mateBefore !== null &&
          input.mateAfter !== null &&
          input.mateBefore > 0 &&
          input.mateAfter > 0 &&
          input.mateAfter <= input.mateBefore)
      ) {
        return 'brilliant';
      }
      if (isComebackMove) {
        return 'great';
      }
      return 'best';
    }

    if (input.mateBefore !== null && input.mateAfter !== null) {
      if (input.mateBefore > 0 && input.mateAfter <= 0) return 'blunder';
      if (input.mateBefore > 0 && input.mateAfter > input.mateBefore) {
        return input.mateAfter - input.mateBefore >= 2 ? 'blunder' : 'mistake';
      }
    }

    if (input.centipawnLoss === null) {
      return 'best';
    }

    if (input.centipawnLoss >= input.thresholds.blunder) return 'blunder';
    if (input.centipawnLoss >= input.thresholds.mistake) return 'mistake';
    if (input.centipawnLoss >= input.thresholds.miss) return 'miss';

    const isNearBest =
      (bestMoveNormalized.length > 0 &&
        playedMoveNormalized === bestMoveNormalized) ||
      input.centipawnLoss <= 15;

    if (
      isNearBest &&
      ((isSacrifice && keepsAdvantage) ||
        (input.mateBefore !== null &&
          input.mateAfter !== null &&
          input.mateBefore > 0 &&
          input.mateAfter > 0 &&
          input.mateAfter <= input.mateBefore))
    ) {
      return 'brilliant';
    }

    if (isNearBest && isComebackMove) {
      return 'great';
    }

    return 'best';
  }

  private resolveUserRating(userRating?: number | null): number {
    if (!Number.isFinite(userRating)) {
      return 800;
    }

    const clamped = Math.round(userRating as number);
    return Math.min(3000, Math.max(400, clamped));
  }

  private getRatingProfile(rating: number): RatingProfile {
    if (rating <= 900) {
      return {
        depth: 10,
        thresholds: { miss: 80, mistake: 180, blunder: 320 },
      };
    }

    if (rating <= 1300) {
      return {
        depth: 12,
        thresholds: { miss: 65, mistake: 140, blunder: 260 },
      };
    }

    if (rating <= 1700) {
      return {
        depth: 14,
        thresholds: { miss: 50, mistake: 110, blunder: 210 },
      };
    }

    if (rating <= 2100) {
      return {
        depth: 16,
        thresholds: { miss: 40, mistake: 90, blunder: 170 },
      };
    }

    return {
      depth: 18,
      thresholds: { miss: 30, mistake: 75, blunder: 130 },
    };
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
      (p) => p.moveQuality === 'miss',
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
