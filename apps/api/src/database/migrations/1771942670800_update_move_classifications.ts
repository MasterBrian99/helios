import { type Kysely, sql } from 'kysely';

const moveClassificationsTable = 'move_classifications';
const classificationPatternsTable = 'classification_patterns';
const gamePositionsTable = 'game_positions';
const gamesTable = 'games';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(moveClassificationsTable)
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
          sql`classification IN ('brilliant', 'great', 'good', 'book', 'inaccuracy', 'mistake', 'blunder')`,
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
    .on(moveClassificationsTable)
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_move_classifications_game_id')
    .on(moveClassificationsTable)
    .column('game_id')
    .execute();

  await db.schema
    .createTable(classificationPatternsTable)
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
    .createIndex('idx_classification_patterns_user_id')
    .on(classificationPatternsTable)
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_classification_patterns_unique')
    .on(classificationPatternsTable)
    .columns(['user_id', 'mistake_type'])
    .unique()
    .execute();

  await db.schema
    .alterTable(gamePositionsTable)
    .dropConstraint('game_positions_move_quality_check')
    .execute();

  await db.schema
    .alterTable(gamePositionsTable)
    .modifyColumn('move_quality', 'varchar(20)', (col) =>
      col.check(
        sql`move_quality IN ('brilliant', 'great', 'good', 'book', 'inaccuracy', 'mistake', 'blunder')`,
      ),
    )
    .execute();

  await db.schema
    .alterTable(gamesTable)
    .addColumn('user_brilliants', 'integer', (col) => col.defaultTo(0))
    .execute();

  await db.schema
    .alterTable(gamesTable)
    .addColumn('user_greats', 'integer', (col) => col.defaultTo(0))
    .execute();

  await db.schema
    .alterTable(gamesTable)
    .addColumn('user_book_moves', 'integer', (col) => col.defaultTo(0))
    .execute();

  await db.schema.dropTable('mistake_patterns').execute();
  await db.schema.dropTable('mistakes').execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('mistakes')
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
    .createTable('mistake_patterns')
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
    .alterTable(gamesTable)
    .dropColumn('user_brilliants')
    .dropColumn('user_greats')
    .dropColumn('user_book_moves')
    .execute();

  await db.schema
    .alterTable(gamePositionsTable)
    .dropConstraint('game_positions_move_quality_check')
    .execute();

  await db.schema
    .alterTable(gamePositionsTable)
    .modifyColumn('move_quality', 'varchar(20)', (col) =>
      col.check(
        sql`move_quality IN ('good', 'inaccuracy', 'mistake', 'blunder')`,
      ),
    )
    .execute();

  await db.schema.dropTable(classificationPatternsTable).execute();
  await db.schema.dropTable(moveClassificationsTable).execute();
}
