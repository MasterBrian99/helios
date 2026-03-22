import { type Kysely, sql } from 'kysely';

const tableName = 'move_classifications';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(tableName)
    .addColumn('classification_id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('game_id', 'uuid', (col) =>
      col.references('games.id').onDelete('cascade').notNull(),
    )
    .addColumn('position_id', 'uuid', (col) =>
      col.references('game_positions.position_id').onDelete('cascade'),
    )
    .addColumn('classification', 'varchar(20)', (col) =>
      col
        .notNull()
        .check(
          sql`classification IN ('brilliant', 'great', 'best', 'book', 'miss', 'mistake', 'blunder')`,
        ),
    )
    .addColumn('mistake_type', 'varchar(50)')
    .addColumn('centipawn_loss', 'real')
    .addColumn('fen', 'text', (col) => col.notNull())
    .addColumn('move_played', 'varchar(20)')
    .addColumn('best_move', 'varchar(20)')
    .addColumn('move_number', 'integer')
    .addColumn('explanation', 'text')
    .addColumn('explanation_source', 'varchar(30)')
    .addColumn('explanation_validation_status', 'varchar(30)')
    .addColumn('explanation_validation_reason', 'text')
    .addColumn('analysis_version', 'varchar(50)')
    .addColumn('has_been_reviewed', 'boolean', (col) => col.defaultTo(false))
    .addColumn('tactical_pattern', 'varchar(50)')
    .addColumn('mate_in', 'integer')
    .addColumn('sequence_start', 'integer')
    .addColumn('sequence_end', 'integer')
    .addColumn('difficulty', 'integer')
    .addColumn('tactical_features', 'jsonb')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex('idx_move_classifications_user_id')
    .on(tableName)
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_move_classifications_game_id')
    .on(tableName)
    .column('game_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(tableName).execute();
}
