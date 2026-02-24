import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PgBossService } from '@wavezync/nestjs-pgboss';
import { ANALYZE_GAME_JOB, AnalyzeGameJobData } from './jobs/analyze-game.job';
import { Auth } from 'src/common/decorators';

@ApiTags('analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly pgBossService: PgBossService,
  ) {}

  @Post(':gameId')
  @ApiOperation({ summary: 'Queue a game for analysis' })
  async queueAnalysis(
    @Param('gameId') gameId: string,
    @Auth('sub') userId: string,
  ) {
    await this.analysisService.queueGameAnalysis(gameId, userId);

    const jobData: AnalyzeGameJobData = { gameId, userId };
    await this.pgBossService.scheduleJob(ANALYZE_GAME_JOB, jobData);

    return {
      message: 'Game analysis queued',
      gameId,
    };
  }

  @Get(':gameId')
  @ApiOperation({ summary: 'Get analysis results for a game' })
  async getAnalysis(
    @Param('gameId') gameId: string,
    @Auth('sub') userId: string,
  ) {
    return this.analysisService.getAnalysisResults(gameId, userId);
  }

  @Get(':gameId/mistakes')
  @ApiOperation({ summary: 'Get mistakes for a specific game' })
  async getMistakes(
    @Param('gameId') gameId: string,
    @Auth('sub') userId: string,
  ) {
    return this.analysisService.getMistakesByGame(gameId, userId);
  }

  @Get('mistakes')
  @ApiOperation({ summary: 'Get user mistakes with pagination' })
  async getUserMistakes(
    @Auth('sub') userId: string,

    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.analysisService.getUserMistakes(userId, limitNum, offsetNum);
  }

  @Get('patterns')
  @ApiOperation({ summary: 'Get user mistake patterns' })
  async getMistakePatterns(@Request() req: { user: { sub: string } }) {
    return this.analysisService.getUserMistakePatterns(req.user.sub);
  }
}
