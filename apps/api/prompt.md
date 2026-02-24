# 🎯 The Next Process (Critical Upgrade)

You now move from:

> "Eval spike detection"

to

> "Tactical identity resolution"

This is the missing layer.

---

# 🔥 STEP 1 — Collapse Redundant Moments

You currently have 4 moments:

13, 14, 15, 16

But they represent ONE tactical sequence.

So first step:

### 🧹 Sequence Consolidation

If:

- Consecutive moves
- Same mating line in PV
- Mate depth decreasing (12 → 1 → 0)

Then merge into:

```json
{
  "startMove": 14,
  "endMove": 16,
  "type": "Forced Checkmate Sequence"
}
```

This prevents LLM spam.

---

# 🔥 STEP 2 — Upgrade Motif Classification

Your current motif logic only sees:

```
delta > 300 → blunder
```

But here it's actually:

- Defensive collapse
- King-side weakness
- Back rank exposure
- Mate pattern

You need second-pass motif detection:

### Detect Checkmate Pattern

If:

- evalAfter.mate !== null
- mate <= 3
- sideToMove delivers mate

Then classify:

```
"Forced Mate"
```

If queen delivers mate:

```
"Queen-led mating attack"
```

---

# 🔥 STEP 3 — Tactical Feature Extraction

Before calling LLM, enrich metadata with:

- Is it check?
- Is it capture?
- Is it sacrifice?
- Material difference
- Was king exposed?

You already have FEN.
Use chess.js:

Example:

```ts
const isCheck = chess.inCheck();
const isCapture = move.flags.includes('c');
const isMate = evalAfter.mate !== null;
```

Add this to metadata.

---

# 🔥 STEP 4 — Create Tactical Narrative Input

Instead of sending raw eval numbers to LLM, send:

```json
{
  "phase": "middlegame",
  "pattern": "Queen-led mating attack",
  "mateIn": 1,
  "materialSwing": 9,
  "blunderSide": "black",
  "difficulty": 95
}
```

Now LLM has context, not engine noise.

---

# 🔥 STEP 5 — Remove Noise Moments

Moment 16:

```
mate: 1 → mate: 0
```

This is game termination.
You should discard terminal confirmation states.

Rule:

If `mate === 0` → ignore.

---

# 📊 What Your System Should Output For This Game

One final moment:

```json
{
  "moveNumber": 14,
  "type": "Forced Mate",
  "pattern": "Queen-led mating attack",
  "mateIn": 1,
  "blunderSide": "black",
  "difficulty": 92
}
```

Not 4 separate spikes.

---

# 🧠 Why This Matters

Right now your engine layer is correct.

But your domain layer is immature.

You're detecting:

- numerical spikes

You need to detect:

- tactical stories

---

# 🚀 The Real Next Step In Architecture

Add:

```
tactical-sequence-merger.ts
advanced-motif-classifier.ts
terminal-state-filter.ts
```

Pipeline becomes:

```
Spike detection
↓
Terminal filter
↓
Sequence merge
↓
Advanced motif classification
↓
Metadata enrichment
↓
LLM commentary
```

---

# 🧠 If You Don't Do This

Your LLM will generate:

- 4 repetitive explanations
- Weak beginner-level commentary
- Redundant mate announcements

---

# 🏁 Summary

Your next process is NOT:

- More engine depth
- Better ranking formula
- LLM integration

Your next process is:

> Tactical sequence normalization + stronger motif intelligence
