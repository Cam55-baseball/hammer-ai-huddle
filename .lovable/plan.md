## Arm Care Intelligence Engine — Implementation Plan

### Goal
Replace the current static 5-slug arm-care fallback with an elite, catalog-driven Arm Care Intelligence Engine. It must be used everywhere arm care appears in the app: the **Lifts** card in Hammers Today, the **warm-up** builder, and a new **stand-alone Arm Care library** for extra sessions. The engine must be auto-progressed, safe, and tailored to sport (baseball vs softball), role (pitcher vs position), training age, season phase, and daily readiness.

---

### Current state (confirmed by reads)
- `wk_movement_catalog` only has **3 arm-care rows** with `arm_care_category` set (`crossover_symmetry_full`, `jband_full_chart`, `plyo_ball_pitching`).
- The daily generator in `wk-generate-daily` picks arm care from a hardcoded `ARM_CARE_SLUGS` list of 5 lifts (`strength.ts` lines 224–230).
- Warm-up arm care in `warmupLibrary.ts` is a small, static list not connected to the catalog or the certification system.
- A governance/certification layer exists (`_shared/wic/armCare/sessionBuilder.ts`, `templates.ts`, `movementCategories.ts`) but it is not yet wired to a real content selector.

---

### What we will build

#### 1. Elite arm-care content seed (~150+ rows)
Insert a comprehensive catalog into `wk_movement_catalog` covering all requested methods, with full WIC metadata so the engine can filter by context.

**Method families (arm_care_category)**
- `jaeger_jband` — J-Band / Jaeger Throwing Program
- `xband` — X-Band / crossover-style tubing
- `jobes` — Jobes-style light dumbbell shoulder series
- `crossover_symmetry` — Crossover Symmetry protocols (activation, recovery, plyo)
- `cressey` — Cressey shoulder health / serratus/scap series
- `driveline` — Driveline plyo-care, rebounders, recovery
- `oates` — Oates Shoulder Tube / rhythmic stabilization
- `isometric` — Isometric holds, rocker throws, manual-resistance decel
- `softball_windmill` — Softball-specific decel, wrist/forearm, hip-shoulder separation
- `forearm_wrist` — Forearm/wrist health for hitters/throwers
- `recovery` — Breathing, blood-flow, capillary work

**Metadata per row**
- `sport_scope`: `baseball`, `softball`, `both`
- `position_scope`: `pitcher`, `position`, `catcher`, `all`
- `throwing_phase`: `activation`, `cuff`, `scap`, `decel`, `recovery`, `general`
- `training_age_legality` JSON, `season_legality` JSON, `min_training_age_years`, `min_age_years`
- `equipment`, `cns_cost`, `recovery_cost`, `volume_cost`, `game_day_legal`, `practice_day_legal`, `indoor_legal`, `travel_friendly`
- `source_philosophy`, `why_prescribed`, `cue`, `default_sets/reps/tempo`, `progression_slug`, `regression_slug`, `substitution_family`

**Softball priority**
- Dedicated softball windmill rows marked `sport_scope = 'softball'` and `position_scope = 'pitcher'`.
- Extra decel/forearm volume and slower eccentrics for underload arm speeds.

---

#### 2. Catalog-driven Arm Care Engine
Create `supabase/functions/_shared/wic/armCare/generator.ts` with a single entry point:

```typescript
selectArmCarePicks(input: {
  lib: WkMovement[],
  sport: 'baseball' | 'softball' | 'both',
  role: 'pitcher' | 'position' | 'catcher',
  seasonPhase: 'off' | 'pre' | 'in' | 'post',
  trainingAgeYears: number,
  lifecycleBand: string,
  readiness: number | null,
  equipment: string[],
  isGameDay: boolean,
  isThrowingDay: boolean,
  isPracticeDay: boolean,
  isLiftDay: boolean,
  isTravelDay: boolean,
  isRecoveryDay: boolean,
  daySeed: number,
  priorArmCare?: { slug: string; volume: number; soreness: number }[],
}): ArmCarePick[]
```

**Engine behavior**
- Resolves a `templateKey` from context (e.g., `game_day_primer`, `velocity_block`, `softball_pitching_recovery`, `travel_maintenance`, `youth_initiation`).
- Builds a deterministic **progression chain** per template:
  1. Activation / blood flow
  2. Rotator cuff / serratus
  3. Scapular control
  4. Deceleration / posterior chain
  5. Forearm / wrist / grip
  6. Recovery / breath (optional)
- For each step, filters the catalog by `sport_scope`, `position_scope`, `throwing_phase`, age/season/equipment legality, then selects one movement using a stable seeded shuffle.
- Auto-scales dosage:
  - **Youth / beginner**: low volume, bodyweight/bands, J-Band / Jobes focus.
  - **Intermediate**: add Crossover/Cressey/Oates.
  - **Advanced / pro**: add Driveline PlyoCare, isometrics, high-specificity decel.
  - **In-season / game day**: reduce to activation + cuff + decel, keep CNS cost low.
  - **Off-season velocity block**: add plyo volume and isometric holds.
  - **Softball pitchers**: bias toward windmill decel and Oates/Shoulder Tube.
- Reports lineage: each pick returns `reason`, `template`, `method_family`, and `substitution_family` so the UI can explain why it was chosen.

**Certification**
- The engine calls `certifyArmCare` (existing) after selection to enforce daily caps, contraindications, and injury safety.

---

#### 3. Lifts card integration
Update `supabase/functions/wk-generate-daily/index.ts` and `supabase/functions/_shared/wic/engines/strength.ts`.

- Remove the hardcoded `ARM_CARE_SLUGS` array.
- Before generating the rest of the lift sequence, call `selectArmCarePicks` and insert the returned rows into `wk_prescriptions` with:
  - `slot = 'lift'`
  - `sequence_role = 'arm_care'`
  - `sequence_order` placed before `trunk_primer` in the lift order.
- Number of arm-care picks: 2–6 depending on context and training age.
- Each row stores the full `why_v2` rationale so `WkPrescriptionCard` can explain the method and dosage.
- If the generator fails to find arm-care picks, surface a structured `engine_failure` to `WkCardFailureNotice` instead of a generic retry.

---

#### 4. Warm-up integration
Update `src/lib/hammer/prescription/warmupLibrary.ts` to source arm-care from the same catalog.

- Create a client-side mirror of the engine data: `src/lib/hammer/prescription/armCareLibrary.ts` containing the same movement definitions and selection rules as the server engine (generated from the same source of truth).
- Add `selectArmCareForWarmup(context, lifecycle, daySeed)` that returns 1–3 arm-care drills matching the warm-up context (throwing day, hitting day, game day, lift day, recovery, travel).
- For each warm-up context, insert the arm-care block at the correct place (after general mobility, before sport-specific activation).
- Ensure youth athletes get coordination/band work, while advanced athletes get method-specific activation.

**Future phase (optional):** Move the entire warm-up builder to the server by generating `slot = 'warmup'` rows in `wk-generate-daily` and rendering a new `WkWarmupCard`. This is the cleanest long-term path, but it is not required to deliver the arm-care expansion.

---

#### 5. Stand-alone Arm Care library & UI
Add a new surface where athletes can run extra arm-care sessions or learn each method.

- New component: `src/components/hammer/ArmCareLibraryDialog.tsx`.
- Accessible from the **Lifts card header** and from the **Tools menu**.
- Filters: method family (J-Band, XBand, Jobes, Crossover, Cressey, Driveline, Oates, Isometrics, Softball Windmill), level (Beginner → Elite), sport/role, equipment available.
- Each method shows a short doctrine explanation, a sample program, and a **“Start arm-care session”** button that creates a loggable Game Plan template.
- Favorites can be saved to a new `vault_saved_arm_care` table (or re-use `vault_saved_drills` with `arm_care` tag).

---

#### 6. Auto-progression & feedback loop
Build a small progression manager so arm care adapts week to week.

- Track completed arm-care sessions from `wk_prescriptions` / `wk_session_logs`.
- Progression rules:
  - Increase total arm-care volume by ~10% per week for 3 weeks, then deload 1 week.
  - Taper total volume 30–40% in-season.
  - If a recovery ack reports elbow/shoulder soreness > 5/10, drop plyo/isometrics and return to activation + cuff + recovery for 2–3 sessions.
  - If a user reports velocity stuck, add a plyo/isometric day; if overuse, reduce volume.
- This logic lives in the engine and is applied before `certifyArmCare` so it never violates safety caps.

---

#### 7. Verification & hardening
- Add a runtime check in `wk-generate-daily`: after arm-care selection, assert at least one pick exists and every pick has a valid `progression_slug` or `regression_slug`.
- Add a post-seed verification query that counts rows per `arm_care_category` and reports any method with < 5 rows.
- Ensure no user-facing copy uses the word “AI” (per the global terminology rule); use “Hammer Arm Care” or “Method” instead.

---

### Files to change / create
- `supabase/functions/_shared/wic/armCare/generator.ts` — new engine
- `supabase/functions/_shared/wic/armCare/templates.ts` — extend templates
- `supabase/functions/_shared/wic/engines/strength.ts` — remove static slugs
- `supabase/functions/wk-generate-daily/index.ts` — wire generator, insert arm-care rows
- `src/lib/hammer/prescription/armCareLibrary.ts` — new client-side arm-care library
- `src/lib/hammer/prescription/warmupLibrary.ts` — integrate arm-care into warm-ups
- `src/components/hammer/ArmCareLibraryDialog.tsx` — new UI
- `src/components/hammer/WkLiftsCard.tsx` — add Arm Care library button
- `src/components/hammer/WkPrescriptionCard.tsx` — ensure arm-care rationale renders cleanly
- Seed data file (e.g., `supabase/functions/_shared/wic/armCare/seed.json`) used to populate `wk_movement_catalog` via `supabase--insert`

---

### Acceptance criteria
1. `wk_movement_catalog` contains ≥ 150 arm-care rows with all requested method families and softball-specific content.
2. `wk-generate-daily` produces a non-static, context-aware arm-care block in the Lifts card for every athlete profile.
3. Warm-up builder includes arm-care drills that match the athlete’s sport/role/training age/season.
4. A user can open the Arm Care library, filter by method and level, and start a custom session.
5. Auto-progression and soreness feedback adjust dosage without breaking safety certification.
6. No user-facing “AI” copy remains on arm-care surfaces.
7. `WkCardFailureNotice` shows a clear reason if arm-care generation fails instead of a generic retry.

---

### Open items I’m deciding without you
- I will keep the word “AI” purged from all arm-care UI (already a project rule).
- I will prioritize safety over velocity: plyo/isometric work only appears for advanced athletes and is suppressed on soreness/recovery days.
- I will initially expand the client-side warm-up library with the same content; server-side warm-up generation is noted as a future phase and is not included in this plan.
- Softball pitchers will receive a dedicated windmill/decel arm-care bias and extra volume on throwing days.

If you want me to also move the full warm-up to the server now, or to expose a coach-facing arm-care editor, let me know and I’ll add those before implementation.