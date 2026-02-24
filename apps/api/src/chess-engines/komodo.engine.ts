import { ConfigService } from '@nestjs/config';
import { UciEngineBase } from './uci-engine.base';
import { EvaluationResult, ChessEngineConfig } from './chess-engine.interface';

export class KomodoEngine extends UciEngineBase {
  protected readonly config: ChessEngineConfig;

  constructor(configService: ConfigService) {
    super('Komodo');

    const binaryPath =
      configService.get<string>('CHESS_ENGINE_PATH') ?? './bin/komodo';
    const defaultDepth = configService.get<number>('CHESS_ENGINE_DEPTH') ?? 15;

    this.config = {
      binaryPath,
      defaultDepth,
      options: {
        Threads: 1,
        Hash: 128,
      },
    };
  }

  protected parseEvaluation(lines: string[]): EvaluationResult {
    let score: number | null = null;
    let scoreType: 'cp' | 'mate' | null = null;
    let bestMove: string | null = null;
    let pv: string[] = [];
    let depth: number | null = null;

    for (const line of lines) {
      if (line.startsWith('info depth')) {
        const depthMatch = line.match(/info depth (\d+)/);
        if (depthMatch) {
          depth = parseInt(depthMatch[1], 10);
        }

        const cpMatch = line.match(/score cp (-?\d+)/);
        if (cpMatch) {
          score = parseInt(cpMatch[1], 10);
          scoreType = 'cp';
        }

        const mateMatch = line.match(/score mate (-?\d+)/);
        if (mateMatch) {
          score = parseInt(mateMatch[1], 10);
          scoreType = 'mate';
        }

        const pvMatch = line.match(/pv (.+)$/);
        if (pvMatch) {
          pv = pvMatch[1].trim().split(/\s+/);
        }
      }

      if (line.startsWith('bestmove')) {
        const bestMoveMatch = line.match(/bestmove (\S+)/);
        if (bestMoveMatch) {
          bestMove = bestMoveMatch[1];
        }
      }
    }

    return {
      score,
      scoreType,
      bestMove,
      pv,
      depth,
      rawLines: lines,
      engineName: this.name,
    };
  }
}
