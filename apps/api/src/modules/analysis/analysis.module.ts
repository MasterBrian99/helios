import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisRepository } from './analysis.repository';
import { MoveEvaluatorService } from './move-evaluator.service';
import { LlmExplainerService } from './llm-explainer.service';
import { AnalyzeGameJob } from './jobs/analyze-game.job';
import { ChessEnginesModule } from '../../chess-engines';
import { TacticalFeatureService } from './tactical-feature.service';
import { DeterministicMistakeBuilderService } from './deterministic-mistake-builder.service';
import { SequenceMergerService } from './sequence-merger.service';
import { MotifClassifierService } from './motif-classifier.service';

@Module({
  imports: [ChessEnginesModule],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    AnalysisRepository,
    MoveEvaluatorService,
    LlmExplainerService,
    AnalyzeGameJob,
    TacticalFeatureService,
    DeterministicMistakeBuilderService,
    SequenceMergerService,
    MotifClassifierService,
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
