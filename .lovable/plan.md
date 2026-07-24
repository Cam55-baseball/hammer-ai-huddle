# Elite Defensive Drill System

## Problem
The Defense card in Hammers Today prescribes 3–4 generic drills ("Footwork ladder", "Position-specific glove work", "Live game-rep") regardless of the athlete's position or sport. That is not elite, not coach-legible, and does not differentiate C vs SS vs CF vs P, or baseball vs softball.

Source: `src/lib/hammer/prescription/dailyPlan.ts` lines 798–867 — the `defense` case emits generic `DrillStep`s with no position/sport branching beyond the title.

## Solution
Build a real defensive drill library keyed by `(position, sport, seasonPhase)` and drive the daily Defense block from it, matching the depth and structure we already ship for EASS, warmups, and lifts.

### 1. New library: `src/lib/hammer/prescription/defenseLibrary.ts`
Position × sport × phase catalog. Coverage:

- **Catcher (C)** — receiving/framing (Driveline one-knee, Yadi glove-load), blocking (short-hop, angled recoveries, runner-on-3rd blocks), pop-time footwork (jab-replace, rock-and-throw to 2B/3B), pitch calling reads, foul-pop turn-and-find. Softball adds slap-bunt pop-ups and slapper block reads.
- **Pitcher (P)** — PFPs: 1-3-1, comebackers, bunt fielding to all bases, covering 1B on 3-6-1, backing up bases, holding runners (baseball) / rise-ball hold-and-throw (softball).
- **1B** — scoop/short-hop ladder, 3-6-1 & 3-6-3 turn, holding runners, bunt charge, pick footwork.
- **2B / SS** — double-play footwork (feed, pivot, tag+throw, flip, backhand-glove-flip), backhand/forehand range, slow-roller barehand, DP depth vs corners depth, relay cuts.
- **3B** — slow-roller barehand-and-throw, bunt charge & throw, backhand at the line, in-between hop reads.
- **OF (LF/CF/RF)** — drop-step reads, crossover first step, do-or-die charge, fence work, one-hop throws to bases, cutoff communication, sun-ball tracking. CF adds gap reads & communication authority. Softball OF adds rise-ball tracking and shorter fences.
- **Utility / IF-flex / OF-flex** — merge two nearest positions at reduced volume.

Each drill = `{ name, dosage, cue, stopIf?, coachingKey, tags }` with 3–5 drills per phase (in/pre/off/tournament) per position per sport. Off-season prioritizes volume + range; in-season prioritizes reads + finishes; tournament reduces to primer only.

### 2. Sport differentiation
Read `sport_primary` (already available at `dailyPlan.ts:702`). Softball branches:
- 60' bases → shorter throws, quicker exchanges emphasized
- rise-ball tracking for OF/1B pop-ups
- slap-hitter reads for MIF and C
- fastpitch-specific pitcher fielding (no lead-off in most rulesets)

### 3. Rewire `defense` case (`dailyPlan.ts` ~798–867)
Replace the hardcoded drill arrays with `selectDefenseDrills({ position, sport, seasonPhase, injuries, goal })`. Keep the existing `awaiting-input` gate when `pos` is missing. Preserve `gamePlanTemplate` and route.

### 4. Two-way / multi-position awareness
When the athlete has secondary positions logged, add one primer drill from the secondary position so utility players stay sharp on both. Bounded to 1 extra drill to avoid card bloat.

### 5. Injury-aware gating
- Knee/ankle/hip injuries → suppress charge & change-of-direction drills, keep glove work.
- Shoulder injury → suppress long throws, keep footwork + exchange dry reps.
- Reuses `injuryRegions` already computed in `dailyPlan.ts`.

### 6. Coach-legible copy
Every drill gets a plain-English "How?" one-liner (already the pattern from Movement Guides). Hidden behind the same "Show me how" affordance we use for EASS/lifts, so cards stay clean.

## Files
- **New**: `src/lib/hammer/prescription/defenseLibrary.ts` — catalog + `selectDefenseDrills()`
- **Edit**: `src/lib/hammer/prescription/dailyPlan.ts` — `defense` case calls the selector
- **Edit (optional)**: `src/lib/hammer/prescription/movementGuide.ts` — add defensive drill keys so the "How?" sheet resolves

## Out of scope
- Team defense / cutoff-relay choreography (that lives in Game IQ / Game Hub)
- New DB tables — this is a static library like EASS/warmups
- UI changes beyond what the existing `BlockCard` already renders

## Verification
- Switch position from SS → C → CF → P in profile, confirm Defense card drills change per position.
- Toggle sport baseball ↔ softball, confirm softball-specific drills appear (rise-ball, slapper reads).
- Simulate knee injury, confirm charge drills drop out and glove/footwork remain.
- Confirm off/pre/in/tournament phase changes the drill mix and volume.
- Typecheck clean.
