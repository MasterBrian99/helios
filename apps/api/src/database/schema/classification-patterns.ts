import {
  Generated,
  Insertable,
  Selectable,
  Updateable,
  ColumnType,
} from 'kysely';
import { CreatedAt, UpdatedAt } from './common/datetime';
import { MistakeType } from './move-classifications';

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  string | undefined
>;

export interface ClassificationPatternTable {
  patternId: Generated<string>;
  userId: string;
  mistakeType: MistakeType;
  occurrenceCount: Generated<number>;
  firstOccurrence: CreatedAt;
  lastOccurrence: TimestampColumn;
  priorityScore: number | null;
  updatedAt: UpdatedAt;
}

export type ClassificationPattern = Selectable<ClassificationPatternTable>;
export type ClassificationPatternCreate =
  Insertable<ClassificationPatternTable>;
export type ClassificationPatternUpdate =
  Updateable<ClassificationPatternTable>;
