# Plan: Elastic Arm Speed & Underload Throwing System (EASS) Integration

## What we are building

A new **catalog-backed Throwing engine** inside the Workout Intelligence Constitution (WIC) that powers the existing Hammers Today Plan "Throwing" card with EASS principles:

- Velocity is a whole-body skill: ground → leg → pelvis → torso → scapula → shoulder → arm → hand → ball.
- Fast objects teach fast movement: tennis balls, 3.5 oz plyo balls, 4 oz balls, regulation balls before overload.
- Daily neural band preparation as a non-fatiguing arm-care module.
- Position-aware (pitcher / catcher / infield / outfield) and sport-aware (baseball / softball windmill) progressions.
- Safety-first adaptive rules: arm soreness, elbow/shoulder/UCL injuries, and readiness suppress overload and increase band/underload/recovery work.
- No double cards — the existing Throwing card remains the single surface; the EASS engine becomes its prescription brain while the current hardcoded block serves as a fallback during validation.

## Verified current state

- **Hammers Today Plan** is generated server-side by `supabase/functions/wk-generate-daily/index.ts` and rendered client-side by `src/components/hammer/HammerDailyPlan.tsx` and `WkPrescriptionCard.tsx`.
- **WIC engines** (`strength`, `speed`, `bat_speed`, `conditioning`, `cross_sport`, `recovery`, `arm_care`) are catalog-backed and write rows into `public.wk_prescriptions` with `slot`, `engine`, `sequence_role`, and `why_v2`.
- **There is no `throwing` WIC engine today.** The Throwing card is built in `src/lib/hammer/prescription/dailyPlan.ts` as hardcoded drill lists per season/position.
- **Arm care** already has a dedicated WIC engine (`arm_care`) with templates, categories, and a picker. EASS will reuse the *philosophy* but live under the new `throwing` engine so it can drive the Throwing card without duplicating the Arm-Care card.
- **Day order** is constitutional in `supabase/functions/_shared/wic/dayStructure.ts` and `src/lib/wic/cardRegistry.ts` (server/client mirror).
- **Catalog schema** `public.wk_movement_catalog` already supports `default_sets`, `default_reps`, `default_duration_seconds`, `default_distance_feet`, `default_total_reps`, `dosage_unit`, `cns_cost`, `sport_scope`, `position_scope`, `phase_allow`, `season_eligibility`, and `source_philosophy`.
- **Diagnostics** are persisted to `public.wk_generation_diagnostics` per run; throwing engine columns will need to be added there too.

## Resolved decisions from clarifying questions

- **Scope:** Co-phase in alongside the existing block. Keep current Throwing block running, but replace its hardcoded drill list with EASS prescriptions from the catalog. The old block becomes a fallback only if the engine fails.
- **Access:** Available to **all** existing Hammers Today Plan subscribers.
- **Softball pitchers:** Dedicated **windmill-specific** movement set and templates, not just baseball cues relabeled.

## Technical approach

### 1. Database schema (migration)

Extend `public.wk_movement_catalog` with EASS-specific columns:

- `throwing_category` — e.g., `band_prep`, `tennis_ball`, `underload`, `regulation`, `long_toss`, `pulldown`, `intent`, `overload`, `cooldown`, `recovery`.
- `throwing_implement` — e.g., `tennis_ball`, `3.5oz_plyo`, `4oz`, `5oz`, `6oz`, `7oz`, `softball_12in`, `softball_11in`, `band`.
- `throwing_phase` — `throwing_day`, `non_throwing_day`, `recovery`, `game_day`.
- `throwing_intensity` — `prep`, `low`, `moderate`, `high`, `max`.
- `throwing_position` — text array with `pitcher`, `catcher`, `infield`, `outfield`, `position_player`.
- `throwing_sport` — `baseball`, `softball`, `both`.
- `is_elastic`, `is_underload`, `is_overload` booleans.
- `max_weekly_frequency` integer.

Seed the catalog with **80+ movements**:

- **Baseball throwing:** band series (Jaeger, Crossover, Oates, Jobes), tennis-ball throws, 3.5 oz plyo, 4 oz, 5 oz long-toss, pulldowns, intent throwing, positional work (pitcher/catcher/IF/OF), optional overload (6–7 oz) with strict season/age gates, cooldown/recovery.
- **Softball windmill:** dedicated underload tennis/softball progression, windmill-specific band prep, low-impact plyo, long-toss, catcher/IF/OF position work, and cooldown.

Extend `public.wk_generation_diagnostics` with throwing engine audit columns (template id, category coverage, substitution completeness, validation status, governance version) so every run is traceable.

### 2. New WIC engine: `throwing`

Create a canonical engine under `supabase/functions/_shared/wic/throwing/` that mirrors the existing `armCare/` and `speed/` engines:

- `movementCategories.ts` — defines required categories and single-occurrence rules (e.g., `overload` max 1 per session).
- `templates.ts` — templates for each context:
  - `eass_offseason_build`
  - `eass_inseason_maintain`
  - `eass_preseason_ramp`
  - `eass_postseason_recovery`
  - `eass_game_day_prep`
  - `eass_recovery_only`
  - `eass_softball_windmill_build`
  - `eass_softball_windmill_maintain`
- `picker.ts` — deterministic selection by sport, position, training age, season phase, throwing day vs non-throwing day, game day, fatigue, equipment, day-of-year seed, and family rotation.
- `substitutions.ts` — fallback ladder if equipment is missing (e.g., no tennis ball → rolled socks; no band → bodyweight scap control).
- `sessionBuilder.ts` — certifies the session: category coverage, phase legality, overload constraints, substitution completeness, and safety rules.

Create `supabase/functions/_shared/wic/engines/throwing.ts` with preferred slug pools and position-specific ordering.

Update the constitution:
- `WIC_ENGINES` and `ENGINE_TO_SLOT` include `throwing` mapped to `throwing` slot.
- `dayStructure.ts` places `throwing` after `bat_speed` / `power` and before `conditioning` / `practice` on normal days; suppresses heavy throwing on game days in favor of prep-only.
- `cardRegistry.ts` adds a `throwing` card with the existing slot so the UI does not double-render an Arm-Care card.

### 3. Generator integration (`wk-generate-daily`)

- Load `throwing_category` catalog rows alongside the existing engines.
- Resolve the throwing context:
  - `isThrowingDay` from athlete schedule / practice type / explicit preference.
  - `isGameDay` from `gp_games`.
  - `isRecoveryDay` from low readiness or reported arm soreness.
  - `position` from `profiles.primary_position`.
  - `sport` from `profiles.sport`.
  - `isPitcher`, `isCatcher`, etc.
- Call the new throwing engine, then `certifyThrowing(...)`.
- Add throwing prescriptions to the validator aggregate and diagnostics payload.
- Persist prescriptions through the existing `wk_persist_prescriptions_atomic` RPC.

### 4. Client-side daily plan integration

- Update `src/lib/hammer/prescription/dailyPlan.ts`:
  - The `case "throwing"` block reads `wk_prescriptions` rows with `slot = 'throwing'` first.
  - If EASS prescriptions exist, it maps them into the existing `PrescribedBlock` shape with EASS-specific titles, cues, and stop rules.
  - If the engine is empty or fails, fall back to the current hardcoded throwing block.
- Keep the same `route` (`/practice?module=throwing`) and `ctaLabel` so the user experience is unchanged.
- Add a `throwing` slot to `WkPrescriptionCard.tsx` tone/label mapping so the cards render correctly.

### 5. Safety & adaptive intelligence

Before any overload appears, the engine evaluates:

- Injury: `user_injury_progress` with shoulder / UCL / elbow status → suppresses overload and max-intent throws; replaces with band/underload/cooldown.
- Soreness: `athlete_daily_log` arm soreness fields → reduce overload, increase recovery.
- Readiness: readiness score < 40% → recovery-only throwing mode.
- Game day: only band prep + light catch; no long-toss, pulldowns, or overload.
- Season phase: overload only in offseason Q3/Q4 or pre-season, max 2x/week, low volume, and only if all health gates pass.

Adaptive rules implemented as deterministic decision functions in the picker, not AI generation:

- IF velocity ↑, command ↑, recovery good, pain low, mechanics stable → continue progression.
- IF velocity ↓, soreness ↑, command ↓, mechanics change → reduce overload, increase bands / recovery / tennis ball / underload.

### 6. Other integrations (post-daily-plan)

- **Warmup:** the existing `throwing_day` warmup context already exists; ensure it is selected when the throwing engine schedules a throwing session.
- **Practice module:** `/practice?module=throwing` will display the same EASS drills from `wk_prescriptions` and allow logging reps/distance/velocity.
- **Drill library:** surface EASS movements in the drill library with `Beginner/Intermediate/Advanced/Expert` tiers and sport/position filters.
- **Onboarding:** add optional throwing-goal questions (velocity, arm health, command) to feed the engine's `development_objective` priority.
- **Game Hub:** pitcher pre-game dossier can link to the day's EASS prep prescription.

### 7. Validation & rollout

- Unit tests for `picker.ts` and `sessionBuilder.ts` using sample athlete contexts.
- Smoke test `wk-generate-daily` for baseball pitcher, softball pitcher, and position players across all season phases.
- Verify no duplicate `throwing` cards and no duplicate `arm_care` overlap.
- Bump `WIC_VERSION` so the engine change forces plan regeneration.
- Deploy the edge function; the client will pick up new prescriptions on next plan refresh.

## Phasing

### Phase 1 — Schema & Seed (data-only)
Migration + catalog seed for EASS movements. No code changes yet; validates that rows are queryable and legal.

### Phase 2 — Engine & Certifier (server-only)
Build the throwing WIC engine, templates, picker, certifier, and constitution updates. Add diagnostics columns. Run against sample contexts without persisting to users.

### Phase 3 — Generator Hook (server + client)
Wire `wk-generate-daily` to call the engine and persist prescriptions. Update `dailyPlan.ts` to prefer EASS prescriptions while keeping the hardcoded fallback.

### Phase 4 — Safety & Adaptation
Implement soreness/injury gates, overload frequency cap, game-day suppression, and progression/regression rules. Add "Report arm soreness" quick action.

### Phase 5 — Cross-Module Surfaces
Warmup, practice module, drill library, onboarding, and Game Hub integrations.

### Phase 6 — Validation & GA
Tests, diagnostics review, WIC version bump, and full rollout to all subscribers.

## Risks and mitigations

- **Double-card risk:** the throwing slot maps to one card in the registry. Existing Arm-Care card remains a separate recovery slot. Mitigation: every EASS movement is tagged `slot = 'throwing'`; Arm-Care engine stays on `slot = 'arm_care'`.
- **Overload safety risk:** overload is gated by injury, soreness, readiness, season phase, and frequency cap. No overload for youth or injured athletes regardless of training age.
- **Softball windmill confusion:** dedicated templates and category tags prevent baseball drills from leaking into softball windmill prescriptions.
- **Plan-generation failure:** the existing hardcoded throwing block remains a fallback so users never lose their Today Plan.
- **Migration / production data:** catalog seed is additive-only; no existing rows are deleted or renamed. Existing plans regenerate automatically after the WIC version bump.