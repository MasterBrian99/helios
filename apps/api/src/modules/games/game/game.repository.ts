import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/database/schema/db';
import { GameCreate } from 'src/database/schema/games';

@Injectable()
export class GameRepository {
  constructor(@InjectKysely() private readonly kdb: Kysely<DB>) {}

  async createGame(game: GameCreate) {
    return await this.kdb
      .insertInto('games')
      .values(game)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async createGames(games: GameCreate[]) {
    if (games.length === 0) return [];

    return await this.kdb
      .insertInto('games')
      .values(games)
      .returningAll()
      .execute();
  }
}
