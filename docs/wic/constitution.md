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

---

## Amendment — Elite Speed & Bat-Speed Progression

**Session shape floors.** Speed and bat-speed are sessions, not single drills.
Full training day: 4–6 movements. Deload / beginner: 3–4. Game or recovery
day: 2–3. Falling below the floor is recorded as a warning on the plan.

**Bat-speed stage sequence.** Every bat-speed session walks the canonical
order `Prime → Potentiate → Contrast → Intent → Transfer`
(`_shared/wic/engines/batSpeed.ts`). Game day receives the short primer
instead of nothing.

**Progression wave.** `_shared/wic/progression/progressionState.ts` derives a
4-week block from a fixed global anchor — `accumulate · intensify · peak ·
deload` — plus per-movement re-exposure windows and personal bests read from
`wk_session_logs`. It is pure and performs no I/O, so plans stay replayable.

**Guards.** The validator records `session_shape_below_floor` and
`re_exposure_window_violation` as warnings on `validator_report.issues`.
`scripts/audits/speed-batspeed-progression-audit.ts` replays 60 consecutive days
for four athlete archetypes and hard-fails on floor breaches, broken stage
order, missing block phases, non-determinism, or fabricated targets.

**Lineage on the card.** Speed and bat-speed prescriptions carry
`why_payload.progression` (`builds_on`, `target`, `next_step`, `baseline`) and
`why_payload.session_title`. Progression is interpretive only: it never
fabricates a performance number and never authors organism truth.

## Amendment — Universal Progression (every card)

**Domain law.** Every prescription resolves to exactly one training domain via
`domainForSlotRole(slot, sequence_role)` — movement prep, warm-up, speed, bat
speed, lift, supplemental, conditioning, cross-sport, recovery, mobility, arm
care, throwing. The domain is the unit that carries progression.

**Shared history.** `wk-generate-daily` loads one 28-day window of
`wk_prescriptions` + `wk_session_logs` (all slots) and builds a single
`ProgressionState`. Per-domain lineage (last session, cadence, completion
rate), personal bests, and the block wave are derived from it. Pure and
replay-safe.

**Universal stamping.** Before ordering, every row receives
`why_payload.training_domain`, `.session_shape` (domain floor vs actual),
`.session_title`, `.progression` (block/week, builds-on, domain history,
target, next step), `.career_horizon`, and `.day_orchestration` (the shared
CNS budget every card drew from). Engines that computed a richer payload keep
theirs — the pass never overwrites.

**Career horizon.** `resolveCareerHorizon(age, trainingAge)` places today
inside foundation → development → expression → peak → sustain → longevity.
Interpretive only; it never caps what may be prescribed.

**Deload is real.** On week 4, lift / supplemental / conditioning rows with 3+
sets drop one working set (floor of 2, never on total-dose rows) and record
`why_payload.deload_applied`.

**Guards.** The validator adds `progression_lineage_missing` (warn) alongside
`session_shape_below_floor` and `re_exposure_window_violation`.
`scripts/audits/universal-progression-audit.ts` replays 60 days × 4 archetypes
across every domain and hard-fails on missing floors, missing lineage,
fabricated targets, absent block phases, or non-determinism.
