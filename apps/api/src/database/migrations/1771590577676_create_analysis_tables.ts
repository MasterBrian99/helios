import { type Kysely, sql } from 'kysely';

const gamePositionsTable = 'game_positions';
const mistakesTable = 'mistakes';
const mistakePatternsTable = 'mistake_patterns';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(gamePositionsTable)
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
        sql`move_quality IN ('good', 'inaccuracy', 'mistake', 'blunder')`,
      ),
    )
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex('idx_game_positions_game_id')
    .on(gamePositionsTable)
    .column('game_id')
    .execute();

  await db.schema
    .createTable(mistakesTable)
    .addColumn('mistake_id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('game_id', 'uuid', (col) =>
      col.references('games.id').onDelete('cascade').notNull(),
    )
    .addColumn('position_id', 'uuid', (col) =>
      col.references('game_positions.position_id').onDelete('cascade'),
    )
    .addColumn('mistake_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('severity', 'varchar(20)', (col) =>
      col
        .notNull()
        .check(sql`severity IN ('inaccuracy', 'mistake', 'blunder')`),
    )
    .addColumn('centipawn_loss', 'real')
    .addColumn('fen', 'text', (col) => col.notNull())
    .addColumn('move_played', 'varchar(20)')
    .addColumn('best_move', 'varchar(20)')
    .addColumn('move_number', 'integer')
    .addColumn('explanation', 'text')
    .addColumn('has_been_reviewed', 'boolean', (col) => col.defaultTo(false))
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex('idx_mistakes_user_id')
    .on(mistakesTable)
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_mistakes_game_id')
    .on(mistakesTable)
    .column('game_id')
    .execute();

  await db.schema
    .createTable(mistakePatternsTable)
    .addColumn('pattern_id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('mistake_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('occurrence_count', 'integer', (col) => col.defaultTo(1))
    .addColumn('first_occurrence', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('last_occurrence', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('priority_score', 'real')
    .addColumn('updated_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex('idx_mistake_patterns_user_id')
    .on(mistakePatternsTable)
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_mistake_patterns_unique')
    .on(mistakePatternsTable)
    .columns(['user_id', 'mistake_type'])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(mistakePatternsTable).execute();
  await db.schema.dropTable(mistakesTable).execute();
  await db.schema.dropTable(gamePositionsTable).execute();
}
