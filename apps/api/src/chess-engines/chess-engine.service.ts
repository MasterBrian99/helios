import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IChessEngine,
  EvaluationResult,
  scoreToCentipawns,
} from './chess-engine.interface';
import { StockfishEngine } from './stockfish.engine';
import { Lc0Engine } from './lc0.engine';
import { KomodoEngine } from './komodo.engine';

export type ChessEngineType = 'stockfish' | 'lc0' | 'komodo';

@Injectable()
export class ChessEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChessEngineService.name);
  private engine: IChessEngine | null = null;
  private readonly engineType: ChessEngineType;

  constructor(private readonly configService: ConfigService) {
    const model =
      this.configService.get<string>('CHESS_MODEL')?.toLowerCase() ??
      'stockfish';
    this.engineType = this.validateEngineType(model);
  }

  private validateEngineType(type: string): ChessEngineType {
    const validTypes: ChessEngineType[] = ['stockfish', 'lc0', 'komodo'];
    if (validTypes.includes(type as ChessEngineType)) {
      return type as ChessEngineType;
    }
    this.logger.warn(
      `Unknown engine type "${type}", falling back to stockfish`,
    );
    return 'stockfish';
  }

  async onModuleInit() {
    this.engine = this.createEngineInstance(this.engineType);
    this.logger.log(`Initializing chess engine: ${this.engine.name}`);
    await this.engine.initialize();
    this.logger.log(`Chess engine ready: ${this.engine.name}`);
  }

  onModuleDestroy() {
    if (this.engine) {
      this.engine.shutdown();
    }
  }

  private createEngineInstance(type: ChessEngineType): IChessEngine {
    switch (type) {
      case 'lc0':
        return new Lc0Engine(this.configService);
      case 'komodo':
        return new KomodoEngine(this.configService);
      case 'stockfish':
      default:
        return new StockfishEngine(this.configService);
    }
  }

  getEngineName(): string {
    return this.engine?.name ?? 'unknown';
  }

  getEngineType(): ChessEngineType {
    return this.engineType;
  }

  isReady(): boolean {
    return this.engine?.isReady() ?? false;
  }

  async analyzePosition(
    fen: string,
    depth?: number,
  ): Promise<EvaluationResult> {
    if (!this.engine) {
      throw new Error('Chess engine not initialized');
    }

    if (!this.engine.isReady()) {
      throw new Error(`${this.engine.name} is not ready`);
    }

    return this.engine.analyzePosition(fen, depth);
  }

  scoreToCentipawns(score: number, scoreType: 'cp' | 'mate'): number {
    return scoreToCentipawns(score, scoreType);
  }
}
