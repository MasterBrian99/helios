import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChessPGN } from '@chess-pgn/chess-pgn';
import { PositionBook } from '@chess-openings/eco.json';

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
    getPositionBook: (openingBook: OpeningCollection) => PositionBook;
  findOpening: (
    openingBook: OpeningCollection,
    fen: string,
    positionBook?: PositionBook,
  ) => Opening | undefined;
}

export interface OpeningInfo {
  eco: string | null;
  name: string | null;
}

@Injectable()
export class OpeningService implements OnModuleInit {
    private readonly logger = new Logger(OpeningService.name);
  
  private openings: OpeningCollection | null = null;
  private ecoModule: EcoJsonModule | null = null;
  private positionBook: PositionBook | null = null;

 async onModuleInit(): Promise<void> {
    try {
      this.ecoModule = await import('@chess-openings/eco.json');
      this.openings = await this.ecoModule.openingBook();
      this.positionBook = this.ecoModule.getPositionBook(this.openings);
      this.logger.log('Opening book loaded for analysis');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown initialization error';
      this.logger.warn(`Opening book unavailable: ${message}`);
      this.ecoModule = null;
      this.openings = null;
      this.positionBook = null;
    }
  }


  isReady(): boolean {
    return (
      this.ecoModule !== null &&
      this.openings !== null &&
      this.positionBook !== null
    );
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
   isBookPosition(fen: string): boolean {
    if (!this.isReady() || !this.openings) {
      return false;
    }

    return Boolean(this.openings[fen]);
  }
}
