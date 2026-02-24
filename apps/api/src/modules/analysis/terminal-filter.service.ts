import { Injectable } from '@nestjs/common';
import { MoveAnalysis } from './move-evaluator.service';
import { TacticalSequence } from './sequence-merger.service';

@Injectable()
export class TerminalFilterService {
  filterTerminalPositions(positions: MoveAnalysis[]): MoveAnalysis[] {
    return positions.filter((position) => !this.isTerminalState(position));
  }

  filterTerminalSequences(sequences: TacticalSequence[]): TacticalSequence[] {
    return sequences.filter((sequence) => !this.isSequenceTerminal(sequence));
  }

  removeDuplicatePositions(sequences: TacticalSequence[]): TacticalSequence[] {
    const seenMoves = new Set<number>();

    return sequences
      .map((sequence) => {
        const filteredPositions = sequence.positions.filter((pos) => {
          if (seenMoves.has(pos.moveNumber)) {
            return false;
          }
          seenMoves.add(pos.moveNumber);
          return true;
        });

        if (filteredPositions.length === 0) {
          return null;
        }

        return {
          ...sequence,
          positions: filteredPositions,
          startMove: filteredPositions[0].moveNumber,
          endMove: filteredPositions[filteredPositions.length - 1].moveNumber,
        };
      })
      .filter((seq): seq is TacticalSequence => seq !== null);
  }

  getOnlyKeyMoments(sequences: TacticalSequence[]): MoveAnalysis[] {
    return sequences.map((sequence) => sequence.keyMove);
  }

  isTerminalState(position: MoveAnalysis): boolean {
    if (position.mateAfter === 0) return true;
    if (position.mateBefore === 0) return true;

    if (position.mateAfter !== null && position.mateAfter === 1) {
      return true;
    }

    return false;
  }

  private isSequenceTerminal(sequence: TacticalSequence): boolean {
    const lastPosition = sequence.positions[sequence.positions.length - 1];

    if (lastPosition && lastPosition.mateAfter === 0) {
      return true;
    }

    return false;
  }

  shouldSkipPosition(position: MoveAnalysis): boolean {
    if (this.isTerminalState(position)) return true;

    if (position.moveQuality === 'good') return true;
    if (
      position.moveQuality === 'inaccuracy' &&
      position.centipawnLoss !== null &&
      position.centipawnLoss < 25
    ) {
      return true;
    }

    return false;
  }

  filterMistakePositions(positions: MoveAnalysis[]): MoveAnalysis[] {
    return positions.filter((position) => {
      if (!position.isUserMove) return false;

      if (this.isTerminalState(position)) return false;

      if (position.moveQuality === 'blunder') return true;
      if (position.moveQuality === 'mistake') return true;

      if (position.centipawnLoss !== null && position.centipawnLoss >= 100) {
        return true;
      }

      if (
        position.mateBefore !== null &&
        position.mateBefore > 0 &&
        position.mateAfter !== null
      ) {
        if (
          position.mateAfter <= 0 ||
          position.mateAfter > position.mateBefore
        ) {
          return true;
        }
      }

      return false;
    });
  }
}
