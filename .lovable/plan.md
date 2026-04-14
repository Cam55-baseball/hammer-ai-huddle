

# System Completion: Chapters 11–12 → Lessons 18–25

## Phase 1 — Clean Range
No lessons exist at order_index >= 18. No cleanup needed.

## Phase 2 — Insert 8 Lessons (order_index 18–25)

All lessons use `sport = 'both'`. Deterministic UUIDs `d18xxxxx` through `d25xxxxx`.

| order_index | Title | Level |
|---|---|---|
| 18 | Secondary Leads & Reaction Movement | advanced |
| 19 | Pitch-to-Pitch Adjustment System | advanced |
| 20 | Pitch Recognition → First Move | elite |
| 21 | Ball-in-Dirt Reaction System | elite |
| 22 | Rundown Survival System | elite |
| 23 | Trailing Runner Intelligence | elite |
| 24 | Chaos Base Running (Broken Plays) | elite |
| 25 | Elite Game Awareness (Full Field Processing) | elite |

Each includes concise decision-focused `content`, `elite_cue`, and `game_transfer`.

## Phase 3 — Insert 32 Scenarios (4 per lesson)

Difficulty per lesson: `easy`, `game_speed`, `elite`, `mistake`.

All scenarios written as live-game reads — no "What should you do?" phrasing. Each includes:
- `scenario_text`: situational, pressure-based
- `options`: 4 distinct choices
- `correct_answer`, `explanation`
- `wrong_explanations`: keyed to each wrong option
- `game_consequence`: next-play outcome

## Phase 4 — Sport Adaptation
Lessons set to `sport = 'both'`. Scenario text references universal reads. Where relevant, scenarios naturally accommodate both baseball (longer windows) and softball (faster reactions) since they use `both`.

## Phase 5 — Verification Queries
After insert, run:
1. `SELECT COUNT(*) FROM baserunning_lessons` → expect 25
2. `SELECT order_index, COUNT(*) FROM baserunning_lessons GROUP BY order_index ORDER BY order_index` → 1–25 sequential
3. `SELECT lesson_id, COUNT(*) FROM baserunning_scenarios GROUP BY lesson_id` → every lesson has ≥4
4. `SELECT COUNT(*) FROM baserunning_scenarios` → expect 168
5. Orphan check: scenarios with no matching lesson
6. Sample 2 full scenarios as JSON proof
7. Confirm DailyDecision compatibility (sport filter includes `both`)

## Implementation
- Single data insert operation (no schema changes needed)
- No code changes — existing UI renders dynamically
- DailyDecision hook already queries `sport.eq.both` so new scenarios appear automatically

## Post-Insert Deliverables
- Total lesson count
- Total scenario count
- 2 full sample scenarios (JSON)
- Sport filtering confirmation
- DailyDecision compatibility confirmation

