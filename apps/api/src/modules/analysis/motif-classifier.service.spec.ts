import { MotifClassifierService } from './motif-classifier.service';
import { TacticalSequence } from './sequence-merger.service';
import { TacticalFeatures } from './tactical-feature.service';
import { MoveAnalysis } from './move-evaluator.service';

describe('MotifClassifierService', () => {
  const service = new MotifClassifierService();

  const move = (overrides: Partial<MoveAnalysis> = {}): MoveAnalysis => ({
    moveNumber: 12,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R b - - 1 1',
    movePlayed: 'Nh3',
    isUserMove: true,
    evalBefore: 20,
    evalAfter: -220,
    mateBefore: null,
    mateAfter: null,
    centipawnLoss: 240,
    bestMove: 'Nf3',
    bestMoveEval: 20,
    moveQuality: 'blunder',
    isCheck: false,
    isCapture: false,
    phase: 'middlegame',
    materialBalance: 0,
    pv: [],
    ...overrides,
  });

  const features: TacticalFeatures = {
    isCheck: true,
    isCapture: true,
    isSacrifice: false,
    materialSwing: 3,
    kingSafetyScore: 65,
    isBackRankExposed: false,
    phase: 'middlegame',
    pieceActivity: 6,
    materialBalance: 0,
    kingExposed: false,
    queenAttacking: false,
    knightAttacking: true,
    rookAttacking: false,
  };

  it('classifies tactical sequence and returns difficulty metadata', () => {
    const keyMove = move({ movePlayed: 'Nxf7+', isCapture: true, isCheck: true });
    const sequence: TacticalSequence = {
      startMove: 12,
      endMove: 14,
      type: 'tactical_sequence',
      pattern: 'tactical_sequence',
      mateIn: null,
      difficulty: 62,
      positions: [keyMove, move({ moveNumber: 13, isUserMove: false })],
      keyMove,
      userMoveCount: 1,
    };

    const result = service.classifySequence(sequence, features);
    expect(result.pattern).toBe('fork');
    expect(result.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.difficulty).toBeLessThanOrEqual(100);
  });
});
