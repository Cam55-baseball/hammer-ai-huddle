Plan: Breath placement clarity + cross-sport template fix

### 1. Clarify the two breathing cues

The HPI breath primer at the top of the Hammers Today Plan is a **morning readiness / pre-activity** primer. The Recovery "Breathing / down-regulation" step is an **evening / post-session** downshift. Both are correct, but they are currently not labeled, so they look like duplicates.

Changes:

- `src/components/hpi/BreathPrimer.tsx`
  - Add a `timeOfDay` prop and render a schedule chip above the timer.
  - Default label: "First today — pre-activity".

- `src/components/hpi/HumanPerformanceCard.tsx`
  - Add a one-line schedule cue above the primer: "Use this before warm-up, at-bats, or pitches."
  - Pass the schedule chip to `BreathPrimer`.

- `src/lib/hammer/prescription/dailyPlan.ts` (recovery block)
  - Rename the step from "Breathing / down-regulation" to "Evening / post-session down-regulation".
  - Append a clarifying note to the `why` text so the recovery block explicitly distinguishes itself from the HPI morning primer.

- `src/components/hammer/HammerDailyPlan.tsx`
  - Confirm the HPI card is already first in the plan; add a small "Today starts here" cue to the HPI card header so it reads as the first scheduled item, not a floating widget.

### 2. Fix the "Template xs.coordination requires: coordination" failure

Root cause: In `supabase/functions/wk-generate-daily/index.ts`, the in-season non-game cross-sport block picks a low-impact WOST movement (`cross_sport_category: low_impact`), but the certifier resolves the default cross-sport template `xs.coordination`, which requires a movement with `cross_sport_category: coordination`. The mismatch is fatal and kills the entire daily plan, so Speed, Bat Speed, and Lifts cards all show the same error.

Changes:

- `supabase/functions/wk-generate-daily/index.ts` (cross-sport selection block)
  - Resolve the cross-sport template **before** selecting a movement.
  - Map contexts deterministically:
    - Game day → `xs.low_impact`, pick from `CROSS_SPORT_LOW_IMPACT_PREFERRED`.
    - In-season non-game / off-season → `xs.coordination`, pick from `CROSS_SPORT_COORDINATION_PREFERRED` or `wk_movement_catalog` where `cross_sport_category = 'coordination'`.
    - Recovery-focused day → `xs.recovery_transfer`, pick a `recovery_transfer` movement.
  - If the catalog has no matching movement for the resolved template, skip the cross-sport block instead of failing the whole plan.
  - Pass the resolved `primaryAdaptation` / `dayType` into `certifyCrossSport` so the certifier resolves the same template.

- `supabase/functions/_shared/wic/crossSport/templates.ts`
  - Optionally expose `resolveCrossSportTemplate` as a public helper if the generator needs to resolve it before selection.
  - Keep the existing template definitions unchanged.

### 3. Verify

- Run the edge function against an in-season non-game day profile and confirm the plan publishes with no `wic_validation_failed` / `xs_unresolved_template` error.
- In the preview, confirm Speed, Bat Speed, and Lifts cards load drills instead of the error notice.
- Confirm the HPI breath primer shows the "First today — pre-activity" chip.
- Confirm the Recovery card shows "Evening / post-session down-regulation".
- Run `vitest run src/test/hpiSignal.test.ts` and any relevant daily-plan tests to avoid regressions.