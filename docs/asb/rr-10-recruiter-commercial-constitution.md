# RR-10 — Recruiter Contact & Commercial Ethics Constitution

**Status:** Sealed (Post-Mastery doctrine phase). Doctrine only.
**Scope:** the `relational.recruiter.*` topic family and any future
recruiter workflow, commercial interaction, scholarship visibility,
or opportunity continuity surfaces derived from it.
**Subordinate to:** Eternal Laws, Megaphase 151–160, RR-1…RR-9, the
safeguarding orchestration sub-route, minor-athlete supremacy, the
developmental gating matrix, the relational visibility matrix, and
all prior immutable invariants across Phases 1–150 (notably
RW-1…RW-10, ER-1…ER-10).

Commercial systems are subordinate to safeguarding. Always. Without
exception.

## RR-10 invariants

1. **Commercial systems subordinate to safeguarding.** No recruiter
   workflow, contact, inquiry, offer, or commercial interaction may
   land on an athlete (or be visible to one) when safeguarding routes
   are active. The safeguarding sub-route runs first.
2. **No pay-to-win visibility.** Recruiter surfaces may not be biased
   by athlete payment, athlete tier, recruiter payment, sponsorship,
   or platform monetization. Visibility derives from athlete
   authorization and developmental gates only.
3. **No hidden ranking manipulation.** Recruiter-facing rankings,
   filters, and matchings must be lineage-decomposable and replay-
   reconstructable. Hidden boosts, demotions, or "promoted" injection
   are forbidden.
4. **No pressure escalation toward minors.** Recruiters may not send
   urgency-coded, scarcity-coded, deadline-coded, or comparison-coded
   messages to minor athletes. Cadence limits apply per the
   developmental gating matrix.
5. **Parents retain supremacy for minors.** All recruiter contact with
   minor athletes requires an active parent relationship with
   `parent_consent_required` per the developmental matrix. Parent
   visibility is non-optional and non-revocable while the athlete is
   a minor.
6. **Recruiters only see authorized surfaces.** Recruiter visibility
   is scoped strictly by:
   - RR-4 active recruiter relationship for the athlete,
   - the developmental gating matrix (recruiter gate `allowed` /
     `parent_gate` / `blocked`),
   - the athlete's (and parent's, for minors) explicit RR-9 exposure
     authorization, and
   - the visibility matrix.
   Any other recruiter read path is forbidden.
7. **Opportunity continuity remains replay-visible.** Every recruiter
   contact, response, meeting, offer, decision, withdrawal, and gate
   violation reconstructs deterministically at pinned
   `engine_version` + `reasoning_version`.
8. **Commercial pressure may not distort organism truth.** Recruiter
   interest, scholarship visibility, NIL framing, sponsorship demand,
   and showcase economics may never bias readiness, recovery,
   developmental gating, narrative, or career-arc projections (RR-5,
   RR-6, RR-7 supremacy preserved).
9. **Recruiter events never author organism truth.** They never set
   `organism_truth`, `athlete_intent`, `authority_override`,
   `hard_stop`, or `rehabilitation_state`. They contribute lineage to
   opportunity surfaces only.
10. **Gate violations are first-class events.** A recruiter contact
    attempt against a closed gate emits `relational.recruiter.
    gate_violation` and routes through the safeguarding sub-route for
    minors. Silent denial is forbidden.

## Recruiter visibility rules

- Default visibility: closed.
- Open requires: active RR-4 recruiter relationship + developmental
  gate `allowed` (or `parent_gate` with active parent consent) +
  explicit RR-9 exposure authorization for the specific surface.
- Revocation of any one of the above closes recruiter visibility on
  the next projection rebuild.

## Prohibited commercial behavior

- Pay-to-feature, pay-to-rank, pay-to-message, pay-to-prioritize.
- Urgency / scarcity / countdown framing in recruiter messages.
- Auto-generated "shortlist" insertion based on commercial signal.
- Recruiter-driven narrative authorship (RR-5 supremacy).
- Recruiter-driven exposure widening (RR-9 supremacy).
- Recruiter-driven life-context access (RR-8 supremacy).
- Recruiter-driven medical or readiness inference (RR-6 supremacy).

## Safeguarding override rules

- Active safeguarding flag → recruiter contact paused, surfaces
  redacted, notification fan-out suppressed.
- Minor without active parent relationship → recruiter surfaces
  closed.
- Revoked parent relationship → recruiter authority on minor lapses
  immediately.
- Gate violation → safeguarding sub-route for minors; logged and
  arbitrated per Phase 31.

## Replay invariants for commercial interactions

- Byte-identical reconstruction under identical ledger inputs at
  pinned `engine_version` + `reasoning_version`.
- Revocations are additive events; original contact lineage remains.
- Composite opportunity surfaces expose every contributing antecedent
  one interaction away.

## Out of scope for RR-10

Implementation. See `docs/asb/post-mastery-expansion-roadmap.md` step 5.
