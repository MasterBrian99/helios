import { MoveClassification } from "src/database/schema/move-classifications";

export interface StructuredMistake {
  phase: 'opening' | 'middlegame' | 'endgame';
  centipawnLoss: number;
  classification: MoveClassification;

  material: {
    immediateLoss: boolean;
    materialLost: number;
  };

  tactical: {
    missedMate: boolean;
    mateIn?: number;
    hangingPiece: boolean;
    fork: boolean;
    pin: boolean;
    skewer: boolean;
    discoveredAttack: boolean;
    kingExposed: boolean;
    backRankWeak: boolean;
  };

  positional: {
    undevelopedPieces: string[];
    blockedPieces: string[];
    weakenedSquares: string[];
    lostCenterControl: boolean;
    openFileConceded: boolean;
  };

  comparison: {
    movePlayed: string;
    bestMove: string;
    bestMoveBenefits: string[];
    movePlayedConsequences: string[];
  };
}
