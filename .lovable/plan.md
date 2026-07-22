## Goal
Hide internal/coaching-jargon metadata from Hammers Today plan cards so athletes see clean, actionable prescriptions. No engine logic changes — everything still runs the same, just no longer surfaced in the UI.

## What gets hidden

### `src/components/hammer/WkPrescriptionCard.tsx`
- Remove the `Source: {source_philosophy}` line (e.g. "Blended elite programming").
- Remove the visible **CNS cost: X/3** row (and the `Zap` icon row it lives on).
- Remove the **Training age: Xy · Pro/Prospect** span.
- Remove the **Phase rule: …** line (`why.rep_rule`).
- Remove the **phase_display** chip in the header (e.g. "Off-Season Q1").
- Remove the **CNS-clamped** badge in the header.
- Remove the small `engine: … · adaptation: …` footer under the Why-v2 block.

### `src/components/hammer/WkSpeedCard.tsx` & `WkBatSpeedCard.tsx`
- Replace the subtitle `"Pre-lift · fresh CNS"` with `"Warm and ready"` (keeps a friendly cue without CNS jargon). Game-day copy stays.

### `src/components/hammer/HammerDailyPlan.tsx`
- Hide the top-level **"CNS heavy · skill clamped"** pill (clamp logic still runs silently).
- Remove the doctrine explainer block ("2. Speed → Bat Speed → Lifts (fresh-CNS window)" etc.) that documents our sequencing rules to the user.

### `WkLiftsCard.tsx`
- Suppress the `phaseDisplay` subtitle (e.g. "Off-Season Q1 — Max Strength") and the "N movements blocked this phase" collapsible — both leak phase/doctrine language.

## What stays
- Movement name, dosage (sets × reps, tempo, load%), Cue, "Why this movement" (plain-English rationale), Complete/Skip.
- Injury-swap badge and substitution reason (safety-relevant, athlete-facing).
- All underlying engine behavior: CNS clamping, phase gating, training-age scaling, blocked-movement filtering — unchanged, just not displayed.

## Out of scope
No changes to `wk-generate-daily`, prescription schema, or the Progress/General surfaces where coaches/owners may still want the meta.