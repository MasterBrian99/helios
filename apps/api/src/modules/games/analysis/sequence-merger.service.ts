import { Injectable } from '@nestjs/common';
import { MoveAnalysis } from './move-evaluator.service';

export type SequenceType =
  | 'forced_mate'
  | 'tactical_sequence'
  | 'single_blunder'
  | 'missed_mate';

export interface TacticalSequence {
  startMove: number;
  endMove: number;
  type: SequenceType;
  pattern: string;
  mateIn: number | null;
  difficulty: number;
  positions: MoveAnalysis[];
  keyMove: MoveAnalysis;
  userMoveCount: number;
}

@Injectable()
export class SequenceMergerService {
  mergeSequences(positions: MoveAnalysis[]): TacticalSequence[] {
    const sequences: TacticalSequence[] = [];
    const processedMoves = new Set<number>();

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];

      if (processedMoves.has(position.moveNumber)) continue;

      if (this.isTerminalState(position)) {
        processedMoves.add(position.moveNumber);
        continue;
      }

      if (!position.isUserMove) continue;

      const mateSequence = this.tryMergeMateSequence(positions, i);
      if (mateSequence) {
        sequences.push(mateSequence);
        for (let j = mateSequence.startMove; j <= mateSequence.endMove; j++) {
          processedMoves.add(j);
        }
        continue;
      }

      const tacticalSequence = this.tryMergeTacticalSequence(positions, i);
      if (tacticalSequence) {
        sequences.push(tacticalSequence);
        for (
          let j = tacticalSequence.startMove;
          j <= tacticalSequence.endMove;
          j++
        ) {
          processedMoves.add(j);
        }
        continue;
      }

      if (this.isSignificantMistake(position)) {
        sequences.push(this.createSingleBlunderSequence(position));
        processedMoves.add(position.moveNumber);
      }
    }

    return sequences;
  }

  private isTerminalState(position: MoveAnalysis): boolean {
    return position.mateAfter === 0 || position.mateBefore === 0;
  }

  private tryMergeMateSequence(
    positions: MoveAnalysis[],
    startIndex: number,
  ): TacticalSequence | null {
    const startPosition = positions[startIndex];

    if (startPosition.mateBefore === null || startPosition.mateBefore <= 0) {
      return null;
    }

    const sequencePositions: MoveAnalysis[] = [startPosition];
    let currentIndex = startIndex;
    let currentMateDistance = startPosition.mateBefore;

    for (
      let i = startIndex + 1;
      i < positions.length && sequencePositions.length <= 20;
      i++
    ) {
      const nextPosition = positions[i];

      if (this.isTerminalState(nextPosition)) break;

      sequencePositions.push(nextPosition);
      currentIndex = i;

      if (nextPosition.mateAfter !== null && nextPosition.mateAfter > 0) {
        if (nextPosition.mateAfter < currentMateDistance) {
          currentMateDistance = nextPosition.mateAfter;
        }
      }

      if (nextPosition.mateAfter === 0) break;
    }

    const keyMove = this.findKeyMove(sequencePositions);
    const difficulty = this.calculateMateDifficulty(
      currentMateDistance,
      sequencePositions,
    );

    return {
      startMove: startPosition.moveNumber,
      endMove: positions[currentIndex].moveNumber,
      type: 'forced_mate',
      pattern: this.detectMatePattern(sequencePositions),
      mateIn: currentMateDistance,
      difficulty,
      positions: sequencePositions,
      keyMove,
      userMoveCount: sequencePositions.filter((p) => p.isUserMove).length,
    };
  }

  private tryMergeTacticalSequence(
    positions: MoveAnalysis[],
    startIndex: number,
  ): TacticalSequence | null {
    const startPosition = positions[startIndex];

    if (!this.isSignificantMistake(startPosition)) {
      return null;
    }

    const sequencePositions: MoveAnalysis[] = [startPosition];
    let currentIndex = startIndex;
    let hasConsecutiveTactics = false;

    for (
      let i = startIndex + 1;
      i < positions.length && i < startIndex + 6;
      i++
    ) {
      const nextPosition = positions[i];

      if (this.isTerminalState(nextPosition)) break;

      if (nextPosition.isUserMove && this.isSignificantMistake(nextPosition)) {
        hasConsecutiveTactics = true;
      }

      sequencePositions.push(nextPosition);
      currentIndex = i;
    }

    if (!hasConsecutiveTactics && sequencePositions.length < 3) {
      return null;
    }

    const keyMove = this.findKeyMove(sequencePositions);
    const difficulty = this.calculateTacticalDifficulty(sequencePositions);

    return {
      startMove: startPosition.moveNumber,
      endMove: positions[currentIndex].moveNumber,
      type: 'tactical_sequence',
      pattern: 'tactical_sequence',
      mateIn: null,
      difficulty,
      positions: sequencePositions,
      keyMove,
      userMoveCount: sequencePositions.filter((p) => p.isUserMove).length,
    };
  }

  private isSignificantMistake(position: MoveAnalysis): boolean {
    if (
      position.moveQuality === 'blunder' ||
      position.moveQuality === 'mistake'
    )
      return true;
    if (position.centipawnLoss !== null && position.centipawnLoss >= 50)
      return true;
    if (
      position.mateBefore !== null &&
      position.mateBefore > 0 &&
      position.mateAfter !== null &&
      position.mateAfter < 0
    ) {
      return true;
    }
    return false;
  }

  private createSingleBlunderSequence(
    position: MoveAnalysis,
  ): TacticalSequence {
    return {
      startMove: position.moveNumber,
      endMove: position.moveNumber,
      type: 'single_blunder',
      pattern: 'single_blunder',
      mateIn:
        position.mateAfter !== null && position.mateAfter < 0
          ? Math.abs(position.mateAfter)
          : null,
      difficulty: this.calculateSingleMoveDifficulty(position),
      positions: [position],
      keyMove: position,
      userMoveCount: 1,
    };
  }

  private findKeyMove(positions: MoveAnalysis[]): MoveAnalysis {
    let keyMove = positions[0];
    let maxImpact = 0;

    for (const position of positions) {
      if (!position.isUserMove) continue;

      let impact = position.centipawnLoss ?? 0;

      if (position.mateBefore !== null && position.mateAfter !== null) {
        if (position.mateBefore > 0 && position.mateAfter <= 0) {
          impact = 1000;
        } else if (
          position.mateBefore > 0 &&
          position.mateAfter > position.mateBefore
        ) {
          impact = 500 + (position.mateAfter - position.mateBefore) * 50;
        }
      }

      if (impact > maxImpact) {
        maxImpact = impact;
        keyMove = position;
      }
    }

    return keyMove;
  }

  private detectMatePattern(positions: MoveAnalysis[]): string {
    const keyMove = this.findKeyMove(positions);
    const hasCheck = positions.some((p) => p.isCheck);

    if (hasCheck && keyMove.isCapture) {
      return 'checkmate_with_capture';
    }

    if (hasCheck) {
      return 'checkmate_sequence';
    }

    return 'forced_mate';
  }

  private calculateMateDifficulty(
    mateIn: number,
    positions: MoveAnalysis[],
  ): number {
    let difficulty = Math.max(20, 100 - mateIn * 10);

    const captureCount = positions.filter((p) => p.isCapture).length;
    difficulty += Math.min(20, captureCount * 5);

    const checkCount = positions.filter((p) => p.isCheck).length;
    difficulty += Math.min(15, checkCount * 3);

    return Math.min(100, Math.round(difficulty));
  }

  private calculateTacticalDifficulty(positions: MoveAnalysis[]): number {
    let difficulty = 40;

    const blunderCount = positions.filter(
      (p) => p.moveQuality === 'blunder',
    ).length;
    difficulty += blunderCount * 15;

    const avgCPL =
      positions
        .filter((p) => p.centipawnLoss !== null)
        .reduce((sum, p) => sum + (p.centipawnLoss ?? 0), 0) /
        positions.length || 0;
    difficulty += Math.min(30, avgCPL / 10);

    return Math.min(100, Math.max(20, Math.round(difficulty)));
  }

  private calculateSingleMoveDifficulty(position: MoveAnalysis): number {
    if (position.centipawnLoss === null) return 50;

    if (position.centipawnLoss >= 500) return 95;
    if (position.centipawnLoss >= 300) return 85;
    if (position.centipawnLoss >= 200) return 75;
    if (position.centipawnLoss >= 100) return 60;

    return 40;
  }
}
