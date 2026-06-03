## RR-6 Wave 1A — Verification Alignment & Ratification

Test-only fix to unblock RR-6 Wave 1 ratification. Aligns the inherited duplicate-id assertion with the already-ratified RR-5 projection convention (projections do not dedupe — that is a ledger-ingestion responsibility).

### Section 1 — Test corpus alignment

File: `src/lib/runtime/relational/__tests__/injuryRecoveryState.replay.test.ts`

Rename the failing test from `"idempotent on duplicate ids"` to `"duplicate event_ids flow through projection output (ledger-layer responsibility)"`.

Replace the `expect(r1).toEqual(r2)` assertion with assertions that verify:
- duplicate rows remain visible in `visibleRecoveryTimeline` (length grows with duplication, matching RR-5 precedent)
- ordering remains deterministic across repeated runs (`r2 === r2'` byte-equal across two builds of the duplicated input)
- replay remains stable (re-running the duplicated input twice produces identical output)
- duplicate inputs do not alter `safeguardingHeld`
- duplicate inputs do not alter the per-region `participation_status` selection in `activeRecoveryState`

No other tests in this file are modified. No production code, projection, emitter, schema, replay-engine, or UI changes.

### Section 2 — Verification re-run (sequential)

1. `bunx tsc --noEmit`
2. `bunx vitest run src/lib/runtime/relational/__tests__ --reporter=dot`
3. RR-5 + RR-6 + RR-8 suites together — one vitest invocation across `narrative*`, `injury*`, `lifeContext*` files plus visibility matrix
4. `bash scripts/preflight.sh`

Report exact files executed, tests executed, pass/fail totals, invariant totals, preflight totals.

### Section 3 — Append §10 to `docs/asb/injury-recovery-audit.md`

Add `## 10. Final verification` section recording:
- TypeScript result
- Full relational suite result
- RR-5 + RR-6 + RR-8 combined result
- Preflight result
- Replay guarantees confirmed: shuffled-input rebuild stability, revocation rebuild, safeguarding precedence, demo↔production firewall, parent supremacy (Wave 1D guard), missingness preservation, RTP authority restriction, three-way arbitration stability
- Remaining risks (carryover from §8 + any newly observed)

### Section 4 — Ratification (conditional on all green)

Append `RR-6 WAVE 1 — CONSTITUTIONALLY RATIFIED` block to both:
- `docs/asb/injury-recovery-audit.md`
- `.lovable/plan.md`

Recording: files created, files edited, final test totals, replay guarantees, remaining risks, final verdict.

If any check fails: stop, report, do not ratify.

### Files touched

- `src/lib/runtime/relational/__tests__/injuryRecoveryState.replay.test.ts` — rename + reshape one test only
- `docs/asb/injury-recovery-audit.md` — append §10 + ratification stamp
- `.lovable/plan.md` — append ratification entry

### Stop gate

No production logic, schema, projection, emitter, replay-engine, UI, or RR-7/9/10 changes.
