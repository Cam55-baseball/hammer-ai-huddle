

# Upgrade Scenario Feedback System

## Summary
Add per-wrong-answer explanations and game consequences to every scenario, turning each into a full coaching moment.

## 1. Database Migration

Add two columns to `baserunning_scenarios`:

```sql
ALTER TABLE baserunning_scenarios
  ADD COLUMN wrong_explanations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN game_consequence text;
```

- `wrong_explanations`: JSON object keyed by wrong answer text → explanation string. Example: `{"Hold at second": "Holding here lets the defense reset...", "Try for home": "Without reading the cutoff..."}`
- `game_consequence`: Text describing what happens on the next play if the correct decision is made

## 2. UI Changes — 3 Files

### `ScenarioBlock.tsx` — Enhanced feedback panel
When user answers:
- **Correct**: Show existing `explanation` (why it wins) + `game_consequence` (what happens next)
- **Wrong**: Show the specific `wrong_explanations[selected]` message for their choice, then the correct explanation below, plus `game_consequence`

Layout after answer:
```text
┌─────────────────────────────────────┐
│ ✗ Why "Hold at second" fails:       │
│   [wrong_explanations[selected]]    │
│                                     │
│ ✓ Correct: "Tag and advance"        │
│   [explanation]                     │
│                                     │
│ 🎯 Next Play:                       │
│   [game_consequence]                │
└─────────────────────────────────────┘
```

### `DailyDecision.tsx` — Same enhanced feedback
Apply identical feedback rendering in the daily decision flow (lines ~155-160 where feedback is shown).

### `useBaserunningDaily.ts` — Update type
Add `wrong_explanations` and `game_consequence` to the `DailyScenario` interface.

## 3. Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `wrong_explanations` (jsonb) + `game_consequence` (text) columns |
| `src/components/baserunning-iq/ScenarioBlock.tsx` | Enhanced feedback panel with wrong-answer-specific + consequence |
| `src/components/baserunning-iq/DailyDecision.tsx` | Same enhanced feedback |
| `src/hooks/useBaserunningDaily.ts` | Update interface |

## 4. Seed Data Update
Update existing 5 scenarios with sample `wrong_explanations` and `game_consequence` values so the feature is immediately visible.

