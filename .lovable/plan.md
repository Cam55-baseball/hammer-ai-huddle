

# Replace Chapter 1 Content — Baserunning IQ

## Summary
Delete existing Chapter 1 lessons (order_index=1) and their linked scenarios, then insert the two new elite lessons (baseball + softball) and 8 scenarios (4 per sport).

## What Gets Deleted
- **Lesson**: `a0000001-0000-0000-0000-000000000001` — "Reading the Pitcher's Move" (baseball, order_index=1)
- **Lesson**: `a0000001-0000-0000-0000-000000000003` — "Slap-and-Run Baserunning" (softball, order_index=1)
- **Scenarios**: `b0000001-...0001` and `b0000001-...0003` (linked to those lessons)
- No user progress references these lessons (0 rows).

## What Gets Inserted

### Lessons (2)
| Title | Sport | Level | order_index |
|-------|-------|-------|-------------|
| Understanding the Runner's Baseline (Baseball) | baseball | beginner | 1 |
| Understanding the Runner's Baseline (Softball) | softball | beginner | 1 |

Both include `elite_cue` and `game_transfer` fields as specified.

### Scenarios (8)
- **4 baseball** scenarios (easy, game_speed, elite, mistake) linked to the baseball lesson
- **4 softball** scenarios (easy, game_speed, elite, mistake) linked to the softball lesson
- All include `options` (jsonb), `wrong_explanations` (jsonb), and `game_consequence`

## Implementation
Single database migration that:
1. Deletes scenarios for old Chapter 1 lessons (CASCADE from lesson_id FK, or explicit delete)
2. Deletes old Chapter 1 lessons
3. Inserts 2 new lessons with known UUIDs
4. Inserts 8 scenarios referencing those lesson UUIDs

No code changes needed — the existing UI already renders lessons, scenarios, elite cues, game transfers, wrong explanations, and game consequences.

