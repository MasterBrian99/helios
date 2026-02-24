export interface EvaluationResult {
  score: number | null;
  scoreType: 'cp' | 'mate' | null;
  bestMove: string | null;
  pv: string[];
  depth: number | null;
  rawLines: string[];
  engineName: string;
}

export interface ChessEngineConfig {
  binaryPath: string;
  defaultDepth: number;
  options?: Record<string, string | number>;
}

export interface IChessEngine {
  readonly name: string;
  analyzePosition(fen: string, depth?: number): Promise<EvaluationResult>;
  isReady(): boolean;
  initialize(): Promise<void>;
  shutdown(): void;
}

export function scoreToCentipawns(
  score: number,
  scoreType: 'cp' | 'mate',
): number {
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
