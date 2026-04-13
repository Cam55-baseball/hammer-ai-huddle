

# Insert Chapters 10 & 11 — Baserunning IQ

## Conflict Resolution
"Leads at Third" currently sits at `order_index = 10`. The new chapters need 10 and 11. Solution: shift "Leads at Third" from 10 → 12, then insert the new chapters at 10 and 11.

No user progress exists on any lessons, so the shift is safe.

## Data Operations

### Step 1: Shift existing lesson
Update `c2000001-0000-0000-0000-000000000009` ("Leads at Third") from `order_index = 10` to `order_index = 12`.

### Step 2: Insert 4 new lessons

| Title | Sport | Level | order_index |
|-------|-------|-------|-------------|
| Double or Nothing: Hustling Out of the Box (Baseball) | baseball | advanced | 10 |
| Double or Nothing: Hustling Out of the Box (Softball) | softball | advanced | 10 |
| Run Like It Counts: Two-Out Baserunning (Baseball) | baseball | advanced | 11 |
| Run Like It Counts: Two-Out Baserunning (Softball) | softball | advanced | 11 |

All with `elite_cue`, `game_transfer`, and full `content` as specified.

### Step 3: Insert 16 scenarios (4 per lesson)

**Chapter 10 — Baseball** (4 scenarios: easy, game_speed, elite, mistake) — all content from request  
**Chapter 10 — Softball** (4 scenarios: easy, game_speed, elite, mistake) — mirrored with tighter timing emphasis  
**Chapter 11 — Baseball** (4 scenarios: easy, game_speed, elite, mistake) — 2 from request + 2 generated (elite, mistake)  
**Chapter 11 — Softball** (4 scenarios: easy, game_speed, elite, mistake) — parallel softball versions

Each scenario includes `options`, `correct_answer`, `wrong_explanations`, `game_consequence`.

## Result After Insert
- 15 total lessons (order_index 1–12, with some shared indices per sport)
- ~60 total scenarios
- No code changes needed — existing UI handles all fields

