# Add foot length (inches) to onboarding body measurements

Foot size joins height, weight, wingspan and body fat in the same onboarding
"Body measurements" step, is stored on the same record, and is wired into the
places that can already use it. Everything stays optional — a blank field is
preserved as missing, never estimated.

## What changes for the athlete

- The Body measurements step gains a fifth field: **Foot length (inches)**,
  with helper text explaining how to measure (heel to longest toe, standing,
  barefoot) and that it's optional.
- The value is draft-saved as they type, hydrates on return, and shows in the
  onboarding review row alongside the other measurements.
- Anyone who already finished onboarding can add it later from the same step /
  profile edit path — no re-onboarding required.

## Where it is used now

- Lever/archetype interpretation: foot length is added as a measured input on
  the anthropometric profile (relative to height) so it can contribute a
  foot-lever flag and, when absent, appear explicitly in the `missing` list.
- Athlete context: exposed through the shared limb-proportions block so
  downstream prescribers read it from the one canonical context object.
- No new prescriptions are authored from it yet — it is recognition/context
  only until a future wave defines dose effects.

## Technical notes

- `src/components/onboarding/steps/AnthropometricsStep.tsx`: add
  `foot_length_in` to the local `Anthro` shape, state, draft write, server
  hydration, and the save payload (`persistContextAnswer` →
  `athlete_context.anthropometrics`). JSONB column, so no migration.
- `src/components/onboarding/steps/ReviewAnswersStep.tsx`: update the "Body
  measurements" summary text to mention foot length.
- `src/lib/hammer/anthro/profile.ts`: add `foot_length_in` to
  `AnthropometricsRaw`, parse it with the existing `num` guard, add it to the
  `missing` list when absent, and derive a `footFlag`
  (`long_foot` / `short_foot` / `balanced`) from foot-length ÷ height with
  conservative thresholds. Pure function, no default branch on missingness.
- `src/lib/wic/athleteContext.ts` + `supabase/functions/_shared/wic/athleteContext.ts`:
  document `foot_length_in` as a key inside `limb_proportions` (shape parity
  kept between client and server mirrors).
- Anywhere the anthropometrics object is projected into the daily-plan context
  passes the field through unchanged; no engine currently branches on it.

## Out of scope

- Shoe/cleat size conversion tables.
- Any dosage, drill selection, or standards change driven by foot length.
