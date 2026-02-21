import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ChessGameSource } from '../enums/chess-game-source.enum';

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  pgn: string;

  @IsEnum(ChessGameSource)
  @IsNotEmpty()
  source: ChessGameSource = ChessGameSource.UPLOAD;
}
