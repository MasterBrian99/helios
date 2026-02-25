import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PgBossService } from '@wavezync/nestjs-pgboss';
import { Job } from 'pg-boss';
import { AnalysisService } from '../analysis.service';

export const ANALYZE_GAME_JOB = 'analyze-game';

export interface AnalyzeGameJobData {
  gameId: string;
  userId: string;
}

@Injectable()
export class AnalyzeGameJob implements OnModuleInit {
  private readonly logger = new Logger(AnalyzeGameJob.name);

  constructor(
    private readonly analysisService: AnalysisService,
    private readonly pgBossService: PgBossService,
  ) {}

  async onModuleInit() {
    try {
      await this.pgBossService.boss.createQueue(ANALYZE_GAME_JOB);
      this.logger.log(`Created queue: ${ANALYZE_GAME_JOB}`);
    } catch {
      this.logger.debug(`Queue ${ANALYZE_GAME_JOB} may already exist`);
    }

    await this.pgBossService.boss.work<AnalyzeGameJobData>(
      ANALYZE_GAME_JOB,
      async (jobs: Job<AnalyzeGameJobData>[]) => {
        for (const job of jobs) {
          await this.handle(job.data);
        }
      },
    );
    this.logger.log(`Registered job handler: ${ANALYZE_GAME_JOB}`);
  }

  async handle(data: AnalyzeGameJobData): Promise<void> {
    this.logger.log(`Processing analysis job for game ${data.gameId}`);

    try {
      await this.analysisService.analyzeGame(data.gameId, data.userId);
      this.logger.log(`Completed analysis job for game ${data.gameId}`);
    } catch (error) {
      this.logger.error(`Failed to analyze game ${data.gameId}: ${error}`);
      throw error;
    }
  }
}
