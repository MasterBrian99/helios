import { Kysely, sql } from 'kysely';

const GAME_POSITIONS = 'game_positions';
const MOVE_CLASSIFICATIONS = 'move_classifications';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    UPDATE ${sql.raw(GAME_POSITIONS)}
    SET move_quality = 'best'
    WHERE move_quality = 'good'
  `.execute(db);

  await sql`
    UPDATE ${sql.raw(GAME_POSITIONS)}
    SET move_quality = 'miss'
    WHERE move_quality = 'inaccuracy'
  `.execute(db);

  await sql`
    UPDATE ${sql.raw(MOVE_CLASSIFICATIONS)}
    SET classification = 'best'
    WHERE classification = 'good'
  `.execute(db);

  await sql`
    UPDATE ${sql.raw(MOVE_CLASSIFICATIONS)}
    SET classification = 'miss'
    WHERE classification = 'inaccuracy'
  `.execute(db);

  const gamePositionChecks = await sql<{ conname: string }>`
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = ${GAME_POSITIONS}
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%move_quality%'
  `.execute(db);

  for (const row of gamePositionChecks.rows) {
    await sql
      .raw(
        `ALTER TABLE ${GAME_POSITIONS} DROP CONSTRAINT IF EXISTS "${row.conname}"`,
      )
      .execute(db);
  }

  await sql`
    ALTER TABLE ${sql.raw(GAME_POSITIONS)}
    ADD CONSTRAINT game_positions_move_quality_check
    CHECK (move_quality IN ('brilliant', 'great', 'best', 'book', 'miss', 'mistake', 'blunder'))
  `.execute(db);

  const classificationChecks = await sql<{ conname: string }>`
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = ${MOVE_CLASSIFICATIONS}
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%classification%'
  `.execute(db);

  for (const row of classificationChecks.rows) {
    await sql
      .raw(
        `ALTER TABLE ${MOVE_CLASSIFICATIONS} DROP CONSTRAINT IF EXISTS "${row.conname}"`,
      )
      .execute(db);
  }

  await sql`
    ALTER TABLE ${sql.raw(MOVE_CLASSIFICATIONS)}
    ADD CONSTRAINT move_classifications_classification_check
    CHECK (classification IN ('brilliant', 'great', 'best', 'book', 'miss', 'mistake', 'blunder'))
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    UPDATE ${sql.raw(GAME_POSITIONS)}
    SET move_quality = 'good'
    WHERE move_quality = 'best'
  `.execute(db);

  await sql`
    UPDATE ${sql.raw(GAME_POSITIONS)}
    SET move_quality = 'inaccuracy'
    WHERE move_quality = 'miss'
  `.execute(db);

  await sql`
    UPDATE ${sql.raw(MOVE_CLASSIFICATIONS)}
    SET classification = 'good'
    WHERE classification = 'best'
  `.execute(db);

  await sql`
    UPDATE ${sql.raw(MOVE_CLASSIFICATIONS)}
    SET classification = 'inaccuracy'
    WHERE classification = 'miss'
  `.execute(db);

  await sql`
    ALTER TABLE ${sql.raw(GAME_POSITIONS)}
    DROP CONSTRAINT IF EXISTS game_positions_move_quality_check
  `.execute(db);

  await sql`
    ALTER TABLE ${sql.raw(GAME_POSITIONS)}
    ADD CONSTRAINT game_positions_move_quality_check
    CHECK (move_quality IN ('brilliant', 'great', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'))
  `.execute(db);

  await sql`
    ALTER TABLE ${sql.raw(MOVE_CLASSIFICATIONS)}
    DROP CONSTRAINT IF EXISTS move_classifications_classification_check
  `.execute(db);

  await sql`
    ALTER TABLE ${sql.raw(MOVE_CLASSIFICATIONS)}
    ADD CONSTRAINT move_classifications_classification_check
    CHECK (classification IN ('brilliant', 'great', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'))
  `.execute(db);
}
