## Phase XX — Workout Intelligence Constitution (WIC)

Replace the current workout generator with a constitutional Workout Intelligence Engine that prescribes adaptations first and exercises last, governed end-to-end by the WIC doctrine.

---

### 1. Constitutional core (new)

Create `src/lib/wic/` as the permanent authority layer:

- `constitution.ts` — encodes the 15-layer priority hierarchy (Safety → Recovery → Medical → Schedule → Season → CNS → Objective → Position → Training Age → Movement Quality → Strength/Speed/Bat-Speed Deficiencies → Throw/Hit Workload → Equipment → Time).
- `pipeline.ts` — the fixed decision pipeline (Athlete → Identity → Training Age → Maturation → Season → Games → Practice → Recovery → CNS → Testing → Deficiencies → Goals → Equipment → Environment → **Adaptation** → Generation → Validation → Publication). Exercises are only chosen after `Adaptation` is set.
- `adaptationSelector.ts` — determines "today's primary adaptation" answering the six mandatory questions (Why today / athlete / exercise / volume / order / recovery). If any answer is null, generation aborts.
- `rationale.ts` — structured `why_payload` schema surfaced to the UI.

### 2. Independent engines (one module each)

Replace the monolithic generator with 12 engines under `src/lib/wic/engines/`, each owning its own rules and never authoring for another:

`movementPrep`, `warmup`, `sprint`, `batSpeed`, `strength`, `power`, `conditioning`, `crossSport`, `recovery`, `armCare`, `mobility`, `returnToPlay`.

Each exports `plan(ctx) -> EngineBlock[]` and `validate(block)`.

### 3. Exercise Intelligence catalog

Extend `wk_movement_catalog` with full metadata (movement pattern, family, primary/secondary adaptation, season eligibility, age eligibility, training-age eligibility, equipment, joint stress, CNS load, recovery cost, volume cost, concentric/eccentric bias, power/speed/elastic emphasis, throw/bat/sprint compatibility, duplicate group, replacement pool, progression, regression, injury contraindications, game-day eligibility, recovery window).

- Migration adds missing columns.
- Backfill script tags every existing movement. Untagged movements become ineligible for prescription (hard rule).
- Seed elite catalog covering full-body coverage across all seasons/ages.

### 4. Seasonal Intelligence

`src/lib/wic/seasonal.ts` encodes Early-OS, Mid-OS, Late-OS, Preseason, In-Season rules:

- Sprint cadence (48h / 48h / 72h / intent / 96h) with CNS-adjusted deltas.
- Eccentric bias curve (high → low → banned in-season unless medical override).
- Concentric dominance and Functional Patterning supplementals in-season.
- Youth bands (0–7 movement literacy, 8–13 PAP + bodyweight, 14+ progressive lifting) with biological maturation override.

### 5. Full-Body Lift Constitution

Every non-rehab/non-specialized lift must contain: lower compound + upper push + upper pull + unilateral + rotational/anti-rotational core + carry/brace/isometric + arm care + recovery. Enforced in `strength` engine and re-checked by validator.

### 6. Workout Structure

`src/lib/wic/dayStructure.ts` enforces canonical order:

Normal: MovementPrep → Activation → Sprint → BatSpeed → PowerPrep → Strength → Practice/Comp → Conditioning → Recovery → Mobility → ArmCare → CrossSport(OS only).

Game day: MovementPrep → Short Cross-Sport Neural Primer → Sprint Prep (if OK) → BatSpeed Prep → Pregame → Competition → Recovery. Regular lifts and conditioning suppressed.

Hard rule: conditioning, sprint, and bat-speed each render as separate cards, never merged into the lifting card.

### 7. Sprint, Bat Speed, Conditioning, Cross-Sport, Isometric engines

Each engine chooses an adaptation category from its enumerated list (per the constitution) before selecting movements. Bat speed defaults to pre-lift placement (fresh CNS). Conditioning modes are baseball/softball-specific (repeated explosive, sit-explode-recover, base-run repeatability, pitcher/catcher/position, heat, recovery). Cross-sport is a full session in OS and a short neural primer in-season. Isometric selection (yielding/overcoming/functional/reactive/long-duration/short-duration/joint-angle) driven by season + adaptation.

### 8. Personalization inputs

`src/lib/wic/context.ts` aggregates every required input (season, schedules, ages, maturation, anthropometrics, assessments, workloads, recovery/sleep/nutrition/hydration, travel, environment, equipment, goals, history, trends, readiness, CNS, injury, restrictions, time). Missing values become explicit signals (`missing: true`) that influence adaptation choice — never silently ignored.

### 9. Workout Validation Engine

`src/lib/wic/validator.ts` runs before publication. Blocks on: duplicates (slug/name/family/pattern), duplicate sets/reps in-session, wrong season phase, wrong adaptation, invalid recovery window, invalid game-day mod, wrong order, conflicting fatigue, OS-eccentric-in-season without override, invalid equipment, invalid age, rehab conflicts, workload overflow, missing upper/lower/trunk/arm-care buckets. Failures return structured errors; the generator retries with fixes; on 2nd failure, publication is blocked and a diagnostic row is written.

### 10. Edge function rewrite

Rewrite `supabase/functions/wk-generate-daily/index.ts` around the WIC pipeline. Bump `generator_version` to `wic_v1`. Delete legacy branches. Persist `why_payload`, `adaptation`, `phase`, `validator_report` on every `wk_prescriptions` row.

### 11. UI surfacing

- Split cards already exist (`WkSpeedBatCard`, `WkLiftsCard`, `WkConditioningCard`, `WkSportBlockCard`) — add `WkMovementPrepCard`, `WkRecoveryCard`, `WkMobilityCard`, `WkArmCareCard`, `WkCrossSportCard`.
- Each card renders the "why" (adaptation, athlete reason, exercise reason, volume reason, order reason, recovery-window reason).
- `HammerDailyPlan.tsx` renders in canonical order pulled from `dayStructure.ts` — not hard-coded in the component.

### 12. Repo-wide audit + reliability sweep

- Enumerate every workout-generation code path; delete duplicates and legacy fallbacks.
- Remove stale caches and legacy prompts.
- Invalidate queries on schedule/game/recovery/injury mutations.
- Add `scripts/audits/wic-audit.ts` verifying: full-body coverage, no duplicates, season legality, game-day suppression, sprint cadence, bat-speed placement, cross-sport placement, arm-care presence, per-age eligibility, per-training-age eligibility. Runs against production data samples per season phase and age band.

### 13. Success gate

No engine ships until the audit passes for: Early-OS / Mid-OS / Late-OS / Preseason / In-Season × Youth / 8–13 / 14+ / HS / College / Pro × Game day / Practice day / Recovery day. Evidence written to `docs/wic/audit-evidence.md`.

---

### Technical file map

- New: `src/lib/wic/{constitution,pipeline,adaptationSelector,rationale,seasonal,dayStructure,context,validator}.ts`
- New: `src/lib/wic/engines/{movementPrep,warmup,sprint,batSpeed,strength,power,conditioning,crossSport,recovery,armCare,mobility,returnToPlay}.ts`
- New: `src/components/hammer/{WkMovementPrepCard,WkRecoveryCard,WkMobilityCard,WkArmCareCard,WkCrossSportCard}.tsx`
- Rewrite: `supabase/functions/wk-generate-daily/index.ts`
- Update: `src/components/hammer/HammerDailyPlan.tsx`, `src/hooks/useWkDailyPrescriptions.ts`
- Migration: extend `wk_movement_catalog` metadata; add `adaptation`, `why_payload`, `validator_report`, `phase`, `generator_version` to `wk_prescriptions` if missing
- New: `scripts/audits/wic-audit.ts`, `docs/wic/*`

### Clarifying questions before build

1. Scope of the initial ship: build the full 12-engine constitution end-to-end in one pass, or stage it (Strength + Sprint + BatSpeed + Conditioning + CrossSport first, then Recovery/Mobility/ArmCare/RTP)?
2. Catalog policy: should movements missing new metadata be **hard-blocked** from prescription immediately (safer, may shrink pool during transition), or **soft-warned** until backfill completes?
3. Overrides: keep the existing user "Request Override" path for blocked movements, or lock it fully to medical/coach role only under WIC?
