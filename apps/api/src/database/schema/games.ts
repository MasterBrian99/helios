import { Generated, Insertable, Selectable, Updateable } from 'kysely';
import { CreatedAt, UpdatedAt, DeletedAt } from './common/datetime';
import { ChessResult } from 'src/modules/games/game/enums/chess-game-result';
import { ChessGameStatus } from 'src/modules/games/game/enums/chess-game-status.enum';
import { ChessGameTermination } from 'src/modules/games/game/enums/chess-game-termination.enum';
import { ChessGameSource } from 'src/modules/games/game/enums/chess-game-source.enum';
import { ChessUserColor } from 'src/modules/games/game/enums/chess-user-color.enum';
import { ChessTimeControlType } from 'src/modules/games/game/enums/chess-time-control-type.enum';

export interface GameTable {
  id: Generated<string>;
  userId: string;

  // Game metadata
  pgn: string;
  source: ChessGameSource | null;
  externalGameId: string | null;

  // Players
  whitePlayer: string;
  whiteRating: number | null;
  blackPlayer: string;
  blackRating: number | null;
  userColor: ChessUserColor | null;

  // Game details
  result: ChessResult;
  termination: ChessGameTermination | null;
  timeControl: string | null;
  timeControlType: ChessTimeControlType | null;
  status: Generated<ChessGameStatus>;
  eventName: string | null;
  playedAt: Date | string;

  // Opening
  openingEco: string | null;
  openingName: string | null;

  // Analysis status
  analyzed: Generated<boolean>;
  analysisCompletedAt: Date | string | null;
  analysisEngine: string | null;

  // Game statistics (computed from analysis)
  totalMoves: number | null;
  userAccuracy: number | null;
  opponentAccuracy: number | null;
  userAvgCentipawnLoss: number | null;
  opponentAvgCentipawnLoss: number | null;
  userBlunders: Generated<number>;
  userMistakes: Generated<number>;
  userInaccuracies: Generated<number>;
  userTimeTrouble: Generated<boolean>;

  // Flags
  isPublic: Generated<boolean>;
  isFavorite: Generated<boolean>;

  // Metadata
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
  deletedAt: DeletedAt;
}

export type Game = Selectable<GameTable>;
export type GameCreate = Insertable<GameTable>;
export type GameUpdate = Updateable<GameTable>;
