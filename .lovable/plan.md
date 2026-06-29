
# Game IQ 101 — Full Remediation Sweep

Authority: `docs/iq/iq101-audit-report.md` (6 OK · 77 EDIT · 31 WRONG across 114 published situations). Work proceeds top-to-bottom through 6 phases; each phase is a checkpoint where I'll post a summary before moving on, so you can pause/redirect without re-approving.

## Phase 0 — Rule & factual corrections (18 items)

Pure data updates via `supabase--insert` (UPDATE on `iq_situations`, `iq_situation_actors`, `iq_scenarios`). Highest credibility risk, fastest to ship.

1. `intentional-walk-baseball` — re-encode to MLB 5.05(b)(1) auto-IBB (no pitches thrown); C→`read`
2. `courtesy-runner-pitcher-catcher` — remove "with 2 outs" (NCAA 8.10 any inning)
3. `appeal-leaving-base-early` — "reached plate" → "leaves pitcher's hand" (NCAA 12.21)
4. `rise-ball-2-strike-approach` — zone bottom "sternum" → "top of knees"
5. `illegal-pitch-softball-r0` — replace MLB sources with NCAA Softball Rule 10.5 + NFCA
6. `bunt-tag-play-r3` — remove "block plate" (violates MLB 6.01(i))
7. `bunt-defense-tying-run-9th` — 3B→`ball` (charge), SS→`bag` (rotate to 3B)
8. `safety-squeeze-r3-2-outs` — rename + reframe as 2-out suicide squeeze
9. `off-bunt-for-hit` Scenario 2 — fix RHH push-bunt direction (P–1B corridor)
10. `bunt-pop-up-corner` — add IFF-does-NOT-apply-to-bunts cue (MLB 5.09(a)(12))
11. `bunt-3-2-count-r1`, `bunt-defense-cover-r1-steal`, `bunt-foul-pop-c` — add 2-strike-foul-bunt = K rule (MLB 5.09(a)(3))
12. `bunt-3b-line-r1` — P→`bag` covering 1B
13. Rundown family (3 slugs): trappers→`execute`, backers→`backup`, fix C on rundown-r3-between-3-home
14. 1st-and-3rd family (4 slugs): C `read`→`ball`
15. `catcher-throw-3b-r2-steal` — SS→`backup`; 3B covers
16. `off-lead-from-2b`, `off-lhp-pickoff-tells`, `off-primary-secondary-1b` — set `sport='baseball'`
17. `off-tag-up-3b` — verify break cue says "ball secured", not "first touch"
18. `first-third-walk-off-bunt` — temporarily unpublish (`status='draft'`) until rewritten in Phase 2

## Phase 1 — System / structural fixes (code)

| File | Change |
|---|---|
| `src/pages/GameIqSituation.tsx` (line ~168) | Render `OFFENSIVE_ROLES` (BAT/BR/R1/R2/R3) in the teach grid alongside `DEFENSIVE_ROLES` so offense actors are accessible |
| `src/lib/iq/contextShifts.ts` | Add baserunner entries (R1/R2/R3/BR/BAT) to `SHIFTS` map across batter_speed / swing_side / tendency / next_pitch / weather; add new axes `lead_type`, `pickoff_look`, `secondary_timing` to `CONTEXT_VALUES` (baseballOnly) |
| Migration | `ALTER TABLE iq_actor_context_shifts DROP CONSTRAINT … CHECK (context_axis IN …)` then re-add with the 3 new axes |
| `src/lib/iq/bulkImport.ts` | Validator: slugs containing `lead`/`pickoff`/`primary-secondary` must have `sport='baseball'` |

## Phase 2 — Stub-text purge (~12 slugs)

Rewrite every actor that currently reads "Standard coaching / Out of position / Anticipate pre-pitch / Standard" with play-specific assignments, common mistakes, elite cues, and comms calls. Plus full rewrite of `first-third-walk-off-bunt` and the 3 fully-stubbed pickoffs (`pickoff-2b-daylight`, `pickoff-2b-timing`, `pickoff-3b-lhp`). Re-publish after rewrite.

## Phase 3 — Path choreography (~80 slugs)

Replace every `primary_path=[{x:50,y:50}]` with real coordinates. Templates already validated in the existing DB: `runner-1st-sac-bunt`, `comebacker-r1-double-play`, `mound-visit-runners-12-no-outs`, `no-one-on-ball-in-gap`. Coordinate plan per slug authored from the per-bucket tables in the audit report (e.g. SS relay LF→home alignment `(30,72)`, 2B relay RF→home `(65,62)`, P backup 3B `(24,72)` not `(18,85)`). Work in batches of ~10 slugs per `supabase--insert`.

## Phase 4 — Missing runner actors (~30 slugs)

Add the absent R1/R2/R3 actor row (with `execute` assignment + canonical lead path) to every pickoff, wild-pitch, squeeze, look-back, wheel, and first-third slug where the runner is the subject of the play. Verified list per bucket-tables.

## Phase 5 — Scenario authoring (~90 slugs at 0 scenarios)

Target 3 scenarios per slug (one teaching the primary decision branch, one distractor against a common mistake, one rules-edge case). Authored to match the corrected coaching content. Inserted via `iq_scenarios` with explicit `correct_actor_assignments`. Batched ~15 slugs per call.

## Phase 6 — Context-shift seeding

Populate `iq_actor_context_shifts` for the highest-leverage axes first: `pitchout-r1-suspected-steal` (batter_speed), `pickoff-1b-daylight-lhp` (swing_side), all pitch-call slugs (tendency / next_pitch), `bunt-vs-shift` (swing_side), `off-steal-2b` and `catcher-pop-time-r1-steal` (swing_side gating SS-vs-RHH / 2B-vs-LHH). Then sweep remaining slugs.

## Working rhythm & guardrails

- After each phase I post a one-screen summary: slugs changed, counts, links to spot-check.
- All `iq_situations` data changes go through `supabase--insert` (no schema mutation except the Phase-1 `context_axis` CHECK).
- The Phase-1 code edits (`GameIqSituation.tsx`, `contextShifts.ts`, `bulkImport.ts`) are presentation-layer only; no business-logic refactors.
- Reply "pause" at any phase boundary to redirect; otherwise I continue.

## Out of scope

- New situations beyond the published 114
- Sport expansion (e.g. coach-pitch, T-ball)
- UI redesign of the IQ teach mode beyond the one-line offense-actor render fix
- `fieldGeometry.ts` repositioning (already settled in prior turn)

Approve and I begin Phase 0 immediately.
