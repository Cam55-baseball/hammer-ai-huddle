# Adaptive Phases & Schedule Communication v1
**Owner-directed, 2026-09-24.** Extends training-intelligence-v1.md, tissue-cost-scheduler-v1.md and its addenda. Same discipline as always: one timeline, shadow before live, tests before release, fallback to today's behaviour.

## 1. The problem
Athletes are not all on a 162-game plan. We have youth athletes with summer ball, AUSL players, athletes who get hurt mid-season, athletes with 4-week offseasons, and athletes who play year round. Plans must bend to the real calendar, not the other way round.
Two things must be true:
1. Telling Hammers about a schedule change must be easy enough for a child, and the plan must visibly change right away.
2. Training phases must fit the time each athlete actually has, and carry over what they have already banked.

## 2. Tell Hammers — one simple inbox
One entry point, big buttons, no typing required:
| Button | What it asks | Tag |
|---|---|---|
| I have games | dates, or "every Saturday until…" | GAME |
| My season starts / ends | one date | SEASON |
| Games got cancelled | pick the dates | CANCELLED |
| Something hurts | where, and how bad (3 faces) | PAIN |
| I need a break | how long | HOLD |
| Big event coming | combine, showcase, tryout, camp + date | EVENT |
| I'm travelling | dates | HOLD |
| Back to normal | today | RESUME |
Rules:
- Three taps maximum for any entry.
- "Ask Hammer" accepts the same thing in plain words or voice, then shows a plain confirmation to approve before saving.
- After saving, always show what changed: "Got it — no games October 5 to 19. Heavy days move to Tuesday and Friday. Next heavy day: Friday."
- Everything lands in one timeline table. Every module reads it. No second calendar anywhere.
- No duplicates: same tag + overlapping dates + same source merges into one entry, and the app says "You already told me this — I updated it."
- Every entry can be undone in one tap for 24 hours.
Tags drive navigation in "Schedule & what changed": SEASON, GAME, TOURNAMENT, PRACTICE, CANCELLED, PAIN, HOLD, EVENT, GOAL, NOTE. Each with its own icon, colour and filter chip.

## 3. The four phases (athlete-facing names)
| Phase | Athlete name | What it builds | Built from existing blocks |
|---|---|---|---|
| P1 | Power Potential | tissue capacity, strength base, absorbing force | B1 Build the Base + B2 Absorb |
| P2 | Power Building | heavy strength and speed-strength | B4 heavy and banded velocity |
| P3 | Explosiveness | reactive, contrast, sharpening | B4 reactive + B5 Sharpen |
| P4 | Game-Ready Production | hold it all, play well, stay healthy | In-season plan |
Each discipline — lifting, throwing, speed, bat speed — has its own phase track. Lifting can be in P2 while throwing is in P4. The tissue tanks already stop the two from stacking.

## 4. The time maths
Window W = weeks from today to the next hard date (first game, or a big event), minus planned off days and holds.
Shares of W: P1 50%, P2 25%, P3 25%. P4 runs the season itself.
Minimums: P1 three weeks, P2 two weeks, P3 two weeks. Seven weeks total.
Allocation rules:
- W ≥ 7 weeks: allocate by share, clamp to minimums, give the remainder to the athlete's priority need (§5).
- 4 ≤ W < 7 weeks: run only two phases, chosen by priority need, two weeks each minimum, and always finish with at least one sharpening week before the first game.
- W < 4 weeks: Bridge mode. Tissue and capacity work, then one sharpening week. No new heavy methods, no new tiers.
- Year-round athletes: rolling three-week micro-phases inside P4, with the emphasis rotating. Any gap of 10+ days with no games becomes a mini block (P2 or P3 by need). Any gap of 21+ days runs a short full arc.
Phase credit ledger: weeks completed in a phase are banked per discipline, weighted by adherence (sessions done ÷ prescribed, capped at 1.0). Credits count toward that phase's minimum, so a churning schedule never forces a restart. Credits fade by half after eight weeks without work in that quality.
Re-planning: any schedule entry recomputes W, subtracts credits, and re-allocates the weeks that remain. A phase already past its minimum is never restarted. A phase cut short by the calendar is marked "shortened" with the reason shown.
Example: youth athlete expects three months of summer ball, gets one weekend, then four weeks are cancelled. The cancellation entry gives back a 4-week window. The engine sees P1 credit already banked, so it runs two weeks of P2 and two of P3, ending with a sharpening week before play resumes.

## 5. Priority need — what gets the extra weeks
Ranked by: (1) the athlete's stated goal (throw harder, get faster, hit harder, stay healthy); (2) their biggest gap against their own benchmarks and their age and level cohort; (3) what they have least of in the credit ledger; (4) any open pain pattern, which always pulls toward P1 capacity work.

## 6. What the athlete sees
A single strip at the top of Hammer's Today:
"Power Building · 3 weeks left → next: Explosiveness (about 2 weeks) → Game-Ready by May 3."
Tapping it explains, in plain words, what this phase is building and what the next one will feel like. No block numbers, no jargon.

## 7. Learning from results (correlation only, never causation)
Outcomes come first: field, combine and practice, not lifting numbers. Tracked per athlete: sprint times, jump tests, bat speed and exit velocity, throwing velocity, combine marks, plus practice and game markers.
For each athlete and each cohort, link: phase length → outcome change; adherence → outcome change; spacing and rest → outcome change; which phase order produced the best gains for athletes like them.
Results feed back into §4 within bounds: shares and minimums may shift by at most 20% from the defaults, changing no more than 5% a week, versioned, and automatically disabled if a learned setting does worse than the default. Language stays "linked with" and "predicts", never "causes", and never a medical or injury-prevention claim.

## 8. Injury and pain pattern record
Every pain flag, "something's off" tap, skip cluster and cut-short session is stored with the load that surrounded it: channel volumes, tank levels, phase, tier, spacing, sleep and soreness.
Produce: a per-athlete pattern view for the athlete and their staff; a cohort pattern report for the owner, for example "shoulder flags rose in the two weeks after throwing volume climbed more than 30% above normal".
Rules: patterns are reported as links, with a confidence label and a minimum data bar. No diagnosis, no treatment advice, no prevention claims. Strong patterns feed the governors as extra caution, never as a verdict.

## 9. Build stages
Stage A — Tell Hammers: the inbox, the tags, the single timeline, dedupe, undo, and proof that a change re-plans Hammer's Today immediately.
Stage B — Adaptive phases: the window maths, credit ledger, per-discipline tracks, the athlete strip, and re-planning on every schedule entry. Shadow first, then live behind its switch.
Stage C — Learning and patterns: outcome links, bounded feedback into the maths, and the injury pattern record.
Each stage: invariants, golden scenarios, a simulated-season sweep, the nightly self-check, watchdog coverage, and a fallback to today's behaviour.

## 10. Invariants
- One timeline, no duplicate entries, every entry undoable for 24 hours.
- A schedule entry always produces a visible plan change or a plain "nothing needed to change" message.
- Phase minimums are never broken silently; a shortened phase always shows its reason.
- Banked credit is never lost to a schedule change.
- Every athlete always has a phase, even with no dates on file: default to Bridge mode.
- No phase change may break a floor, a hard rule or an age gate.
- With the switch off, behaviour is identical to today.
