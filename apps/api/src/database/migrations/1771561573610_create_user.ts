import { Kysely, sql } from 'kysely';

const tableName = 'users';
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(tableName)
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('username', 'varchar(30)', (col) => col.unique().notNull())
    .addColumn('email', 'text', (col) => col.unique().notNull())
    .addColumn('password', 'text', (col) => col.notNull())
    .addColumn('full_name', 'text')

    // Chess profile
    .addColumn('current_rating', 'integer', (col) => col.defaultTo(1200))
    .addColumn('playing_style', 'varchar(50)')
    .addColumn('years_playing', 'integer')

    // Account status
    .addColumn('email_verified', 'boolean', (col) => col.defaultTo(false))
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(true))

    // Settings
    .addColumn('preferred_language', 'varchar(10)', (col) =>
      col.defaultTo('en'),
    )
    .addColumn('timezone', 'varchar(50)', (col) => col.defaultTo('UTC'))
    .addColumn('explanation_level', 'varchar(20)', (col) =>
      col.defaultTo('intermediate'),
    )

    // Privacy
    .addColumn('profile_public', 'boolean', (col) => col.defaultTo(true))
    .addColumn('show_rating_publicly', 'boolean', (col) => col.defaultTo(true))
    .addColumn('allow_friend_requests', 'boolean', (col) => col.defaultTo(true))

    // Metadata
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('last_login_at', 'timestamp')
    .addColumn('last_active_at', 'timestamp')
    .addColumn('deleted_at', 'timestamp')

    // Constraints
    .addCheckConstraint(
      'users_current_rating_check',
      sql`current_rating >= 400 AND current_rating <= 3000`,
    )
    .addCheckConstraint(
      'users_playing_style_check',
      sql`playing_style IN ('aggressive', 'positional', 'solid', 'tactical', 'unknown')`,
    )
    .addCheckConstraint(
      'users_explanation_level_check',
      sql`explanation_level IN ('beginner', 'intermediate', 'advanced')`,
    )

    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable(tableName).execute();
}
