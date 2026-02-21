import { Injectable } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { GameRepository } from './game.repository';
import { PgnParserService, ParsedGame } from './pgn-parser.service';
import { GameCreate } from 'src/database/schema/games';
import { getUUID } from 'src/utils/uuid-gen';
import { withTimestamps } from 'src/database/utils/datetime';
import { StandardResponse } from 'src/common/dto/standard-response.dto';

@Injectable()
export class GameService {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly pgnParserService: PgnParserService,
  ) {}

  async create(
    userId: string,
    createGameDto: CreateGameDto,
  ): Promise<StandardResponse> {
    const allParsedGames: ParsedGame[] = [];

    for (const pgnString of createGameDto.pgn) {
      const parsed = this.pgnParserService.parseMultiplePgns(pgnString);
      allParsedGames.push(...parsed);
    }

    const gamesToInsert: GameCreate[] = allParsedGames.map((game) =>
      withTimestamps({
        id: getUUID(),
        userId,
        pgn: game.pgn,
        source: createGameDto.source,
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        whiteRating: game.whiteRating,
        blackRating: game.blackRating,
        result: game.result,
        termination: game.termination,
        timeControl: game.timeControl,
        timeControlType: game.timeControlType,
        eventName: game.eventName,
        playedAt: game.playedAt ?? new Date(),
        openingEco: game.openingEco,
        openingName: game.openingName,
        totalMoves: game.totalMoves,
      }),
    );

    await this.gameRepository.createGames(gamesToInsert);
    return {
      message: 'Games created successfully',
      statusCode: 201,
    };
  }
}
