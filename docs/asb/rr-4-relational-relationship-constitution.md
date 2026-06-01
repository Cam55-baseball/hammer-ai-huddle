# RR-4 — Relational Relationship Constitution

**Status:** Sealed (Phase B, post-presentation unlock).
**Scope:** the `relational.relationship.*` topic family.
**Subordinate to:** Eternal Laws, Megaphase 151–160, RR-1…RR-3 (when sealed),
all prior immutable invariants across Phases 1–150, and the relational
visibility matrix (`docs/asb/relational-visibility-matrix.md`).

RR-4 governs how relationships between an athlete and their counterparties
(parent, coach, self, future roles) are constituted, evolved, and revoked.
Relationships are not first-class rows — they are deterministic projections
over an append-only event stream that rides the canonical
`emitAsbEvent` / `emitAsbLineage` path on `asb_events` + `asb_event_lineage`.

## RR-4 invariants

1. **Relationships are additive-only events.** Creation, confirmation,
   revocation, and pause are independent events on the canonical ledger.
   No row is ever updated or deleted.
2. **No mutable relationship truth table.** There is no `relationships`
   table. The current relationship set is a memoized projection over the
   `relational.relationship.*` stream.
3. **Revocation never deletes history.** A `relational.relationship.revoked`
   event references the originating `created` event via `lineage_parent_ids`.
   The full transition lineage is permanently reconstructable.
4. **Revocation removes downstream visibility immediately.** Once a
   revocation event is appended, any subsequent projection rebuild excludes
   the revoked counterparty from rows scoped to the revoked relationship.
   No grace period, no cached authority.
5. **Parent authority supersedes coach and recruiter for minors.** When
   the subject's developmental projection indicates `is_minor === true`,
   an active `parent` relationship has constitutional precedence over any
   `coach` or future `recruiter` relationship on safeguarding-flagged
   payloads.
6. **Commercial authority never overrides safeguarding.** No commercial,
   sponsorship, or recruiting relationship may override a safeguarding
   classification — the safeguarding route always runs first and always
   wins on conflict.
7. **Trust never grants authorization.** A high trust projection does not
   confer visibility, write authority, or any constitutional privilege.
   Authorization derives exclusively from active relationship events
   and the visibility matrix.
8. **Relationship state is replay-derived only.** Any consumer that needs
   the current relationship set must compute it from the event log via
   the canonical projection. Side caches and ad-hoc reads are forbidden.
9. **All relationship transitions are lineage-visible.** Every
   `confirmed`, `revoked`, and `paused` event carries
   `lineage_parent_ids` referencing the originating `created` event and
   emits a corresponding `asb_event_lineage` edge with
   `derivation_type: "relationship_transition"`.
10. **No silent escalation.** Authority changes (e.g. parent precedence
    activating because the subject crossed into a minor stage) are
    derived deterministically from the projection. The relationship layer
    itself never silently expands a counterparty's authority — that
    only happens through an explicit, lineage-visible event.

## Verbs

The four sealed verbs are:

- `relational.relationship.created` — proposes a new relationship.
- `relational.relationship.confirmed` — counterparty accepts.
- `relational.relationship.revoked` — either side terminates.
- `relational.relationship.paused` — temporarily downgrades to
  presence-only visibility (payload redacted in projection).

All four are registered in `asb_topic_registry` and validated by
`relationshipSchemas.ts`. Payloads are emitted exclusively through the
wrappers in `relationshipEmitters.ts`, which compute deterministic
idempotency keys and write lineage edges.

## Out of scope for RR-4

- Recruiter relationships (RR-5).
- Injury lifecycle, narrative_event, career_arc, exposure_event,
  recruiter_contact_event.
- Safeguarding notification delivery (route foundation only — see
  `src/lib/runtime/relational/safeguardingRoute.ts`).
- RR-5…RR-10 invariants remain reserved.

## Replay guarantee

For any subject `S` and any event prefix the same set of relationship
events deterministically projects to the same relationship state at
pinned `engine_version` + `reasoning_version`. Replay is byte-identical
under identical ledger inputs.
