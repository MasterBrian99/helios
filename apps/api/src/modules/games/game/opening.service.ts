import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChessPGN } from '@chess-pgn/chess-pgn';

interface Opening {
  eco: string;
  name: string;
  moves: string;
}

interface OpeningCollection {
  [fen: string]: Opening;
}

interface LookupByMovesResult {
  opening: Opening | undefined;
  movesBack: number;
}

interface EcoJsonModule {
  openingBook: () => Promise<OpeningCollection>;
  lookupByMoves: (
    chess: { fen(): string; undo(): unknown; load(fen: string): void },
    openings: OpeningCollection,
    options?: { maxMovesBack?: number },
  ) => LookupByMovesResult;
}

export interface OpeningInfo {
  eco: string | null;
  name: string | null;
}

@Injectable()
export class OpeningService implements OnModuleInit {
  private openings: OpeningCollection | null = null;
  private ecoModule: EcoJsonModule | null = null;

  async onModuleInit() {
    // for ESM-only magic
    this.ecoModule = await import('@chess-openings/eco.json');
    this.openings = await this.ecoModule.openingBook();
  }


  isReady(): boolean {
    return this.openings !== null && this.ecoModule !== null;
  }


  findByMoves(chess: ChessPGN): OpeningInfo {
    if (!this.openings || !this.ecoModule) {
      return { eco: null, name: null };
    }

    try {
      const result = this.ecoModule.lookupByMoves(chess, this.openings);
      if (result.opening) {
        return {
          eco: result.opening.eco,
          name: result.opening.name,
        };
      }
    } catch {
      // failed,return null
    }

    return { eco: null, name: null };
  }


  getOpeningInfo(
    headers: Record<string, string>,
    chess: ChessPGN,
  ): OpeningInfo {
    const headerEco = headers['ECO'] || null;
    const headerName = headers['Opening'] || null;

    if (headerEco && headerName) {
      return { eco: headerEco, name: headerName };
    }

    const foundOpening = this.findByMoves(chess);

    return {
      eco: headerEco || foundOpening.eco,
      name: headerName || foundOpening.name,
    };
  }
}
