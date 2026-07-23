## Plan: Eliminate ambiguity from Hammers Today warm-up prescriptions

### Current state
The two cards in the screenshot are rendered by `src/components/hammer/HammerDailyPlan.tsx` → `BlockCard`, which displays drills built from `src/lib/hammer/prescription/warmupLibrary.ts` (`DrillStep` shape: `name`, `dosage`, `setup`, `cue`).

The current copy is too vague for an athlete to execute correctly:
- **Scarf cross-body catch**: cue = "reach long across the body — hips stay square" — does not explain the throw, the drop, the catch, or the scarf path.
- **Low wicket runs (rhythm)**: setup = "6-8 inch hurdles evenly spaced", cue = "tall, cyclical, don't reach" — does not specify number of hurdles, exact spacing, or total run distance.

The same slugs also exist in `wk_movement_catalog` (backend catalog used by `wk-generate-daily`), where the cues are equally vague or missing setup entirely.

### What we will build
1. **Rewrite the two offending movements in `warmupLibrary.ts`** with explicit, age-8-readable `setup` and `cue` strings.
   - Scarf cross-body catch: specify throwing the scarf across the midline, letting it fall, catching with the opposite hand, hip rule, and rep tempo.
   - Low wicket runs: specify 8–10 mini hurdles, 6 ft apart, ~50 ft total run, walk-back return, and how to cycle the knees.

2. **Audit and tighten all WOST + wicket/warmup movements in the same file** so the same class of ambiguity does not recur. We will scan every movement whose `setup` or `cue` is one phrase or lacks equipment/spacing/distance/tempo and expand it.

3. **Backfill the database `wk_movement_catalog`** for the matching slugs (`wu_scarf_cross_body_catch`, `wu_wickets_low`, `wost_scarf_cross_body_catch`, and any related slugs audited in step 2) so both the `dailyPlan.ts` frontend path and the `wk-generate-daily` backend path emit the same elite copy.

4. **Bump the workout generator version** (`WIC_VERSION` in `supabase/functions/_shared/wic/constitution.ts` and `WK_GENERATOR_VERSION` in `src/hooks/useWkDailyPrescriptions.ts`) so existing prescriptions invalidate and regenerate on next app load, guaranteeing users see the clarified copy immediately.

5. **Verify rendering** in `HammerDailyPlan.tsx` that `setup` and `cue` are surfaced verbatim (they already are; this step confirms no UI truncation overrides the new copy).

### Files to edit
- `src/lib/hammer/prescription/warmupLibrary.ts` — rewrite vague cues/setups.
- `supabase/functions/_shared/wic/constitution.ts` — bump `WIC_VERSION`.
- `src/hooks/useWkDailyPrescriptions.ts` — bump `WK_GENERATOR_VERSION` to match.
- Database migration targeting `wk_movement_catalog` rows for `wu_scarf_cross_body_catch`, `wu_wickets_low`, and audited related slugs.

### Outcome
Athletes will see unambiguous instructions such as:
- Scarf cross-body catch: full throw-catch path, hip rule, and tempo.
- Low wicket runs: exact hurdle count, spacing, total distance, and mechanics.

No athlete should have to guess what "cross-body" or "through" means.