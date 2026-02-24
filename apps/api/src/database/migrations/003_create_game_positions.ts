import { type Kysely, sql } from 'kysely';

const tableName = 'game_positions';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(tableName)
    .addColumn('position_id', 'uuid', (col) => col.primaryKey())
    .addColumn('game_id', 'uuid', (col) =>
      col.references('games.id').onDelete('cascade').notNull(),
    )
    .addColumn('move_number', 'integer', (col) => col.notNull())
    .addColumn('fen', 'text', (col) => col.notNull())
    .addColumn('move_played', 'varchar(20)')
    .addColumn('is_user_move', 'boolean')
    .addColumn('eval_before', 'real')
    .addColumn('eval_after', 'real')
    .addColumn('centipawn_loss', 'real')
    .addColumn('best_move', 'varchar(20)')
    .addColumn('best_move_eval', 'real')
    .addColumn('move_quality', 'varchar(20)', (col) =>
      col.check(
        sql`move_quality IN ('brilliant', 'great', 'good', 'book', 'inaccuracy', 'mistake', 'blunder')`,
      ),
    )
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex('idx_game_positions_game_id')
    .on(tableName)
    .column('game_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(tableName).execute();
}
