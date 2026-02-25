import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

interface Opening {
  eco: string;
  name: string;
  moves: string;
}

interface OpeningCollection {
  [fen: string]: Opening;
}

interface PositionBook {
  [positionFen: string]: string[];
}

interface EcoJsonModule {
  openingBook: () => Promise<OpeningCollection>;
  getPositionBook: (openingBook: OpeningCollection) => PositionBook;
  findOpening: (
    openingBook: OpeningCollection,
    fen: string,
    positionBook?: PositionBook,
  ) => Opening | undefined;
}

@Injectable()
export class AnalysisOpeningBookService implements OnModuleInit {
  private readonly logger = new Logger(AnalysisOpeningBookService.name);
  private openings: OpeningCollection | null = null;
  private positionBook: PositionBook | null = null;
  private ecoModule: EcoJsonModule | null = null;

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

  isBookPosition(fen: string): boolean {
    if (!this.isReady() || !this.openings) {
      return false;
    }

    return Boolean(this.openings[fen]);
  }
}
