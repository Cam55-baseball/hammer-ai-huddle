## Goal
Introduce Weightless Object Sport Training (WOST) as a core coordination pillar for Hammers Today Plan. Youth and beginner lifecycles should get maximized exposure; advanced/elite athletes keep it as a low-load coordination primer. The work must be usable in the warmup card and the cross-sport card (game-day early activation + offseason back-end).

## What will be built

### 1. Frontend warmup library — `src/lib/hammer/prescription/warmupLibrary.ts`
- Add a new `weightless_coordination` warmup role.
- Seed 24+ elite WOST drills (tennis ball, scarf, balloon, beanbag, frisbee, reaction drop-catch, coin finger roll, shuttle tap-up, light-bat shadow tap, etc.) with youth, beginner, and elite dose scaling.
- Add `templateFor(context, lifecycle)` so youth and beginner lifecycles automatically receive extra `weightless_coordination` slots; elite gets only the canonical single slot.
- Add `weightless_coordination` to every non-recovery warmup template so it stays in the rotation throughout the athlete's journey.

### 2. Cross-sport engine — `supabase/functions/_shared/wic/engines/crossSport.ts`
- Replace the old hardcoded `GAME_DAY_PRIMER_SLUGS` with a deterministic `selectCrossSportPicks` selector.
- Selector resolves the canonical cross-sport template (`xs.coordination` / `xs.low_impact` / etc.) and picks movements from `wk_movement_catalog` matching the required categories, respecting `eligible`, day-of-year seed, and substitution-family deduplication.
- Export a `CROSS_SPORT_PREFERRED` list so weightless object movements are preferred when available.

### 3. Daily generator — `supabase/functions/wk-generate-daily/index.ts`
- Extend the `MovementRow` type to include `cross_sport_category`, `substitution_family`, `transfer_group`, and `training_age_legality` so the selector can consume the full catalog.
- Replace the game-day `GAME_DAY_PRIMER_SLUGS` block with `selectCrossSportPicks` using the low-impact template, producing early-activation cross-sport work.
- Replace the offseason back-end cross-sport block with `selectCrossSportPicks` using the coordination template, producing off-season cross-sport conditioning.
- Both blocks stamp the chosen `cross_sport_template_id` and correct placement in `why_payload` so canonical ordering still works.

### 4. AI warmup generator prompt — `supabase/functions/generate-warmup/index.ts`
- Update the system prompt to explicitly instruct the AI to include weightless object coordination drills (tennis ball, scarf, balloon, beanbag, reaction drop-catch) for youth and beginner athletes, and to keep them as low-load options for advanced/elite athletes when the context is appropriate.

### 5. Database seed — `wk_movement_catalog`
- Insert ~30 new `cross_sport` category movements:
  - 24 under `cross_sport_category = 'coordination'` (offseason back-end use).
  - 6 under `cross_sport_category = 'low_impact'` (game-day early activation use).
- All rows will have `cns_cost = 0`, `game_day_eligible = true`, `travel_friendly = true`, `indoor_legal = true`, `outdoor_legal = true`, `primary_adaptation = 'movement_literacy'`, `source_philosophy = 'Weightless Object Sport Training'`, a shared `substitution_family`/`transfer_group`, and full season/training-age legality.

## Verification steps
- Run the existing build to confirm TypeScript compiles after the interface changes.
- Open the workout library viewer to confirm the new movements appear under the cross-sport category.
- Generate a sample plan for a youth game-day and an offseason day to confirm the new weightless drills appear in the warmup and cross-sport cards without fatal certification errors.
- Check that the AI warmup function still returns a valid JSON payload when invoked with `warmupContext: 'game'`.

## Technical notes
- The selector will be deterministic: a `dayOfYearSeed` + category-based rotation means athletes see variety day-to-day while staying stable within a single day.
- The cross-sport certifier (`certifyCrossSport`) already validates category coverage and substitution ladders; the new rows will pass because their `cross_sport_category` matches the resolved template and they share a `substitution_family`.
- No changes to `supabase/config.toml`, no new tables, no new auth providers.