import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { MistakeType, Severity } from '../../database/schema/mistakes';

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

    const prompt = this.buildPrompt(
      fen,
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
      console.log('llm result ', text);

      const mistakeType = this.extractMistakeType(text);

      return {
        explanation: text.trim(),
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

  private buildPrompt(
    fen: string,
    movePlayed: string,
    bestMove: string,
    centipawnLoss: number,
    severity: Severity,
  ): string {
    return `You are a chess coach analyzing a player's mistake. Provide a concise explanation (2-3 sentences) of why the move was a mistake and what the better move would have been.

Position (FEN): ${fen}
Move played: ${movePlayed}
Best move: ${bestMove}
Centipawn loss: ${centipawnLoss}
Severity: ${severity}

First, classify this mistake into one of these categories:
- tactical_blunder: A clear tactical error (missed tactic, blundering material)
- positional_error: A positional mistake (weakening pawn structure, poor piece placement)
- calculation_error: A calculation mistake (missed a key line)
- defensive_error: A defensive lapse (allowing attack on king or key pieces)
- time_trouble_error: Likely a time-pressure mistake (obvious blunder)
- opening_error: A known opening mistake
- endgame_error: An endgame mistake

Format your response as:
TYPE: [category]
EXPLANATION: [your 2-3 sentence explanation]`;
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
}
