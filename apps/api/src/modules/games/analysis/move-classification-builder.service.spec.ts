import { MoveClassificationBuilderService } from './move-classification-builder.service';
import { TacticalFeatures } from './tactical-feature.service';
import { PatternAnalysis } from './motif-classifier.service';

describe('MoveClassificationBuilderService', () => {
  const service = new MoveClassificationBuilderService();

  const features: TacticalFeatures = {
    isCheck: false,
    isCapture: false,
    isSacrifice: false,
    materialSwing: 0,
    kingSafetyScore: 80,
    isBackRankExposed: false,
    phase: 'middlegame',
    pieceActivity: 5,
    materialBalance: 0,
    kingExposed: false,
    queenAttacking: false,
    knightAttacking: false,
    rookAttacking: false,
  };

  const patternAnalysis: PatternAnalysis = {
    pattern: 'positional_error',
    description: 'positional_error',
    difficulty: 50,
    keyPiece: null,
    isCheckmateRelated: false,
  };

  it('produces non-empty deterministic comparison arrays', () => {
    const result = service.build({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      movePlayed: 'h3',
      bestMove: 'Nf3',
      phase: 'opening',
      engineEvaluation: {
        centipawnLoss: 70,
        mateBefore: null,
        mateAfter: null,
        evalBefore: 20,
        evalAfter: -50,
      },
      features,
      patternAnalysis,
      classification: 'mistake',
    });

    expect(result.comparison.bestMoveBenefits.length).toBeGreaterThan(0);
    expect(result.comparison.movePlayedConsequences.length).toBeGreaterThan(0);
    expect(result.centipawnLoss).toBe(70);
    expect(result.classification).toBe('mistake');
  });

  it('detects missed mate from engine evaluation fields', () => {
    const result = service.build({
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
      movePlayed: 'a3',
      bestMove: 'Bc4',
      phase: 'middlegame',
      engineEvaluation: {
        centipawnLoss: 400,
        mateBefore: 3,
        mateAfter: null,
        evalBefore: 500,
        evalAfter: 100,
      },
      features,
      patternAnalysis,
      classification: 'blunder',
    });

    expect(result.tactical.missedMate).toBe(true);
    expect(result.tactical.mateIn).toBe(3);
    expect(result.classification).toBe('blunder');
  });

  it('handles brilliant classification', () => {
    const result = service.build({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      movePlayed: 'Nf3',
      bestMove: 'Nf3',
      phase: 'opening',
      engineEvaluation: {
        centipawnLoss: 0,
        mateBefore: null,
        mateAfter: null,
        evalBefore: 20,
        evalAfter: 20,
      },
      features,
      patternAnalysis,
      classification: 'brilliant',
    });

    expect(result.classification).toBe('brilliant');
    expect(result.centipawnLoss).toBe(0);
  });
});
