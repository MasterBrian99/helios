import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameRepository } from './game.repository';
import { PgnParserService } from './pgn-parser.service';
import { OpeningService } from './opening.service';

@Module({
  controllers: [GameController],
  providers: [GameService, GameRepository, PgnParserService, OpeningService],
})
export class GameModule {}
