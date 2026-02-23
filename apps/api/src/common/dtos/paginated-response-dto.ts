import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<TData> {
  @ApiProperty({ description: 'Total count of results', example: 100 })
  totalCount: number;

  @ApiProperty({ description: 'page', example: 10 })
  page: number;

  @ApiProperty({ description: 'Total pages', example: 10 })
  totalPages: number;

  results: TData[];
}
