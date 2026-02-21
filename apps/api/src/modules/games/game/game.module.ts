import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameRepository } from './game.repository';
import { PgnParserService } from './pgn-parser.service';

@Module({
  controllers: [GameController],
  providers: [GameService, GameRepository, PgnParserService],
})
export class GameModule {}
