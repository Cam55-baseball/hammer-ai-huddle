

# Fix: Deterministic Answer Options + Intent-Based Mistake Classification

## Issue 1: answer_options Determinism

**Current state**: The backfill produced correct data (0 mismatches between `correct_answer` text and `correct_answer_id` mapping across all 232 rows). `options` is a JSONB array with inherent ordering, so the result is stable. However, the SQL used ROW_NUMBER() without ORDER BY — technically non-deterministic.

**Fix**: Regenerate all 232 `answer_options` using `WITH ORDINALITY` on `jsonb_array_elements_text(options)` to make the mapping explicitly ordered. This is a safety guarantee — the data won't change, but the SQL will be provably deterministic.

**Implementation**: Single UPDATE statement using a CTE with `jsonb_array_elements_text(options) WITH ORDINALITY` to rebuild `answer_options` as `[{"id":"a","text":"..."},{"id":"b","text":"..."},...]` and re-derive `correct_answer_id` by matching `correct_answer` to the ordinality-indexed array.

---

## Issue 2: Mistake Type Reclassification

**Current state**: 19/19/19/19 distribution is artificially balanced. Multiple scenarios are misclassified:

**Examples of wrong classifications** (there are ~15-20 total):
- Scenarios where correct answer = GO/SCORE/ADVANCE but classified `over_aggressive` (should be `hesitation` — the mistake is failing to go):
  - `f1010001-...-04` "bobble → GO" — classified `over_aggressive`, should be `hesitation`
  - `f1010002-...-04` "delayed steal → GO" — classified `over_aggressive`, should be `hesitation`
  - `f1040001-...-04` "wall carom → TAKE SECOND" — classified `over_aggressive`, should be `hesitation`
  - `f1050001-...-04` "passed ball → GO" — classified `over_aggressive`, should be `hesitation`
  - `f1080001-...-04` "2 outs → SCORE" — classified `over_aggressive`, should be `hesitation`
  - `f1080002-...-04` "60ft → SCORE" — classified `over_aggressive`, should be `hesitation`
  - etc.

- Scenarios where correct answer = FREEZE/READ but classified `hesitation` (should be `over_aggressive` or `misread`):
  - `f1020001-...-04` "swing-and-miss → FREEZE AND READ" — classified `hesitation`, should be `over_aggressive`
  - `f1020002-...-04` "line drive → FREEZE AND READ" — classified `hesitation`, should be `over_aggressive`

**Classification rules** (intent-derived):
- `hesitation`: correct answer requires committing (GO/SCORE/ADVANCE), mistake = player freezes
- `over_aggressive`: correct answer requires holding (HOLD/FREEZE/READ), mistake = player goes too early
- `misread`: player reads the wrong cue (wrong fielder, wrong trajectory, wrong count)
- `panic`: player makes irrational snap decision under pressure (surrender, straight-line rundown, abandon technique)

**Implementation**: Review all 76 mistake scenarios individually. Update each `mistake_type` based on actual scenario intent. Accept whatever distribution emerges — it will likely skew toward `misread` and `hesitation` given the scenario content.

---

## Execution Order

1. Regenerate `answer_options` + `correct_answer_id` for all 232 scenarios using WITH ORDINALITY (1 bulk UPDATE via insert tool)
2. Reclassify all 76 mistake scenarios by intent (multiple UPDATEs via insert tool)
3. Return final distribution counts — no rebalancing

## No Code Changes Required

The `ScenarioBlock.tsx` and `useBaserunningDaily.ts` already handle `answer_options` with fallback. Only data updates.

