# Phase B — RR-4 Sealing + Parent Linkage Activation

Strict, additive-only. Halts at backlog item #5. No recruiter, injury, narrative, exposure, career_arc, or RR-5…RR-10 work.

## Section 1 — RR-4 Constitutional Sealing

- **New** `docs/asb/rr-4-relational-relationship-constitution.md` — full RR-4 doctrine: relationships are append-only events; revocation never deletes lineage; parent supremacy for minors; commercial never overrides safeguarding; trust never grants authorization; relationship state is replay-derived; no mutable relationship table; no silent escalation; all transitions lineage-visible.
- **New memory** `mem://constraints/rr-4-relationship-sealing` — RR-4 invariants 1…10 (additive-only events, no mutable truth, revocation preserves history, immediate visibility removal on revoke, parent precedence for minors, commercial < safeguarding, trust ≠ authorization, replay-derived state, lineage-visible transitions, no silent escalation).
- **Update** `mem://index.md` Core/Memories sections to reference the new constraint file. Preserve all existing entries verbatim (full-file overwrite rule).
- Subordinate to Eternal Laws, Megaphase 151–160, and presentation-mode lock allowances (additive doctrine is allowed; no schema or pipeline changes).

## Section 2 — Relationship Schema Activation

Topics already registered in `asb_topic_registry` from Phase A (`relational.relationship.created|confirmed|revoked|paused`). Activation = schemas + emitters only; no DB changes.

- **New** `src/lib/runtime/relational/relationshipSchemas.ts` — Zod schemas for the four verbs with exact fields specified by the user (`relationship_id`, `subject_user_id`, `counterparty_user_id`, `relationship_type ∈ {parent, coach, athlete_self}`, `initiated_by`, `consent_required`, `visibility_scope`, `lineage_parent_ids[]` for `created`; corresponding fields for `confirmed|revoked|paused`).
- **New** `src/lib/runtime/relational/relationshipEmitters.ts` — `emitRelationshipCreated/Confirmed/Revoked/Paused` wrappers around canonical `emitAsbEvent` + `emitAsbLineage`. Deterministic `idempotency_key` via existing `computeIdempotencyKey` over (athlete_id, topic_id, occurred_at anchor, payload). `occurred_at` anchored to invite token issuance time so retries dedupe.

## Section 3 — Parent Invite / Linkage Flow (Backlog #5)

- **New** `src/lib/runtime/relational/parentLinking.ts` — pure functions: `createParentInvite(athleteId, parentEmail)` → emits `relationship.created` (`consent_required: true`, `visibility_scope: "parent"`); `acceptParentInvite(token, parentUserId)` → emits `relationship.confirmed` with `lineage_parent_ids` pointing back to the `created` event_id; `revokeParentRelationship(relationshipId, revokedBy, reason)` → emits `relationship.revoked`. Invite token = signed payload `{relationship_id, athlete_id, parent_email, issued_at}` (HMAC via existing project secret pattern; if no secret available, use deterministic UUID stored in payload — flagged in plan as confirmation point).
- **New** `src/pages/ParentInvite.tsx` — authenticated athlete page: enter parent email → call `createParentInvite` → display shareable invite link `/accept-parent-invite?token=…`. Lists pending + active relationships derived from replay (no parallel state).
- **New** `src/pages/AcceptParentInvite.tsx` — reads `?token=…`, requires parent sign-in/sign-up, calls `acceptParentInvite` on confirm. Idempotent on repeat acceptance.
- **Route registration** in `src/App.tsx` for the two new pages.
- No new tables. No parallel relationship state. All linkage state is `useAsbTimeline` → projection-derived.

## Section 4 — Visibility Arbitration Enforcement

- **New** projection `src/lib/runtime/projections/relationshipState.ts` — replay-derives current relationship set per athlete: active / paused / revoked, with parent supremacy flag when subject is minor (cross-reference `developmentalState`).
- **Extend** `src/lib/runtime/projections/types.ts::prepareRows` — when reader scope is `coach` and an active `parent` relationship exists for the same subject on a safeguarding-flagged payload, parent precedence wins. Revoked relationships → reader loses visibility on rows whose `payload.visibility_scope` matches the revoked side. Paused relationships → downgrade to presence-only (rows pass header/topic but `payload` redacted to `{paused: true}`). Recruiter scope remains universally blocked (already enforced).
- **New tests** `src/lib/runtime/relational/__tests__/relational-relationship-visibility.test.ts` — assertions exactly as user listed (revoked parent loses reads; revoked coach loses reads; paused → presence-only; parent precedence survives replay rebuild; trust score cannot bypass visibility gates).

## Section 5 — Safeguarding Route Foundation

- **New** `src/lib/runtime/relational/safeguardingRoute.ts` — pure deterministic classifier `classifySafeguardingSignal(row) → { route: "notify_parent" | "lockdown_commercial" | "arbitration_required" | "none", reasons: string[] }`. Routes only — **no** notification emission, **no** external integration, **no** state mutation. Triggers on: psych self-report with crisis tags, developmental marker for minor combined with commercial-scope event, explicit safeguarding category in payload.
- Small unit test file `safeguardingRoute.test.ts` for the classifier truth table.

## Section 6 — Replay & Persistence Verification

- **New** `relationship-replay.test.ts` — emit created→confirmed→revoked, rebuild projection from event log, assert final state matches; emit out-of-order (revoked before confirmed) and assert deterministic resolution by `occurred_at`.
- **New** `parent-linkage.test.ts` — full invite flow, acceptance, revocation, idempotent re-acceptance, demo↔live firewall preserved.

## Section 7 — Final Verification

Run `bunx tsc --noEmit`, full relational vitest suite, and document exact counts + remaining blockers (RR-5…RR-10 unsealed, recruiter inactive, injury isolated, safeguarding notifications not operational, exposure/career/narrative inactive) in `.lovable/plan.md`.

## Technical notes

- All emission flows through `emitAsbEvent` / `emitAsbLineage` in `src/lib/asb/emit.ts`. No `supabase.from("asb_events")` calls in new code.
- `useAsbTimeline` remains the sole reader; new projection plugs into `useRelationalProjections.ts` as `useRelationshipState(athleteId, scope)`.
- Idempotency: `occurred_at` anchored to deterministic anchors (invite issuance, acceptance click) so retries collapse via existing 23505 path.
- Lineage: every `confirmed`/`revoked`/`paused` carries `lineage_parent_ids` referencing the originating `created` event_id; written via `emitAsbLineage` with `derivation_type: "relationship_transition"`.
- Presentation-mode lock: Phase B work is explicitly authorized by the user message overriding the lock for backlog items #5 + RR-4 sealing only.

## Out of scope (will not touch)

Recruiter workflows, injury lifecycle, `narrative_event`, `career_arc`, `exposure_event`, `recruiter_contact_event`, RR-5…RR-10, schema rewrites, safeguarding notification delivery, external integrations.

## Confirmation point

Invite token signing — do you want HMAC via a new `PARENT_INVITE_SIGNING_KEY` secret, or is a server-generated opaque token (random UUID stored only inside the `relationship.created` payload, validated by lookup at acceptance time) acceptable? Default if you don't answer: opaque UUID (no new secret required, simpler, replay-derivable).
