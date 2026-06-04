# Hammer Activation Phase 8 — Execution Constitution

**Status:** Governance-only. No code, UI, prompts, schemas, projections,
emitters, or RR-7 / RR-9 / RR-10 activation under this phase.
**Subordinate to:** Eternal Laws · Megaphase 151–160 · RR-5 (ratified) ·
RR-6 (ratified) · RR-8 (sealed) · Hammer Activation Phases 1–7 · all
prior immutable invariants across Phases 1–150.

This document is the final governance lock before Wave 1 implementation
begins. Phases 1–7 defined *what* to build and *in what order*. Phase 8
defines *under what rules building is permitted to proceed*.

---

## §0 Objective

Define the rules under which Wave 1–4 implementation may proceed. The
question this document answers is:

> "What must never happen while building Waves 1–4?"

Implementation may not:

- drift from the Phase 5 architecture
- skip dependencies from the Phase 6 audit
- collapse constitutional boundaries from RR-4 / RR-5 / RR-6 / RR-8
- introduce hidden capabilities beyond C1–C7
- create duplicate Hammer authorities

Any deviation triggers §7 escalation.

---

## §1 Immutable Scope Lock

Implementation scope is exhaustively enumerated. No additions.

| Wave | Capability | Source |
|------|------------|--------|
| W1   | **C1 — Name Disambiguation** | Phase 5 §2, Phase 6 §3 |
| W1   | **C7 — Silence Enforcement** | Phase 5 §2, Phase 6 §3 |
| W2   | **C6 — Navigation Handoff** | Phase 5 §2, Phase 6 §3 |
| W2   | **C2 — Today Presence**     | Phase 5 §2, Phase 6 §3 |
| W3   | **C3 — Onboarding Presence** | Phase 5 §2, Phase 6 §3 |
| W3   | **C5 — First Setback Guidance** | Phase 5 §2, Phase 6 §3 |
| W4   | **C4 — Parent Voice**        | Phase 5 §2, Phase 6 §3 |

**Out of scope (no leakage):** RR-7 career arc, RR-9 exposure, RR-10
recruiter contact, additional Hammer surfaces, alternate Hammer
personalities, narrative resurfacing beyond RR-5 minimum, life-context
disclosure surfaces beyond RR-8 minimum, injury diagnosis surfaces, any
"Hammer v2" successor identity, any parallel coaching agent.

Hidden workstreams forbidden. If a contributor believes a capability is
required for launch but is not listed above, halt and escalate per §7
before writing code.

---

## §2 Dependency Lock

Strict build order:

```
W1 → W2 → W3 → W4
```

No parallel execution may bypass dependency order. Within a wave, the
two capabilities may be built concurrently only if neither violates
the other's invariants.

### Wave dependency rationale

- **W1 (C1 + C7) before W2.** Until a canonical Hammer identity exists
  (C1) and silence zones are classifiable as lawful or accidental (C7),
  no athlete-visible Hammer surface can be lawfully rendered. Building
  W2 first would force Hammer to speak inside undefined silence zones —
  immediate Organism-State silence breach.
- **W2 (C6 + C2) before W3.** C3 (onboarding presence) and C5 (first
  setback) both depend on the C2 "Today" substrate to render Hammer's
  voice and on C6 to hand off navigation lawfully. Building W3 first
  would require Hammer narrative surfaces with no underlying presence
  surface to attach to, forcing parallel surface authorship.
- **W3 (C3 + C5) before W4.** C4 (parent voice) inherits RR-5 framing
  legality from C5's setback narrative rules and RR-8 disclosure
  posture established in W3. Building C4 first would force the parent
  surface to invent its own framing rules, creating a duplicate
  narrative authority.

---

## §3 Constitutional Invariant Preservation

Each row lists an inherited invariant, the most likely accidental
violation vector during W1–W4 implementation, and the verification
that must prove the invariant survived.

| Invariant | Likely accidental violation | Required verification |
|-----------|-----------------------------|-----------------------|
| **RR-5 — no invented feelings, no fictional continuity** | Copy or prompt that paraphrases athlete emotion not present in a canonical self-report event | Every Hammer string in W2–W4 traceable to a canonical antecedent or marked as observational pattern only |
| **RR-5 — narrative revocability** | Cached narrative survives revocation event | Revocation simulation: emit revoke → next projection rebuild → narrative thread no longer visible |
| **RR-6 — no diagnosis, no prescription** | Setback flow (C5) infers injury type or recommends treatment | Static check: no diagnosis vocabulary in C5 copy; RTP paths require explicit human-authorization event |
| **RR-6 — athlete-reported pain outranks inferred readiness** | C2 surface overrides athlete-reported pain with model-derived readiness | Replay: pain self-report event always wins against inferred readiness on the Today surface |
| **RR-8 — no coercive disclosure** | Onboarding (C3) gates progress on life-context disclosure | UX audit: every life-context prompt skippable without feature loss |
| **RR-8 — life context never authors organism truth** | C3/C5 use disclosed context to mutate `organism_truth` | Code audit: no life-context event paths write `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state` |
| **Replay determinism** | Hammer surface reads wall-clock time, random seed, or live model output without lineage | Byte-identical replay under pinned `engine_version` + `reasoning_version` across all W1–W4 surfaces |
| **Parent supremacy for minors** | C4 surface exposes coach/recruiter authority above parent on minor athlete | Visibility-matrix test: minor account with active parent relationship — parent decisions always win at arbitration |
| **Safeguarding precedence** | Hammer narrative (C5) renders ahead of an active safeguarding classification | Safeguarding orchestration test: active classification suppresses narrative surface without notice |
| **Demo ↔ production firewall** | W1–W4 surface reads or writes across the `prepareRows` boundary | Inspect `src/lib/runtime/projections/types.ts::prepareRows`; add no new bypass paths; integration test confirms `x-demo-session: 1` blocked at edge per `supabase/functions/_shared/demoFirewall.ts` |
| **Single Hammer authority (C1)** | A second identity ("Coach Bot", "Mentor", "Assistant") emerges in copy, routing, or relational primitives | Identity audit: exactly one canonical Hammer identity referenced across all W1–W4 surfaces and emitted events |
| **Organism State silence (C7)** | Hammer speaks inside an undefined silence zone (e.g., during a safeguarding hold, during athlete-revoked narrative, during missingness-dominant state) | Silence-zone test matrix from Phase 6 §4 must pass — every zone classified lawful-silent or accidental-silent before C2 ships |

---

## §4 Wave Completion Gates

A wave is complete only when **all** of the following are satisfied.
Subjective "feels done" is forbidden.

### Per-wave gate

1. **Required verification artifacts** — TypeScript clean, replay
   determinism log, constitutional audit doc committed under
   `docs/asb/wave-N-completion/`.
2. **Required audit checklist** — every row in §3 relevant to that
   wave's capabilities verified and signed off.
3. **Required acceptance criteria** — measurable, capability-based,
   carried verbatim from Phase 7 §4:
   - **W1:** every athlete-visible surface resolves a single canonical
     Hammer identity; every silence zone is classifiable as lawful or
     accidental.
   - **W2:** Today surface renders Hammer presence only inside lawful
     speech zones; navigation handoffs preserve replay lineage.
   - **W3:** onboarding presence cites antecedents for every Hammer
     line; first-setback flow contains zero diagnosis vocabulary and
     zero prescription paths.
   - **W4:** parent surface enforces minor-athlete supremacy and
     routes safeguarding-relevant disclosures through the safeguarding
     sub-route before any narrative rendering.
4. **Required constitutional review** — explicit sign-off referencing
   this document by section. Reviewer attests no §1 scope expansion,
   no §3 invariant regression, no §5 anti-drift breach.

No wave may be marked complete with any gate open.

---

## §5 Anti-Drift Controls

Implementation may NOT, under any operational, vendor, cost, latency,
modernization, or aesthetic framing:

- invent new Hammer personalities (single-authority lock; see §3
  "Single Hammer authority")
- invent new memory systems parallel to the canonical
  `relational.narrative.*` lineage (RR-5 supremacy)
- invent new authority systems parallel to the Phase 31 arbitration
  route
- bypass arbitration on conflicting recommendations
- bypass the Megaphase 151–160 safeguarding sub-route
- bypass the relational visibility matrix
  (`docs/asb/relational-visibility-matrix.md`)
- introduce alternate Hammer surfaces ("HammerLite", "QuickHammer",
  "Hammer-for-recruiters", etc.)
- gate features behind life-context disclosure (RR-8 §4)
- author `organism_truth`, `athlete_intent`, `authority_override`,
  `hard_stop`, or `rehabilitation_state` from any C1–C7 surface

Every deviation request requires explicit constitutional review:
halt → write a deviation-request doc under
`docs/asb/wave-N-deviation/` → review against this document → either
amend Phase 8 (additive, lineage-visible) or abandon the deviation.
Silent deviations are constitutionally illegal.

---

## §6 Verification Requirements

Each wave must pass **all five** categories before advancing.

1. **TypeScript verification** — `tsc` clean across the project; no
   `// @ts-ignore` added on W1–W4 surfaces; no `any` introduced in
   Hammer identity or silence-zone code paths.
2. **Replay verification** — pinned `engine_version` +
   `reasoning_version` produce byte-identical projections across two
   independent replays of the wave's introduced events.
3. **Constitutional verification** — §3 invariant table reviewed row
   by row; §5 anti-drift checklist reviewed item by item; results
   documented under `docs/asb/wave-N-completion/constitutional.md`.
4. **Acceptance verification** — §4 per-wave acceptance criteria
   demonstrated with reproducible scenarios.
5. **Preflight verification** — `scripts/preflight.sh` passes
   end-to-end on the wave branch before merge.

A missing or partial result in any category blocks wave advancement.

---

## §7 Failure Escalation Rules

**Stop conditions** (non-discretionary):

- A dependency from §2 fails (prior wave incomplete or regressed).
- An invariant from §3 fails verification.
- Replay behavior changes unexpectedly (output divergence under
  pinned versions, projection nondeterminism, or lineage gap).
- Safeguarding weakens (visibility matrix regression, sub-route
  bypass, or notification fan-out failure on a safeguarding-relevant
  event).

**Escalation path:**

1. Halt the wave immediately. No further commits on the wave branch.
2. Write a findings doc under
   `docs/asb/wave-N-escalation/<short-name>.md` capturing: trigger,
   affected invariant or dependency, replay handle, lineage trace,
   suspected root cause.
3. Constitutional review against this document and the relevant RR-4
   / RR-5 / RR-6 / RR-8 constitutions.
4. Remediation plan reviewed and approved before any resume work.
5. Re-run §6 verification in full (not just the failing category)
   before the wave may advance.

No silent fix-ups. No "we'll catch it later." No partial-resume
without full re-verification.

---

## §8 Launch Readiness Gate

Launch is permitted only when **all** of:

- Wave 1 complete (per §4)
- Wave 2 complete (per §4)
- Wave 3 complete (per §4)
- Wave 4 complete (per §4)
- All §6 verification passed for every wave
- All §3 constitutional audits passed for every wave
- Zero open §7 escalation findings

If any item is open, launch is constitutionally illegal.

---

## §9 Post-Launch Boundary

The following remain outside the launch scope:

- **RR-7** — Career Arc & Longitudinal Identity
- **RR-9** — Exposure & Visibility Ethics
- **RR-10** — Recruiter Contact & Commercial Ethics

These are sealed-only per
`docs/asb/post-mastery-expansion-roadmap.md`. No implementation may
leak from RR-7 / RR-9 / RR-10 into W1–W4 surfaces, prompts, schemas,
projections, or emitted events. If a launch-scope task appears to
require RR-7/9/10 behavior, the task is mis-scoped — halt and
escalate per §7.

---

## §10 Final Verdict

Implementation governance is **complete**. Execution may begin under
the wave sequence defined in §1 and §2, governed by §3 invariants,
§4 completion gates, §5 anti-drift controls, §6 verification
requirements, §7 escalation rules, §8 launch readiness gate, and §9
post-launch boundary.

Next architectural step: **begin Wave 1 build — C1 Name Disambiguation
+ C7 Silence Enforcement** under this constitution.

---

## §11 Stop Gate Confirmation

This phase produced:

- this execution-governance document
- one appended entry in `.lovable/plan.md`

This phase did **not** produce:

- production code
- UI changes
- prompts
- schema changes
- projections
- emitters
- RR-7 activation
- RR-9 activation
- RR-10 activation

Execution-governance document only.
