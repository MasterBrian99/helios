# Mistake Analysis Service

## Overview

This service analyzes chess games to identify mistakes, calculate centipawn loss, and generate natural language explanations using LLM (Google Gemini).

## Architecture

```
src/
├── modules/
│   └── analysis/
│       ├── analysis.module.ts           # Module definition
│       ├── analysis.service.ts           # Main orchestration service
│       ├── analysis.repository.ts        # Database operations
│       ├── analysis.controller.ts        # API endpoints
│       ├── move-evaluator.service.ts     # Centipawn loss, classification
│       ├── llm-explainer.service.ts      # Gemini explanations
│       ├── jobs/
│       │   └── analyze-game.job.ts       # pg-boss job handler
│       └── dto/
│           └── analysis-result.dto.ts    # Response DTOs
├── database/
│   └── schema/
│       ├── game-positions.ts             # Position analysis table
│       ├── mistakes.ts                   # Individual mistake records
│       └── mistake-patterns.ts           # Aggregated patterns per user
└── stockfish/
    └── stockfish.service.ts              # Enhanced with evaluation parsing
```

## Database Schema

### game_positions

Stores each position from a game with evaluation data.

| Column         | Type        | Description                                |
| -------------- | ----------- | ------------------------------------------ |
| position_id    | UUID        | Primary key                                |
| game_id        | UUID        | FK to games                                |
| move_number    | INTEGER     | Move number in the game                    |
| fen            | TEXT        | FEN string of position                     |
| move_played    | VARCHAR(20) | Move that was played                       |
| is_user_move   | BOOLEAN     | Whether this was user's move               |
| eval_before    | REAL        | Centipawn evaluation before move           |
| eval_after     | REAL        | Centipawn evaluation after move            |
| centipawn_loss | REAL        | Loss for the move played                   |
| best_move      | VARCHAR(20) | Best move according to engine              |
| best_move_eval | REAL        | Evaluation of best move                    |
| move_quality   | VARCHAR(20) | 'good', 'inaccuracy', 'mistake', 'blunder' |

### mistakes

Individual mistake records for each user.

| Column            | Type        | Description                        |
| ----------------- | ----------- | ---------------------------------- |
| mistake_id        | UUID        | Primary key                        |
| user_id           | UUID        | FK to users                        |
| game_id           | UUID        | FK to games                        |
| position_id       | UUID        | FK to game_positions               |
| mistake_type      | VARCHAR(50) | Classification of mistake type     |
| severity          | VARCHAR(20) | 'inaccuracy', 'mistake', 'blunder' |
| centipawn_loss    | REAL        | How bad the mistake was            |
| fen               | TEXT        | Position FEN                       |
| move_played       | VARCHAR(20) | The mistake move                   |
| best_move         | VARCHAR(20) | What should have been played       |
| move_number       | INTEGER     | Move number                        |
| explanation       | TEXT        | LLM-generated explanation          |
| has_been_reviewed | BOOLEAN     | User review flag                   |

### mistake_patterns

Aggregated patterns per user for trend analysis.

| Column           | Type        | Description                          |
| ---------------- | ----------- | ------------------------------------ |
| pattern_id       | UUID        | Primary key                          |
| user_id          | UUID        | FK to users                          |
| mistake_type     | VARCHAR(50) | Type of mistake                      |
| occurrence_count | INTEGER     | How many times this pattern occurred |
| first_occurrence | TIMESTAMP   | When first seen                      |
| last_occurrence  | TIMESTAMP   | When last seen                       |
| priority_score   | REAL        | Calculated priority for practice     |

## Move Classification

Centipawn loss thresholds:

| Classification | Centipawn Loss |
| -------------- | -------------- |
| Good           | 0-25 cp        |
| Inaccuracy     | 25-50 cp       |
| Mistake        | 50-100 cp      |
| Blunder        | >100 cp        |

Accuracy formula: `103.1668 * e^(-0.04354 * avgCentipawnLoss)`

## Mistake Types

First phase classification (rule-based + LLM):

- **tactical_blunder**: Material loss >200cp with clear tactic
- **positional_error**: 100-200cp loss without material loss
- **calculation_error**: LLM classifies based on position analysis
- **defensive_error**: King safety metrics drop significantly
- **time_trouble_error**: Likely time-pressure mistake
- **opening_error**: Known opening mistake
- **endgame_error**: Endgame-specific mistake

## API Endpoints

| Method | Path                         | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| POST   | `/analysis/:gameId`          | Queue game for analysis       |
| GET    | `/analysis/:gameId`          | Get analysis results          |
| GET    | `/analysis/:gameId/mistakes` | Get mistakes for a game       |
| GET    | `/analysis/mistakes`         | Get user mistakes (paginated) |
| GET    | `/analysis/patterns`         | Get user mistake patterns     |

## Job Queue

Uses pg-boss for asynchronous game analysis:

- **Job Name**: `analyze-game`
- **Concurrency**: 1 (sequential processing)
- **Retry**: 3 attempts with backoff

### Job Flow

1. Parse PGN → extract moves
2. For each move (depth 15):
   - Generate FEN before move
   - Get Stockfish evaluation
   - Apply move, get new FEN
   - Evaluate position after move
   - Calculate centipawn loss
3. Classify moves
4. Save to game_positions table
5. Extract mistakes (loss > 50cp)
6. Generate LLM explanations
7. Update mistake patterns
8. Update games table with stats

## Dependencies

```json
{
  "pg-boss": "^12.x",
  "@wavezync/nestjs-pgboss": "^5.x",
  "ai": "^4.x",
  "@ai-sdk/google": "^1.x",
  "chess.js": "^1.4.0"
}
```

## Environment Variables

| Variable                     | Required | Description                         |
| ---------------------------- | -------- | ----------------------------------- |
| DATABASE_URL                 | Yes      | PostgreSQL connection string        |
| GOOGLE_GENERATIVE_AI_API_KEY | No       | Gemini API key for LLM explanations |

## Stockfish Integration

The `StockfishService` was enhanced with:

- `analyzePosition(fen, depth)` - Returns structured evaluation
- `parseEvaluation(lines)` - Extracts score/bestMove from raw output
- `scoreToCentipawns(score, type)` - Converts mate scores to centipawn equivalent

Binary location: `./bin/stockfish`

## Future Enhancements

1. **ML Classifier**: Train a model to better classify mistake types
2. **Pattern Recognition**: Identify recurring tactical themes
3. **Spaced Repetition**: Schedule review based on mistake patterns
4. **Opening Database**: Cross-reference with opening theory
5. **Multi-engine Support**: Allow different engines (LC0, Komodo)
