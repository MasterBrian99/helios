import { Logger } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as readline from 'readline';
import {
  IChessEngine,
  EvaluationResult,
  ChessEngineConfig,
} from './chess-engine.interface';

export abstract class UciEngineBase implements IChessEngine {
  protected readonly logger: Logger;
  protected engine: ChildProcessWithoutNullStreams | null = null;
  protected rl: readline.Interface | null = null;
  protected ready = false;
  protected abstract readonly config: ChessEngineConfig;

  constructor(protected readonly engineName: string) {
    this.logger = new Logger(engineName);
  }

  get name(): string {
    return this.engineName;
  }

  isReady(): boolean {
    return this.ready;
  }

  async initialize(): Promise<void> {
    this.logger.log(`Initializing ${this.engineName}...`);
    this.logger.log(`Binary path: ${this.config.binaryPath}`);

    this.engine = spawn(this.config.binaryPath);

    this.rl = readline.createInterface({
      input: this.engine.stdout,
    });

    this.engine.stderr.on('data', (data) => {
      this.logger.error(`${this.engineName} stderr: ${data}`);
    });

    this.engine.on('exit', (code) => {
      this.logger.log(`${this.engineName} exited with code: ${code}`);
      this.ready = false;
    });

    this.engine.on('error', (err) => {
      this.logger.error(`${this.engineName} error: ${err.message}`);
      this.ready = false;
    });

    await this.sendCommand('uci');
    await this.waitFor('uciok');

    if (this.config.options) {
      for (const [name, value] of Object.entries(this.config.options)) {
        await this.sendCommand(`setoption name ${name} value ${value}`);
      }
    }

    await this.sendCommand('isready');
    await this.waitFor('readyok');

    this.ready = true;
    this.logger.log(`${this.engineName} ready`);
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

  protected sendCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.engine) {
        reject(new Error(`${this.engineName} not initialized`));
        return;
      }
      this.engine.stdin.write(command + '\n');
      resolve();
    });
  }

  protected waitFor(keyword: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.rl) {
        reject(new Error(`${this.engineName} not initialized`));
        return;
      }

      const lines: string[] = [];
      const timeout = setTimeout(() => {
        reject(new Error(`${this.engineName} timeout waiting for ${keyword}`));
      }, 60000);

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

  async evaluatePosition(fen: string, depth?: number): Promise<string[]> {
    if (!this.ready) {
      throw new Error(`${this.engineName} not ready`);
    }

    const targetDepth = depth ?? this.config.defaultDepth;

    await this.sendCommand(`position fen ${fen}`);
    await this.sendCommand(`go depth ${targetDepth}`);

    const result = await this.waitFor('bestmove');

    return result;
  }

  async analyzePosition(
    fen: string,
    depth?: number,
  ): Promise<EvaluationResult> {
    const rawLines = await this.evaluatePosition(fen, depth);
    return this.parseEvaluation(rawLines);
  }

  protected abstract parseEvaluation(lines: string[]): EvaluationResult;
}
