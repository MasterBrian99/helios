import { Controller, Post, Body } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { Auth } from 'src/common/decorators';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  async create(
    @Auth('sub') userId: string,
    @Body() createGameDto: CreateGameDto,
  ) {
    return await this.gameService.create(userId, createGameDto);
  }
}
