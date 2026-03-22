export enum ChessGameTermination {
  Checkmate = 'CHECKMATE',
  Resignation = 'RESIGNATION',
  DrawAgreement = 'DRAW_AGREEMENT',
  Stalemate = 'STALEMATE',
  ThreefoldRepetition = 'THREEFOLD_REPETITION',
  FivefoldRepetition = 'FIVEFOLD_REPETITION',
  FiftyMoveRule = 'FIFTY_MOVE_RULE',
  SeventyFiveMoveRule = 'SEVENTY_FIVE_MOVE_RULE',
  InsufficientMaterial = 'INSUFFICIENT_MATERIAL',
  TimeForfeit = 'TIME_FORFEIT',
  Abandoned = 'ABANDONED',
}
