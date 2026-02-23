import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as readline from 'readline';

export interface EvaluationResult {
  score: number | null;
  scoreType: 'cp' | 'mate' | null;
  bestMove: string | null;
  pv: string[];
  depth: number | null;
  rawLines: string[];
}

@Injectable()
export class StockfishService implements OnModuleInit, OnModuleDestroy {
  private engine: ChildProcessWithoutNullStreams;
  private rl: readline.Interface;
  private isReady = false;

  async onModuleInit() {
    this.engine = spawn('./bin/stockfish');

    this.rl = readline.createInterface({
      input: this.engine.stdout,
    });

    this.engine.stderr.on('data', (data) => {
      console.error('Stockfish error:', data);
    });

    this.engine.on('exit', (code) => {
      console.log('Stockfish exited:', code);
    });

    await this.sendCommand('uci');
    await this.waitFor('uciok');

    await this.sendCommand('isready');
    await this.waitFor('readyok');

    this.isReady = true;
    console.log('Stockfish ready');
  }

  onModuleDestroy() {
    if (this.engine) {
      this.engine.stdin.write('quit\n');
      this.engine.kill();
    }
  }

  private sendCommand(command: string): Promise<void> {
    return new Promise((resolve) => {
      this.engine.stdin.write(command + '\n');
      resolve();
    });
  }

  private waitFor(keyword: string): Promise<string[]> {
    return new Promise((resolve) => {
      const lines: string[] = [];

      const listener = (line: string) => {
        lines.push(line);

        if (line.includes(keyword)) {
          this.rl.removeListener('line', listener);
          resolve(lines);
        }
      };

      this.rl.on('line', listener);
    });
  }

  async evaluatePosition(fen: string, depth = 15): Promise<string[]> {
    if (!this.isReady) {
      throw new Error('Stockfish not ready');
    }

    await this.sendCommand(`position fen ${fen}`);
    await this.sendCommand(`go depth ${depth}`);

    const result = await this.waitFor('bestmove');

    return result;
  }

  async analyzePosition(fen: string, depth = 15): Promise<EvaluationResult> {
    const rawLines = await this.evaluatePosition(fen, depth);
    return this.parseEvaluation(rawLines);
  }

  parseEvaluation(lines: string[]): EvaluationResult {
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
    };
  }

  scoreToCentipawns(score: number, scoreType: 'cp' | 'mate'): number {
    if (scoreType === 'cp') {
      return score;
    }

    if (scoreType === 'mate') {
      if (score > 0) {
        return 10000 - score;
      } else {
        return -10000 - score;
      }
    }

    return 0;
  }
}
