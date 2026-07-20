
# Fix "Retry" on Speed / Bat Speed / Lifts / Conditioning cards

## Current state (verified)

- `useWkDailyPrescriptions` flips `failed = true` **whenever `wk-generate-daily` throws or times out (30s)**. Every card (`WkSpeedCard`, `WkBatSpeedCard`, `WkLiftsCard`, `WkConditioningCard`) then renders the same generic "Retry" button. The user sees `Retry` on all four because they share one snapshot — one edge failure blanks the whole plan, not four independent failures.
- The edge function can fail for **three distinct reasons**, all currently indistinguishable in the UI:
  1. **HTTP 422 `wic_validation_failed`** — WIC validator rejected the plan (duplicate movements, missing `why_v2` answer, forbidden game-day slot, missing full-body role, or a per-engine certification refused to publish). Returns a full `validator_report` we currently discard.
  2. **HTTP 500** — an engine threw before validation (catalog empty for sport, missing `wk_periodization_blocks` for phase, RPC failure, athlete-context resolver crash).
  3. **Timeout at 30s** — Gemini/LLM path slow or one of the certification engines looping over a sparse catalog.
- The most common practical cause in the wild is **missing athlete context** (Q1–Q24 onboarding partially done): `athleteContext.missing_fields` drives which engines can certify. Speed/Bat-Speed/Lift/Conditioning engines each require a minimum profile (sport, primary position, training age, competitive level, season phase, equipment). If any engine returns `validation_status: "rejected"`, the WIC validator marks the whole publication fatal → 422 → "Retry" on every card.
- **Root cause is currently unconfirmed for this specific user** — no `wk-generate-daily` calls appear in edge logs (user is on `/auth`). The plan below both diagnoses and repairs the class.

## Objectives

1. Never again show a bare "Retry" — the athlete (and we) must see *why* generation was refused and what to do.
2. Turn a single-engine refusal into a **partial success**: cards whose engines certified should render; only the failing card shows an actionable reason.
3. Close the two most common structural failure modes (missing context, sparse catalog per sport/phase) so elite prescriptions publish for every onboarded athlete.

## Work

### 1. Surface the real reason (client)

- `useWkDailyPrescriptions.generate`: capture `error.context` from `supabase.functions.invoke`, read the JSON body (`error`, `validator_report`, `missing_context_fields`, `phase`, `adaptation`), and expose on the snapshot as `failureReason: { code, title, detail, missingFields, engineFailures[] }`.
- Update `useHammersToday()` consumers so each card reads a **per-engine** status (`engineFailures` keyed by `speed | bat_speed | lift | conditioning`). Cards render:
  - Certified engine → normal card.
  - Refused engine → red-outline card with the exact reason (e.g., "Speed engine needs your **primary position** and **training age** — finish onboarding Q6, Q11") and a deep-link to that onboarding step.
  - Global failure (500/timeout) → single top-level banner with "Regenerate" + "Report".

### 2. Diagnostics passthrough (edge)

- In `wk-generate-daily`, both the 422 and 500 paths already write `wk_generation_diagnostics` — extend the response body with a small `failure_reasons[]` array derived from `validatorReport.issues` and each engine's `validationStatus`, so the client can render actionable copy without another fetch.
- Add `missing_context_fields` and `context_completeness_score` to the response (they're already computed for diagnostics).

### 3. Repair the structural failure classes

- **Missing context short-circuit**: at the top of the edge function, if `athleteContext.completeness_score < threshold` OR any of the hard-required fields (`sport`, `primary_position`, `training_age`, `competitive_level`, `season_phase`) is null, return 200 with a *partial plan* (warm-up + mobility + arm care where possible) and a structured `blocked_engines[]` payload instead of 422. This alone eliminates the majority of "Retry" reports.
- **Sparse-catalog guardrail**: in each engine (`liftCertification`, `speedCertification`, `batSpeedCertification`, `conditioningCertification`), when the filtered `wk_movement_catalog` slice for `(sport, phase, equipment, training_age)` returns < N eligible movements, widen the filter deterministically (drop equipment first, then age band) before refusing. Emit a `substitution_completeness` warning so we can audit.
- **Per-engine soft-fail**: change the WIC publication validator so an engine that fails category coverage becomes a **warn** (engine omitted, others publish) instead of a fatal for the whole plan. Fatal remains only for duplicate movements or a forbidden-slot violation.

### 4. Onboarding gap deep-links

- Add an `onboardingFieldRegistry.ts` mapping each `missing_field` to its onboarding step id, so the per-card refusal message renders "Complete: Position (Q6)" as a real button that jumps into `HammerOnboardingChat` at that step (uses the existing dropdown navigator).

### 5. Observability

- Extend `wk_generation_diagnostics` writes with the new `blocked_engines` and `failure_reasons` fields (already partially present); add an owner-facing view at `/owner/wk/diagnostics` listing recent failures + top missing fields so we can watch the class shrink to zero.

### 6. Verification

- Add a Vitest that mocks `supabase.functions.invoke` returning each of: 200 full, 200 partial with blocked engines, 422 with validator report, 500, and asserts the correct per-card UI in each case.
- Deno test for `wk-generate-daily` that runs three athletes: (a) fully onboarded → 4/4 engines certify, (b) missing position → speed+lift blocked, others publish, (c) empty catalog for softball offseason → widened filter still publishes.
- Manual smoke: sign in as a test athlete with partial onboarding, confirm the actual missing-field messages surface and deep-links work.

## Technical notes

- No schema change required for step 1–2 (all fields already exist on `wk_generation_diagnostics`).
- Step 3 changes engine contracts inside `_shared/wic/*` — must bump `WIC_VERSION` minor and update `docs/wic/*` per the WIC amendment process.
- Step 5 owner view is a new read-only page; no RLS changes (owner role already gated).

## Out of scope

- Rebuilding the prescription philosophy itself (movement selection, sets/reps, sequencing) — the engines are correct; the issue is failure handling and context gating. If after this ships you still see weak prescriptions, we open a separate WIC amendment for the specific engine.
