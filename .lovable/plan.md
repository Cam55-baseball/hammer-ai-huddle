# Wave 1 — RR-5 Narrative Continuity Activation

Activates the reserved `relational.narrative.*` family as a fully replay-derived continuity layer. Doctrine subordination: Eternal Laws → Megaphase 151–160 → RR-1…RR-10 → safeguarding orchestration → developmental gating. Strict stop gate: no RR-6…RR-10 work, no recruiter / injury / exposure / career-arc systems, no schema rewrites, no new primitives outside the reserved narrative_event family, no projection rewrites outside `narrativeState`.

## 1. Schema activation
- New `src/lib/runtime/relational/narrativeSchemas.ts` — Zod schemas extending `RelationalEnvelope` for five topics:
  - `relational.narrative.memory_anchor`
  - `relational.narrative.slump_marker`
  - `relational.narrative.breakthrough_marker`
  - `relational.narrative.identity_reflection`
  - `relational.narrative.context_recall`
- Every payload requires non-empty `lineage_parent_ids` (RR-5 invariant 2: citation-bound). `identity_reflection` is athlete-authored only (`authority="self"`). `slump_marker` is observational (pattern window + cited antecedents; no labels). No free-text feelings — utterance-style fields are hashed refs like existing conversation turns.
- Register topic prefixes in any topic registry list used by `prepareRows` consumers.

## 2. Emitter layer
- New `src/lib/runtime/relational/narrativeEmitters.ts` — thin wrappers over canonical `emitAsbEvent`/`buildAsbRow` only, mirroring `relationshipEmitters.ts`. No parallel storage. Each emitter:
  - validates with the Zod schema,
  - asserts `lineage_parent_ids.length >= 1` (anchor/recall/slump/breakthrough),
  - refuses emission if a safeguarding lockdown projection is active for the athlete (defers to safeguarding sub-route),
  - blocks `coach_hammer` from authoring `identity_reflection` (RR-5 invariant 7).
- No mutable narrative tables. No summaries persisted as truth.

## 3. Projection layer
- New `src/lib/runtime/projections/narrativeState.ts` — pure, memoized, replay-deterministic. Produces:
  - `continuityTimeline`: ordered narrative events with cited antecedents.
  - `resurfacingCandidates`: deterministic ranking (recency × lineage richness × athlete-revocation respect), no AI/ML, no random, no `Date.now`.
  - `unresolvedThreads`: slump/breakthrough markers with no resolving event in window.
  - `longitudinalContext`: bounded summary windows (counts only — never inferred emotion).
  - `missingness`: surfaced as explicit signal, never imputed.
- Revocation: `identity_reflection` with `revokes_event_id` removes downstream visibility on next rebuild — no cached narrative authority.
- No new projection rewrites elsewhere.

## 4. Hammer memory resurfacing
- Extend `src/lib/runtime/relational/hammerMemory.ts` with a `validateHammerNarrativeReference` check used before any Hammer turn that cites narrative state:
  - must cite at least one canonical antecedent (`FABRICATED_RECALL` reuse),
  - rejects banned framings (destiny / diagnosis / identity-locking) via a denylist token set,
  - inferred confidence ≤ 0.7,
  - safeguarding lockdown ⇒ rejection.
- `HammerConversationPanel`: read `narrativeState` via a new `useNarrativeState` hook (added to `useRelationalProjections.ts`) and render at most one observational callback per session, sourced from `resurfacingCandidates[0]`. Callback text comes from `copy.ts` templates filled with cited dates only — no model-generated prose.

## 5. Copy / humanization
- Extend `src/lib/relational/copy.ts` with a `NARRATIVE_VOICE` block:
  - allowed templates ("You mentioned {topic} on {date}.", "This echoes what you noted after {anchor}.")
  - empty / revoked / safeguarded states
  - explicit denylist (destiny, "always", "never", "becoming", "sabotage", "fragile", diagnostic verbs)
- All narrative-facing components import from `copy.ts`; no inline strings.

## 6. UI continuity pass
- `HammerConversationPanel`: subtle "Remembering" chip above composer when a resurfacing candidate is available; tap reveals the cited antecedent. No feed, no banner.
- `AthleteJourneyMap`: add narrative markers inline in existing list (badge + cited date). No new section, no clutter.
- `Relational.tsx`: no structural changes — narrative reads flow through existing components. Mobile-first (440/390) preserved.

## 7. Replay & tests
- New `src/lib/runtime/projections/__tests__/narrativeState.test.ts`:
  - rebuild determinism (same rows → identical output, byte-equal JSON)
  - resurfacing determinism (stable ordering under shuffled input)
  - duplicate event idempotency
  - out-of-order replay stability
  - revocation removes downstream visibility on next rebuild
  - missing-memory survivability (gaps remain visible as gaps)
  - safeguarding lockdown suppresses narrative output
- New `src/lib/runtime/relational/__tests__/narrativeEmitters.test.ts`:
  - rejects emission without `lineage_parent_ids`
  - rejects `coach_hammer` `identity_reflection`
  - rejects under safeguarding lockdown
- Extend `hammerMemory` tests with narrative-reference validation cases.
- Run: `bunx tsc --noEmit`, full relational vitest suite, narrative tests, `scripts/preflight.sh`.

## 8. Audit
- New `docs/asb/narrative-continuity-audit.md`:
  - emotional safety findings (denylist coverage, manipulation patterns reviewed)
  - continuity coherence (cross-projection consistency)
  - replay guarantees (test list + outcomes)
  - resurfacing examples (allowed vs forbidden, with rationale)
  - manipulation-risk audit (RR-5 invariants 3–5, 9 mapped to enforcement points)
  - remaining risks
  - final verdict

## Technical notes
- All new files pure modules; no `Date.now`, no `Math.random`, no I/O.
- `narrativeState.ts` follows the `memoize` + `Scope` pattern from `conversationMemoryState.ts`; `prepareRows` handles demo/prod firewall.
- No migrations. No edits to `runtime/projections/types.ts` beyond the narrative prefix list if needed.
- No edits to: schemas of other primitives, recruiter/injury/exposure/career-arc surfaces, App.tsx routes.

## Deliverables
Exact files changed, exact test counts and pass/fail, replay guarantees enumerated, emotional safety findings, remaining risks, final verdict.
