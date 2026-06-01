# Megaphase 151–160 — Phases 152–154 Execution Plan

Scope is strictly bounded: Phases **152 (conversation_event)**, **153 (psychological_state)**, **154 (developmental_stage)**. No work touches 155–160. All primitives ride the existing `emitAsbEvent` / `buildAsbRow` / `asb_events` + `asb_event_lineage` substrate with **zero parallel storage**. Presentation surfaces remain pure downstream projections — no frontend-local relational state, no shallow AI, no silent inference escalation.

Deliverables map 1:1 to the 10 sections you required. They are produced in-repo as code + docs, not as theater.

---

## SECTION 1 — Canonical Event Schemas

New file: `src/lib/runtime/relational/schemas.ts` (Zod schemas, exported types, version-pinned). All schemas include the constitutional envelope: `engine_version`, `reasoning_version`, `visibility_scope`, `confidence ∈ [0,1] | null`, `missingness: { fields: string[]; reason: "not_observed" | "redacted" | "consent_withheld" }`, `authority: "self" | "coach" | "parent" | "system_inferred"`, `lineage_parent_ids: string[]`.

**Phase 152 — `relational.conversation.*`**
- `relational.conversation.turn` — `{ thread_id, speaker_role: "athlete"|"coach_hammer"|"coach"|"parent", utterance_ref (hashed pointer, never raw PII in payload), intent_tag, recalled_event_ids[], trust_delta: number ∈ [-0.1, +0.1], confidence, missingness, authority }`
- `relational.conversation.shared` — `{ thread_id, shared_with_scope: VisibilityScope, redaction_mask: string[], consent_event_id }`
- `relational.conversation.redacted` — `{ thread_id, turn_ids[], reason, redacted_by_authority }`

**Phase 153 — `relational.psych.*`**
- `relational.psych.self_report` — `{ axis: "mood"|"motivation"|"confidence"|"anxiety"|"burnout_risk", value: -2..+2, note_ref?, confidence: 1.0, authority: "self" }` (self-reports are authoritative on their axis)
- `relational.psych.inferred` — `{ axis, value, evidence_event_ids[], confidence ∈ [0, 0.7] (HARD CEILING), missingness, authority: "system_inferred" }` (inferred never exceeds 0.7 — human supremacy)
- `relational.psych.transition` — `{ axis, from_band, to_band, trigger_event_id, confidence, requires_human_ack: boolean }`

**Phase 154 — `relational.developmental.*`**
- `relational.developmental.age_observed` — `{ chronological_age_years: number, source: "self"|"parent"|"verified_doc", confidence, authority }`
- `relational.developmental.growth_attestation` — `{ height_cm?, mass_kg?, attested_by_authority, measurement_window_days }`
- `relational.developmental.puberty_marker` — `{ marker_code, observed_by: "self"|"parent"|"clinician", confidence, missingness }` (clinician-only for sensitive markers; otherwise rejected at projection)
- `relational.developmental.deload_window` — `{ window_start, window_end, reason: "growth_spurt"|"puberty_transition"|"chronological_load", load_ceiling_pct }`
- `relational.developmental.transition` — `{ from_stage, to_stage, evidence_event_ids[], confidence }`

Stages enum: `youth_intro | youth_developmental | adolescent_early | adolescent_mid | adolescent_late | adult_emerging | adult_competitive | adult_pro`.

All schemas are **additive**; no existing topic is modified.

---

## SECTION 2 — Projection Architecture

New files, following the existing `src/lib/runtime/projections/*State.ts` pattern (pure, memoized, frozen, deterministic):

- `src/lib/runtime/projections/conversationMemoryState.ts` — projects `relational.conversation.*` into `{ threads: Record<thread_id, { turns: TurnSummary[]; trust_score; last_shared_scope; redacted_turn_ids }> }`. Trust score is **derived only**, never written. Hammer relational memory reads this projection — never local React state.
- `src/lib/runtime/projections/psychState.ts` — projects `relational.psych.*` into `{ axes: Record<axis, { self_reported_value?; inferred_value?; effective_band; confidence; requires_ack }> }`. Self-reports always override inferred on the same axis within the same window.
- `src/lib/runtime/projections/developmentalState.ts` — projects `relational.developmental.*` into `{ chronological_age; current_stage; active_deload_window?; load_ceiling_pct; gating_flags }`.

All three reuse `prepareRows` + `memoize` from `types.ts`, so the Phase 151 demo↔production firewall applies automatically. Projection keys remain `scope::lastEventId` — replay-stable.

Hooks (read-only consumers): `useConversationMemory(scope)`, `usePsychState(scope)`, `useDevelopmentalState(scope)`. UI components subscribe to these; **no component holds relational state in `useState`**.

---

## SECTION 3 — Replay Semantics Verification

Tests added under `src/lib/runtime/__tests__/`:
- `relational-conversation.replay.test.ts` — given a sealed event sequence, projection output is byte-identical across reruns at pinned `engine_version + reasoning_version`. Re-inserting events out of arrival order but in canonical `(occurred_at, event_id)` order yields identical state. Demo events excluded from `self/coach/parent/org/external` projections.
- `relational-psych.replay.test.ts` — inferred confidence is clamped ≤ 0.7; self-report supersedes inferred deterministically; `transition.requires_human_ack` derived purely from band-crossing rules.
- `relational-developmental.replay.test.ts` — stage transitions reproducible from `age_observed + growth_attestation + puberty_marker` lineage; deload windows are pure functions of antecedents.

Every test asserts: (a) determinism across two independent builder invocations, (b) lineage completeness (`lineage_parent_ids` reachable in the input set), (c) no Date.now / Math.random reachable from projection code (lint rule already enforced in projections directory).

---

## SECTION 4 — Visibility + Privacy Enforcement Review

Enforcement is **constitutional at the projection boundary**, not a UI filter:

1. `prepareRows` (already Phase 151) handles `demo` bidirectional firewall and `self` exclusion.
2. New helper `enforceRelationalVisibility(row, scope, developmentalState)` extends `prepareRows` for relational topics only:
   - `psych.self_report` with `axis ∈ {anxiety, burnout_risk}` and minor athlete → visible to `self` and `parent` only; coach/org/external receive an opaque presence marker (`{ present: true, axis, value: null }`) so downstream UI knows a signal exists without leaking value.
   - `conversation.turn` payloads carry only `utterance_ref` (hash); raw text lives in a separate `conversation_utterances` storage row keyed by ref, with RLS scoped to `(athlete_id, allowed_scope)`. Replay never requires raw text.
   - `developmental.puberty_marker` with non-clinician authority is downgraded to `presence-only` in non-self/non-parent scopes.
3. Minor-athlete supremacy (Phase 151 doctrine): when `developmentalState.current_stage ∈ minor_stages`, parent scope has read precedence over coach/recruiter for any relational topic flagged `safeguarding_category: true`.

Audit doc: `docs/asb/relational-visibility-matrix.md` — table of (topic × scope × stage) → visibility decision, machine-checkable in a dedicated test.

---

## SECTION 5 — Demo-to-Production Migration Proof

Demo seeding writes real `asb_events` rows with `payload.visibility_scope = "demo"`. Promotion to production is a **single field change** with a constitutional gate:

1. Migration script `scripts/promote-relational-demo.ts` (dry-run by default) selects demo events for a target athlete, validates: (a) all referenced `lineage_parent_ids` resolve, (b) authority claims are backed by a real authority binding row, (c) consent events exist for each `conversation.shared`, (d) no field exceeds inferred confidence ceiling.
2. On approval, emits **new** events (`relational.*.promoted_from_demo`) referencing the demo events as `lineage_parent_ids` and carrying the production scope. Original demo events are **never mutated** — additive-only.
3. Projection cache invalidates by `lastEventId` change; no code path needs to change. UI flips automatically because it reads projections, not demo flags.

Proof artifact: `docs/asb/relational-demo-to-prod-migration.md` walks one conversation thread + one psych axis + one developmental transition through the full path.

---

## SECTION 6 — Hammer Relational Memory Constraints

Coach Hammer's relational memory is bound by these constitutional rules, encoded in `src/lib/runtime/relational/hammerMemory.ts`:

1. **Read-only over projection.** Hammer never writes `psych.inferred` or `conversation.turn` directly — only the conversation orchestrator does, after producing a turn.
2. **Recall must cite.** Any Hammer utterance referencing prior context must populate `recalled_event_ids[]` with replay-resolvable IDs. Empty array ⇒ no claim of memory permitted in the utterance.
3. **No silent escalation.** Hammer may emit `psych.inferred` at confidence ≤ 0.7 only. Any inference that would cross a `transition` band sets `requires_human_ack: true` and routes through Phase 31 arbitration before influencing downstream state.
4. **No commercial/recruiting authority.** Hammer responses are forbidden from authoring `recruiter.*` topics or referencing recruiter context when `developmental_stage` is minor without parent consent event.
5. **Missingness explicit.** When Hammer lacks signal, the turn payload's `missingness.fields` lists the gap; the UI surfaces it ("I don't have data on X yet"). Fabrication is constitutionally illegal.

---

## SECTION 7 — Psychological-State Bounded Inference Rules

Encoded as pure functions in `src/lib/runtime/relational/psychInference.ts`:

- **Self supremacy:** if a `psych.self_report` exists for `(axis, window)`, no `psych.inferred` for the same `(axis, window)` may contribute to `effective_band`.
- **Confidence ceiling:** inferred confidence is clamped to `0.7`. Composite scores across multiple evidence events use min-aggregation, never product-inflation.
- **Evidence requirement:** every `psych.inferred` row must list ≥1 `evidence_event_ids` resolvable in the ledger. Empty evidence ⇒ rejected at emit-time validator.
- **Band thresholds frozen:** `{ -2: crisis, -1: strained, 0: baseline, +1: elevated, +2: peak }`. Band-crossing always emits a `psych.transition` with `requires_human_ack: true` for crisis/strained bands.
- **No mood manipulation.** Inference may surface, may suggest a check-in, may never author motivational content that contradicts the athlete's stated state.
- **Decay model:** inferred values decay deterministically toward `null` over a frozen half-life; self-reports do not decay until next self-report or explicit window close. Both functions are pure, replay-stable.

---

## SECTION 8 — Developmental-Stage Gating Matrix

`src/lib/runtime/relational/developmentalGates.ts` exports `gates(stage) → { load_ceiling_pct, allowed_topics, blocked_topics, parent_consent_required_topics, safeguarding_default }`.

Matrix (excerpt; full version in `docs/asb/developmental-gating-matrix.md`):

```text
stage                | load_ceil | recruiter.* | exposure.* | psych.inferred(anxiety/burnout) | conversation.shared(external)
youth_intro          | 60%       | blocked     | blocked    | parent_only                     | parent_consent_required
youth_developmental  | 70%       | blocked     | blocked    | parent_only                     | parent_consent_required
adolescent_early     | 80%       | parent_gate | parent_gate| parent_only                     | parent_consent_required
adolescent_mid       | 85%       | parent_gate | allowed    | parent_visible                  | parent_consent_required
adolescent_late      | 95%       | parent_gate | allowed    | parent_visible                  | self_consent + parent_notify
adult_emerging+      | 100%      | allowed     | allowed    | self_visible                    | self_consent
```

Active `deload_window` overrides `load_ceiling_pct` downward; commercial/recruiting authority **may never** raise a gate. Gating decisions emit observable `developmental.gate_decision` events (additive subtopic) so denials are replay-visible, not silent.

---

## SECTION 9 — Trust Propagation Rules

Trust is a **derived projection**, never a stored scalar. `src/lib/runtime/projections/trustState.ts`:

- Source events: `relational.conversation.turn.trust_delta`, `relationship.confirmed`, `relationship.revoked`, `conversation.shared` (consented), `safeguarding_escalation` (penalty), `developmental.gate_decision` (denied → relational integrity reinforcement, not penalty).
- Aggregation: `trust(athlete, counterparty) = clamp(Σ trust_delta · decay(t), -1, +1)` with frozen decay. Pure function. Replay-stable.
- **No transitive trust.** Coach A's trust does not bleed into Coach B's score.
- **Trust never authorizes.** It can gate UI affordances (e.g., showing a relationship as "established") but cannot bypass developmental gates, consent gates, or safeguarding routes.
- **Revocation is immediate and lineage-visible.** A `relationship.revoked` event causes the projection to recompute; the revoked counterparty's downstream reads return `presence-only` thereafter.

---

## SECTION 10 — Failure-Mode Audit

Documented in `docs/asb/relational-failure-modes.md`, with each failure mode mapped to a containment route already constitutionalized in prior phases:

| Failure | Detection | Containment route |
|---|---|---|
| Hammer fabricates recall (empty `recalled_event_ids` but cites memory) | emit-time validator on `conversation.turn` | reject + emit `relational.conversation.rejected`, Phase 31 arbitration if recurring |
| Inferred psych confidence > 0.7 | schema clamp + projection assert | clamp at emit, log `psych.ceiling_violation`, alert |
| Self-report overridden by inferred in projection | replay test diff | projection rejected, last replay-valid frame restored (Phase 47 §E) |
| Demo event leaks into production projection | `prepareRows` invariant test | event filtered; failing test blocks deploy |
| Minor athlete recruiter contact without parent consent | gating matrix evaluation pre-emit | reject + `developmental.gate_decision { denied: true, reason: "parent_consent_missing" }` |
| Safeguarding signal in `psych.self_report{ axis:"crisis" }` | projection band-crossing detector | route to safeguarding sub-orchestrator (Phase 151 doctrine), notify `parent` scope, lockdown commercial topics |
| Trust score manipulation via burst of synthetic turns | per-counterparty rate + authority check in trust projection | deltas beyond rate ceiling discarded, `relational.trust.suspect` emitted |
| Replay divergence after migration | promote-demo dry-run lineage check | migration blocked; no production emit |
| Consent withdrawal mid-thread | `conversation.redacted` lineage-walks downstream turns | downstream turns' `utterance_ref` marked unresolvable; projections degrade to presence-only |
| Developmental stage regression (illegal) | transition validator | rejected; only forward + clinician-attested correction permitted |

Every failure mode emits a canonical, replay-visible event. **No silent recovery. No self-healing.**

---

## File-level deliverables (Phase 152–154 build, in order)

1. `src/lib/runtime/relational/schemas.ts` — Zod schemas for all three primitives + envelope.
2. `src/lib/runtime/relational/emit.ts` — typed wrappers over `emitAsbEvent` with validator + authority/consent precondition checks.
3. `src/lib/runtime/relational/psychInference.ts`, `developmentalGates.ts`, `hammerMemory.ts` — pure rule modules.
4. `src/lib/runtime/projections/{conversationMemoryState,psychState,developmentalState,trustState}.ts` — pure projections.
5. `src/hooks/{useConversationMemory,usePsychState,useDevelopmentalState,useTrustState}.ts` — read-only hooks.
6. Tests under `src/lib/runtime/__tests__/relational-*.replay.test.ts` + `relational-visibility.matrix.test.ts`.
7. Docs: `docs/asb/relational-visibility-matrix.md`, `developmental-gating-matrix.md`, `relational-demo-to-prod-migration.md`, `relational-failure-modes.md`.
8. Migration: `scripts/promote-relational-demo.ts` (dry-run default).
9. Memory updates: amend `mem://architecture/asb-megaphase-151-160-...` with Phase 152/153/154 sealed sections; refresh `mem://index.md` summary.

## Out of scope (explicitly deferred to ≥155)

- `narrative_event`, `injury_event`, `career_arc`, `life_context_event`, `exposure_event`, `recruiter_contact_event` — schemas referenced only as *future* topics in the gating matrix; **no implementation**.
- RR-1…RR-10 sealing (deferred to Phase 160).
- Any UI surface beyond the read-only hooks listed above. Presentation components are downstream consumers built in a separate, later loop.

## Constitutional invariants preserved (non-negotiable, restated)

- Additive-only; zero parallel storage; canonical `emitAsbEvent` path only.
- Replay-certifiable at pinned `engine_version + reasoning_version`.
- Human authority supremacy — self-report > inferred; parent supremacy for minors on safeguarding.
- Inferred psych confidence hard ceiling 0.7; no silent escalation.
- Commercial/recruiting authority cannot raise developmental gates or bypass survivability.
- Missingness/confidence explicit at every projection boundary.
- Demo↔production firewall (Phase 151) extended, never weakened.
- Relational primitives never author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, `rehabilitation_state`.

Approve to proceed with Phase 152 implementation as the first build slice; Phases 153 and 154 follow in sequence within the same megaphase, each gated on its own replay test suite passing before the next begins.
