import { Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';
import type { PatternAnalysis } from './motif-classifier.service';
import { StructuredMistake } from './structured-mistake.interface';
import { TacticalFeatures } from './tactical-feature.service';
import { MoveClassification } from '../../database/schema/move-classifications';

export interface DeterministicEngineEvaluation {
  centipawnLoss: number;
  mateBefore: number | null;
  mateAfter: number | null;
  evalBefore: number | null;
  evalAfter: number | null;
}

export interface MoveClassificationBuilderInput {
  fen: string;
  movePlayed: string;
  bestMove: string | null;
  phase: 'opening' | 'middlegame' | 'endgame';
  engineEvaluation: DeterministicEngineEvaluation;
  features: TacticalFeatures;
  patternAnalysis: PatternAnalysis;
  classification: MoveClassification;
}

@Injectable()
export class MoveClassificationBuilderService {
  build(input: MoveClassificationBuilderInput): StructuredMistake {
    const centipawnLoss = this.safeNumber(input.engineEvaluation.centipawnLoss);

    return {
      phase: input.phase,
      centipawnLoss,
      classification: input.classification,
      material: this.buildMaterial(input),
      tactical: this.buildTactical(input),
      positional: this.buildPositional(input),
      comparison: this.buildComparison(input),
    };
  }

  private buildMaterial(
    input: MoveClassificationBuilderInput,
  ): StructuredMistake['material'] {
    const materialLost = this.safeNumber(input.features.materialSwing);
    const immediateLoss = materialLost > 0;

    return {
      immediateLoss,
      materialLost,
    };
  }

  private buildTactical(
    input: MoveClassificationBuilderInput,
  ): StructuredMistake['tactical'] {
    const pattern = input.patternAnalysis.pattern;
    const missedMate = this.isMissedMate(input);

    return {
      missedMate,
      mateIn: missedMate ? this.resolveMateDistance(input) : undefined,
      hangingPiece: pattern === 'hanging_piece',
      fork: pattern === 'fork',
      pin: pattern === 'pin',
      skewer: pattern === 'skewer',
      discoveredAttack: pattern === 'discovered_attack',
      kingExposed: input.features.kingExposed,
      backRankWeak: input.features.isBackRankExposed,
    };
  }

  private buildPositional(
    input: MoveClassificationBuilderInput,
  ): StructuredMistake['positional'] {
    return {
      undevelopedPieces: this.findUndevelopedPieces(input.fen, input.phase),
      blockedPieces: [],
      weakenedSquares: [],
      lostCenterControl:
        input.phase !== 'endgame' && input.engineEvaluation.centipawnLoss >= 80,
      openFileConceded: false,
    };
  }

  private buildComparison(
    input: MoveClassificationBuilderInput,
  ): StructuredMistake['comparison'] {
    const movePlayed = input.movePlayed?.trim() || 'unknown';
    const bestMove = input.bestMove?.trim() || 'unknown';
    return {
      movePlayed,
      bestMove,
      bestMoveBenefits: this.bestMoveBenefits(input),
      movePlayedConsequences: this.movePlayedConsequences(input),
    };
  }

  private isMissedMate(input: MoveClassificationBuilderInput): boolean {
    if (input.patternAnalysis.pattern === 'missed_mate') {
      return true;
    }

    const { mateBefore, mateAfter } = input.engineEvaluation;
    if (mateBefore !== null && mateBefore > 0) {
      return mateAfter === null || mateAfter <= 0 || mateAfter > mateBefore;
    }

    return mateAfter !== null && mateAfter < 0;
  }

  private resolveMateDistance(
    input: MoveClassificationBuilderInput,
  ): number | undefined {
    const { mateBefore, mateAfter } = input.engineEvaluation;
    if (mateBefore !== null && mateBefore > 0) return mateBefore;
    if (mateAfter !== null && mateAfter < 0) return Math.abs(mateAfter);
    return undefined;
  }

  private bestMoveBenefits(input: MoveClassificationBuilderInput): string[] {
    const benefits: string[] = [];

    if (this.isMissedMate(input)) {
      const mateIn = this.resolveMateDistance(input);
      benefits.push(
        mateIn ? `keeps a mate in ${mateIn}` : 'keeps a mating attack',
      );
    }

    if (input.features.kingExposed) {
      benefits.push('improves king safety');
    }

    if (input.engineEvaluation.centipawnLoss >= 80) {
      benefits.push('keeps evaluation stable');
    }

    if (benefits.length === 0) {
      benefits.push('keeps a more accurate position');
    }

    return benefits;
  }

  private movePlayedConsequences(
    input: MoveClassificationBuilderInput,
  ): string[] {
    const consequences: string[] = [];

    if (this.isMissedMate(input)) {
      const mateIn = this.resolveMateDistance(input);
      consequences.push(
        mateIn
          ? `misses a forcing line with mate in ${mateIn}`
          : 'misses a forcing mate sequence',
      );
    }

    const materialLost = this.safeNumber(input.features.materialSwing);
    if (materialLost > 0) {
      consequences.push(`loses ${materialLost} points of material`);
    }

    if (input.features.kingExposed) {
      consequences.push('exposes the king');
    }

    if (consequences.length === 0) {
      consequences.push('reduces positional accuracy');
    }

    return consequences;
  }

  private findUndevelopedPieces(
    fen: string,
    phase: StructuredMistake['phase'],
  ): string[] {
    if (phase !== 'opening') return [];

    try {
      const chess = new Chess(fen);
      const board = chess.board();
      const files = 'abcdefgh';
      const side = chess.turn();
      const homeRank = side === 'w' ? 7 : 0;
      const pieces: string[] = [];

      for (let file = 0; file < 8; file++) {
        const square = board[homeRank][file];
        if (!square || square.color !== side) continue;
        if (square.type === 'n' || square.type === 'b') {
          const piece = square.type === 'n' ? 'Knight' : 'Bishop';
          pieces.push(`${piece} on ${files[file]}${8 - homeRank}`);
        }
      }

      return pieces;
    } catch {
      return [];
    }
  }

  private safeNumber(value: number | null | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.round(value));
  }
}
