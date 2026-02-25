import { Injectable } from '@nestjs/common';
import { TacticalFeatures } from './tactical-feature.service';
import { TacticalSequence } from './sequence-merger.service';
import { TacticalPattern } from 'src/database/schema/move-classifications';

export interface PatternAnalysis {
  pattern: TacticalPattern;
  description: string;
  difficulty: number;
  keyPiece: string | null;
  isCheckmateRelated: boolean;
}

@Injectable()
export class MotifClassifierService {
  classifySequence(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): PatternAnalysis {
    const pattern = this.detectPattern(sequence, features);
    const description = this.generateDescription(pattern, sequence, features);
    const keyPiece = this.identifyKeyPiece(sequence, features);
    const isCheckmateRelated = this.isCheckmatePattern(pattern);
    const difficulty = this.adjustDifficulty(
      sequence.difficulty,
      pattern,
      features,
    );

    return {
      pattern,
      description,
      difficulty,
      keyPiece,
      isCheckmateRelated,
    };
  }

  private detectPattern(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): TacticalPattern {
    if (sequence.mateIn !== null && sequence.mateIn > 0) {
      if (this.isBackRankMate(sequence, features)) return 'back_rank_mate';
      if (this.isSmotheredMate(sequence, features)) return 'smothered_mate';
      if (features.queenAttacking) return 'queen_mating_attack';
      if (sequence.type === 'forced_mate') return 'forced_mate';
    }

    if (sequence.type === 'missed_mate') return 'missed_mate';

    if (this.isKingHunt(sequence, features)) return 'king_hunt';

    if (this.isDefensiveCollapse(sequence, features))
      return 'defensive_collapse';

    if (sequence.type === 'tactical_sequence') {
      return this.classifyTacticalSequence(sequence, features);
    }

    if (sequence.type === 'single_blunder') {
      return this.classifySingleBlunder(sequence, features);
    }

    return 'material_blunder';
  }

  private isBackRankMate(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): boolean {
    if (!features.isBackRankExposed) return false;

    const keyMove = sequence.keyMove;
    return keyMove.isCheck && features.rookAttacking;
  }

  private isSmotheredMate(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): boolean {
    return (
      features.knightAttacking &&
      sequence.mateIn !== null &&
      sequence.mateIn <= 4
    );
  }

  private isKingHunt(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): boolean {
    if (!features.kingExposed) return false;

    const checkCount = sequence.positions.filter((p) => p.isCheck).length;
    return (
      checkCount >= 2 || (checkCount >= 1 && sequence.positions.length >= 3)
    );
  }

  private isDefensiveCollapse(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): boolean {
    if (!features.kingExposed) return false;

    const userBlunders = sequence.positions.filter(
      (p) => p.isUserMove && p.moveQuality === 'blunder',
    ).length;

    return userBlunders >= 2;
  }

  private classifyTacticalSequence(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): TacticalPattern {
    if (this.detectFork(sequence, features)) return 'fork';
    if (this.detectPin(sequence, features)) return 'pin';
    if (this.detectSkewer(sequence, features)) return 'skewer';
    if (this.detectDiscoveredAttack(sequence, features))
      return 'discovered_attack';

    return 'tactical_sequence';
  }

  private classifySingleBlunder(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): TacticalPattern {
    const keyMove = sequence.keyMove;

    if (keyMove.centipawnLoss !== null && keyMove.centipawnLoss >= 200) {
      if (features.isBackRankExposed) return 'defensive_collapse';
      if (features.kingExposed) return 'king_hunt';
      return 'material_blunder';
    }

    if (keyMove.centipawnLoss !== null && keyMove.centipawnLoss >= 100) {
      if (features.kingExposed || features.isBackRankExposed) {
        return 'defensive_collapse';
      }
      return 'hanging_piece';
    }

    if (keyMove.centipawnLoss !== null && keyMove.centipawnLoss >= 50) {
      if (features.kingExposed || features.isBackRankExposed) {
        return 'defensive_error';
      }
      if (features.materialSwing > 0) {
        return 'calculation_error';
      }
      return 'positional_error';
    }

    return 'positional_error';
  }

  private detectFork(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): boolean {
    const captures = sequence.positions.filter((p) => p.isCapture);
    if (captures.length < 1) return false;

    const keyMove = sequence.keyMove;
    const moveStr = keyMove.movePlayed.toLowerCase();

    if (moveStr.startsWith('n') || moveStr.startsWith('N')) return true;
    if (moveStr.startsWith('q') || moveStr.startsWith('Q')) return true;

    return features.isCheck && captures.length >= 1;
  }

  private detectPin(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): boolean {
    if (!features.rookAttacking && !features.queenAttacking) return false;

    const captures = sequence.positions.filter(
      (p) => p.isCapture && !p.isUserMove,
    );
    return captures.length >= 1;
  }

  private detectSkewer(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): boolean {
    if (!features.rookAttacking && !features.queenAttacking) return false;

    const captures = sequence.positions.filter((p) => p.isCapture);
    return captures.length >= 2;
  }

  private detectDiscoveredAttack(
    sequence: TacticalSequence,
    _features: TacticalFeatures,
  ): boolean {
    const keyMove = sequence.keyMove;
    const captures = sequence.positions.filter(
      (p) => p.isCapture && !p.isUserMove,
    );

    if (captures.length >= 1 && !keyMove.isCapture) {
      return true;
    }

    return keyMove.isCapture && captures.length >= 2;
  }

  private generateDescription(
    pattern: TacticalPattern,
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): string {
    const descriptions: Record<TacticalPattern, string> = {
      forced_mate: `Forced mate in ${sequence.mateIn} moves`,
      queen_mating_attack: 'Queen-led mating attack',
      back_rank_mate: 'Back rank checkmate',
      smothered_mate: 'Smothered mate pattern',
      fork: 'Tactical fork winning material',
      pin: 'Pinned piece leading to material loss',
      skewer: 'Skewer attack winning material',
      discovered_attack: 'Discovered attack winning material',
      defensive_collapse: 'Defensive structure collapsed',
      king_hunt: 'King was exposed and attacked',
      material_blunder: 'Material blunder',
      positional_error: 'Positional mistake',
      missed_mate: 'Missed checkmate opportunity',
      hanging_piece: 'Piece left hanging',
      tactical_sequence: 'Complex tactical sequence',
      defensive_error: 'Defensive error',
      calculation_error: 'Calculation error',
    };

    let description = descriptions[pattern];

    if (features.phase === 'opening') {
      description += ' in the opening';
    } else if (features.phase === 'endgame') {
      description += ' in the endgame';
    } else {
      description += ' in the middlegame';
    }

    return description;
  }

  private identifyKeyPiece(
    sequence: TacticalSequence,
    features: TacticalFeatures,
  ): string | null {
    if (features.queenAttacking) return 'queen';
    if (features.rookAttacking) return 'rook';
    if (features.knightAttacking) return 'knight';

    const keyMove = sequence.keyMove;
    const moveStr = keyMove.movePlayed.toLowerCase();

    if (moveStr.startsWith('q')) return 'queen';
    if (moveStr.startsWith('r')) return 'rook';
    if (moveStr.startsWith('n')) return 'knight';
    if (moveStr.startsWith('b')) return 'bishop';
    if (moveStr.startsWith('k')) return 'king';

    return null;
  }

  private isCheckmatePattern(pattern: TacticalPattern): boolean {
    const checkmatePatterns: TacticalPattern[] = [
      'forced_mate',
      'queen_mating_attack',
      'back_rank_mate',
      'smothered_mate',
      'missed_mate',
    ];

    return checkmatePatterns.includes(pattern);
  }

  private adjustDifficulty(
    baseDifficulty: number,
    pattern: TacticalPattern,
    features: TacticalFeatures,
  ): number {
    let difficulty = baseDifficulty;

    if (features.phase === 'endgame') {
      difficulty += 5;
    }

    if (features.kingExposed) {
      difficulty += 10;
    }

    if (features.isBackRankExposed) {
      difficulty -= 5;
    }

    const checkmatePatterns: TacticalPattern[] = [
      'smothered_mate',
      'queen_mating_attack',
    ];
    if (checkmatePatterns.includes(pattern)) {
      difficulty += 10;
    }

    return Math.min(100, Math.max(10, Math.round(difficulty)));
  }
}
