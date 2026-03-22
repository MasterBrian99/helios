import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ChessGameSource } from '../enums/chess-game-source.enum';

export class CreateGameDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  pgn: string[];

  @IsEnum(ChessGameSource)
  @IsNotEmpty()
  source: ChessGameSource = ChessGameSource.UPLOAD;
}
