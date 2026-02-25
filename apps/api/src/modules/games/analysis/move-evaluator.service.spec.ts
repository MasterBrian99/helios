import { ConfigService } from '@nestjs/config';
import { MoveEvaluatorService } from './move-evaluator.service';
import { AnalysisOpeningBookService } from './analysis-opening-book.service';
import { ChessEngineService } from 'src/chess-engines';

describe('MoveEvaluatorService', () => {
  const createService = () => {
    const analyzePositionMock = jest.fn();
    const chessEngine = {
      analyzePosition: analyzePositionMock,
      scoreToCentipawns: jest.fn((score: number) => score),
    } as unknown as ChessEngineService;

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'ANALYSIS_ENGINE_DEPTH') return 20;
        return undefined;
      }),
    } as unknown as ConfigService;

    const openingBookService = {
      isBookPosition: jest.fn(() => false),
    } as unknown as AnalysisOpeningBookService;

    const service = new MoveEvaluatorService(
      chessEngine,
      configService,
      openingBookService,
    );

    return {
      service,
      chessEngine,
      openingBookService,
      analyzePositionMock,
    };
  };

  const evalResult = (score: number, bestMove = 'e2e4') => ({
    score,
    scoreType: 'cp' as const,
    bestMove,
    pv: [bestMove],
    depth: 12,
    rawLines: [],
    engineName: 'mock',
  });

  it('uses softer thresholds for default 800 rating', async () => {
    const { service, analyzePositionMock } = createService();
    analyzePositionMock
      .mockResolvedValueOnce(evalResult(200, 'g1f3'))
      .mockResolvedValueOnce(evalResult(130));

    const result = await service.analyzeGame('1. e4', 'white', null);

    expect(result.positions[0].moveQuality).toBe('best');
    expect(analyzePositionMock).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      10,
    );
  });

  it('uses stricter thresholds for high elo', async () => {
    const { service, analyzePositionMock } = createService();
    analyzePositionMock
      .mockResolvedValueOnce(evalResult(200, 'g1f3'))
      .mockResolvedValueOnce(evalResult(130));

    const result = await service.analyzeGame('1. e4', 'white', 2300);

    expect(result.positions[0].moveQuality).toBe('miss');
    expect(analyzePositionMock).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      18,
    );
  });

  it('marks book moves and skips engine evaluation while in book', async () => {
    const { service, openingBookService, analyzePositionMock } =
      createService();

    (openingBookService.isBookPosition as jest.Mock)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);

    const result = await service.analyzeGame('1. e4 e5', 'white', 1200);

    expect(result.positions).toHaveLength(2);
    expect(result.positions[0].moveQuality).toBe('book');
    expect(result.positions[1].moveQuality).toBe('book');
    expect(analyzePositionMock).not.toHaveBeenCalled();
  });

  it('classifies brilliant move for a sound sacrifice', () => {
    const { service } = createService();

    const quality = service.classifyMove({
      isBookMove: false,
      centipawnLoss: 8,
      mateBefore: null,
      mateAfter: null,
      playedMoveUci: 'g5f7',
      bestMove: 'g5f7',
      moverEvalBefore: 40,
      moverEvalAfter: 35,
      materialDelta: -100,
      isCapture: false,
      thresholds: { miss: 80, mistake: 180, blunder: 320 },
    });

    expect(quality).toBe('brilliant');
  });

  it('classifies great move for comeback improvement', () => {
    const { service } = createService();

    const quality = service.classifyMove({
      isBookMove: false,
      centipawnLoss: 5,
      mateBefore: null,
      mateAfter: null,
      playedMoveUci: 'd2d4',
      bestMove: 'd2d4',
      moverEvalBefore: -200,
      moverEvalAfter: -60,
      materialDelta: 0,
      isCapture: false,
      thresholds: { miss: 80, mistake: 180, blunder: 320 },
    });

    expect(quality).toBe('great');
  });

  it('classifies miss/mistake/blunder using configured thresholds', () => {
    const { service } = createService();

    const thresholds = { miss: 80, mistake: 180, blunder: 320 };

    expect(
      service.classifyMove({
        isBookMove: false,
        centipawnLoss: 100,
        mateBefore: null,
        mateAfter: null,
        playedMoveUci: 'a2a3',
        bestMove: 'a2a4',
        moverEvalBefore: 0,
        moverEvalAfter: -100,
        materialDelta: 0,
        isCapture: false,
        thresholds,
      }),
    ).toBe('miss');

    expect(
      service.classifyMove({
        isBookMove: false,
        centipawnLoss: 200,
        mateBefore: null,
        mateAfter: null,
        playedMoveUci: 'a2a3',
        bestMove: 'a2a4',
        moverEvalBefore: 0,
        moverEvalAfter: -200,
        materialDelta: 0,
        isCapture: false,
        thresholds,
      }),
    ).toBe('mistake');

    expect(
      service.classifyMove({
        isBookMove: false,
        centipawnLoss: 350,
        mateBefore: null,
        mateAfter: null,
        playedMoveUci: 'a2a3',
        bestMove: 'a2a4',
        moverEvalBefore: 0,
        moverEvalAfter: -350,
        materialDelta: 0,
        isCapture: false,
        thresholds,
      }),
    ).toBe('blunder');
  });

  it('does not classify an exact best move as a blunder even with noisy cp loss', () => {
    const { service } = createService();

    const quality = service.classifyMove({
      isBookMove: false,
      centipawnLoss: 400,
      mateBefore: null,
      mateAfter: null,
      playedMoveUci: 'f6g6',
      bestMove: 'f6g6',
      moverEvalBefore: 30,
      moverEvalAfter: -370,
      materialDelta: 0,
      isCapture: false,
      thresholds: { miss: 80, mistake: 180, blunder: 320 },
    });

    expect(quality).toBe('best');
  });

  it('stores bestMove in SAN so explainer does not compare SAN vs UCI', async () => {
    const { service, analyzePositionMock } = createService();
    analyzePositionMock
      .mockResolvedValueOnce(evalResult(20, 'e2e4'))
      .mockResolvedValueOnce(evalResult(18));

    const result = await service.analyzeGame('1. e4', 'white', 1200);

    expect(result.positions[0].bestMove).toBe('e4');
  });
});
