import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisRepository } from './analysis.repository';
import { MoveEvaluatorService } from './move-evaluator.service';
import { LlmExplainerService } from './llm-explainer.service';
import { AnalyzeGameJob } from './jobs/analyze-game.job';
import { StockfishModule } from '../../stockfish/stockfish.module';

@Module({
  imports: [StockfishModule],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    AnalysisRepository,
    MoveEvaluatorService,
    LlmExplainerService,
    AnalyzeGameJob,
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
