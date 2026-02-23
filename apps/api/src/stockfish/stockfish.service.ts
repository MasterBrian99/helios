import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as readline from 'readline';

@Injectable()
export class StockfishService implements OnModuleInit, OnModuleDestroy {
  private engine: ChildProcessWithoutNullStreams;
  private rl: readline.Interface;
  private isReady = false;

  async onModuleInit() {
    this.engine = spawn('./bin/stockfish'); // path to binary

    this.rl = readline.createInterface({
      input: this.engine.stdout,
    });

    this.engine.stderr.on('data', (data) => {
      console.error('Stockfish error:', data);
    });

    this.engine.on('exit', (code) => {
      console.log('Stockfish exited:', code);
    });

    // Initialize UCI
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

  async evaluatePosition(fen: string, depth = 15) {
    if (!this.isReady) {
      throw new Error('Stockfish not ready');
    }

    await this.sendCommand(`position fen ${fen}`);
    await this.sendCommand(`go depth ${depth}`);

    const result = await this.waitFor('bestmove');

    return result;
  }
}
