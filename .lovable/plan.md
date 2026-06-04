# Hammer Critical Stack Validation Audit — Plan

Audit-only deliverable. No code, schema, migrations, emitters, projections, or implementation. Two files touched.

## Files

- **Create** `docs/asb/hammer-critical-stack-validation-audit.md` — full forensic audit spanning §0–§12.
- **Append** `.lovable/plan.md` — sealed audit entry referencing the new document.

No other files modified.

## Document Structure

The audit document will contain the following sealed sections, each grounded in the actual implementation surface from Waves 1–4 (`src/lib/hammer/identity.ts`, `src/lib/runtime/silence/*`, `src/lib/runtime/guidance/*`, `src/lib/runtime/handoff/*`, `src/lib/runtime/onboarding/*`, `src/lib/runtime/setback/*`, `src/lib/runtime/parent/*`, and their mount points in `Today.tsx`, `AthleteOnboarding.tsx`, `AcceptParentInvite.tsx`).

- **§0 Audit Scope** — C1–C7 across Athlete · Parent · Recovery · Onboarding · Setback · Navigation · Today · Silence · Identity · Trust · Authority · Safeguarding · Replay determinism · Demo↔prod isolation.
- **§1 Capability Verification (C1–C7)** — per capability: constitutional objective, implementation inventory (file paths), dependency satisfaction, verification evidence (test suite refs), remaining risk, readiness score (0–100), partial implementation, hidden assumptions, unresolved edge cases.
- **§2 Athlete Journey Validation** — 14 states (Discovery → Ongoing Usage). Per state: sees / understands / Hammer explains / Hammer does not explain / routes to / confusion vectors / improvement gaps.
- **§3 Parent Journey Validation** — 9 states mapped against the 7 `ParentStateKind` values. Same per-state matrix as §2.
- **§4 Silence Architecture Validation** — `classifySilenceZone`, guidance slots, handoff, onboarding, setback, parent voice. Lawful vs accidental silence, missingness, safeguarding, parent supremacy, RR-5 compliance, user-confusion states.
- **§5 Navigation Validation** — 7 lawful destinations: reachability, handoff quality, lineage traceability, authority limits, failure handling, dead ends, broken loops, circular routing, missing destinations.
- **§6 Trust Formation Audit** — Athlete · Parent · Recovery · Platform. Per axis: what creates trust, what destroys it, current readiness, remaining gaps, severity.
- **§7 Constitutional Compliance Audit** — RR-5, RR-6, RR-8, replay determinism, parent supremacy, safeguarding precedence, single Hammer authority, Organism State silence, demo↔prod firewall. Per item: evidence, risk level, residual concerns, pass/fail.
- **§8 Failure-State Stress Testing** — 25 scenarios (3-week athlete disappearance, late parent join, recovery interruption, missing data, no activity, broken onboarding, safety concern, conflicting signals, etc.). Per scenario: current vs expected behavior, risk, severity, required mitigation.
- **§9 Hidden Gap Search** — missing capabilities, hidden dependencies, undefined states, broken assumptions, UX blind spots, trust blind spots.
- **§10 Launch Readiness Scoring** — explicit criteria for Athlete Simplicity, Parent Simplicity, Navigation Clarity, Trust Formation, Recovery Safety, Guidance Quality, Constitutional Compliance, Overall Hammer Readiness.
- **§11 Final Verdict** — Hammer complete? Launch ready? What's missing / non-blocking / blocking? Can production launch proceed?
- **§12 Stop Gate** — audit-only confirmation; no implementation; no RR-7/9/10; no new capability creation.

## Method

Pure forensic review against existing source. Citations reference file paths and test suites already in the repo. No runtime checks, no edits.

## Stop Gate

Audit only. No code. No schema. No new capability. No RR-7/9/10. Two files touched.
