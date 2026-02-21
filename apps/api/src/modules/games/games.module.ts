import { Module } from '@nestjs/common';
import { GameModule } from './game/game.module';

@Module({
  controllers: [],
  providers: [],
  imports: [GameModule],
})
export class GamesModule {}
