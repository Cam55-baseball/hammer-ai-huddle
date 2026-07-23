# Elite Warmup & Fast-Twitch Library Expansion

## Summary
Replace the hardcoded daily warm-up block with a catalog-driven, elite warmup engine. Add 60–80 new fascial/ECM, fast-twitch neural, mobility, and activation movements to `wk_movement_catalog`, then wire them into the Hammers Today plan so every athlete—from first-time youth to pro—gets a progression-matched, phase-appropriate prep sequence.

## Current state (verified)
- Warm-ups in `src/lib/hammer/prescription/dailyPlan.ts` are hardcoded drill lists (≈6–8 exercises per season phase).
- `wk_movement_catalog` has only 4 generic `cross_sport` rows tagged with cross-sport categories and no dedicated `warmup`/`movement_prep`/`fascial` category.
- The `WIC` pipeline (`supabase/functions/wk-generate-daily`) has engines for `strength`, `sprint`, `batSpeed`, `conditioning`, `crossSport`, `armCare`, and `recovery`, but no `warmup` engine.
- `crossSport` templates already define a `fascial_rotation` category and a `xs.fascial_rotation` template.
- The daily plan renders warm-ups as the first card in `HammerDailyPlan.tsx` via the `warmup` modality.

## What we will build

### 1. Seed elite warmup movement library
Create a new migration that inserts 60–80 movements into `wk_movement_catalog` across these doctrine families:

| Family | Purpose | Example movements |
|---|---|---|
| **Fascial / ECM** | Hydrate tissue, restore glide, prepare elastic transfer | CARs (hip/shoulder/spine), controlled articular rotations, long-lever fascial reaches, spinal wave, arm-line spirals, thoracic windmill, hip capsule CARs, ankle CARs |
| **Fast-Twitch Neural Prep** | Prime CNS, stiffness, rate of force development | Pogo hops, ankle-bounce series, single-leg pogo, bounding prep, rapid lateral hops, drop-step sprints, reaction cones, floor taps, split-snap jumps |
| **Mobility / Movement Prep** | Open joints, improve positions for sport | 90/90 hip switch, shin box, cossack squat, world's greatest stretch, spiderman reach, t-spine open book, frog stretch, hip airplane, adductor mobilizer |
| **Activation / Stability** | Turn on key stabilizers | glute bridge walkout, mini-band lateral/monster walk, Copenhagen plank primer, dead-bug, bird-dog, Pallof iso, single-leg RDL balance reach |
| **Arm Care / Throwing Prep** | Shoulder complex readiness | J-Band progression, crossover symmetry activation, external rotation at 90°, prone T/Y/W, scapular pull, serratus wall slide, forearm pump |

Each row will include:
- `category`: `warmup` (new canonical category)
- `cross_sport_category`: mapped to existing categories where applicable (`fascial_rotation`, `coordination`, `explosive_transfer`, `balance_transfer`, `low_impact`, `reflex`, `visual_reaction`)
- `primary_adaptation`: `fascial_hydration`, `neural_priming`, `mobility`, `activation`, `in_season_maintenance`, etc.
- `season_legality` and `training_age_legality` JSONB flags: all `true` for beginners through elite, with progressive intensity logic handled by dose and duration, not by blocking access.
- `cns_cost`: 0–1 (warmups are low-cost)
- `game_day_eligible`: true for most; false only for longer-volume fast-twitch primers.
- `source_philosophy`: FRC, DNS, Ido Portal, Kelly Starrett, KOT, Marinovich, Cressey, Driveline, Blended elite programming.
- `wic_metadata_complete`: true
- `equipment` array, `indoor_legal`/`outdoor_legal`, and `travel_friendly` flags.

### 2. Create a new WIC warmup engine
Add `supabase/functions/_shared/wic/engines/warmup.ts` that defines:
- A `WarmupRole` enum: `tissue_prep`, `fascial_rotation`, `mobility_joint`, `neural_activation`, `fast_twitch_primer`, `stability_activation`, `arm_care_prep`, `movement_pattern_bridge`.
- A `WarmupTemplate` per context: `game_day`, `in_season_practice`, `offseason_extended`, `speed_day`, `lift_day`, `recovery_day`, `travel_day`.
- A `buildWarmupSequence(context, trainingAge, phase, availableTime)` function that returns an ordered list of movement slugs, with:
  - In-season/game-day: short (8–12 min), low CNS, includes fascial rotation + neural activation + arm care.
  - Off-season: longer (15–22 min), includes full CARs, mobility, fast-twitch primer, and stability work.
  - Speed day: fast-twitch emphasis before sprint work.
  - Lift day: joint CARs + stability activation before barbell work.
  - Travel/day-before-game: low-impact movement prep + breathing.
- Dose scaling by training age: beginners get fewer reps and slower tempos; elite get more complexity, shorter contacts, and higher intent.

### 3. Wire the warmup engine into `wk-generate-daily`
- Load the new `warmup` category rows alongside other engines.
- Add a `certifyWarmup()` certifier analogous to `certifyCrossSport()`.
- Generate the warm-up prescription as a `slot: "warmup"` with `sequence_role: "warmup"` and `engine: "warmup"`.
- Use the resolved phase/game-day/practice-day context from `resolveTrainingContext` to pick the right template.
- Ensure the generated warm-up respects schedule modulation (e.g., game day → short neural primer; travel → low-impact).

### 4. Replace the hardcoded warmup block in the client
In `src/lib/hammer/prescription/dailyPlan.ts`:
- Remove the static `warmup` switch case drill lists.
- Add a `useWkDailyPrescriptions` or `HammersTodayProvider` lookup for the warm-up slot (consistent with the existing Speed/Bat/Lift/Conditioning cards).
- If the warm-up prescription is available, render it as a `WkWarmupCard` (new component). If unavailable, fall back to a minimal safe default so no athlete is left without a warm-up.
- Keep the warm-up card at the top of the daily plan before speed/lift work.

### 5. Build the `WkWarmupCard` UI component
- Expandable card showing the sequence of warmup drills with setup, dosage, cue, and stop-if.
- Tag pills per drill: `Fascial`, `Fast-Twitch`, `Mobility`, `Activation`, `Arm Care`.
- Context-aware header: e.g., "Warm-up — game day neural primer", "Warm-up — off-season extended prep", "Warm-up — speed day prep".
- "Add to Game Plan" button that converts the warm-up into a `custom_activity_template` like the other cards.
- "Why this warm-up" collapsible explaining the fascial/ECM and fast-twitch rationale.

### 6. Validation & E2E checks
- Verify all new rows pass the WIC validator (`supabase/functions/_shared/wic/validator.ts`).
- Confirm `wk-generate-daily` returns a non-empty warm-up slot for: in-season game day, in-season practice day, off-season Q1/Q2, youth beginner, and elite pro.
- Confirm no 500s or "retry" states on the Hammers Today card.
- Run a targeted build/typecheck.

## Technical notes
- Movement insertion will be idempotent (`ON CONFLICT (slug) DO UPDATE`) so re-running is safe.
- The new `warmup` category is additive only; it will not break existing strength/speed/bat-speed engines.
- All new movements will be `season_legality: true` across every phase and `training_age_legality: true` across every class, so no athlete is excluded. Intensity and volume differences are handled by the engine's dose selection.
- We will keep the global "AI terminology purge" in mind: any user-facing copy will use "Hammer" or "analysis" language, never "AI".

## Deliverables
1. New migration: `supabase/migrations/20260723_elite_warmup_library.sql`
2. New engine: `supabase/functions/_shared/wic/engines/warmup.ts`
3. New certifier: `supabase/functions/_shared/wic/warmup/sessionBuilder.ts`
4. Updated `supabase/functions/wk-generate-daily/index.ts` to call the warmup engine
5. Updated `src/lib/hammer/prescription/dailyPlan.ts` to consume the warm-up prescription
6. New component: `src/components/hammer/WkWarmupCard.tsx`
7. Updated `src/components/hammer/HammerDailyPlan.tsx` to render the warm-up card first

## Out of scope (for this plan)
- Changing the existing strength, speed, bat-speed, or conditioning engines beyond ensuring warm-up ordering.
- Adding video demonstrations for new movements (descriptions only; video URLs can be backfilled later).
- Rebuilding the `generate-warmup` standalone edge function; it remains a standalone AI feature while the daily warm-up becomes deterministic and catalog-driven.

---
*Approximate effort: 1 focused build turn.*