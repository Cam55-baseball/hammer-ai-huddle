# RR-8 Wave 1 — Life Context Integration Activation

Mirrors the RR-5 narrative wave: schemas + canonical emitters + pure replay-derived projection + read-only UI awareness + safeguarding subordination + tests + audit. Strictly additive. No RR-6/7/9/10 work, no recruiter / injury / exposure / career-arc surfaces, no schema rewrites, no new primitives outside the reserved `relational.life_context.*` family.

## Subordination chain
Eternal Laws → Megaphase 151–160 → RR-1…RR-8 invariants → safeguarding orchestration sub-route → developmental gating → relational visibility matrix → projection legality.

## Files to create

1. `src/lib/runtime/relational/lifeContextSchemas.ts`
   - `LIFE_CONTEXT_TOPICS` map + `LIFE_CONTEXT_TOPIC_PREFIX = "relational.life_context."`.
   - Six Zod schemas extending `RelationalEnvelope`:
     `academic_load`, `schedule_stress`, `sleep_disruption`, `travel_load`, `family_context`, `general_pressure`.
   - Plus a `disclosure_revocation` payload (revokes prior life-context event by id) — uses the already-reserved `life_context_event` family, no new primitive.
   - Payload fields are **observational and bounded** only: `window_start`, `window_end`, `intensity_band: "light" | "moderate" | "heavy"`, optional `topic_tag` (≤64 chars, surface via copy templates), `visibility_scope ∈ {"self","parent","coach","safeguarding_only","demo"}` (no `external`, no recruiter).
   - **Forbidden fields** (not present in schema): personality, sentiment, "stress_score", inferred household composition, demographic data, free-text feeling content. `family_context` carries only an `intensity_band` + optional cited antecedents.
   - Cite-bound topics require `lineage_parent_ids.length >= 1` where antecedent exists (athlete-authored disclosure is its own antecedent for first-time disclosure — modeled the same way `identity_reflection` is in RR-5).
   - `authority` constrained to `self` or `parent` (parent only legal when developmental gate marks minor).

2. `src/lib/runtime/relational/lifeContextEmitters.ts`
   - Thin wrappers over `emitAsbEvent` / `emitAsbLineage` only. No mutable tables, no parallel storage.
   - `LifeContextEmissionError` + `LifeContextEmitGate { safeguardingLockdown: boolean; isMinor: boolean }`.
   - Pre-emission asserts:
     - Zod parse.
     - Block `coach` and `recruiter` actor roles (RR-8 invariant 1 + 9).
     - If `visibility_scope === "coach"` and `isMinor`, require parent authority binding (Phase 152 minor supremacy).
     - If `safeguardingLockdown`, route through safeguarding sub-route (defer the original visibility scope to `safeguarding_only`).
     - Never emit derived/composite scores.
   - One emitter per topic + `emitLifeContextRevocation`.

3. `src/lib/runtime/projections/lifeContextState.ts`
   - Pure, memoized, deterministic, replay-safe. Same `memoize` + `Scope` pattern as `narrativeState.ts` / `conversationMemoryState.ts`.
   - Output:
     - `currentContext` — most recent disclosure per category within bounded window (no inference into empty categories).
     - `activePressureSignals` — disclosures whose `window_end` is open or `>= last observed event timestamp`. No wall-clock.
     - `suppressionCandidates` — context items that should soften scheduled load (returned as references; never as scores, never authoring organism truth).
     - `continuityTimeline` — chronological visible events.
     - `revokedEventIds` — removed on next rebuild (RR-8 invariant 2).
     - `missingness` — explicit gap signal, never imputed (RR-8 invariant 3).
   - No predictive scoring, no behavioural classification, no identity locking. No `Date.now`, no `Math.random`, no I/O.
   - Filtered through existing `prepareRows(rows, scope, prefixes)` — inherits demo↔production firewall + visibility matrix without modification.

4. `src/hooks/useRelationalProjections.ts` (edit)
   - Add `useLifeContextState(athleteId, scope)` mirroring `useNarrativeState`. No other changes.

5. `src/lib/relational/copy.ts` (edit)
   - Append `LIFE_CONTEXT_VOICE` block:
     - Observational templates only: "You mentioned travel has been heavy this week.", "Looks like your schedule has been packed lately.", "Sleep has been tight recently — easing today's load."
     - Empty / revoked / safeguarded-state strings.
     - **Denylist** (mirrors RR-5 NARRATIVE_VOICE pattern): "emotionally overwhelmed", "burnout", "fragile", "prone to", "affecting your confidence", "stress score", "mental score", diagnostic verbs.

6. `src/components/relational/HammerConversationPanel.tsx` (edit)
   - Add `useLifeContextState` read.
   - At most **one** observational context acknowledgement per session, sourced from `activePressureSignals[0]`, rendered from `LIFE_CONTEXT_VOICE` templates with cited date only. Coexists with the existing RR-5 resurfacing chip (separate slot, never both speaking on the same turn — pick the most recent disclosure deterministically).
   - Reuses existing `validateNarrativeReference`-style guard pattern: new tiny `validateLifeContextReference` in `hammerMemory.ts` enforcing denylist + confidence ≤ 0.7 + safeguarding lockdown → reject.

7. `src/pages/Relational.tsx` (edit, minimal)
   - No structural changes. Mobile-first layout preserved. No new dashboard, no timeline feed.
   - Optional: pass-through visibility unchanged. Section ordering unchanged.

8. `src/pages/OnboardingFlow.tsx` (edit, minimal)
   - Add one **optional** "Is anything heavy off the field right now?" calm check-in step. Skippable with no penalty. Emits exactly one `general_pressure` event via canonical emitter when answered. Never gates progression.

9. `src/lib/runtime/relational/hammerMemory.ts` (edit)
   - Add `validateLifeContextReference(text, ctx)` — same denylist/confidence-ceiling/lockdown contract as the narrative validator.

## Tests to add

All under `src/lib/runtime/relational/__tests__/` using shared `_fixtures.ts`.

- `lifeContextSchemas.test.ts` — schema acceptance/rejection, denylist of forbidden fields, parent-authority rule for minor coach-visibility.
- `lifeContextEmitters.test.ts` — coach/recruiter actor block, safeguarding lockdown deferral, revocation emission, lineage population.
- `lifeContextState.replay.test.ts`:
  - rebuild determinism (shuffled input → identical output)
  - duplicate idempotency
  - out-of-order replay stability
  - revocation removes downstream visibility on next rebuild
  - missingness preserved (never imputed)
  - safeguarding lockdown precedence (item routed away from non-safeguarding scopes)
  - demo↔production firewall (already covered by visibility matrix test — add a life-context row to that suite if cheap, else dedicated case here)
- `life-context-reference.test.ts` — `validateLifeContextReference` denylist + confidence ceiling + lockdown.

Run: `bunx tsc --noEmit`, full relational suite, life-context replay suite, `bash scripts/preflight.sh`.

## Audit deliverable

`docs/asb/life-context-audit.md` covering:
- emotional safety review (template-by-template denylist enforcement)
- profiling-risk audit (confirming no composite scores, no demographic inference)
- safeguarding precedence walk-through
- replay guarantees (determinism proof + revocation behaviour)
- visibility isolation (matrix row coverage including `safeguarding_only`)
- manipulation-risk review (no engagement loops, no coercive disclosure)
- remaining risks
- final verdict

## Stop gate enforced
- No RR-6 (injury), RR-7 (career arc), RR-9 (exposure), RR-10 (recruiter) code.
- No recruiter visibility for life-context events at any layer.
- No new primitives, no schema rewrites, no projection rewrites outside `lifeContextState`.
- No mutable storage, no edge functions, no migrations.
- Commercial / recruiting surfaces remain blocked from `relational.life_context.*` by topic-prefix isolation + visibility matrix.

## Verification deliverable
Return: exact files changed, tests added, pass/fail counts, replay guarantees, emotional safety findings, remaining risks, final verdict.
