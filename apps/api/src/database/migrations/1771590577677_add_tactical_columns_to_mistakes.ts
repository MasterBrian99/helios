import { type Kysely, sql } from 'kysely';

const mistakesTable = 'mistakes';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable(mistakesTable)
    .addColumn('tactical_pattern', 'varchar(50)', (col) =>
      col.check(
        sql`tactical_pattern IN ('forced_mate', 'queen_mating_attack', 'back_rank_mate', 'smothered_mate', 'fork', 'pin', 'skewer', 'discovered_attack', 'defensive_collapse', 'king_hunt', 'material_blunder', 'positional_error', 'missed_mate', 'hanging_piece', 'tactical_sequence', 'defensive_error', 'calculation_error')`,
      ),
    )
    .execute();

  await db.schema
    .alterTable(mistakesTable)
    .addColumn('mate_in', 'integer')
    .execute();

  await db.schema
    .alterTable(mistakesTable)
    .addColumn('sequence_start', 'integer')
    .execute();

  await db.schema
    .alterTable(mistakesTable)
    .addColumn('sequence_end', 'integer')
    .execute();

  await db.schema
    .alterTable(mistakesTable)
    .addColumn('difficulty', 'integer')
    .execute();

  await db.schema
    .alterTable(mistakesTable)
    .addColumn('tactical_features', 'jsonb')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable(mistakesTable)
    .dropColumn('tactical_pattern')
    .dropColumn('mate_in')
    .dropColumn('sequence_start')
    .dropColumn('sequence_end')
    .dropColumn('difficulty')
    .dropColumn('tactical_features')
    .execute();
}
