## Problem

Athletes are seeing two failure modes in Hammers Today:

1. **Prescriptions assume too much knowledge.** Example surfaced by the user: *“Reaction ball vs wall — 3 x 20 sec — Cue: athletic stance, hands ready — read early”* gives a name and a short cue, but an 8-year-old athlete (or any non-expert) has no idea what a reaction ball is, what “read early” means, or how to actually do the drill safely.
2. **The plan is not one organism.** A throwing athlete was given **arm care in the lift**, **arm care twice before throwing during defense**, and **an arm care cool down**. Arm care is being prescribed independently by two different generation systems rather than being budgeted once per day.

## Current state (verified)

Hammers Today stitches together two separate engines:

- **Server-side WIC engine** — `supabase/functions/wk-generate-daily/index.ts` reads `wk_movement_catalog` and writes `wk_prescriptions` rows for `lift`, `speed`, `bat_speed`, `conditioning`, `cross_sport`, and a `sequence_role: arm_care` slot inside the lift card.
- **Client-side legacy engine** — `src/lib/hammer/prescription/dailyPlan.ts` builds the `warmup`, `throwing`, `hitting`, `defense`, `baserunning`, `game_iq`, `fueling`, and `recovery` blocks in the browser. Throwing is built from `src/lib/hammer/prescription/eassLibrary.ts`, which injects its own band-prep / arm-care / cool-down work.

Confirmed via subagent read:
- `warmupLibrary.ts` and `eassLibrary.ts` store static drill content with `name`, `setup`, `dosage`, `cue`, `stopIf` fields.
- `WkPrescriptionCard.tsx` renders `why`, `cue`, `sequencing_hint`, and `dosage` from `wk_prescriptions` rows.
- `WkLiftsCard.tsx` renders the DB-generated lift list, including arm-care rows.
- The `wk_movement_catalog` arm-care section is thin (only 2 seeded rows) and the picker expects many more families (`jaeger_jband`, `crossover_symmetry`, `xband`, `cressey`, `jobes`, `driveline`, `oates`, `isometric`, `softball_windmill`, `forearm_wrist`, `recovery`).
- `dailyPlan.ts` does not currently read the WIC-generated lift rows to avoid duplicating arm care with the throwing block.

## Goal

Make every prescription legible to a complete beginner and make every daily card aware of the others so the day feels like a single, coordinated plan.

## Solution

### 1. Canonical Movement Guide standard

Introduce a shared `MovementGuide` schema that every movement must carry, regardless of whether it lives in TypeScript (`warmupLibrary.ts`, `eassLibrary.ts`) or the database (`wk_movement_catalog`).

Required fields:
- `what` — plain-language description of the movement in 1–2 sentences.
- `setup` — exact equipment, body position, spacing, distance, and hand/foot placement.
- `good_rep` — 3–5 checkpoints an athlete can self-verify.
- `bad_rep` — 2–3 common mistakes to avoid.
- `feel` — what the athlete should feel when it is correct.
- `why_today` — how this specific movement connects to today’s plan/goal.
- `next_link` — how this movement leads into the next card or drill.
- `stop_if` — safety stop rules.
- `image_hint` — optional text description of visual reference.

This schema is added to:
- `DrillStep` in `src/lib/hammer/prescription/dailyPlan.ts`.
- `WarmupDrill` in `src/lib/hammer/prescription/warmupLibrary.ts`.
- `EassDrill` in `src/lib/hammer/prescription/eassLibrary.ts`.
- A new JSONB column `movement_guide` on `wk_movement_catalog` (migration), plus a matching TypeScript type shared by the server edge functions and the client viewer.

UI display:
- **Inline**: every card shows a concise `what` + `setup` directly under the movement name, plus the existing dosage string.
- **Sheet**: a “How do I do this?” button opens a bottom sheet with the full `good_rep`, `bad_rep`, `feel`, `why_today`, `next_link`, and `stop_if`.

### 2. Full library content rewrite

Audit and rewrite every movement currently used by Hammers Today to the zero-prior-knowledge standard.

Sources to rewrite:
- All `WARMUP_LIBRARY` entries in `warmupLibrary.ts`.
- All `EassDrill` entries in `eassLibrary.ts` (band prep, tennis ball, underload, regulation, long toss, intent, position skill, windmill, cooldown, recovery).
- All `DrillStep` entries in the `dailyPlan.ts` switch cases (`speed`, `strength`, `hitting`, `defense`, `baserunning`, `game_iq`, `fueling`, `recovery`).
- All `wk_movement_catalog` rows that map to the WIC cards (`lift`, `supplemental`, `speed`, `bat_speed`, `conditioning`, `cross_sport`, `arm_care`). This is done via an `UPDATE` script against the catalog, using the new `movement_guide` JSONB column.

Example of the new standard for the surfaced movement:

> **Reaction ball vs wall**
> - *What:* A small, uneven ball is thrown against a wall so it bounces back unpredictably. You catch it before it bounces twice.
> - *Setup:* Face a wall 6–10 feet away with a partner or by yourself. Feet shoulder-width, knees slightly bent, weight on the balls of your feet, hands relaxed in front of your chest.
> - *Good rep:* Eyes stay on the ball the whole time, hands move to the ball early, body stays balanced, catch is clean with two hands.
> - *Bad rep:* Waiting for the ball to come to you, reaching late, catching it against your chest, losing your stance.
> - *Feel:* Light and quick, like you are waiting for a pitch or a batted ball.
> - *Why today:* Wakes up your hand-eye timing and fast-twitch reflexes before speed or throwing work.
> - *Next link:* Move into the sprint or throwing block while your nervous system is still alert.
> - *Stop if:* You roll an ankle, your shoulder pinches, or you feel dizzy.

### 3. Single daily “Arm Care Budget” — smart split

Introduce a single daily budget that decides **once** where arm care appears and suppresses it everywhere else.

Rules:
- If the day is a **throwing day** (from schedule/athlete context or a throwing-due flag), the warmup and throwing cards own the arm-care activation and cooldown.
- If the day is a **non-throwing day**, the lift card may own the arm-care slot.
- Defense, baserunning, hitting, and recovery blocks do **not** inject their own arm-care work.
- The EASS cooldown category is the final arm-care exposure of the day; no other card appends a cool-down.

Implementation path:
- Add an `arm_care_budget` object to the daily plan context (client-side) and to the `wk-generate-daily` payload.
- `HammersTodayProvider` exposes the generated lift rows so `buildHammerDailyPlan` can detect whether arm care is already present and suppress the client-side warm-up/throwing arm care if so.
- Conversely, when the client-side plan determines it is a throwing day, it passes `throwing_day: true` to the `wk-generate-daily` invocation so the server suppresses the lift-card `sequence_role: arm_care` row.
- Add a hard `dedupe` rule keyed by movement name + family across all cards (client + server) for the day.

### 4. Daily plan narrative header

At the top of Hammers Today, render a single “Today’s organism plan” sentence that explains the ordering and intent of the cards, e.g.:

> “Today is a throwing day. We are front-loading arm care in the warm-up, keeping the lift short, and saving the high-intent throwing for after speed. Recovery is a cooldown only.”

This narrative is generated by a new `buildDailyNarrative()` helper that reads the same schedule, readiness, and phase context used by the cards.

### 5. Files to change

Client:
- `src/lib/hammer/prescription/dailyPlan.ts` — add `MovementGuide` to `DrillStep`, rewrite all non-WIC block drills, consume `arm_care_budget`.
- `src/lib/hammer/prescription/warmupLibrary.ts` — add `MovementGuide` to `WarmupDrill`, rewrite all entries.
- `src/lib/hammer/prescription/eassLibrary.ts` — add `MovementGuide` to `EassDrill`, rewrite all entries, tie cooldown to the daily budget.
- `src/lib/hammer/prescription/types.ts` (new) — canonical `MovementGuide` type.
- `src/components/hammer/WkPrescriptionCard.tsx` — render inline `what`/`setup` and the “How do I do this?” sheet.
- `src/components/hammer/HammerDailyPlan.tsx` — render daily narrative header, pass throwing-day flag to provider.
- `src/components/hammer/HammersTodayProvider.tsx` — expose `liftHasArmCare` and `armCareBudget` to the plan builder.

Server/DB:
- Migration: add `movement_guide jsonb` to `wk_movement_catalog` with `GRANT` and `ALTER … ENABLE ROW LEVEL SECURITY` (already RLS-enabled, but GRANT is required for the new column via the migration pattern).
- `supabase/functions/wk-generate-daily/index.ts` — accept `throwing_day` payload, suppress arm care in lift when throwing day is true, read `movement_guide` from catalog rows, write it into `wk_prescriptions.why_payload`.
- `supabase/functions/_shared/wic/types.ts` — add `MovementGuide` mirror type.
- Update/insert script: backfill `movement_guide` for every row in `wk_movement_catalog` that is currently used by the WIC cards.

### 6. Phases

**Phase 1 — Schema & standards (1–2 days)**
- Define `MovementGuide` type.
- Add `movement_guide` JSONB column to `wk_movement_catalog`.
- Wire the type into `DrillStep`, `WarmupDrill`, and `EassDrill`.
- Update `WkPrescriptionCard` to render the inline + sheet UI using placeholder data.

**Phase 2 — Content rewrite (3–4 days)**
- Rewrite all `warmupLibrary.ts` entries.
- Rewrite all `eassLibrary.ts` entries.
- Rewrite all `dailyPlan.ts` non-WIC block entries.
- Backfill `movement_guide` for `wk_movement_catalog` rows.

**Phase 3 — Plan integration (2–3 days)**
- Implement `arm_care_budget` in `HammersTodayProvider` / `dailyPlan.ts`.
- Pass `throwing_day` flag to `wk-generate-daily`.
- Suppress duplicated arm care server-side and client-side.
- Implement daily plan narrative header.

**Phase 4 — Verification (1–2 days)**
- Typecheck and build.
- Smoke test for throwing-athlete, non-throwing-athlete, and pitcher profiles.
- Verify arm care appears exactly once per day.
- Verify no “1 x 1” or vague placeholders remain in the rendered cards.

## Risks & mitigations

- **Risk:** Backfilling 100+ movement-guide rows is a lot of content work.
  - *Mitigation:* Prioritize the movements that actually appear in the current catalog; use the “full library rewrite” answer but split into the four phases above.
- **Risk:** Changing the arm-care split could temporarily remove arm care from users who expect it.
  - *Mitigation:* Always keep at least one arm-care exposure per day; only move it between cards, never delete it.
- **Risk:** Server-side `wk-generate-daily` and client-side `dailyPlan.ts` remain two engines; full unification is a much larger project.
  - *Mitigation:* The smart-split budget is a cross-engine coordination layer, not a rewrite of either engine. It keeps the existing architecture stable while fixing the duplication.

## Open decision before build

No open questions — the user confirmed: full library rewrite, smart-split arm-care budget, and both inline + sheet explanation display.