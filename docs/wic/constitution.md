# Workout Intelligence Constitution (WIC)

**Version:** `wic_v1` — Phase XX ratified.

The WIC is the **permanent constitutional authority** for every workout
prescription inside Hammers. Every lift, sprint, bat-speed, conditioning,
crossover, recovery, warm-up, and practice-integration decision must
originate here.

This is not a workout generator upgrade. It is doctrine.

---

## Sources of authority

| Layer | File |
| --- | --- |
| Priority hierarchy + engine registry | `supabase/functions/_shared/wic/constitution.ts` |
| Adaptation selector (Why today?) | `supabase/functions/_shared/wic/adaptationSelector.ts` |
| Canonical day structure | `supabase/functions/_shared/wic/dayStructure.ts` |
| Six-question rationale (`why_v2`) | `supabase/functions/_shared/wic/rationale.ts` |
| Publication validator | `supabase/functions/_shared/wic/validator.ts` |
| Client mirror (types + render order) | `src/lib/wic/constitution.ts` |
| Live generator wiring | `supabase/functions/wk-generate-daily/index.ts` |

Any deviation from these files is a **constitutional violation** and
must be corrected before ship.

---

## The six mandatory questions

Every prescription persisted to `wk_prescriptions.why_v2` must answer:

1. **Why today?** — day-level adaptation rationale.
2. **Why this athlete?** — personalized context.
3. **Why this exercise?** — the specific implementation choice.
4. **Why this volume?** — sets, reps, load defense.
5. **Why this order?** — position in the canonical sequence.
6. **Why this recovery window?** — CNS + repeat-hour cost.

Failure to answer any → the publication validator blocks generation.

---

## Priority hierarchy (top-down)

1. Athlete Safety
2. Recovery State
3. Medical Restrictions
4. Schedule Context
5. Seasonal Phase
6. CNS Readiness
7. Development Objective
8. Position Demands
9. Training Age
10. Movement Quality
11. Strength Deficiencies
12. Speed Deficiencies
13. Bat-Speed Deficiencies
14. Throwing/Hitting Workload
15. Available Equipment
16. Available Time

An exercise is never chosen before every layer has been evaluated.

---

## Engine registry

`movement_prep · warmup · sprint · bat_speed · strength · power ·
conditioning · cross_sport · recovery · arm_care · mobility ·
return_to_play`

No engine may author exercises for another engine. Each engine owns
its own rules.

---

## Canonical day structure

**Normal day:**
Movement Prep → Warm-up → Sprint → Bat Speed → Power → Strength →
Practice/Competition → Conditioning → Recovery → Mobility → Arm Care →
Cross-Sport (offseason).

**Game day:**
Movement Prep → Short Cross-Sport Neural Primer → Sprint Prep →
Bat-Speed Prep → Pregame Practice → Competition → Recovery.

Suppressed on game day: `strength · power · conditioning · mobility ·
arm_care`.

Conditioning **never** shares a card with lifting. Sprint **never** shares
a card with lifting. Bat speed **never** shares a card with lifting.

---

## Persistence

`wk_prescriptions` now carries:

- `adaptation` — the primary adaptation targeted today.
- `engine` — the WIC engine that authored the block.
- `why_v2` (jsonb) — the six constitutional answers.
- `validator_report` (jsonb) — the pre-publication validator's output.
- `generator_version` — pinned to `wic_v1`.

`wk_movement_catalog` now carries the movement metadata contract
(pattern, primary/secondary adaptation, season/age eligibility,
equipment, joint stress, recovery cost, volume cost, bias, power/speed/
elastic emphasis, throw/bat/sprint compatibility, duplicate group,
replacement pool, game-day eligibility, recovery window). Exercises
without metadata should not be prescribed once backfill completes; the
`wic_metadata_complete` flag gates that transition.

---

## Validator fatal checks

The Workout Validation Engine blocks publication on:

- Duplicate movements (slug or normalized name).
- Slots forbidden on game day.
- Missing constitutional `why_v2` answers.

Warn-only (surfaced in `validator_report.issues`):

- Missing full-body lift roles.
- Same sets×reps repeated within a role bucket.

Fatal failures return HTTP 422 with the validator report and abort the
write to `wk_prescriptions`.

---

## Amendment process

Changes to the WIC require an explicit **Phase XX amendment** commit,
updated doctrine here, matching updates in every file listed under
**Sources of authority**, and a bump to `WIC_VERSION`.
