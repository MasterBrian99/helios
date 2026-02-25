import { ConfigService } from '@nestjs/config';
import { LlmExplainerService } from './llm-explainer.service';
import { StructuredMistake } from './structured-mistake.interface';

describe('LlmExplainerService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_GENERATIVE_AI_API_KEY') return undefined;
      return undefined;
    }),
  } as unknown as ConfigService;

  const service = new LlmExplainerService(config);

  const baseData: StructuredMistake = {
    phase: 'middlegame',
    centipawnLoss: 140,
    classification: 'blunder',
    material: {
      immediateLoss: true,
      materialLost: 3,
    },
    tactical: {
      missedMate: false,
      hangingPiece: false,
      fork: false,
      pin: false,
      skewer: false,
      discoveredAttack: false,
      kingExposed: false,
      backRankWeak: false,
    },
    positional: {
      undevelopedPieces: [],
      blockedPieces: [],
      weakenedSquares: [],
      lostCenterControl: false,
      openFileConceded: false,
    },
    comparison: {
      movePlayed: 'Bxh7+',
      bestMove: 'Re1',
      bestMoveBenefits: ['keeps evaluation stable'],
      movePlayedConsequences: ['loses 3 points of material'],
    },
  };

  it('uses deterministic fallback when llm is unavailable', async () => {
    const result = await service.explainStructured(baseData);
    expect(result.source).toBe('deterministic_fallback');
    expect(result.validationStatus).toBe('llm_unavailable');
    expect(result.explanation).toContain('Bxh7+');
    expect(result.explanation).toContain('Re1');
  });

  it('respects classification precedence (missedMate first)', async () => {
    const result = await service.explainStructured({
      ...baseData,
      tactical: {
        ...baseData.tactical,
        missedMate: true,
        mateIn: 2,
      },
      material: {
        immediateLoss: false,
        materialLost: 0,
      },
    });

    expect(result.mistakeType).toBe('tactical_blunder');
  });
});
