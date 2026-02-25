import { Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';
import { GamePhase } from './move-evaluator.service';

export interface TacticalFeatures {
  isCheck: boolean;
  isCapture: boolean;
  isSacrifice: boolean;
  materialSwing: number;
  kingSafetyScore: number;
  isBackRankExposed: boolean;
  phase: GamePhase;
  pieceActivity: number;
  materialBalance: number;
  kingExposed: boolean;
  queenAttacking: boolean;
  knightAttacking: boolean;
  rookAttacking: boolean;
}

@Injectable()
export class TacticalFeatureService {
  private readonly pieceValues: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
  };

  extractFeatures(
    fenBefore: string,
    fenAfter: string,
    moveSan: string,
    moveNumber: number,
  ): TacticalFeatures {
    const chessBefore = new Chess(fenBefore);
    const chessAfter = new Chess(fenAfter);

    const materialBefore = this.calculateMaterial(chessBefore);
    const materialAfter = this.calculateMaterial(chessAfter);
    const materialBalance = materialBefore.white - materialBefore.black;
    const materialSwing = this.calculateMaterialSwing(
      materialBefore,
      materialAfter,
    );

    const isCheck = chessAfter.isCheck();
    const isCapture = this.isCapture(moveSan);
    const isSacrifice = this.detectSacrifice(
      moveSan,
      materialBefore,
      materialAfter,
    );
    const phase = this.detectPhase(moveNumber, fenBefore);
    const pieceActivity = this.calculatePieceActivity(chessBefore);
    const kingSafetyScore = this.calculateKingSafety(chessBefore);
    const isBackRankExposed = this.detectBackRankWeakness(chessBefore);
    const kingExposed = this.isKingExposed(chessBefore);
    const { queenAttacking, knightAttacking, rookAttacking } =
      this.detectAttackingPieces(chessAfter);

    return {
      isCheck,
      isCapture,
      isSacrifice,
      materialSwing,
      kingSafetyScore,
      isBackRankExposed,
      phase,
      pieceActivity,
      materialBalance,
      kingExposed,
      queenAttacking,
      knightAttacking,
      rookAttacking,
    };
  }

  private calculateMaterial(chess: Chess): { white: number; black: number } {
    const board = chess.board();
    let white = 0;
    let black = 0;

    for (const row of board) {
      for (const square of row) {
        if (square) {
          const value = this.pieceValues[square.type] || 0;
          if (square.color === 'w') {
            white += value;
          } else {
            black += value;
          }
        }
      }
    }

    return { white, black };
  }

  private calculateMaterialSwing(
    before: { white: number; black: number },
    after: { white: number; black: number },
  ): number {
    const whiteDiff = Math.abs(after.white - before.white);
    const blackDiff = Math.abs(after.black - before.black);
    return whiteDiff + blackDiff;
  }

  private isCapture(moveSan: string): boolean {
    return moveSan.includes('x');
  }

  private detectSacrifice(
    moveSan: string,
    materialBefore: { white: number; black: number },
    materialAfter: { white: number; black: number },
  ): boolean {
    if (!this.isCapture(moveSan)) return false;

    const whiteLostMaterial = materialBefore.white - materialAfter.white;
    const blackLostMaterial = materialBefore.black - materialAfter.black;

    return whiteLostMaterial > 0 || blackLostMaterial > 0;
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

  private calculatePieceActivity(chess: Chess): number {
    const moves = chess.moves();
    const board = chess.board();
    let pieceCount = 0;

    for (const row of board) {
      for (const square of row) {
        if (square) pieceCount++;
      }
    }

    return Math.round((moves.length / pieceCount) * 10);
  }

  private calculateKingSafety(chess: Chess): number {
    const turn = chess.turn();
    const board = chess.board();

    let kingFile = 0;
    let kingRank = 0;
    let kingFound = false;

    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
        const square = board[rankIdx][fileIdx];
        if (square && square.type === 'k' && square.color === turn) {
          kingFile = fileIdx;
          kingRank = rankIdx;
          kingFound = true;
          break;
        }
      }
      if (kingFound) break;
    }

    let safetyScore = 100;

    if (turn === 'w') {
      if (kingRank < 6) safetyScore -= 30;
      if (kingFile < 2 || kingFile > 5) safetyScore += 10;
    } else {
      if (kingRank > 1) safetyScore -= 30;
      if (kingFile < 2 || kingFile > 5) safetyScore += 10;
    }

    const pawnShieldBonus = this.countPawnShield(
      board,
      kingFile,
      kingRank,
      turn,
    );
    safetyScore += pawnShieldBonus * 5;

    return Math.max(0, Math.min(100, safetyScore));
  }

  private countPawnShield(
    board: ReturnType<Chess['board']>,
    kingFile: number,
    kingRank: number,
    kingColor: 'w' | 'b',
  ): number {
    let shieldCount = 0;
    const direction = kingColor === 'w' ? 1 : -1;

    for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
      const checkFile = kingFile + fileOffset;
      const checkRank = kingRank - direction;

      if (checkFile >= 0 && checkFile < 8 && checkRank >= 0 && checkRank < 8) {
        const square = board[checkRank][checkFile];
        if (square && square.type === 'p' && square.color === kingColor) {
          shieldCount++;
        }
      }
    }

    return shieldCount;
  }

  private detectBackRankWeakness(chess: Chess): boolean {
    const board = chess.board();
    const turn = chess.turn();

    const kingRank = turn === 'w' ? 0 : 7;
    let kingFile = 4;

    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      const square = board[kingRank][fileIdx];
      if (square && square.type === 'k' && square.color === turn) {
        kingFile = fileIdx;
        break;
      }
    }

    let pawnsInFront = 0;
    for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
      const checkFile = kingFile + fileOffset;
      if (checkFile >= 0 && checkFile < 8) {
        const pawnRank = turn === 'w' ? 1 : 6;
        const square = board[pawnRank][checkFile];
        if (square && square.type === 'p' && square.color === turn) {
          pawnsInFront++;
        }
      }
    }

    const escapeSquares = this.countKingEscapeSquares(
      chess,
      kingRank,
      kingFile,
    );

    return pawnsInFront >= 2 && escapeSquares <= 1;
  }

  private countKingEscapeSquares(
    chess: Chess,
    kingRank: number,
    kingFile: number,
  ): number {
    let escapeCount = 0;
    const board = chess.board();
    const kingColor = chess.turn();

    for (let rankOffset = -1; rankOffset <= 1; rankOffset++) {
      for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
        if (rankOffset === 0 && fileOffset === 0) continue;

        const newRank = kingRank + rankOffset;
        const newFile = kingFile + fileOffset;

        if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
          const square = board[newRank][newFile];
          if (!square || square.color !== kingColor) {
            escapeCount++;
          }
        }
      }
    }

    return escapeCount;
  }

  private isKingExposed(chess: Chess): boolean {
    const kingSafety = this.calculateKingSafety(chess);
    return kingSafety < 50;
  }

  private detectAttackingPieces(chess: Chess): {
    queenAttacking: boolean;
    knightAttacking: boolean;
    rookAttacking: boolean;
  } {
    const turn = chess.turn();
    const opponent = turn === 'w' ? 'b' : 'w';
    const board = chess.board();

    let queenAttacking = false;
    let knightAttacking = false;
    let rookAttacking = false;

    let opponentKingFile = 0;
    let opponentKingRank = 0;

    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
        const square = board[rankIdx][fileIdx];
        if (square && square.type === 'k' && square.color === opponent) {
          opponentKingFile = fileIdx;
          opponentKingRank = rankIdx;
          break;
        }
      }
    }

    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
        const square = board[rankIdx][fileIdx];
        if (square && square.color === turn) {
          const distance = Math.max(
            Math.abs(rankIdx - opponentKingRank),
            Math.abs(fileIdx - opponentKingFile),
          );

          if (distance <= 3) {
            if (square.type === 'q') queenAttacking = true;
            if (square.type === 'n') knightAttacking = true;
            if (square.type === 'r') rookAttacking = true;
          }
        }
      }
    }

    return { queenAttacking, knightAttacking, rookAttacking };
  }
}
