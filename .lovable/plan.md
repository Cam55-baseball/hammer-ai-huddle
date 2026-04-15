

# Structural Hardening: wrong_explanations Key Alignment + Duplicate Cleanup

## Findings

### 1. wrong_explanations Key Mismatch — ALL 232 Scenarios Affected

Every scenario's `wrong_explanations` is keyed by **option text** (e.g., `"The catcher's shift was a decoy..."`) rather than by **answer_option ID** (`"b"`, `"c"`, `"d"`). The code in `getWrongExplanation` tries ID first (`we[selectedId]`), silently fails on all 232 rows, then falls back to text matching (`we[selectedText]`).

This works today but is fragile: if option text is ever edited without updating `wrong_explanations` keys, the explanation silently disappears. The fix requires two changes:

**Data fix**: Rekey all 232 `wrong_explanations` from text keys → answer_option ID keys. For each scenario, map the 3 wrong option texts to their corresponding `answer_options[].id` values and rebuild the JSONB object.

**Code fix**: Add a dev-mode console warning when `getWrongExplanation` falls through both ID and text lookups, so mismatches are never silent again. This applies to both `ScenarioBlock.tsx` and `DailyDecision.tsx`.

### 2. Near-Duplicate Rundown Scenarios — 3 Redundant

The "rundown between first and second" concept appears across 3 lessons with nearly identical easy-difficulty scenarios teaching the same decision ("primary objective in a rundown"):

| ID | Lesson | Sport | Decision |
|---|---|---|---|
| `645b07dc-...` | L1 (c1000001) | baseball | Fielder jogging toward you — what do you do? |
| `e1200001-...-01` | L12 (d1200001) | baseball | Primary objective in rundown |
| `e2200001-...-01` | L22 (d2200000) | both | First baseman running at you — what do you do? |

L12 is the dedicated rundown lesson — the other two (L1 and L22) duplicate its core concept. Additionally, `f1100001-...-01` (L12 game_speed, baseball) and `e2200001-...-01` (L22 easy, both) have nearly identical scenario text ("first baseman has the ball and is running at you").

**Fix**: Rewrite 2 scenarios:
- `645b07dc-...` (L1 easy, baseball) → New concept: **reading the overthrow at first** — ball gets past first baseman, runner decides to advance
- `e2200001-...-01` (L22 easy, both) → New concept: **rundown with trailing runners** — focus shifts from personal survival to advancing the runner behind you

This preserves L12 as the canonical rundown lesson while eliminating the semantic overlap.

---

## Implementation Order

1. **Data: Rekey wrong_explanations** for all 232 scenarios — single bulk UPDATE via insert tool using a CTE that joins `wrong_explanations` text keys to `answer_options` IDs
2. **Data: Rewrite 2 duplicate rundown scenarios** with new contexts, options, wrong_explanations (ID-keyed), and game_consequence
3. **Code: Add mismatch warning** in `ScenarioBlock.tsx` and `DailyDecision.tsx` — `console.warn` in development when neither ID nor text lookup finds a match

## Technical Details

Rekey SQL pattern:
```sql
-- For each scenario, rebuild wrong_explanations with ID keys
-- by matching each wrong answer_option's text to the existing text-keyed entries
UPDATE baserunning_scenarios s
SET wrong_explanations = (
  SELECT jsonb_object_agg(ao->>'id', s.wrong_explanations::jsonb->(ao->>'text'))
  FROM jsonb_array_elements(s.answer_options) ao
  WHERE ao->>'id' != s.correct_answer_id
)
WHERE answer_options IS NOT NULL;
```

Console warning (dev-only):
```typescript
function getWrongExplanation(scenario, selectedId, selectedText) {
  const we = scenario.wrong_explanations;
  if (!we) return null;
  const result = we[selectedId] ?? we[selectedText] ?? null;
  if (!result && import.meta.env.DEV) {
    console.warn(`[BaserunningIQ] Missing wrong_explanation for scenario ${scenario.id}, selected: id=${selectedId} text="${selectedText}"`);
  }
  return result;
}
```

No schema changes. ~234 total UPDATE operations + 2 code file edits.

