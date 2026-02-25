import { Module } from '@nestjs/common';
import { GameService } from './service/game.service';
import { OpeningService } from './service/opening.service';
import { PgnParserService } from './service/pgn-parser.service';
import { GameRepository } from './repository/game.repository';
import { GameController } from './controller/game.controller';

@Module({
  controllers: [GameController],
  providers: [],
  imports: [GameService, GameRepository, PgnParserService, OpeningService],
})
export class GamesModule {}
