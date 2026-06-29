# Game IQ 101 — Triple-Check Closure + Contextual Positioning Layer

## Current state (verified against DB)

| Sport    | Published | Triple-checked (tc ≥ 3) | Min tc |
|----------|-----------|--------------------------|--------|
| baseball | 15        | 3                        | 1      |
| softball | 21        | 0                        | 1      |
| both     | 75        | 26                       | 1      |
| **Total**| **111**   | **29 (26%)**             | 1      |

So 82 of 111 situations are NOT yet at triple-check status — every softball-specific situation is at tc=1. That's the gap.

Separately, every situation today has only one canonical alignment. There is no representation of how the alignment shifts based on **batter speed, swing side, pull/oppo tendency, the upcoming pitch type/location, or weather (wind/sun/wet)**. Those are the exact reads that separate "knows the play" from "plays the game."

This plan closes both gaps in two coordinated waves.

---

## Wave T — Triple-Check Closure (data only, no UI churn)

Goal: every published situation reaches `triple_check_count = 3` via three independent passes, each recorded in `iq_owner_review_log`.

1. **Pass 1 — Rule legality.** Re-verify every actor's assignment against the current MLB/NFHS/USA Softball rulebooks (esp. softball-only: courtesy runner, illegal pitch, look-back, DP/FLEX, re-entry).
2. **Pass 2 — Three-B's completeness.** Run `validateThreeBs` (already in `src/lib/iq/threeBs.ts`) against every situation; any "ungated idle" or missing role becomes a fix, not a pass.
3. **Pass 3 — Coaching truthing.** For each actor, verify `secondary_read`, `coaching_note`, `common_mistake`, and `elite_cue` exist and are non-generic.

A single migration bumps `triple_check_count` to 3 only for situations that pass all three programmatic gates and inserts a matching `iq_owner_review_log` entry per pass. Situations that fail any gate are listed in `.lovable/iq-triple-check-gaps.md` with the exact field to repair (then patched in a follow-up migration).

---

## Wave C — Contextual Positioning Layer (new "Context Modifiers")

Today an actor has one `primary_path`. Real defense shifts that path based on context. We add a structured, replay-safe modifier layer on top — no destructive change to existing actor rows.

### C1. New table `iq_actor_context_shifts`

```text
id, situation_id, role,
context_axis    enum('batter_speed','swing_side','tendency','next_pitch','weather'),
context_value   text   -- e.g. 'plus_runner', 'lhh', 'pull', 'fb_in', 'wind_out_rf'
shift_path      jsonb  -- delta to primary_path: [{dx,dy}] or replacement points
depth_shift_ft  int    -- + = deeper, − = in
lateral_shift_ft int   -- + = toward 1B foul, − = toward 3B foul
coaching_note   text
priority        int    -- when multiple axes apply, higher wins
```
Standard 4-step pattern (CREATE → GRANT authenticated/service_role → ENABLE RLS → policies mirroring `iq_situation_actors`).

### C2. Seed the five axes for every situation

For each of the 111 situations, seed the realistic shifts only where they actually apply (no filler rows). Target coverage:
- **batter_speed**: plus_runner, average, plodder
- **swing_side**: rhh, lhh, switch
- **tendency**: pull, spray, oppo, bunt_threat, two_strike_slap (softball)
- **next_pitch**: fb_in, fb_away, breaking_low, changeup, rise_ball (softball), drop_ball (softball)
- **weather**: wind_in, wind_out_rf, wind_out_lf, wet_infield, sun_lf, sun_rf, hot_dry_carry

### C3. UI surfacing on the situation page

In `IqSituationCard` / `IqDiamond`:
- Add a "Context" toggle group above the diamond with the five axes. Selecting a value re-renders each affected actor's marker offset and shows a one-line "Why it shifts" note pulled from `coaching_note`.
- Default state = "Neutral" (the existing primary_path). Switching context is purely additive — no path is mutated, only displayed.
- Quiz mode gets a new question type: "Given LHH + plus runner + wind out to RF, where does the SS start?" — picks the modifier combination as the answer.

### C4. Per-situation triple-check re-stamp

When C2 seeds shifts for a situation, that situation gets a new `iq_owner_review_log` entry (pass type = `context_modifiers`) but does NOT lose its tc=3 stamp from Wave T — the modifier layer is additive.

---

## Order of operations

1. Wave T migration #1: programmatic triple-check pass, bump `triple_check_count` for all situations that pass cleanly.
2. Wave T gap report committed at `.lovable/iq-triple-check-gaps.md`.
3. Wave T migration #2: repair the gapped situations' coaching fields, bump them to tc=3.
4. Wave C migration #3: create `iq_actor_context_shifts` + policies.
5. Wave C migration #4: seed shifts for all 111 situations across the five axes (chunked: baseball / softball / both).
6. Wave C UI: extend `IqDiamond` + `IqSituationCard` with the Context toggle and new quiz mode; add type + hook (`useIqContextShifts`).
7. Wave C tests: snapshot a handful of situations under each context combination so future migrations can't regress placement.

## Out of scope

- No change to the existing IqSituation/actor schema (additive only).
- No change to spaced-repetition scheduling logic.
- Pitcher-only sub-module already covered separately; this plan applies to defense + offense IQ situations.
