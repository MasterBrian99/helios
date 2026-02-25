import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OffsetPaginationBaseDto } from 'src/common/dtos/offset-pagination-base.dto';
import { ChessGameTermination } from '../enums/chess-game-termination.enum';
import { ChessTimeControlType } from '../enums/chess-time-control-type.enum';
import { ChessResult } from '../enums/chess-game-result';

export class GameListFilterDto extends OffsetPaginationBaseDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ChessGameTermination)
  termination?: ChessGameTermination;

  @IsOptional()
  @IsEnum(ChessTimeControlType)
  timeControlType?: ChessTimeControlType;

  @IsOptional()
  @IsEnum(ChessResult)
  result?: ChessResult;
}
