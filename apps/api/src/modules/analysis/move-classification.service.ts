import { Injectable } from '@nestjs/common';
import { MoveClassification } from '../../database/schema/move-classifications';

export interface ClassificationContext {
  centipawnLoss: number | null;
  mateBefore: number | null;
  mateAfter: number | null;
  evalBefore: number | null;
  evalAfter: number | null;
  isBookMove: boolean;
  isSacrifice: boolean;
  isOnlyWinningMove: boolean;
  alternativesLoseMaterial: boolean;
  alternativesCpl: number[];
  moveTurnsGame: boolean;
}

@Injectable()
export class MoveClassificationService {
  classify(context: ClassificationContext): MoveClassification {
    if (context.isBookMove) {
      return 'book';
    }

    if (this.isBrilliant(context)) {
      return 'brilliant';
    }

    if (this.isGreat(context)) {
      return 'great';
    }

    if (context.centipawnLoss === null) {
      return 'good';
    }

    if (context.centipawnLoss >= 100) {
      return 'blunder';
    }

    if (context.centipawnLoss >= 50) {
      return 'mistake';
    }

    if (context.centipawnLoss >= 25) {
      return 'inaccuracy';
    }

    return 'good';
  }

  private isBrilliant(context: ClassificationContext): boolean {
    if (context.isSacrifice && this.improvesPosition(context)) {
      return true;
    }

    if (context.isOnlyWinningMove && context.alternativesLoseMaterial) {
      return true;
    }

    if (context.alternativesCpl.length > 0) {
      const allAlternativesLose = context.alternativesCpl.every(
        (cpl) => cpl >= 200,
      );
      if (
        allAlternativesLose &&
        context.centipawnLoss !== null &&
        context.centipawnLoss < 25
      ) {
        return true;
      }
    }

    if (this.foundsMateWhenOthersDont(context)) {
      return true;
    }

    return false;
  }

  private isGreat(context: ClassificationContext): boolean {
    if (context.isOnlyWinningMove && !context.alternativesLoseMaterial) {
      return true;
    }

    if (context.moveTurnsGame) {
      return true;
    }

    return false;
  }

  private improvesPosition(context: ClassificationContext): boolean {
    if (context.evalBefore === null || context.evalAfter === null) {
      return false;
    }

    return context.evalAfter >= context.evalBefore;
  }

  private foundsMateWhenOthersDont(context: ClassificationContext): boolean {
    if (context.mateAfter !== null && context.mateAfter > 0) {
      if (context.alternativesCpl.length > 0) {
        const allAlternativesMiss = context.alternativesCpl.some(
          (cpl) => cpl >= 100,
        );
        if (allAlternativesMiss) {
          return true;
        }
      }
    }

    return false;
  }
}
