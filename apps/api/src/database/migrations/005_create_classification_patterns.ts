import { type Kysely, sql } from 'kysely';

const tableName = 'classification_patterns';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable(tableName)
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
    .on(tableName)
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_classification_patterns_unique')
    .on(tableName)
    .columns(['user_id', 'mistake_type'])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable(tableName).execute();
}
