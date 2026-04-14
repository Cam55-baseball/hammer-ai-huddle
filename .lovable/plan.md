

# Elite Control System: Lessons 26–37

## Current State
- 25 lessons (order_index 1–25), 168 scenarios
- Last lesson: order_index 25, "Elite Game Awareness"
- All recent lessons use `sport = 'both'`, `level = 'elite'`

## Phase 1 — Insert 12 Lessons

Deterministic UUIDs `d26...` through `d37...`. All `sport = 'both'`, `level = 'elite'`.

| # | Title | Core Focus |
|---|---|---|
| 26 | Pitcher Pattern Recognition | Reading timing tells, slide-step vs full wind-up |
| 27 | Timing Disruption (Controlling the Pitcher) | Forcing pickoffs, disrupting rhythm |
| 28 | Primary Lead Deception | Disguising lead distance and intent |
| 29 | Secondary Lead Manipulation | Using secondary movement to bait throws |
| 30 | Steal Decision Intelligence (When NOT to Go) | Recognizing negative-EV steal situations |
| 31 | Delayed Steal & Walking Leads | Exploiting defensive inattention |
| 32 | Defensive Alignment Exploitation | Reading shifts, open bases, coverage gaps |
| 33 | Forcing Defensive Mistakes | Creating rushed throws and miscommunication |
| 34 | Body Language & Intent Disguise | Controlling what the defense reads from you |
| 35 | Selling Hesitation & False Reads | Fake stops, delayed breaks, misdirection |
| 36 | Inning & Score Game Theory | When aggression pays vs. when it kills rallies |
| 37 | Fatigue & Pressure Recognition | Reading tired pitchers/catchers, late-game edges |

Each lesson includes concise `content` (decision-focused, no long paragraphs), `elite_cue`, and `game_transfer`.

## Phase 2 — Insert 48 Scenarios (4 per lesson × 12 lessons)

Difficulty per lesson: `easy`, `game_speed`, `elite`, `mistake`

All scenarios written as live-game pressure reads with:
- Pitcher movement, defender positioning, game context (outs/inning/score), timing windows
- 4 distinct answer options
- `correct_answer`, `explanation`
- `wrong_explanations` keyed to each wrong option
- `game_consequence`

Example quality standard:
- "Pitcher has shown 1.4s to the plate twice. Catcher pops 2.05. You've taken two aggressive leads already — what wins?"
- NOT "What should you do when the pitcher is slow?"

## Phase 3 — Sport Adaptation
All lessons `sport = 'both'`. Scenario text uses universal reads that apply to both baseball (longer timing windows) and softball (tighter reaction windows).

## Phase 4 — Verification
After insert, confirm:
1. Total lessons = 37
2. Order_index 1–37 sequential, no gaps
3. Every new lesson has exactly 4 scenarios
4. Total scenarios = 216 (168 + 48)
5. No orphan scenarios
6. DailyDecision compatibility (hook queries `sport.eq.both`)
7. Return 2 full sample scenarios as JSON proof

## Implementation
- Data inserts only (no schema or code changes)
- Existing UI renders dynamically
- DailyDecision hook already includes `sport = 'both'` in its filter

## Expected Final State
- **37 lessons** (order_index 1–37)
- **216 scenarios** total
- 2 full JSON scenario samples provided as proof

