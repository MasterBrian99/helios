import { Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';
import { ChessResult } from './enums/chess-game-result';
import { ChessGameTermination } from './enums/chess-game-termination.enum';
import { ChessTimeControlType } from './enums/chess-time-control-type.enum';

export interface ParsedGame {
  pgn: string;
  whitePlayer: string;
  blackPlayer: string;
  whiteRating: number | null;
  blackRating: number | null;
  result: ChessResult;
  termination: ChessGameTermination | null;
  timeControl: string | null;
  timeControlType: ChessTimeControlType | null;
  eventName: string | null;
  playedAt: Date | null;
  openingEco: string | null;
  openingName: string | null;
  totalMoves: number;
}

@Injectable()
export class PgnParserService {
  /**
   * Split a multi-game PGN string into individual PGN strings.
   * Games in a PGN file are separated by blank lines before a new tag pair.
   */
  splitPgn(multiPgn: string): string[] {
    const games = multiPgn
      .split(/\n\n(?=\[Event )/)
      .map((g) => g.trim())
      .filter((g) => g.length > 0);
    return games;
  }

  /**
   * Parse a single PGN string into structured game data.
   * Returns null if parsing fails.
   */
  parsePgn(pgn: string): ParsedGame | null {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);

      const headers = chess.getHeaders();
      const moves = chess.history();

      return {
        pgn,
        whitePlayer: headers['White'] || 'Unknown',
        blackPlayer: headers['Black'] || 'Unknown',
        whiteRating: headers['WhiteElo']
          ? parseInt(headers['WhiteElo'], 10)
          : null,
        blackRating: headers['BlackElo']
          ? parseInt(headers['BlackElo'], 10)
          : null,
        result: this.mapResult(headers['Result'] ?? undefined),
        termination: this.mapTermination(headers['Termination'] ?? undefined),
        timeControl: headers['TimeControl'] || null,
        timeControlType: this.deriveTimeControlType(
          headers['TimeControl'] ?? undefined,
        ),
        eventName: headers['Event'] || null,
        playedAt: this.parsePgnDate(headers['Date'] ?? undefined),
        openingEco: headers['ECO'] || null,
        openingName: headers['Opening'] || null,
        totalMoves: Math.ceil(moves.length / 2),
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse multiple PGNs from a single concatenated PGN string.
   * Skips games that fail to parse.
   */
  parseMultiplePgns(multiPgn: string): ParsedGame[] {
    const pgns = this.splitPgn(multiPgn);
    return pgns
      .map((pgn) => this.parsePgn(pgn))
      .filter((game): game is ParsedGame => game !== null);
  }

  private mapResult(result?: string): ChessResult {
    switch (result) {
      case '1-0':
        return ChessResult.WhiteWin;
      case '0-1':
        return ChessResult.BlackWin;
      case '1/2-1/2':
        return ChessResult.Draw;
      default:
        return ChessResult.Ongoing;
    }
  }

  private mapTermination(termination?: string): ChessGameTermination | null {
    if (!termination) return null;

    const normalized = termination.toLowerCase();

    if (normalized.includes('checkmate')) return ChessGameTermination.Checkmate;
    if (normalized.includes('resign')) return ChessGameTermination.Resignation;
    if (normalized.includes('agreement'))
      return ChessGameTermination.DrawAgreement;
    if (normalized.includes('stalemate')) return ChessGameTermination.Stalemate;
    if (normalized.includes('threefold'))
      return ChessGameTermination.ThreefoldRepetition;
    if (normalized.includes('fivefold'))
      return ChessGameTermination.FivefoldRepetition;
    if (normalized.includes('fifty') || normalized.includes('50-move'))
      return ChessGameTermination.FiftyMoveRule;
    if (normalized.includes('seventy') || normalized.includes('75-move'))
      return ChessGameTermination.SeventyFiveMoveRule;
    if (normalized.includes('insufficient'))
      return ChessGameTermination.InsufficientMaterial;
    if (normalized.includes('time')) return ChessGameTermination.TimeForfeit;
    if (normalized.includes('abandon')) return ChessGameTermination.Abandoned;

    // Lichess/Chess.com use "Normal" for resignation or checkmate
    if (normalized === 'normal') return ChessGameTermination.Resignation;

    return null;
  }

  private deriveTimeControlType(tc?: string): ChessTimeControlType | null {
    if (!tc || tc === '-') return null;

    // TimeControl format: "base+increment" in seconds, e.g. "300+3"
    const parts = tc.split('+');
    const baseSeconds = parseInt(parts[0], 10);
    if (isNaN(baseSeconds)) return null;

    const increment = parts[1] ? parseInt(parts[1], 10) : 0;
    // Estimated total time = base + 40 * increment (standard formula)
    const estimatedSeconds = baseSeconds + 40 * increment;
    const estimatedMinutes = estimatedSeconds / 60;

    if (estimatedMinutes < 3) return ChessTimeControlType.Bullet;
    if (estimatedMinutes < 10) return ChessTimeControlType.Blitz;
    if (estimatedMinutes < 30) return ChessTimeControlType.Rapid;
    return ChessTimeControlType.Classical;
  }

  private parsePgnDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    // PGN date format: "YYYY.MM.DD"
    const normalized = dateStr.replace(/\./g, '-');
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
  }
}
