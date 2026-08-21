# Per-Side Logging for Every Single-Arm / Single-Leg Exercise

## Answer first: partially, and not reliably

Today only **one** log template captures a side (`unilateral_lift`), and it is
reached only when:

- the prescription is in the `lift` or `supplemental` slot, **and**
- the movement slug happens to match a hard-coded regex
  (`split|lunge|single_leg|pistol|bulgarian|rfe|step_up|single_arm|1_arm|kb_single`).

Verified gaps:

- The movement catalog has a `unilateral` boolean column, but it is **false/null
  on all 547 rows** — the authoritative flag is never used or populated.
- Unilateral work outside the lift slot gets **no side field at all**: suitcase
  carries (routed to the carry template), single-leg bounds/hops and single-leg
  jumps (speed slot), single-arm throws / arm care, side planks and single-leg
  iso holds, unilateral mobility (CARs, half-kneeling work).
- Even inside `unilateral_lift`, the side chip is optional, rounds are not
  auto-paired L/R, and a round can save with side blank.
- Saved rounds land in `wk_session_logs.metrics.rounds` only. The canonical
  metric normalizer collapses rounds into single bests with no side, so
  progression, "beat your best", and any left/right imbalance read cannot see
  a side even when the athlete entered one.
- The Log button exists only on Hammers Today prescription cards. Quick Log and
  custom-activity logging have no side concept.

## What to build

### 1. Authoritative laterality, not slug guessing

- Backfill `wk_movement_catalog.unilateral = true` for every single-limb
  movement (slug/name/pattern sweep across all categories: lift, carry,
  speed/plyo, throwing, iso, mobility), reviewed per category.
- Add `laterality` to the prescription payload the client already reads, so the
  app never re-guesses from a slug.
- Keep the slug regex only as a fallback when the flag is missing.

### 2. Side-aware log templates across every slot

- Introduce a template decorator: when a prescription is unilateral, prepend the
  `side` field to whichever template resolved (carry, sprint/plyo, iso,
  throwing, mobility, accessory, barbell), instead of the single
  `unilateral_lift` special case.
- Default round seeding alternates L / R / L / R and doubles the round count so
  `3 sets each side` opens as 6 pre-sided rows.
- Side becomes required on unilateral rows: save is blocked with an inline
  "pick a side" hint rather than silently storing null.
- Add a "same as other side" copy action so the second side is one tap.

### 3. Per-side data actually reaching intelligence

- Extend the canonical metric normalizer (client + the mirrored shared copy used
  by the engine) to emit per-side canonical metrics alongside the combined best
  (e.g. `bat_speed_mph`, plus `left`/`right` variants keyed the same way).
- Store a per-side summary on the log row so history and progression can read it
  without re-parsing rounds.
- Surface a left/right delta line in the log sheet's read-back and in the
  movement's history view when both sides have enough rounds — using the
  existing confidence-bounded rule (no delta shown below the minimum per-side
  sample; never impute a missing side).

### 4. Other logging surfaces

- Quick Log and custom-activity logging: show the same L/R chip when the chosen
  activity is unilateral.
- Existing logs stay valid; missing side reads as "unspecified", never inferred.

### 5. Regression locks

- Extend the side-context lint so a unilateral prescription resolving to a
  template without a `side` field fails the check.
- A catalog audit that fails when a movement whose name/slug is clearly
  single-limb has `unilateral` unset.

## Technical notes

- Files: `src/components/hammer/logging/logTemplates.ts` (decorator + resolver),
  `RoundGrid.tsx` (required-side state, copy-other-side),
  `ExerciseLogSheet.tsx` (L/R seeding, validation, delta read-back),
  `src/hooks/useExerciseLog.ts` and
  `supabase/functions/_shared/wic/progression/metricNormalizer.ts` +
  `src/lib/hammer/logging/metricNormalizer.ts` (per-side canonical metrics).
- Storage stays additive: rounds already live in `wk_session_logs.metrics`; the
  per-side summary is a new key inside that JSON, no destructive migration.
- The catalog backfill is a data migration on `wk_movement_catalog.unilateral`
  only — no schema or RLS change.
