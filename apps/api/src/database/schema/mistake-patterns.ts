import {
  Generated,
  Insertable,
  Selectable,
  Updateable,
  ColumnType,
} from 'kysely';
import { CreatedAt, UpdatedAt } from './common/datetime';
import { MistakeType } from './mistakes';

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  string | undefined
>;

export interface MistakePatternTable {
  patternId: Generated<string>;
  userId: string;
  mistakeType: MistakeType;
  occurrenceCount: Generated<number>;
  firstOccurrence: CreatedAt;
  lastOccurrence: TimestampColumn;
  priorityScore: number | null;
  updatedAt: UpdatedAt;
}

export type MistakePattern = Selectable<MistakePatternTable>;
export type MistakePatternCreate = Insertable<MistakePatternTable>;
export type MistakePatternUpdate = Updateable<MistakePatternTable>;
