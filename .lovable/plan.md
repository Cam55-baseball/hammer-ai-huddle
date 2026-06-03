## RR-6 Wave 1 — Verification & Constitutional Ratification

Verification-only pass. No feature expansion, no schema/projection/emitter edits.

### Section 1 — Verification execution (sequential)

1. `bunx tsc --noEmit`
2. Full relational suite: `bunx vitest run src/lib/runtime/relational/__tests__ --reporter=dot`
3. RR-5 + RR-6 + RR-8 suites together (narrative*, injury*, lifeContext* test files) in one vitest invocation
4. `bash scripts/preflight.sh`

Report exact totals: files executed, tests executed, pass/fail, failing names.

### Section 2 — Replay verification

Confirm in test output:
- shuffled-input rebuild stability
- duplicate-id idempotency
- revocation rebuild
- safeguarding precedence (parent reroute + chip suppression)
- demo↔production firewall (bidirectional)
- parent supremacy (Wave 1D guard)
- missingness preservation
- three-way arbitration stability (RR-5 / RR-8 / RR-6 single chip per turn)

If any assertion fails: stop, identify invariant + file, propose minimal fix surface, do NOT implement without authorization.

### Section 3 — Audit verification

Review `docs/asb/injury-recovery-audit.md` against:
anti-diagnosis, anti-prescription, RTP authority restriction, safeguarding precedence, replay determinism, visibility isolation, manipulation review, emotional safety.

Append `## 10. Final verification` section recording test counts + replay guarantees observed.

### Section 4 — Ratification

If all checks pass, append `RR-6 WAVE 1 — CONSTITUTIONALLY RATIFIED` to:
- `docs/asb/injury-recovery-audit.md`
- `.lovable/plan.md`

Include files created, files edited, test totals, replay guarantees, remaining risks, final verdict.

If any failure occurs: stop, report, do not ratify.

### Files touched (verification-only)

- `docs/asb/injury-recovery-audit.md` — append §10 + ratification stamp
- `.lovable/plan.md` — append ratification entry

No code, schema, projection, emitter, or UI edits unless required to fix a failing invariant (in which case: stop and report first).
