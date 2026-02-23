import { SelectQueryBuilder } from 'kysely';
import { PaginatedResponseDto } from '../dtos/paginated-response-dto';

export interface OffsetPaginationResult<T> {
  results: T[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export function toPaginatedDto<T, R>(
  source: OffsetPaginationResult<T>,
  mapFn: (item: T) => R,
): PaginatedResponseDto<R> {
  return {
    totalCount: source.totalCount,
    page: source.page,
    totalPages: source.totalPages,
    results: source.results.map(mapFn),
  };
}

export async function paginateWithOffset<T>(
  qb: SelectQueryBuilder<any, any, T>,
  page: number | undefined = 0,
  pageSize: number | undefined = 20,
): Promise<OffsetPaginationResult<T>> {
  const offset = page * pageSize;

  const [results, totalRow] = await Promise.all([
    qb.offset(offset).limit(pageSize).execute(),
    qb
      .clearSelect()
      .clearOrderBy()
      .clearGroupBy()
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  const totalCount = Number(totalRow.count);
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    results,
    totalCount,
    page,
    totalPages,
  };
}
