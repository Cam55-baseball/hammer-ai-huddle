

# Full Scenario Repair: Structure, Balance, and Deduplication

## Current State
- **232 total scenarios**, 75 are `mistake` difficulty
- **17 scenarios have only 2 options** (all `mistake`, all in lessons 1–13)
- **Concept duplication**: 4 scenarios repeat "SPRINT THROUGH vs SLIDE" (lessons 2–5), 5 repeat "GO vs HOLD on error/bobble" (lessons 1, 6–10)
- Mistake type distribution is heavily skewed toward over-aggressive/hesitation binary choices

## Phase 1 — Structural Fix (17 scenarios)

Expand all 17 two-option scenarios to 4 options each. Every scenario gets:
- 1 correct answer (unchanged)
- 3 distinct wrong answers: one hesitation-based, one over-aggressive, one misread/panic
- `wrong_explanations` JSONB updated with all 3 keys
- `correct_answer` verified to match one option exactly

| ID | Lesson | Current Binary | New Options Added |
|---|---|---|---|
| `f101...04` (×2) | L1 BB/SB | GO/HOLD on bobble | +hesitation read, +misread angle, +panic retreat |
| `f102...04` | L2 BB | SPRINT/SLIDE | +decelerate to read, +dive headfirst, +veer wide |
| `f102...04` | L3 SB | SPRINT/SLIDE | +pump arms and lean, +hook slide, +slow to time |
| `f103...04` (×2) | L4-5 BB/SB | SPRINT/SLIDE | +pop-up slide, +stutter-step, +barrel roll |
| `f104...04` (×2) | L6-7 BB/SB | GO/HOLD on wall | +check halfway, +round but wait, +sprint then stop |
| `f105...04` | L8 | GO/HOLD on passed ball | +freeze and watch, +bluff then hold, +jog casually |
| `f106...04` | L9 | GO/WAIT on ground ball | +peek then decide, +freeze at bag, +sprint then brake |
| `f107...04` (×2) | L10 BB/SB | GO/HOLD on error | +read backup, +stutter turn, +stop and watch |
| `f108...04` (×2) | L11-12 BB/SB | SCORE/HOLD | +hold for coach, +round but brake, +freeze at third |
| `f109...04` | L13 | TAG/HOLD on fly | +leave early, +sprint blind, +freeze mid-path |

## Phase 2 — Concept Deduplication

**Problem**: "SPRINT THROUGH vs SLIDE into first" appears in 4 separate scenarios (plus 2 more in `game_speed`). "GO vs HOLD on error" appears 5 times.

**Fix**: Rewrite 6 scenarios to introduce distinct game contexts:
- Convert 2 "slide into first" scenarios → new contexts (e.g., "reaching for bag vs running through on overthrow", "deciding to dive back vs sprint on pickoff")
- Convert 2 "GO/HOLD on error" scenarios → new contexts (e.g., "reading relay throw angle", "commit vs bail on delayed steal")

## Phase 3 — Mistake Type Balance

Current distribution across 75 mistake scenarios (estimated):
- Hesitation: ~35%
- Over-aggressive: ~15%
- Misread: ~30%
- Panic: ~20%

**Target**: ~25% each (18-19 per type)

Achieved naturally through Phase 1 (each expanded scenario adds all 3 wrong types) and Phase 2 (new contexts diversify the correct-answer classification).

## Phase 4 — Validation

Return:
1. `SELECT jsonb_array_length(to_jsonb(options)) as opt_count, COUNT(*) FROM baserunning_scenarios GROUP BY opt_count` → must show only `4: 232`
2. 10 random updated scenarios as full JSON
3. List of all 17+ modified scenario IDs
4. `SELECT DISTINCT difficulty FROM baserunning_scenarios` → only `easy`, `game_speed`, `elite`, `mistake`

## Implementation

- 17 UPDATE statements via insert tool to expand options + wrong_explanations
- 6 additional UPDATEs to rewrite duplicated concepts
- No schema changes, no code changes
- Total: ~23 UPDATE operations

## Expected Final State
- **232 scenarios**, all with exactly 4 options
- **0 concept duplicates** across slide/error patterns
- Balanced mistake type distribution
- Every `wrong_explanations` has exactly 3 keys matching the 3 wrong options

