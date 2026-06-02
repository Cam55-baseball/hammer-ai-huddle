# RR-8 Wave 1B — Organism Coherence Audit

**Status:** Wave 1B completion pass. Strict additive scope. RR-6, RR-7, RR-9,
RR-10 remain doctrine-only.

## 1. Onboarding emotional safety review

- Step is presented as a "Quick check-in" with a calm, non-clinical prompt:
  "Is anything heavy outside of training right now?".
- Helper text states "No score. Nothing shared with anyone else." — no
  surveillance framing, no inferred wellbeing claim.
- No free-text required. Six fixed selectable options including
  "Nothing heavy right now" plus an explicit `Skip` action.
- No progression gating: skipping advances onboarding identically to
  selecting an option. "Nothing heavy" and Skip emit no relational event.
- No emotional scoring. No predictive language. No identity labelling.
- Mobile-first: chip group uses `flex-wrap` with `min-h-11` targets at
  390 × 782 and 440 × 782 — single primary CTA + ghost Skip.

## 2. Disclosure coercion audit

- No feature is gated behind disclosure.
- No nudge, no prompt repetition, no engagement loop.
- No copy implies disclosure is required for safety or recommendation
  quality. The step is presented as optional and skippable.
- Emission path runs through canonical `emitLifeContextDisclosure` with
  `actorRole: "athlete"`, `authority: "self"`, `visibility_scope: "self"`.
  Coach/recruiter scopes can never be authored from onboarding.

## 3. Replay determinism confirmation

- All emission goes through `emitAsbEvent` with deterministic
  `idempotency_key` (per `computeIdempotencyKey`). No parallel storage.
- `lifeContextState` projection is pure, memoized, no `Date.now`, no
  `Math.random`. Inputs at pinned `engine_version` + `reasoning_version`
  produce byte-identical outputs (covered by
  `lifeContextState.replay.test.ts`).
- Arbitration helper `arbitrateMemoryCallback` is pure — uses only
  `occurred_at` lexical comparison and topic/category/kind tiebreaks. No
  clocks. Replay-equivalent across rebuilds.

## 4. Visibility isolation confirmation

`src/lib/runtime/relational/__tests__/life-context-visibility.test.ts`
exercises eight invariants:

| # | Invariant | Result |
|---|-----------|--------|
| 1 | self sees self-authored rows | ✓ |
| 2 | demo never sees self rows | ✓ |
| 3 | self never sees demo rows (bidirectional firewall) | ✓ |
| 4 | recruiter-equivalent (`external`) sees no self rows | ✓ |
| 5 | safeguarding-routed rows hidden from coach, visible to parent | ✓ |
| 6 | revocation removes downstream visibility on next rebuild | ✓ |
| 7 | paused/revoked coach-scoped disclosure downgrades on rebuild | ✓ |
| 8 | parent supremacy preserved; self stays self-only | ✓ |

Recruiter visibility is documented as contractually starved — recruiter
surfaces must not subscribe to `relational.life_context.*` (RR-10).

## 5. Memory arbitration proof

- `arbitrateMemoryCallback` in `hammerMemory.ts` enforces single-callback
  per assistant turn between RR-5 narrative resurfacing and RR-8 life-
  context acknowledgement.
- Rules: safeguarding lockdown → none. Newest `occurred_at` wins. Ties
  broken by lexical comparison of `topic_tag ?? category ?? kind`.
  Final deterministic tiebreak: narrative wins (stable across replays).
- `HammerConversationPanel.tsx` collapsed: only one of the two chips
  renders. Both-rendering is no longer reachable.

## 6. Safeguarding precedence verification

- Onboarding emission passes `safeguardingLockdown: false` explicitly.
  Future safeguarding lockdown integrations route through the existing
  emitter gate (`visibility_scope` rerouted to `parent`,
  `safeguarding_category` forced true).
- Arbitration helper suppresses both narrative and life-context chips
  when `safeguardingHeld` is true (covered through projection state).
- Visibility matrix test asserts coach scope never sees safeguarding-
  routed rows.

## 7. Missingness preservation proof

- `lifeContextState.missingness.categoriesWithoutDisclosure` reports
  unfilled categories (covered by `lifeContextState.replay.test.ts`).
- Onboarding emission carries explicit `missingness: { fields: [], reason: "not_observed" }`.
- No imputation, no defaulting. Skip emits nothing — absence remains
  first-class state.

## 8. Mobile walkthrough findings

- **390 × 782**: chip group wraps to two rows for six chips; primary CTA
  + ghost Skip share a single row with `flex-1` on the primary. No
  horizontal scroll. Helper text remains one line at 12pt.
- **440 × 782**: chips fit in two rows comfortably; spacing preserved
  via `gap-2` and `space-y-4`. Card padding unchanged (`p-4`).

## 9. Remaining risks

- `isMinor` defaults to `false` at the onboarding emit boundary because
  developmental projection may not yet be populated. Coach-scoped
  disclosures from onboarding remain forbidden by `visibility_scope:
  "self"`, so the minor-parent gate is not bypassable. Future hardening:
  resolve `isMinor` from developmental state once it has rebuilt at
  least once.
- Recruiter scope (`Scope` union has no `recruiter` value) is currently
  approximated by `external`. RR-10 implementation must introduce
  recruiter scope explicitly; until then, recruiter surfaces remain
  contractually starved by topic-prefix subscription discipline.

## 10. Final verdict

RR-8 Wave 1B closes the deferred onboarding and visibility-matrix items
without expanding scope. Arbitration prevents RR-5/RR-8 dual-speaking.
Replay determinism, safeguarding precedence, and missingness preservation
are confirmed by tests. Stop gate held: no RR-6/7/9/10 code, no recruiter
workflows, no exposure systems, no injury systems, no career-arc systems,
no new primitives, no schema rewrites, no new event families, no
commercial activation.

## 11. Replay Isolation Verification (Wave 1C)

### Root cause

`memoize` in `src/lib/runtime/projections/types.ts` keys its cache on
`${scope}::${lastEventId}` with `sourceCount` as the equality tiebreak. The
cache lives in module-scope closure and is therefore shared across every
`it` block that imports the same projection builder (within a file and,
during a single vitest invocation, across files).

Two RR-5/RR-8 replay suites previously reused short event IDs (`"01"`,
`"02"`, `n1`…`n4`) across distinct logical scenarios. When a later test
produced the same `(scope, lastEventId, sourceCount)` triple as a prior
test, the prior `state` was returned verbatim, masquerading as either a
replay failure (Wave 1B symptom) or a false pass (parent-scope visibility,
see §11.5 below).

### Why production was not modified

The memoize contract is constitutionally sound: *under identical pinned
ledger inputs at identical (engine_version, reasoning_version), a
projection must return byte-identical state.* Weakening the cache key
would (a) expand the cache surface unnecessarily, (b) risk hiding real
replay-equivalence drift, and (c) violate the additive-only / no-replay-
engine-rewrite stop gate (per Megaphase 63–67 C4, Phase 56 RE-1…RE-10).

### Why fixture namespacing is constitutionally safer

Real ledger discipline already requires globally unique event IDs. Test
fixtures now mirror that discipline: every event_id starts with a
suite + test prefix; every `occurred_at` is unique across the RR-5/RR-8
corpus. Replay equivalence is exercised against disjoint event corpora
rather than fortuitously-overlapping ones. The fix is additive and
test-only.

### Proof of determinism (post-namespacing)

- `bunx tsc --noEmit` — clean.
- `lifeContextState.replay.test.ts` (6 tests) — pass in isolation and
  alongside `narrativeState.replay.test.ts` (9 tests).
- `narrativeState.replay.test.ts` — pass in isolation and in combined
  RR-5/RR-8 run.
- `life-context-visibility.test.ts` — 7 of 8 pass; one new failure
  exposed (see §11.5).
- Full relational suite (`src/lib/runtime/relational/__tests__/`) —
  149 / 150 pass; the single remaining failure is the gap below, not a
  determinism failure.

### 11.5 New finding — parent-scope visibility gap (escalation)

With the cache pollution removed, life-context-visibility matrix test 5
("safeguarding-only rows excluded from coach scope") now fails. The prior
Wave 1B "pass" was a false positive: the assertion previously returned
the cached `safeguardingHeld: false` state from an earlier `it` block.

Real behaviour: `prepareRows` in `src/lib/runtime/projections/types.ts`
filters `vis === "self"` rows from non-self scopes and enforces the
bidirectional demo firewall, but **does not** filter `vis === "parent"`
rows from non-parent scopes. Coach therefore reads parent-only
safeguarding rows — a direct conflict with the minor-athlete supremacy
doctrine (Phase 152) and with the documented expectation in §4 of this
audit.

Minimal production fix surface (one line, additive, no schema change,
no replay-engine change):

```ts
// src/lib/runtime/projections/types.ts, after the existing self-scope filter:
if (vis === "parent" && scope !== "parent") continue;
```

This change is constitutionally indicated but is **out of scope for
Wave 1C** under the explicit "no production code changes / no projection
logic edits / stop and report" escalation rule. Authorization required
before merging.

### Remaining operational risks

- Future test authors must continue to namespace event IDs; this
  convention is now documented in the two replay test file headers.
- The parent-scope visibility gap remains live until §11.5 is authorized.
  Recruiter / coach surfaces currently must rely on topic-prefix
  subscription discipline (and do not subscribe to
  `relational.life_context.*`) to avoid leakage in practice.

### Final Wave 1C verdict

Replay determinism is restored across the RR-5 + RR-8 corpus via test
fixture namespacing alone — zero production projection logic changed.
Wave 1C uncovered one previously-masked constitutional gap (parent-scope
visibility) and reports it without acting on it, per the stop gate.
