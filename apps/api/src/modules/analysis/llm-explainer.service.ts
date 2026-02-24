import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { Chess } from 'chess.js';
import {
  MistakeType,
  Severity,
  TacticalPattern,
} from '../../database/schema/mistakes';
import { TacticalFeatures } from './tactical-feature.service';
import { TacticalSequence } from './sequence-merger.service';
import { PatternAnalysis } from './motif-classifier.service';

export interface MistakeExplanation {
  explanation: string;
  mistakeType: MistakeType;
}

@Injectable()
export class LlmExplainerService {
  private readonly logger = new Logger(LlmExplainerService.name);
  private readonly model: ReturnType<typeof google> | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(
      'GOOGLE_GENERATIVE_AI_API_KEY',
    );
    if (apiKey) {
      this.model = google('gemini-2.5-flash');
    } else {
      this.logger.warn(
        'GOOGLE_GENERATIVE_AI_API_KEY not set. LLM explanations will be disabled.',
      );
      this.model = null;
    }
  }

  async explainMistake(
    fen: string,
    movePlayed: string,
    bestMove: string,
    centipawnLoss: number,
    severity: Severity,
  ): Promise<MistakeExplanation> {
    if (!this.model) {
      return {
        explanation: 'LLM explanations are not configured.',
        mistakeType: this.classifyMistakeType(centipawnLoss),
      };
    }

    const boardDescription = this.fenToBoardDescription(fen);
    const prompt = this.buildPrompt(
      fen,
      boardDescription,
      movePlayed,
      bestMove,
      centipawnLoss,
      severity,
    );

    try {
      const result = await generateText({
        model: this.model,
        prompt,
      });

      const text: string = result.text;
      const mistakeType = this.extractMistakeType(text);

      return {
        explanation: this.extractExplanation(text),
        mistakeType,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error generating explanation: ${errorMessage}`);
      return {
        explanation: 'Unable to generate explanation for this mistake.',
        mistakeType: this.classifyMistakeType(centipawnLoss),
      };
    }
  }

  async explainTacticalSequence(
    sequence: TacticalSequence,
    patternAnalysis: PatternAnalysis,
    features: TacticalFeatures,
    userColor: 'white' | 'black',
  ): Promise<MistakeExplanation> {
    if (!this.model) {
      return {
        explanation: 'LLM explanations are not configured.',
        mistakeType: this.mapPatternToMistakeType(patternAnalysis.pattern),
      };
    }

    const keyMove = sequence.keyMove;
    const boardDescription = this.fenToBoardDescription(keyMove.fen);
    const prompt = this.buildTacticalPrompt(
      keyMove.fen,
      boardDescription,
      keyMove.movePlayed ?? '',
      keyMove.bestMove,
      keyMove.centipawnLoss ?? 0,
      patternAnalysis,
      features,
      sequence,
      userColor,
    );

    try {
      const result = await generateText({
        model: this.model,
        prompt,
      });

      const text: string = result.text;

      return {
        explanation: this.extractExplanation(text),
        mistakeType: this.extractMistakeType(text),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error generating tactical explanation: ${errorMessage}`,
      );
      return {
        explanation: this.generateFallbackExplanation(
          patternAnalysis,
          features,
        ),
        mistakeType: this.mapPatternToMistakeType(patternAnalysis.pattern),
      };
    }
  }

  private fenToBoardDescription(fen: string): string {
    try {
      const chess = new Chess(fen);
      const turn = chess.turn() === 'w' ? 'White' : 'Black';
      const castling = chess.fen().split(' ')[2];
      const enPassant = chess.fen().split(' ')[3];

      const board = chess.board();
      let boardText = '   a b c d e f g h\n  +-----------------+\n';

      for (let rank = 0; rank < 8; rank++) {
        const rankNum = 8 - rank;
        boardText += `${rankNum} | `;
        for (let file = 0; file < 8; file++) {
          const square = board[rank][file];
          if (square) {
            const piece =
              square.color === 'w'
                ? square.type.toUpperCase()
                : square.type.toLowerCase();
            boardText += `${piece} `;
          } else {
            boardText += '. ';
          }
        }
        boardText += `| ${rankNum}\n`;
      }

      boardText += '  +-----------------+\n   a b c d e f g h\n';

      const pieces: string[] = [];
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const square = board[rank][file];
          if (square) {
            const files = 'abcdefgh';
            const pos = `${files[file]}${8 - rank}`;
            const pieceName = this.getPieceName(square.type);
            const color = square.color === 'w' ? 'White' : 'Black';
            pieces.push(`${color} ${pieceName} on ${pos}`);
          }
        }
      }

      const whitePieces = pieces.filter((p) => p.startsWith('White'));
      const blackPieces = pieces.filter((p) => p.startsWith('Black'));

      let description = `${turn} to move\n\n`;
      description += `Board position:\n${boardText}\n`;
      description += `White pieces: ${whitePieces.join(', ') || 'none'}\n`;
      description += `Black pieces: ${blackPieces.join(', ') || 'none'}\n`;

      if (castling !== '-') {
        description += `Castling rights: ${castling}\n`;
      }
      if (enPassant !== '-') {
        description += `En passant square: ${enPassant}\n`;
      }

      if (chess.isCheck()) {
        description += `${turn} is in CHECK!\n`;
      }

      return description;
    } catch {
      return `FEN: ${fen}`;
    }
  }

  private getPieceName(type: string): string {
    const names: Record<string, string> = {
      p: 'Pawn',
      n: 'Knight',
      b: 'Bishop',
      r: 'Rook',
      q: 'Queen',
      k: 'King',
    };
    return names[type] || type;
  }

  private buildPrompt(
    fen: string,
    boardDescription: string,
    movePlayed: string,
    bestMove: string,
    centipawnLoss: number,
    severity: Severity,
  ): string {
    return `You are a chess coach. A player made a mistake. Analyze this position.

${boardDescription}

Move played: ${movePlayed}
Best move according to engine: ${bestMove || 'unknown'}
Evaluation loss: ${centipawnLoss} centipawns (${severity})

IMPORTANT: Look at the board above carefully. The position shows exactly where each piece is. Do not make up pieces or squares that aren't shown.

Analyze:
1. What tactical or strategic idea did ${movePlayed} miss or allow?
2. What makes ${bestMove || 'the best move'} better in this exact position?

Be brief and factual. Only comment on what you can see on the board.

Classify the mistake:
- tactical_blunder: Missed tactic, blundered material, or missed mate
- positional_error: Weakened position, poor piece placement
- calculation_error: Miscalculated a line
- defensive_error: Failed to defend properly
- opening_error: Known opening mistake
- endgame_error: Endgame mistake

Format:
TYPE: [category]
EXPLANATION: [2-3 sentences based ONLY on the shown position]`;
  }

  private buildTacticalPrompt(
    _fen: string,
    boardDescription: string,
    movePlayed: string,
    bestMove: string | null,
    centipawnLoss: number,
    patternAnalysis: PatternAnalysis,
    features: TacticalFeatures,
    sequence: TacticalSequence,
    _userColor: 'white' | 'black',
  ): string {
    const sequenceContext = this.buildSequenceContext(sequence, _userColor);

    return `You are a chess coach. A player made a tactical mistake. Analyze this position.

${boardDescription}

Move played: ${movePlayed}
Best move: ${bestMove || 'unknown'}
Evaluation loss: ${centipawnLoss} centipawns

Pattern detected: ${patternAnalysis.pattern.replace(/_/g, ' ')}
Phase: ${features.phase}
${sequence.mateIn ? `Mate was possible in ${sequence.mateIn} moves` : ''}
${features.kingExposed ? 'King is exposed' : ''}
${features.isBackRankExposed ? 'Back rank is vulnerable' : ''}

${sequenceContext}

IMPORTANT: Look at the board above. Only comment on pieces and squares that are shown.

Analyze:
1. What was the tactical opportunity?
2. What did ${movePlayed} miss?
3. Why was ${bestMove || 'the best move'} better?

Format:
TYPE: [category]
EXPLANATION: [2-3 factual sentences]`;
  }

  private buildSequenceContext(
    sequence: TacticalSequence,
    userColor: 'white' | 'black',
  ): string {
    if (sequence.positions.length <= 1) {
      return '';
    }

    const userMoves = sequence.positions
      .filter((p) => p.isUserMove)
      .map((p) => p.movePlayed)
      .slice(0, 5);

    const opponentMoves = sequence.positions
      .filter((p) => !p.isUserMove)
      .map((p) => p.movePlayed)
      .slice(0, 5);

    if (userMoves.length === 0 && opponentMoves.length === 0) {
      return '';
    }

    return `Sequence (moves ${sequence.startMove}-${sequence.endMove}):
${userColor === 'white' ? 'White' : 'Black'} played: ${userMoves.join(', ') || 'none'}
Opponent played: ${opponentMoves.join(', ') || 'none'}`;
  }

  private extractExplanation(text: string): string {
    const match = text.match(/EXPLANATION:\s*([\s\S]*?)(?=\n\n|TYPE:|$)/i);
    if (match) {
      return match[1].trim();
    }

    const typeMatch = text.match(/TYPE:/i);
    if (typeMatch) {
      const beforeType = text.substring(0, typeMatch.index).trim();
      if (beforeType) {
        return beforeType;
      }
    }

    return text.trim();
  }

  private extractMistakeType(text: string): MistakeType {
    const typeMatch = text.match(/TYPE:\s*(\w+)/i);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase() as MistakeType;
      const validTypes: MistakeType[] = [
        'tactical_blunder',
        'positional_error',
        'calculation_error',
        'defensive_error',
        'time_trouble_error',
        'opening_error',
        'endgame_error',
      ];
      if (validTypes.includes(type)) {
        return type;
      }
    }
    return 'tactical_blunder';
  }

  private classifyMistakeType(centipawnLoss: number): MistakeType {
    if (centipawnLoss >= 200) {
      return 'tactical_blunder';
    }
    return 'positional_error';
  }

  private generateFallbackExplanation(
    patternAnalysis: PatternAnalysis,
    features: TacticalFeatures,
  ): string {
    let explanation = `In the ${features.phase}, `;

    if (patternAnalysis.isCheckmateRelated) {
      explanation += `there was a checkmate opportunity. `;
    }

    if (features.kingExposed) {
      explanation += `The king was exposed and vulnerable. `;
    }

    explanation += `This was a ${patternAnalysis.pattern.replace(/_/g, ' ')}.`;

    return explanation;
  }

  private mapPatternToMistakeType(pattern: TacticalPattern): MistakeType {
    switch (pattern) {
      case 'forced_mate':
      case 'queen_mating_attack':
      case 'back_rank_mate':
      case 'smothered_mate':
      case 'fork':
      case 'pin':
      case 'skewer':
      case 'discovered_attack':
      case 'missed_mate':
      case 'hanging_piece':
      case 'tactical_sequence':
      case 'material_blunder':
        return 'tactical_blunder';
      case 'defensive_collapse':
      case 'king_hunt':
      case 'defensive_error':
        return 'defensive_error';
      case 'positional_error':
        return 'positional_error';
      case 'calculation_error':
        return 'calculation_error';
      default:
        return 'calculation_error';
    }
  }
}
