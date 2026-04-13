

# Double Scenario Depth: 4 → 8 Per Lesson

## Current State
- 17 lessons, 68 scenarios (4 per lesson)
- Difficulty constraint: `easy`, `game_speed`, `elite`, `mistake`

## Changes Required

### Schema Change (Migration)
Add `reaction_time` to the difficulty check constraint:
```sql
ALTER TABLE public.baserunning_scenarios DROP CONSTRAINT chk_scenarios_difficulty;
ALTER TABLE public.baserunning_scenarios ADD CONSTRAINT chk_scenarios_difficulty
  CHECK (difficulty = ANY (ARRAY['easy','game_speed','elite','mistake','reaction_time']));
```

### Data Insert: 68 New Scenarios
4 new scenarios per lesson across all 17 lessons:

| New Difficulty | Description |
|---|---|
| `game_speed` | Advanced — faster decision, less obvious correct answer |
| `elite` | Pressure + deception element |
| `mistake` | Common player error trap |
| `reaction_time` | Minimal info, instant decision required |

Each scenario includes: `options` (3-4 choices), `correct_answer`, `wrong_explanations`, `game_consequence`.

Content will be generated per lesson topic and sport-specific (baseball scenarios reference MLB-style play; softball scenarios reference shorter basepaths, slap hitting, faster transfers). `sport = 'both'` lessons (Leads at First/Second/Third) get universal scenarios.

### Lesson Breakdown (17 lessons × 4 new scenarios)
1. Understanding the Runner's Baseline — Baseball (4) + Softball (4)
2. Sprint Through the Base — Baseball (4) + Softball (4)
3. Never Slide Into First — Baseball (4) + Softball (4)
4. Right Foot Turn Mechanics — Baseball (4) + Softball (4)
5. Leads at First (both) (4)
6. Leads at Second (both) (4)
7. Double or Nothing — Baseball (4) + Softball (4)
8. Run Like It Counts — Baseball (4) + Softball (4)
9. Leads at Third (both) (4)
10. Never Surrender: Rundown — Baseball (4) + Softball (4)

### Post-Insert Verification
- Confirm 136 total scenarios
- Confirm each lesson has exactly 8 scenarios
- Confirm difficulty distribution: each lesson has 2× game_speed, 2× elite, 2× mistake, 1× easy, 1× reaction_time
- Sport filtering integrity check

### No Code Changes
Existing UI renders any number of scenarios per lesson dynamically.

