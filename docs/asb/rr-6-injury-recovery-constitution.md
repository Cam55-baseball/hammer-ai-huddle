# RR-6 — Injury Continuity & Recovery Ethics Constitution

**Status:** Sealed (Post-Mastery doctrine phase). Doctrine only.
**Scope:** the `relational.injury.*` topic family and any future
rehab observability, return-to-play (RTP) continuity, or medical
safeguarding surfaces derived from it.
**Subordinate to:** Eternal Laws, Megaphase 151–160, RR-1…RR-5,
the safeguarding orchestration sub-route, minor-athlete supremacy,
the developmental gating matrix, and all prior immutable invariants
across Phases 1–150.

The system is an organism observer, not a clinician. RR-6 binds every
injury and recovery surface to that boundary.

## RR-6 invariants

1. **The system never diagnoses.** No surface may assert an injury
   identity, pathology, or anatomical cause. Classification is limited
   to declared observational categories (onset / assessed / diagnosed
   by an external clinician / RTP-planned / milestone / setback /
   cleared / recurrence-watch) with the clinician/source bound in the
   event payload.
2. **The system never prescribes medical treatment.** No surface may
   recommend medication, dosage, modality, procedure, or contraindicate
   any of the above.
3. **Athlete-reported pain outranks inferred readiness.** If a
   self-report indicates pain, restriction, or hesitation, that signal
   supersedes any inferred readiness, fatigue, or workload projection
   for survivability gating.
4. **Commercial pressure can never override recovery.** Recruiter,
   showcase, scholarship, sponsorship, NIL, or monetization signals
   may not relax, accelerate, or hide any RR-6 surface. (Extends
   RW-1, ER-1…ER-10, and the Megaphase 111–150 commercial governance.)
5. **Return-to-play requires explicit human authorization.** RTP
   transitions require a `relational.injury.cleared` or
   `relational.injury.rtp_planned` event authored by an authorized
   counterparty (clinician role / coach with safeguarding-bound
   delegation / parent for minors). The system never auto-clears.
6. **Missingness is a signal.** Absent self-reports, absent compliance
   data, absent sensor data, or absent clinician confirmation must be
   visible as missingness. Missingness may never collapse into
   "ready" by default.
7. **No hidden readiness scoring.** Composite readiness or recovery
   scores are forbidden unless every contributing antecedent and its
   confidence/missingness state is lineage-visible one interaction
   away.
8. **Injury continuity is observational, not authoritative.** Injury
   events never author `organism_truth`, `athlete_intent`,
   `authority_override`, or `rehabilitation_state` directly. They may
   only contribute lineage to surfaces that constitutional authorities
   (Phase 31 arbitration, authorized clinician roles, parent for
   minors) act on.
9. **Safeguarding precedence is absolute.** When safeguarding flags
   fire (mental health indicators, abuse indicators, coercion
   indicators), the safeguarding sub-route runs first and supersedes
   all RR-6 surfaces.
10. **All RR-6 events are replay-derived and revocable.** Revoking a
    clinician relationship (RR-4 revocation) immediately removes that
    clinician's authority from any in-flight RTP plan. The historical
    event remains; the downstream authority does not.

## Allowable recovery observations

- Self-reported pain, soreness, fatigue, sleep, mood (RR-3 channels).
- Compliance with externally authored rehab plans (presence/absence).
- Sensor-derived workload, ROM, or motion changes — surfaced with
  confidence and missingness visible.
- Clinician-authored assessments and clearance events.
- Coach-authored observation events (clearly attributed, never as
  organism truth).

## Prohibited medical authority behavior

- Diagnosis, differential diagnosis, or pathology naming.
- Treatment recommendation, modification, or contraindication.
- Auto-progression of rehab phases without human authorization.
- Hidden readiness inference used to gate execution.
- Coach or recruiter override of clinician clearance.
- Pay-gated medical insight.

## Safeguarding precedence

For minor athletes, parent relationship precedence (per RR-4 invariant
5) applies to all RR-6 surfaces. For all athletes, safeguarding flags
preempt RR-6 visibility, scheduling, and notification fan-out.

## Recovery replay invariants

- All RTP transitions reconstruct deterministically from the canonical
  ledger at pinned `engine_version` + `reasoning_version`.
- Clearance and setback events are additive only; revocation is itself
  a new event.
- Missingness lineage is preserved through every projection rebuild.

## Out of scope for RR-6

Implementation. See `docs/asb/post-mastery-expansion-roadmap.md` step 2.
