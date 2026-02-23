import { UserTable } from './users';
import { GameTable } from './games';
import { GamePositionTable } from './game-positions';
import { MistakeTable } from './mistakes';
import { MistakePatternTable } from './mistake-patterns';

export interface DB {
  users: UserTable;
  games: GameTable;
  gamePositions: GamePositionTable;
  mistakes: MistakeTable;
  mistakePatterns: MistakePatternTable;
}
