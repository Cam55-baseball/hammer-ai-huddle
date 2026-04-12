

# Insert Chapters 2–6 Baserunning IQ Lessons & Scenarios

## Current State
- **Chapter 1** (order_index=1): 2 lessons + 8 scenarios — KEEP
- **Old chapters** (order_index 2–3): 3 legacy lessons + 3 scenarios — REPLACE (0 user progress)

## What Gets Deleted
| Lesson ID | Title | order_index |
|-----------|-------|-------------|
| `a0000001-...0002` | Secondary Leads & Reads | 2 |
| `a0000001-...0004` | Drop-Ball Wild Pitch Reads | 2 |
| `a0000001-...0005` | Tagging Up: Decision Framework | 3 |

Plus their 3 linked scenarios. No user progress affected.

## What Gets Inserted

### 9 Lessons (order_index 2–10)

| # | Title | Sport | Level | order_index |
|---|-------|-------|-------|-------------|
| 1 | Sprint Through the Base (Baseball) | baseball | beginner | 2 |
| 2 | Sprint Through the Base (Softball) | softball | beginner | 3 |
| 3 | Never Slide Into First (Baseball) | baseball | advanced | 4 |
| 4 | Never Slide Into First (Softball) | softball | advanced | 5 |
| 5 | Right Foot Turn Mechanics (Baseball) | baseball | advanced | 6 |
| 6 | Right Foot Turn Mechanics (Softball) | softball | advanced | 7 |
| 7 | Leads at First | both | beginner | 8 |
| 8 | Leads at Second | both | advanced | 9 |
| 9 | Leads at Third | both | elite | 10 |

All include `elite_cue` and `game_transfer` as specified.

### ~32 Scenarios (3–4 per lesson)

Each lesson gets 4 scenarios covering `easy`, `game_speed`, `elite`, `mistake` difficulties with:
- `options` (4 choices each)
- `correct_answer`
- `wrong_explanations` (per incorrect option)
- `game_consequence`
- Correct `sport` matching the lesson

Sport-specific lessons get sport-specific scenarios. "both" lessons get `sport = 'both'`.

## Implementation
Single data operation that:
1. Deletes scenarios for old order_index 2–3 lessons
2. Deletes the 3 old lessons
3. Inserts 9 new lessons with deterministic UUIDs
4. Inserts ~36 scenarios (4 per lesson) referencing those UUIDs

No schema or code changes needed — existing UI handles all fields.

## Verification
After insert, confirm:
- 11 total lessons (2 ch1 + 9 new)
- ~44 total scenarios (8 ch1 + 36 new)
- Sport filtering returns correct subsets
- Order is sequential 1–10

