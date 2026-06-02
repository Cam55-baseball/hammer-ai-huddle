# RR-8 Wave 1C — Determinism Stabilization

## Root cause (confirmed via code read)

`memoize` in `src/lib/runtime/projections/types.ts` keys on `${scope}::${lastEventId}` with a `sourceCount` tiebreak. Cache lives in module-scope closure, so it persists across `it` blocks within a single test file (and across files importing the same builder).

Tests that reuse short event IDs (`"01"`, `"02"`, `n1`…`n4`) within the same projection-call sequence land on a previously-cached `(scope, lastEventId, sourceCount)` triple and receive **stale state**, masquerading as a replay-determinism failure.

Concrete collisions:
- `lifeContextState.replay.test.ts` — uses bare IDs `"01"`/`"02"` across multiple `it` blocks; revocation test collides with the determinism test (`self::02`, count 2).
- `narrativeState.replay.test.ts` — `bad1` case and `dup` case both terminate at `n4` with `sourceCount=5`.

Production projection logic is **not** the defect. The memoize contract is "same key + same count ⇒ same state under identical inputs"; tests violate that by reusing IDs across distinct logical event sets.

## Fix strategy — additive, test-only

Namespace every test's event_id, athlete_id, relationship_id, lineage refs, topic_tag, and `occurred_at` anchor so that no two `it`-block scenarios across RR-5 + RR-8 suites ever share a `(scope, lastEventId, sourceCount)` triple.

No production code changes. No memoize/cache-key changes. No projection edits. No schema edits.

### Section 1 — Test fixture namespacing

Edit only:

1. `src/lib/runtime/relational/__tests__/lifeContextState.replay.test.ts`
   - Per-test prefixes: `lc_det_*`, `lc_miss_*`, `lc_rev_*`, `lc_safe_*`, `lc_demo_*`, `lc_curr_*`.
   - Stagger `occurred_at` per test into disjoint date bands (e.g. `2026-03-01…`, `2026-03-05…`, `2026-03-10…`).
   - Update `revokes_event_id` references accordingly.

2. `src/lib/runtime/relational/__tests__/narrativeState.replay.test.ts`
   - Replace shared `ROWS` constant with a `makeRows(prefix)` builder; each `it` uses its own prefix: `narr_det_`, `narr_shuffle_`, `narr_cite_`, `narr_rev_`, `narr_miss_`, `narr_rank_`, `narr_dup_`, `narr_unres_`, `narr_demo_`.
   - Update internal cross-references (`recalled_event_ids`, `revokes_event_id`, lineage refs) to use the same prefix.
   - Stagger `occurred_at` per test into disjoint date bands within `2026-04-*`.

3. `src/lib/runtime/relational/__tests__/life-context-visibility.test.ts`
   - Already namespaced (`lcv*` + `2026-02-*`). Audit only; no edits expected unless a new collision surfaces.

4. `src/lib/runtime/relational/__tests__/narrative-reference.test.ts`
   - Pure validator tests, no projection calls. Audit only; no edits expected.

5. Shared fixtures (`_fixtures.ts`, `_seed.ts`)
   - **Not edited.** Builders remain generic; only call sites pass namespaced IDs.

Rule applied uniformly: every event_id starts with a suite + test prefix; every `occurred_at` is unique across the whole RR-5/RR-8 corpus; no two tests share the same trailing event_id.

### Section 2 — Replay determinism re-verification

After fixture isolation, the existing assertions already cover:
- shuffled-input rebuild stability (`narrativeState.replay.test.ts` test 2)
- duplicate idempotency (`narrativeState.replay.test.ts` test 7)
- revocation rebuild behaviour (both replay suites + visibility matrix)
- safeguarding precedence (life-context visibility test 5, narrative reference test)
- demo↔production firewall (both replay suites + visibility tests 2/3)
- arbitration stability (`arbitrateMemoryCallback` covered indirectly via `HammerConversationPanel`; pure helper, no projection cache)
- missingness preservation (`narrativeState` test 5, `lifeContextState` test 2)

No new assertions are added unless re-running surfaces a real invariant gap (escalation rule below).

### Section 3 — Preflight

Run `bash scripts/preflight.sh`. Fix only presentation-safe issues if any. No architectural or replay-engine modifications.

### Section 4 — Audit addendum

Append section **"11. Replay Isolation Verification"** to `docs/asb/rr-8-organism-coherence-audit.md`:

- Root cause: memoize closure cache + short shared IDs across `it` blocks; not a projection bug.
- Why production untouched: memoize contract (`same (scope, lastEventId, sourceCount) ⇒ same state under identical inputs`) is constitutionally correct; weakening it would (a) expand cache-key surface, (b) risk hiding real ledger-equivalence drift, (c) violate the additive-only / no-replay-engine-rewrite stop gate.
- Why namespacing is constitutionally safer: tests now mirror real ledger discipline (globally unique event_ids); replay equivalence is exercised against disjoint event corpora rather than fortuitously-overlapping ones.
- Proof of determinism: enumerated re-run results.
- Remaining operational risk: future test authors must continue to namespace IDs; mitigated by the additive convention documented in the addendum.

### Section 5 — Final verification

Sequentially:
1. `bunx tsc --noEmit`
2. Full relational vitest suite
3. RR-5 + RR-8 suites together (single vitest invocation)
4. `bash scripts/preflight.sh`

Return: exact files changed, exact tests modified, exact pass/fail totals, confirmation that no production logic changed, remaining risks, final RR-8 Wave 1 verdict.

## Escalation rule

Only if fixture namespacing fails to resolve the collisions: stop, report exact failing suites, exact cache-key collision evidence, and the minimal required production fix surface. Do not independently harden `memoize` without explicit authorization.

## Stop gate (held)

No RR-6/7/9/10 work. No recruiter, injury, exposure, career-arc, or commercial activation. No schema rewrites, no new primitives, no replay-engine rewrites.

## Files touched (expected)

- edit `src/lib/runtime/relational/__tests__/lifeContextState.replay.test.ts`
- edit `src/lib/runtime/relational/__tests__/narrativeState.replay.test.ts`
- edit `docs/asb/rr-8-organism-coherence-audit.md` (append addendum)
- (audit-only, likely no edit) `life-context-visibility.test.ts`, `narrative-reference.test.ts`, `_fixtures.ts`, `_seed.ts`
