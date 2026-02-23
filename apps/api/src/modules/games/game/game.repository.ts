import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/database/schema/db';
import { GameCreate } from 'src/database/schema/games';
import { GameListFilterDto } from './dto/game-list-filter.dto';
import { isDefined } from 'class-validator';
import { paginateWithOffset } from 'src/common/utils/toPaginatedResult';

@Injectable()
export class GameRepository {
  constructor(@InjectKysely() private readonly kdb: Kysely<DB>) {}

  async createGames(games: GameCreate[]) {
    if (games.length === 0) return [];

    return await this.kdb
      .insertInto('games')
      .values(games)
      .returningAll()
      .execute();
  }

  async listGames(userId: string, gameListFilterDto: GameListFilterDto) {
    const { page, pageSize, search, result, termination, timeControlType } =
      gameListFilterDto;

    const baseQuery = this.kdb
      .selectFrom('games')
      .select([
        'id',
        'blackPlayer',
        'whitePlayer',
        'result',
        'termination',
        'timeControlType',
        'source',
        'whiteRating',
        'blackRating',
        'timeControl',
        'status',
        'openingName',
        'totalMoves',
        'analyzed',
      ])
      .$if(isDefined(search), (qb) =>
        qb.where('blackPlayer', 'ilike', `%${search}%`),
      )
      .$if(isDefined(result), (qb) => qb.where('result', '=', result!))
      .$if(isDefined(termination), (qb) =>
        qb.where('termination', '=', termination!),
      )
      .$if(isDefined(timeControlType), (qb) =>
        qb.where('timeControlType', '=', timeControlType!),
      )
      .where('userId', '=', userId);

    const { results } = await paginateWithOffset(baseQuery, page, pageSize);
    console.log(results);

    return results;
  }
}
