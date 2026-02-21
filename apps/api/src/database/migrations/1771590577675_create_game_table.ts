import { type Kysely, sql } from 'kysely';
import { ChessResult } from '../../modules/games/game/enums/chess-game-result';
import { ChessGameSource } from '../../modules/games/game/enums/chess-game-source.enum';
import { ChessTimeControlType } from '../../modules/games/game/enums/chess-time-control-type.enum';
import { ChessUserColor } from '../../modules/games/game/enums/chess-user-color.enum';
import { DB } from '../schema/db';
import { ChessGameStatus } from '../../modules/games/game/enums/chess-game-status.enum';
import { ChessGameTermination } from '../../modules/games/game/enums/chess-game-termination.enum';

const tableName = 'games';
export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable(tableName)
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )

    // Game metadata
    .addColumn('pgn', 'text', (col) => col.notNull())
    .addColumn('source', 'varchar(50)', (col) =>
      col.check(
        sql`source IN (${sql.join(
          (
            [
              ChessGameSource.UPLOAD,
              ChessGameSource.CHESS_COM,
              ChessGameSource.LICHESS,
              ChessGameSource.MANUAL,
              ChessGameSource.OTB,
            ] as const satisfies readonly `${ChessGameSource}`[]
          ).map((code) => sql.lit(code)),
        )})`,
      ),
    )
    .addColumn('external_game_id', 'varchar(255)')

    // Players
    .addColumn('white_player', 'varchar(100)', (col) => col.notNull())
    .addColumn('white_rating', 'integer')
    .addColumn('black_player', 'varchar(100)', (col) => col.notNull())
    .addColumn('black_rating', 'integer')
    .addColumn('user_color', 'varchar(10)', (col) =>
      col.check(
        sql`user_color IN (${sql.join(
          (
            [
              ChessUserColor.White,
              ChessUserColor.Black,
            ] as const satisfies readonly `${ChessUserColor}`[]
          ).map((code) => sql.lit(code)),
        )})`,
      ),
    )

    // Game details
    .addColumn('result', 'varchar(10)', (col) =>
      col
        .notNull()
        .check(
          sql`result IN (${sql.join(
            (
              [
                ChessResult.WhiteWin,
                ChessResult.BlackWin,
                ChessResult.Draw,
                ChessResult.Ongoing,
              ] as const satisfies readonly `${ChessResult}`[]
            ).map((code) => sql.lit(code)),
          )})`,
        ),
    )
    .addColumn('termination', 'varchar(50)', (col) =>
      col.check(
        sql`termination IN (${sql.join(
          (
            [
              ChessGameTermination.Checkmate,
              ChessGameTermination.Resignation,
              ChessGameTermination.DrawAgreement,
              ChessGameTermination.Stalemate,
              ChessGameTermination.ThreefoldRepetition,
              ChessGameTermination.FivefoldRepetition,
              ChessGameTermination.FiftyMoveRule,
              ChessGameTermination.SeventyFiveMoveRule,
              ChessGameTermination.InsufficientMaterial,
              ChessGameTermination.TimeForfeit,
              ChessGameTermination.Abandoned,
            ] as const satisfies readonly `${ChessGameTermination}`[]
          ).map((code) => sql.lit(code)),
        )})`,
      ),
    )
    .addColumn('time_control', 'varchar(50)')
    .addColumn('time_control_type', 'varchar(20)', (col) =>
      col.check(
        sql`time_control_type IN (${sql.join(
          (
            [
              ChessTimeControlType.Bullet,
              ChessTimeControlType.Blitz,
              ChessTimeControlType.Rapid,
              ChessTimeControlType.Classical,
              ChessTimeControlType.Correspondence,
            ] as const satisfies readonly `${ChessTimeControlType}`[]
          ).map((code) => sql.lit(code)),
        )})`,
      ),
    )
    .addColumn('status', 'varchar(20)', (col) =>
      col
        .check(
          sql`status IN (${sql.join(
            (
              [
                ChessGameStatus.Started,
                ChessGameStatus.Finished,
                ChessGameStatus.Aborted,
              ] as const satisfies readonly `${ChessGameStatus}`[]
            ).map((code) => sql.lit(code)),
          )})`,
        )
        .defaultTo(ChessGameStatus.Started),
    )
    .addColumn('event_name', 'varchar(255)')
    .addColumn('played_at', 'timestamp', (col) => col.notNull())

    // Opening
    .addColumn('opening_eco', 'varchar(10)')
    .addColumn('opening_name', 'varchar(255)')

    // Analysis status
    .addColumn('analyzed', 'boolean', (col) => col.defaultTo(false))
    .addColumn('analysis_completed_at', 'timestamp')
    .addColumn('analysis_engine', 'varchar(50)')

    // Game statistics (computed from analysis)
    .addColumn('total_moves', 'integer')
    .addColumn('user_accuracy', 'real')
    .addColumn('opponent_accuracy', 'real')
    .addColumn('user_avg_centipawn_loss', 'real')
    .addColumn('opponent_avg_centipawn_loss', 'real')
    .addColumn('user_blunders', 'integer', (col) => col.defaultTo(0))
    .addColumn('user_mistakes', 'integer', (col) => col.defaultTo(0))
    .addColumn('user_inaccuracies', 'integer', (col) => col.defaultTo(0))
    .addColumn('user_time_trouble', 'boolean', (col) => col.defaultTo(false))

    // Flags
    .addColumn('is_public', 'boolean', (col) => col.defaultTo(false))
    .addColumn('is_favorite', 'boolean', (col) => col.defaultTo(false))

    // Metadata
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('deleted_at', 'timestamp')
    .execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.dropTable('games').execute();
}
