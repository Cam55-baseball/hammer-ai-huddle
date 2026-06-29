# Why offense looks empty

I queried `iq_situations` + `iq_scenarios`. The offense library is published but partially hollow:

- **Softball offense (7 situations)** — `courtesy-runner-pitcher-catcher`, `drop-third-strike-softball-r0`, `illegal-pitch-reaction-batter`, `re-entry-rule-pinch-hit`, `rise-ball-2-strike-approach`, `short-game-dp-flex-rule`, `slap-bunt-fake-swing` → **0 scenarios each**. These are what render as "empty" when a user opens them.
- **Baseball + both-sport offense (17 situations)** — only **1 scenario apiece**. Functional, but shallow vs. the defense/pitching libraries (which carry 3–5 scenarios).

The card list shows the situations, but tapping in lands on an empty quiz pane because `iq_scenarios` has no rows.

# Fix

One Supabase migration that seeds scenarios. No UI changes needed — the existing `useIqSituation` already renders whatever scenarios exist.

### 1. Seed the 7 missing softball offense situations
Insert 3 scenarios per situation into `iq_scenarios` (prompt, correct assignment, explanation, difficulty). Anchored to the existing `iq_situation_actors` for each row so the quiz binds correctly. Topics covered:

- Courtesy runner mechanics (when allowed, who can run, re-entry interaction)
- Dropped third strike with R0 in softball (batter must run, rule nuances at lower levels)
- Illegal pitch reaction (batter's choice: take result or accept ball+advance)
- Re-entry rule for pinch hitters (starter vs. sub, one re-entry, original slot)
- Rise ball 2-strike approach (lay off above the hands, eye discipline)
- Short game with DP/Flex (lineup implications, who bats)
- Slap-bunt / fake-swing read (corner depth, middle coverage)

### 2. Deepen baseball + both-sport offense to 3 scenarios each
Add 2 scenarios per situation (17 × 2 = 34 new rows) covering count variants, runner-state variants, and pitcher-handedness variants so reps don't feel one-and-done.

### 3. Verification
- Post-migration query confirms every offense situation has ≥3 scenarios.
- Open `/iq/off-rise-ball-2-strike-approach` (softball) → quiz renders.
- Open any baseball offense card → 3 reps available.

# Out of scope
- No schema changes, no policy changes, no client code edits.
- Defense/pitching libraries unchanged.
- Spaced-repetition logic unchanged.
