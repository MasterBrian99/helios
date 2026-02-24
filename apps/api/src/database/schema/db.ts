import { UserTable } from './users';
import { GameTable } from './games';
import { GamePositionTable } from './game-positions';
import { MoveClassificationTable } from './move-classifications';
import { ClassificationPatternTable } from './classification-patterns';

export interface DB {
  users: UserTable;
  games: GameTable;
  gamePositions: GamePositionTable;
  moveClassifications: MoveClassificationTable;
  classificationPatterns: ClassificationPatternTable;
}
