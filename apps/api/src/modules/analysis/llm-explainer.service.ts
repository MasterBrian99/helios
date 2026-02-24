import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from '@ai-sdk/google';
import { generateText, Output, stepCountIs } from 'ai';
import z from 'zod';
import {
  ExplanationSource,
  ExplanationValidationStatus,
  MistakeType,
} from '../../database/schema/move-classifications';
import { StructuredMistake } from './structured-mistake.interface';

const ANALYSIS_VERSION = 'v2-deterministic-core';

export interface MistakeExplanation {
  explanation: string;
  mistakeType: MistakeType;
  source: ExplanationSource;
  validationStatus: ExplanationValidationStatus;
  validationReason: string | null;
  analysisVersion: string;
}

@Injectable()
export class LlmExplainerService {
  private readonly logger = new Logger(LlmExplainerService.name);
  private readonly model: ReturnType<typeof google> | null;
  private readonly temperature: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(
      'GOOGLE_GENERATIVE_AI_API_KEY',
    );
    const configuredTemp = Number(
      this.configService.get<string>('LLM_EXPLAINER_TEMPERATURE') ?? '0.1',
    );
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

  async explainStructured(
    data: StructuredMistake,
  ): Promise<MistakeExplanation> {
    const mistakeType = this.classifyMistake(data);

    if (!this.model) {
      return {
        mistakeType,
        explanation: this.generateDeterministicFallback(data),
        source: 'deterministic_fallback',
        validationStatus: 'llm_unavailable',
        validationReason: 'llm_unavailable',
        analysisVersion: ANALYSIS_VERSION,
      };
    }

    const first = await this.generateFormatted(
      this.buildPrompt(data, mistakeType, false),
      mistakeType,
    );
    const firstValidation = first
      ? this.validateExplanation(first.explanation, data)
      : { valid: false, reason: 'parse_or_format_error' };

    if (first && firstValidation.valid) {
      return {
        mistakeType,
        explanation: first.explanation,
        source: 'llm',
        validationStatus: 'passed',
        validationReason: null,
        analysisVersion: ANALYSIS_VERSION,
      };
    }

    const retry = await this.generateFormatted(
      this.buildPrompt(data, mistakeType, true),
      mistakeType,
    );
    const retryValidation = retry
      ? this.validateExplanation(retry.explanation, data)
      : { valid: false, reason: 'parse_or_format_error' };

    if (retry && retryValidation.valid) {
      return {
        mistakeType,
        explanation: retry.explanation,
        source: 'llm',
        validationStatus: 'passed',
        validationReason: null,
        analysisVersion: ANALYSIS_VERSION,
      };
    }

    return {
      mistakeType,
      explanation: this.generateDeterministicFallback(data),
      source: 'deterministic_fallback',
      validationStatus: 'failed_then_fallback',
      validationReason:
        firstValidation.reason ?? retryValidation.reason ?? 'validation_failed',
      analysisVersion: ANALYSIS_VERSION,
    };
  }

  private classifyMistake(data: StructuredMistake): MistakeType {
    if (data.tactical.missedMate) return 'tactical_blunder';
    if (data.material.immediateLoss) return 'tactical_blunder';
    if (data.tactical.hangingPiece) return 'tactical_blunder';
    if (data.tactical.kingExposed) return 'defensive_error';
    if (data.phase === 'opening' && data.centipawnLoss < 120) {
      return 'opening_error';
    }
    if (data.phase === 'endgame') return 'endgame_error';
    return 'positional_error';
  }

  private buildPrompt(
    data: StructuredMistake,
    mistakeType: MistakeType,
    retry: boolean,
  ): string {
    const allowedTactics = this.allowedTactics(data);
    const materialLine = data.material.immediateLoss
      ? `${data.material.materialLost} points are lost immediately`
      : 'no immediate material loss';

    return `You are a chess coach explaining a mistake to a club-level player.
You are NOT an engine. Do NOT mention centipawns, evaluation numbers, or "accuracy".
Use only the VERIFIED_FACTS below. Do not invent ideas.
Do not name openings.
Do not mention tactics that are not listed in allowedTactics.
If a tactic appears in forbiddenTactics, do NOT reference it.

Return a JSON object with exactly:
{
  "type": "${mistakeType}",
  "explanation": "<2-3 sentences>"
}

${retry ? 'Previous output failed validation. Follow every constraint exactly.' : ''}

STYLE RULES:
- Always mention the played move: "${data.comparison.movePlayed}"
- Always mention the best move: "${data.comparison.bestMove}"
- First sentence: clearly state what went wrong (human terms).
- Second sentence: explain why (material loss, tactic, king safety, etc).
- Third sentence (if needed): explain why the best move is better.
- Use natural chess language like: loses a pawn, loses a piece, weakens the king, allows a pin, gives counterplay, improves activity.
- Do NOT say "centipawn", "evaluation", or "positional accuracy".
- If material=no immediate material loss, focus on positional or tactical consequences instead.
- If severity=blunder, make it sound serious.
- If severity=mistake, make it sound moderate.
- If severity=miss, make it sound mild.

VERIFIED_FACTS:
phase=${data.phase}
classification=${data.classification}
material=${materialLine}
missedMate=${data.tactical.missedMate}${data.tactical.mateIn ? ` (mateIn=${data.tactical.mateIn})` : ''}
hangingPiece=${data.tactical.hangingPiece}
kingExposed=${data.tactical.kingExposed}
backRankWeak=${data.tactical.backRankWeak}
allowedTactics=${allowedTactics.length > 0 ? allowedTactics.join(', ') : 'none'}
movePlayed=${data.comparison.movePlayed}
bestMove=${data.comparison.bestMove}
bestMoveBenefits=${data.comparison.bestMoveBenefits.join('; ') || 'none'}
movePlayedConsequences=${data.comparison.movePlayedConsequences.join('; ') || 'none'}`;
  }

  private async generateFormatted(
    prompt: string,
    expectedType: MistakeType,
  ): Promise<{ explanation: string } | null> {
    const outputSchema = z.object({
      type: z.string(),
      explanation: z.string(),
    });

    console.log('------------------------------------------------------------');
    console.log('prompt: ', prompt);
    console.log('------------------------------------------------------------');

    try {
      const result = await generateText({
        model: this.model!,
        output: Output.object({
          schema: outputSchema,
        }),
        prompt,
        temperature: this.temperature,
        stopWhen: stepCountIs(5),
      });
      console.log(
        '------------------------------------------------------------',
      );
      console.log('result.output', result);
      console.log(
        '------------------------------------------------------------',
      );

      return this.parseOutput(result.output, expectedType);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Structured generation failed, falling back to JSON text parse: ${message}`,
      );
    }

    try {
      const textResult = await generateText({
        model: this.model!,
        prompt: `${prompt}

Return only a valid JSON object. Do not include markdown fences.`,
        temperature: this.temperature,
        maxOutputTokens: 250,
      });

      const parsed = this.tryParseJsonObject(textResult.text);
      if (!parsed) return null;

      const validated = outputSchema.safeParse(parsed);
      if (!validated.success) return null;

      return this.parseOutput(validated.data, expectedType);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `LLM formatting failed after fallback parse: ${message}`,
      );
      return null;
    }
  }

  private parseOutput(
    output: { type: string; explanation: string },
    expectedType: MistakeType,
  ): { explanation: string } | null {
    const parsedType = output.type.trim().toLowerCase();
    if (parsedType !== expectedType) return null;

    const explanation = output.explanation
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(' ')
      .trim();
    if (!explanation) return null;

    const sentenceCount = (explanation.match(/[.!?](\s|$)/g) || []).length;
    if (sentenceCount < 2 || sentenceCount > 3) return null;

    return { explanation };
  }

  private tryParseJsonObject(text: string): unknown {
    const trimmed = text.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      // best effort: parse first top-level object if model wraps extra text
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) return null;
      const candidate = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
  }

  private validateExplanation(
    explanation: string,
    data: StructuredMistake,
  ): { valid: boolean; reason?: string } {
    const text = explanation.toLowerCase();
    const hasWord = (word: string) =>
      new RegExp(
        `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'i',
      ).test(text);

    if (!data.tactical.fork && hasWord('fork')) {
      return { valid: false, reason: 'forbidden_tactic_fork' };
    }
    if (!data.tactical.pin && hasWord('pin')) {
      return { valid: false, reason: 'forbidden_tactic_pin' };
    }
    if (!data.tactical.skewer && hasWord('skewer')) {
      return { valid: false, reason: 'forbidden_tactic_skewer' };
    }
    if (!data.tactical.missedMate && hasWord('mate')) {
      return { valid: false, reason: 'forbidden_mate_mention' };
    }

    if (data.material.materialLost === 0) {
      if (text.includes('loses material')) {
        return { valid: false, reason: 'forbidden_material_loss_claim' };
      }
      if (text.includes('lost material')) {
        return { valid: false, reason: 'forbidden_material_loss_claim' };
      }
      if (text.includes('drops material')) {
        return { valid: false, reason: 'forbidden_material_loss_claim' };
      }
      if (text.includes('blundered a piece')) {
        return { valid: false, reason: 'forbidden_material_loss_claim' };
      }
    }

    return { valid: true };
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

    if (
      data.phase === 'opening' &&
      data.positional.undevelopedPieces.length > 0
    ) {
      return `${move} does not lose material, but it slows down your development in the opening. ${bestMove} improves piece activity and keeps your setup on track.`;
    }

    return `${move} is playable, but it makes your position less precise. ${bestMove} keeps better coordination and leads to a cleaner position.`;
  }
}
