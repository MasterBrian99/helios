import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { MistakeType } from '../../database/schema/mistakes';
import { StructuredMistake } from './structured-mistake.interface';

export interface MistakeExplanation {
  explanation: string;
  mistakeType: MistakeType;
}

@Injectable()
export class LlmExplainerService {
  private readonly logger = new Logger(LlmExplainerService.name);
  private readonly model: ReturnType<typeof google> | null;
  private readonly temperature: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY');
    const configuredTemp = Number(this.configService.get<string>('LLM_EXPLAINER_TEMPERATURE') ?? '0.1');
    this.temperature = Number.isFinite(configuredTemp) ? configuredTemp : 0.1;

    if (!apiKey) {
      this.logger.warn(
        'GOOGLE_GENERATIVE_AI_API_KEY not set. LLM explanations are disabled; deterministic fallback will be used.',
      );
      this.model = null;
      return;
    }

    this.model = google('gemini-2.5-flash');
  }

  async explainStructured(data: StructuredMistake): Promise<MistakeExplanation> {
    const mistakeType = this.classifyMistake(data);

    if (!this.model) {
      return {
        mistakeType,
        explanation: this.generateDeterministicFallback(data),
      };
    }

    const basePrompt = this.buildPrompt(data, mistakeType, false);
    const first = await this.generateFormatted(basePrompt, mistakeType);

    if (first && this.validateExplanation(first.explanation, data)) {
      return {
        mistakeType,
        explanation: first.explanation,
      };
    }

    const retryPrompt = this.buildPrompt(data, mistakeType, true);
    const retry = await this.generateFormatted(retryPrompt, mistakeType);

    if (retry && this.validateExplanation(retry.explanation, data)) {
      return {
        mistakeType,
        explanation: retry.explanation,
      };
    }

    return {
      mistakeType,
      explanation: this.generateDeterministicFallback(data),
    };
  }

  private classifyMistake(data: StructuredMistake): MistakeType {
    if (data.tactical.missedMate) return 'tactical_blunder';
    if (data.material.immediateLoss) return 'tactical_blunder';
    if (data.tactical.hangingPiece) return 'tactical_blunder';
    if (data.tactical.kingExposed) return 'defensive_error';
    if (data.phase === 'opening' && data.centipawnLoss < 120) return 'opening_error';
    if (data.phase === 'endgame') return 'endgame_error';
    return 'positional_error';
  }

  private buildPrompt(data: StructuredMistake, mistakeType: MistakeType, retry: boolean): string {
    const allowedTactics = this.allowedTactics(data);
    const forbiddenTactics = this.forbiddenTactics(data);
    const materialLine = data.material.immediateLoss
      ? `${data.material.materialLost} points are lost immediately`
      : 'no immediate material loss';

    return `You are a strict formatter, not a chess analyst.
Use only the verified fields below. Do not add any chess ideas.
Do not infer tactics that are not flagged true.
Do not name openings.
Output exactly two lines in this exact schema:
TYPE: ${mistakeType}
EXPLANATION: <2-3 sentences>
${retry ? 'Previous output was rejected by validator. Follow constraints exactly.' : ''}
Write in friendly, clear language for a club-level chess player.
Always mention the played move and the best move using these exact SAN strings.

VERIFIED_FACTS:
phase=${data.phase}
centipawnLoss=${data.centipawnLoss}
severity=${data.severity}
material=${materialLine}
missedMate=${data.tactical.missedMate}${data.tactical.mateIn ? ` (mateIn=${data.tactical.mateIn})` : ''}
hangingPiece=${data.tactical.hangingPiece}
kingExposed=${data.tactical.kingExposed}
backRankWeak=${data.tactical.backRankWeak}
allowedTactics=${allowedTactics.length > 0 ? allowedTactics.join(', ') : 'none'}
forbiddenTactics=${forbiddenTactics.join(', ')}
movePlayed=${data.comparison.movePlayed}
bestMove=${data.comparison.bestMove}
bestMoveBenefits=${data.comparison.bestMoveBenefits.join('; ') || 'none'}
movePlayedConsequences=${data.comparison.movePlayedConsequences.join('; ') || 'none'}`;
  }

  private async generateFormatted(
    prompt: string,
    expectedType: MistakeType,
  ): Promise<{ explanation: string } | null> {
    try {
      const result = await generateText({
        model: this.model!,
        prompt,
        temperature: this.temperature,
        maxOutputTokens: 250,
      });

      return this.parseOutput(result.text, expectedType);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`LLM formatting failed: ${message}`);
      return null;
    }
  }

  private parseOutput(text: string, expectedType: MistakeType): { explanation: string } | null {
    const typeMatch = text.match(/^TYPE:\s*(.+)$/im);
    const explanationMatch = text.match(/^EXPLANATION:\s*([\s\S]+)$/im);

    if (!typeMatch || !explanationMatch) return null;

    const parsedType = typeMatch[1].trim();
    if (parsedType !== expectedType) {
      return null;
    }

    const explanation = explanationMatch[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(' ')
      .trim();
    if (!explanation) {
      return null;
    }

    const sentenceCount = (explanation.match(/[.!?](\s|$)/g) || []).length;
    if (sentenceCount < 2 || sentenceCount > 3) {
      return null;
    }

    return { explanation };
  }

  private validateExplanation(explanation: string, data: StructuredMistake): boolean {
    const text = explanation.toLowerCase();

    if (!data.tactical.fork && text.includes('fork')) return false;
    if (!data.tactical.pin && text.includes('pin')) return false;
    if (!data.tactical.skewer && text.includes('skewer')) return false;
    if (!data.tactical.missedMate && text.includes('mate')) return false;

    if (data.material.materialLost === 0) {
      if (text.includes('loses material')) return false;
      if (text.includes('lost material')) return false;
      if (text.includes('drops material')) return false;
      if (text.includes('blundered a piece')) return false;
    }

    return true;
  }

  private allowedTactics(data: StructuredMistake): string[] {
    const tactics: string[] = [];
    if (data.tactical.fork) tactics.push('fork');
    if (data.tactical.pin) tactics.push('pin');
    if (data.tactical.skewer) tactics.push('skewer');
    if (data.tactical.discoveredAttack) tactics.push('discovered attack');
    if (data.tactical.missedMate) tactics.push('mate');
    if (data.tactical.hangingPiece) tactics.push('hanging piece');
    if (data.tactical.backRankWeak) tactics.push('back rank weakness');
    return tactics;
  }

  private forbiddenTactics(data: StructuredMistake): string[] {
    const blocked: string[] = [];
    if (!data.tactical.fork) blocked.push('fork');
    if (!data.tactical.pin) blocked.push('pin');
    if (!data.tactical.skewer) blocked.push('skewer');
    if (!data.tactical.discoveredAttack) blocked.push('discovered attack');
    if (!data.tactical.missedMate) blocked.push('mate');
    return blocked;
  }

  private generateDeterministicFallback(data: StructuredMistake): string {
    const move = data.comparison.movePlayed || 'the played move';
    const bestMove = data.comparison.bestMove || 'the best move';

    if (data.material.immediateLoss) {
      const pointWord = data.material.materialLost === 1 ? 'point' : 'points';
      return `After ${move}, you immediately lose ${data.material.materialLost} ${pointWord} of material. A better choice was ${bestMove}, which avoids that loss and keeps your position steadier.`;
    }

    if (data.tactical.missedMate) {
      if (data.tactical.mateIn) {
        return `With ${move}, a forced mate in ${data.tactical.mateIn} was missed. Playing ${bestMove} keeps that mating line and converts the advantage cleanly.`;
      }
      return `The move ${move} misses a forcing mating sequence. ${bestMove} keeps the mating threat and preserves the winning plan.`;
    }

    if (data.tactical.kingExposed) {
      return `${move} leaves your king more exposed and makes defense harder. ${bestMove} keeps king safety under better control and gives you a more comfortable position.`;
    }

    if (data.phase === 'opening' && data.positional.undevelopedPieces.length > 0) {
      return `${move} does not lose material, but it slows down your development in the opening. ${bestMove} improves piece activity and keeps your setup on track.`;
    }

    return `${move} is playable, but it makes your position less precise. ${bestMove} keeps better coordination and leads to a cleaner position.`;
  }
}
