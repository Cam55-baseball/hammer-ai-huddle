

# Insert Chapter 12 — "Never Surrender: Mastering the Art of the Rundown"

## Source Material
Two uploaded PDFs containing:
- **Lesson PDF**: Chapter 12 content covering rundown ("pickle") strategy — extending the play, forcing errors, controlled movements, eye contact, strategic angles
- **Quiz PDF**: 3 quiz questions about rundown tactics

## What Gets Inserted

### 2 Lessons (order_index = 13)

| Title | Sport | Level |
|-------|-------|-------|
| Never Surrender: Mastering the Art of the Rundown (Baseball) | baseball | advanced |
| Never Surrender: Mastering the Art of the Rundown (Softball) | softball | advanced |

**Content** (adapted from PDF): Covers rundown tactical overview, key objectives (extend play, force errors, maintain awareness), techniques (controlled movements, eye contact, strategic angles).

**elite_cue**: "Stay alive. Make them throw."

**game_transfer**: Applies to pickoffs, delayed steals gone wrong, any rundown between bases. Softball version emphasizes shorter distances and faster transfers.

### 8 Scenarios (4 per lesson)

Built from the 3 quiz questions plus one additional scenario to complete the 4-difficulty set:

| # | Difficulty | Source | Scenario Summary |
|---|-----------|--------|-----------------|
| 1 | easy | Quiz Q1 | Caught in rundown — primary objective? |
| 2 | game_speed | Quiz Q2 | Least effective technique in rundown? |
| 3 | elite | Quiz Q3 | How to force a defensive error? |
| 4 | mistake | Generated | Runner panics and sprints straight — consequence? |

Each with `options` (3-4 choices), `correct_answer`, `wrong_explanations`, `game_consequence`. Softball variants adjust for shorter basepaths and faster fielder transfers.

## Implementation
Single data insert:
1. Insert 2 lessons with deterministic UUIDs at `order_index = 13`
2. Insert 8 scenarios (4 baseball, 4 softball) linked to those lessons

No existing data modified. No code changes needed.

## Post-Insert Verification
- Confirm 17 total lessons
- Confirm 68 total scenarios
- Confirm sport filtering integrity

