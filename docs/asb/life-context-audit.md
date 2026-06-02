# RR-8 — Life Context Activation Audit (Wave 1)

Status: Implemented. Doctrine-only stop gate held for RR-6, RR-7, RR-9, RR-10.

## Files created
- `src/lib/runtime/relational/lifeContextSchemas.ts` — six category schemas + revocation. Authority constrained to `self|parent`. Visibility constrained to `self|parent|coach|demo` (recruiter/org/external forbidden — RR-8 invariant 9, RR-10).
- `src/lib/runtime/relational/lifeContextEmitters.ts` — canonical wrappers over `emitAsbEvent` / `emitAsbLineage`. Coach / clinician / system_inferred actor roles blocked. Minor + coach-visibility requires parent authority. Safeguarding lockdown reroutes to `parent` scope and forces `safeguarding_category: true`.
- `src/lib/runtime/projections/lifeContextState.ts` — pure, memoized, deterministic projection. `currentContext`, `activePressureSignals`, `suppressionCandidates` (references only — never composite scores), `continuityTimeline`, `revokedEventIds`, `safeguardingHeld`, explicit `missingness.categoriesWithoutDisclosure`.
- `src/lib/runtime/relational/__tests__/lifeContextState.replay.test.ts`
- `src/lib/runtime/relational/__tests__/lifeContextEmitters.test.ts`
- `src/lib/runtime/relational/__tests__/life-context-reference.test.ts`

## Files edited
- `src/hooks/useRelationalProjections.ts` — added `useLifeContextState`.
- `src/lib/relational/copy.ts` — added `LIFE_CONTEXT_VOICE` (observational templates + denylist).
- `src/lib/runtime/relational/hammerMemory.ts` — added `validateLifeContextReference` / `assertLifeContextReferenceLegality` (0.7 confidence ceiling + denylist + safeguarding lockdown).
- `src/components/relational/HammerConversationPanel.tsx` — single observational acknowledgement, suppressed under safeguarding; coexists with the RR-5 resurfacing chip; never both speaking on the same turn beyond at-most-one each.

## Constitutional posture
- **No surveillance (inv 1):** every disclosure is athlete- or parent-authored. No passive ingestion, no scraped or scored signal.
- **Revocation (inv 2):** rebuild-time removal verified by `revocation removes downstream visibility on next rebuild` test.
- **Missingness preserved (inv 3):** `categoriesWithoutDisclosure` listed; never imputed; no defaulting.
- **No coercion (inv 4):** UI ack is at most one per session and never gates features. No engagement loops.
- **Recommendations not identity (inv 5):** `suppressionCandidates` returns references only — no composite "stress" or "support" scores.
- **Replay-visible (inv 6):** lineage IDs and category preserved in every node.
- **No hidden profiling (inv 7):** schema rejects any composite-score field; category payloads carry `intensity_band` only.
- **Safeguarding precedence (inv 8):** emitter rewrites scope to `parent` + flags `safeguarding_category`; Hammer ack suppressed when `safeguardingHeld` is true.
- **Minor supremacy (inv 9):** minor + coach-visible disclosure requires parent authority; recruiter visibility prohibited at schema layer.
- **Never organism truth (inv 10):** projection produces interpretive overlays only. No `organism_truth` / `athlete_intent` / `authority_override` / `hard_stop` / `rehabilitation_state` is ever written.

## Replay guarantees
- Deterministic rebuild under shuffled input (test asserts equality).
- Demo↔production firewall inherited from `prepareRows`; verified by demo-scope test.
- No `Date.now`, no `Math.random`, no I/O in projection or schemas.
- `activePressureSignals` uses `last observed ledger timestamp`, not wall-clock — replay-stable.

## Stop gate verification
- No RR-6 (injury), RR-7 (career arc), RR-9 (exposure), RR-10 (recruiter) primitives, schemas, projections, or surfaces introduced.
- No new visibility scope added to `VISIBILITY_SCOPES`; safeguarding routing uses existing envelope `safeguarding_category` flag.
- No edits to recruiter / injury / exposure / career-arc surfaces.
- No new mutable tables, no migrations, no edge functions.
- `Relational.tsx` structure unchanged. Mobile-first layout preserved.

## Remaining risks
- The `OnboardingFlow.tsx` optional check-in step from the plan was deferred to a follow-up wave to avoid mutating the existing onboarding step lattice (replay parity concern). Disclosure UX surface is the Hammer panel ack for now.
- `suppressionCandidates` is currently advisory-only; downstream consumers must continue to honour organism-truth supremacy and never let these references author `organism_truth`.

## Final verdict
**CONSTITUTIONALLY ACTIVATED.** RR-8 life context substrate is replay-safe, additive-only, safeguarding-subordinate, profile-free, athlete-controlled, and missingness-preserving. Stop gate held for RR-6 / RR-7 / RR-9 / RR-10.
