## Hammer Activation Phase 8 — Execution Constitution

Final governance artifact before Wave 1 build execution. Locks scope, dependency order, invariants, and verification gates so implementation cannot drift from Phases 1–7.

### Deliverables

1. **Create** `docs/asb/hammer-execution-constitution.md`
2. **Append** Phase 8 entry to `.lovable/plan.md`

### Document outline (`hammer-execution-constitution.md`)

- **§0 Objective** — define "what must never happen while building Waves 1–4"; governance not capability.
- **§1 Immutable Scope Lock** — enumerate only C1, C7 (W1); C6, C2 (W2); C3, C5 (W3); C4 (W4). Explicitly forbid additions, hidden workstreams, or partial RR-7/9/10 work.
- **§2 Dependency Lock** — strict W1 → W2 → W3 → W4, with per-wave dependency rationale traced to Phase 6 audit (e.g., W2 requires C7 silence law before C2 can lawfully speak).
- **§3 Constitutional Invariant Preservation** — table-form, per invariant: RR-5 (no invented feelings, no fictional continuity), RR-6 (no diagnosis, RTP gated), RR-8 (no coercive disclosure), replay determinism, parent supremacy for minors, safeguarding precedence, demo↔prod firewall (`prepareRows`), single Hammer authority (C1), Organism State silence (C7). Each row: violation vector + required verification.
- **§4 Wave Completion Gates** — per wave: required verification artifacts, audit checklist, measurable acceptance criteria (carried from Phase 7 §4), constitutional review sign-off. Subjective "feels done" forbidden.
- **§5 Anti-Drift Controls** — forbid: new Hammer personalities, parallel memory systems, alternative authority surfaces, arbitration bypass, safeguarding bypass, visibility-matrix bypass. Any deviation → explicit constitutional review event.
- **§6 Verification Requirements** — per wave: TypeScript clean, replay determinism check, constitutional audit, acceptance criteria pass, preflight pass. All five required to advance.
- **§7 Failure Escalation Rules** — Stop conditions (dependency fail, invariant fail, replay drift, safeguarding weakening). Escalation path: halt wave → write findings doc → constitutional review → remediation plan → re-verification before resume.
- **§8 Launch Readiness Gate** — launch permitted only on W1–W4 complete + all verification passed + zero open escalations.
- **§9 Post-Launch Boundary** — RR-7/RR-9/RR-10 remain sealed-only per `post-mastery-expansion-roadmap.md`; no implementation leakage during W1–W4.
- **§10 Final Verdict** — single sentence: governance complete, execution may begin at Wave 1.
- **§11 Stop Gate Confirmation** — no code, UI, prompts, schemas, projections, emitters, or RR-7/9/10 activation under this phase.

### Stop gate

Single governance doc + plan log entry. Zero production changes. Next step after approval: begin Wave 1 build (C1 + C7) under this constitution.
