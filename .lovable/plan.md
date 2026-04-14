

# Surgical Insert: Lessons 14–17 (Execution Layer)

## Current State
- 37 lessons, order_index 1–13 then 18–37 (gap at 14–17)
- 216 scenarios total
- No title conflicts with new lessons

## Phase 1 — Insert 4 Lessons

Deterministic UUIDs `d14xxxxx` through `d17xxxxx`. All `sport = 'both'`.

| order_index | Title | Level |
|---|---|---|
| 14 | First Step Explosion (Commit vs Hesitate) | advanced |
| 15 | Read → Decide → Commit Speed | advanced |
| 16 | Angle Efficiency & Turn Sharpness | advanced |
| 17 | No-Hesitation Zone (Point of No Return) | elite |

Each lesson includes:
- **content**: Concise, game-speed execution focus (not theory)
- **elite_cue**: One-line coaching cue for in-game recall
- **game_transfer**: How to apply in live at-bats/baserunning

## Phase 2 — Insert 16 Scenarios (4 per lesson)

Every scenario follows the speed/commitment theme:
- Mid-play, pressure-read scenario_text (no "what should you do?" prompts)
- 4 options, correct_answer, explanation
- wrong_explanations for ALL 3 incorrect options (JSONB)
- game_consequence for every scenario
- Difficulty spread: easy, game_speed, elite, reaction_time

Example scenario style:
> "Ball chopped to SS, you're three steps off first with full commit momentum — the shortstop bobbles it. What wins?"

## Phase 3 — Order Fix
Insert at order_index 14, 15, 16, 17. No existing lessons occupy these indices. The sequence becomes 1–37 continuous (41 total lessons).

## Phase 4 — Validation Queries
1. `SELECT MIN(order_index), MAX(order_index), COUNT(*) FROM baserunning_lessons` → expect 1, 37, 41
2. `SELECT order_index FROM baserunning_lessons ORDER BY order_index` → continuous 1–37 (with duplicates at 13 for baseball/softball)
3. Total scenario count → 232
4. Scenario count for lessons 14–17 → 16
5. Return 2 full scenario JSON samples

## Implementation
- Data inserts only using the insert tool (no schema changes)
- No code changes needed — UI renders dynamically
- DailyDecision hook includes `sport.eq.both` automatically

## Expected Final State
- **41 lessons** (order_index 1–37, continuous)
- **232 scenarios** total
- 2 full JSON scenario samples as proof

