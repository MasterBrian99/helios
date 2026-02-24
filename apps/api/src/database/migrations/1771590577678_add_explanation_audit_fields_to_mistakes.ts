import { type Kysely, sql } from 'kysely';

const mistakesTable = 'mistakes';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable(mistakesTable)
    .addColumn('explanation_source', 'varchar(30)', (col) =>
      col.check(sql`explanation_source IN ('llm', 'deterministic_fallback')`),
    )
    .execute();

  await db.schema
    .alterTable(mistakesTable)
    .addColumn('explanation_validation_status', 'varchar(40)', (col) =>
      col.check(
        sql`explanation_validation_status IN ('passed', 'failed_then_fallback', 'llm_unavailable')`,
      ),
    )
    .execute();

  await db.schema
    .alterTable(mistakesTable)
    .addColumn('explanation_validation_reason', 'text')
    .execute();

  await db.schema
    .alterTable(mistakesTable)
    .addColumn('analysis_version', 'varchar(50)', (col) =>
      col.defaultTo('v2-deterministic-core'),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable(mistakesTable)
    .dropColumn('explanation_source')
    .dropColumn('explanation_validation_status')
    .dropColumn('explanation_validation_reason')
    .dropColumn('analysis_version')
    .execute();
}
