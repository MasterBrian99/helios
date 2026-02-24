import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as readline from 'readline';
import {
  IChessEngine,
  EvaluationResult,
  ChessEngineConfig,
} from './chess-engine.interface';

export class Lc0Engine implements IChessEngine {
  private readonly logger = new Logger('Lc0');
  private engine: ChildProcessWithoutNullStreams | null = null;
  private rl: readline.Interface | null = null;
  private ready = false;
  private readonly config: ChessEngineConfig;

  constructor(configService: ConfigService) {
    const binaryPath =
      configService.get<string>('CHESS_ENGINE_PATH') ?? './bin/lc0';
    const defaultDepth = configService.get<number>('CHESS_ENGINE_DEPTH') ?? 15;
    const weightsPath = configService.get<string>('LC0_WEIGHTS_PATH');

    this.config = {
      binaryPath,
      defaultDepth,
      options: weightsPath ? { WeightsFile: weightsPath } : {},
    };
  }

  get name(): string {
    return 'Lc0';
  }

  isReady(): boolean {
    return this.ready;
  }

  async initialize(): Promise<void> {
    this.logger.log('Initializing Lc0...');
    this.logger.log(`Binary path: ${this.config.binaryPath}`);

    const args: string[] = [];
    if (this.config.options?.['WeightsFile']) {
      args.push(`--weights=${this.config.options['WeightsFile']}`);
    }

    this.engine = spawn(this.config.binaryPath, args);

    this.rl = readline.createInterface({
      input: this.engine.stdout,
    });

    this.engine.stderr.on('data', (data) => {
      this.logger.error(`Lc0 stderr: ${data}`);
    });

    this.engine.on('exit', (code) => {
      this.logger.log(`Lc0 exited with code: ${code}`);
      this.ready = false;
    });

    this.engine.on('error', (err) => {
      this.logger.error(`Lc0 error: ${err.message}`);
      this.ready = false;
    });

    await this.sendCommand('uci');
    await this.waitFor('uciok');

    await this.sendCommand('isready');
    await this.waitFor('readyok');

    this.ready = true;
    this.logger.log('Lc0 ready');
  }

  shutdown(): void {
    if (this.engine) {
      this.engine.stdin.write('quit\n');
      this.engine.kill();
      this.engine = null;
      this.rl = null;
      this.ready = false;
    }
  }

  private sendCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.engine) {
        reject(new Error('Lc0 not initialized'));
        return;
      }
      this.engine.stdin.write(command + '\n');
      resolve();
    });
  }

  private waitFor(keyword: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.rl) {
        reject(new Error('Lc0 not initialized'));
        return;
      }

      const lines: string[] = [];
      const timeout = setTimeout(() => {
        reject(new Error(`Lc0 timeout waiting for ${keyword}`));
      }, 120000);

      const listener = (line: string) => {
        lines.push(line);

        if (line.includes(keyword)) {
          clearTimeout(timeout);
          this.rl?.removeListener('line', listener);
          resolve(lines);
        }
      };

      this.rl.on('line', listener);
    });
  }

  async analyzePosition(
    fen: string,
    depth?: number,
  ): Promise<EvaluationResult> {
    if (!this.ready) {
      throw new Error('Lc0 not ready');
    }

    const targetDepth = depth ?? this.config.defaultDepth;

    await this.sendCommand(`position fen ${fen}`);
    await this.sendCommand(`go depth ${targetDepth}`);

    const rawLines = await this.waitFor('bestmove');

    return this.parseEvaluation(rawLines);
  }

  private parseEvaluation(lines: string[]): EvaluationResult {
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

        const cpMatch = line.match(/score cp (-?\d+(?:\.\d+)?)/);
        if (cpMatch) {
          score = Math.round(parseFloat(cpMatch[1]));
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
