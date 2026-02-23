import { Controller, Post, Body, Query, Get } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { Auth } from 'src/common/decorators';
import { GameListFilterDto } from './dto/game-list-filter.dto';

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

  @Get()
  async listGames(
    @Auth('sub') userId: string,
    @Query() gameListFilterDto: GameListFilterDto,
  ) {
    return await this.gameService.listGames(userId, gameListFilterDto);
  }
}
