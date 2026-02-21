import { UserTable } from './users';
import { GameTable } from './games';

export interface DB {
  users: UserTable;
  games: GameTable;
}
