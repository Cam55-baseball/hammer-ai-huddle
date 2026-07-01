
# Phase XX (WIC) — Completion Audit

**Short answer: No, not 100%.** The constitutional scaffolding, governance wrapper, adaptation selector, six-question `why_v2`, schema migration, publication validator, audit script, and docs all shipped. But the WIC mission called for more, and several pieces are still gaps.

---

## What is fully shipped (✅)

- Constitutional authority module + 12-engine registry (`_shared/wic/constitution.ts`, `src/lib/wic/constitution.ts`).
- Adaptation selector — one adaptation chosen per day *before* any exercise is picked.
- Six-question `why_v2` builder + completeness gate.
- Publication validator: duplicate slug/name (fatal), duplicate sets×reps (warn), game-day forbidden slots (fatal), missing `why_v2` (fatal), missing full-body role (warn).
- Canonical day-structure module (normal + game day) and sequence helper.
- Schema migration: 16 metadata columns on `wk_movement_catalog`; `adaptation / engine / why_v2 / validator_report / generator_version` on `wk_prescriptions`.
- `wk-generate-daily` refactored to run adaptation → generate → validate → publish. Fatal validator failure returns HTTP 422 and blocks the write.
- `generator_version` bumped to `wic_v1` on both server + client hook.
- `docs/wic/constitution.md` doctrine file.
- `scripts/audits/wic-audit.ts` metadata-gap + legacy-version audit.

---

## Gaps still open (❌)

1. **12 independent engines are not real modules.** The registry exists; the generator still runs the single legacy pipeline wrapped in WIC governance. `movement_prep`, `warmup`, `power`, `recovery`, `mobility`, `arm_care`, `return_to_play` have no dedicated engine files.
2. **Catalog metadata not backfilled.** The new columns have permissive defaults; existing rows have `wic_metadata_complete=false` and nothing blocks them from being prescribed.
3. **Validator is intentionally light.** It doesn't yet enforce seasonal legality (defers to generator's `IN_SEASON_BLOCKED_SLUGS`), min-age, equipment availability, cross-day `recovery_window_hours`, or adaptation↔movement `primary_adaptation` compatibility.
4. **UI is still 4 cards, not 12.** No dedicated cards for Movement Prep, Warm-up, Power, Recovery, Mobility, Arm Care, Return-to-Play. `why_v2` is persisted but not surfaced anywhere.
5. **Open policy questions never confirmed.** From the last turn: (a) staged vs. full-ship, (b) hard-block vs. soft-warn for incomplete metadata, (c) overrides scope under WIC. I proceeded with pragmatic defaults.
6. **No end-to-end test.** I only typechecked; no live invocation of `wk-generate-daily` was run to prove the WIC pipeline publishes a full day for a real profile.

---

## Proposed plan to reach 100%

Staged, additive, each stage independently shippable and validator-gated.

### Stage 1 — Engine extraction (server)
Create `supabase/functions/_shared/wic/engines/` with one file per engine:
`sprint.ts · batSpeed.ts · strength.ts · power.ts · conditioning.ts · crossSport.ts · recovery.ts · armCare.ts · mobility.ts · movementPrep.ts · warmup.ts · returnToPlay.ts`.
Each engine exports `plan(ctx) → Prescription[]` and owns its selection rules. Refactor `wk-generate-daily/index.ts` into a thin composer: `for engine of NORMAL_DAY_ORDER: engine.plan(ctx)`. Legacy `push()` becomes a per-engine helper.

### Stage 2 — Catalog completion
- Backfill migration to set `movement_pattern`, `primary_adaptation`, `season_eligibility`, `equipment`, `joint_stress`, `recovery_cost`, `volume_cost`, `bias`, `duplicate_group`, `recovery_window_hours`, and `wic_metadata_complete=true` for the current ~60-movement library.
- Turn on **hard-block** in the generator: any row with `wic_metadata_complete=false` is filtered out (constitution.ts flag).

### Stage 3 — Validator hardening
Add fatal checks: seasonal legality (`season_eligibility` mismatch), min-age, equipment absent, adaptation mismatch (movement's `primary_adaptation` must match today's decision or be a declared compatible neighbor). Add cross-day check: no repeat within `recovery_window_hours`.

### Stage 4 — UI expansion (frontend only)
Add cards for the missing engines and split the Lifts card into `Strength` + `Power`. Surface the `why_v2` six answers in a "Why this?" drawer on `WkPrescriptionCard`. All engine cards read from the same `wk_prescriptions` rows, filtered by `engine`.

### Stage 5 — Live verification
Curl `wk-generate-daily` for a seeded athlete in each season phase and on a game day. Assert: `validator_report.ok=true`, every row has complete `why_v2`, engine coverage matches canonical order, no duplicates.

---

## Technical notes

- Stages 1 → 3 are the constitutional gaps. Stages 4 → 5 are surfacing + proof.
- Stage 2 introduces a hard cutover risk: turning on `wic_metadata_complete` filtering with an incomplete backfill will empty a user's day. The backfill must land in the same migration that flips the flag.
- All stages remain additive to `wk_prescriptions`; no destructive schema changes.

---

## Decisions I need before building

1. **Ship order:** run Stages 1 → 5 sequentially in one build session, or approve Stage 1 first and re-plan after?
2. **Hard-block policy (Stage 2):** hard-block incomplete-metadata movements immediately after backfill (safer, tighter pool), or keep soft-warn for one release cycle?
3. **Overrides under WIC:** keep the user "Request Override" path, restrict it to medical/coach roles only, or remove it entirely?
