
# RR-8 Wave 1D — Constitutional Gap Closure

Scope-locked: parent-scope visibility guard, SHA-256 preflight invariant, audit addendum, final green verification. No RR-6/7/9/10, no new primitives, no schema or replay-engine changes.

## 1. Parent visibility guard (production)

**File:** `src/lib/runtime/projections/types.ts` — `prepareRows`

Add exactly one additive line immediately after the existing self-scope restriction:

```ts
if (vis === "self" && scope !== "self") continue;
if (vis === "parent" && scope !== "parent") continue;   // ← new
```

No other edits. Demo↔production firewall, sort, prefix filter, memoization untouched.

Constitutional basis: RR-4 + RR-8 parent-only visibility, Phase 152 minor-athlete supremacy.

## 2. Visibility re-verification

Run:
- `src/lib/runtime/relational/__tests__/life-context-visibility.test.ts`
- `src/lib/runtime/relational/__tests__/relational-visibility.matrix.test.ts`
- RR-5 narrative + RR-8 life-context replay suites

Expected:
- coach/self/org/external cannot read `parent`-scoped rows
- parent retains lawful visibility
- safeguarding precedence unchanged
- demo firewall unchanged
- replay determinism unchanged (no projection logic touched, only filter)

Note: the matrix test currently treats payload `parent` as visible to coach/org/external/self. Those expectations must be updated to match the new (and constitutionally correct) truth table: payload `parent` is visible **only** to reader `parent`. This is a test-fixture correction, not a logic relaxation. `docs/asb/relational-visibility-matrix.md` truth table row for "parent" payload column will be updated to reflect the same.

## 3. SHA-256 preflight invariant

**Root cause** (verified via `scripts/check-invariants.sh`):

```
[invariants] 2) event-identity sha256 composition only in engineVersion.ts + sensorIdempotency.ts
src/components/relational/HammerConversationPanel.tsx:198
```

`hashUtterance` uses `crypto.subtle.digest("SHA-256", …)` to derive `utterance_ref`. The invariant reserves SHA-256 composition for canonical event-identity authors (`engineVersion.ts`, `sensorIdempotency.ts`). `utterance_ref` is a content fingerprint, not an event-identity hash — it does not need cryptographic properties.

**Minimal fix:** replace `hashUtterance` with a synchronous non-crypto fingerprint (FNV-1a → 16-hex-char string). Same shape (`string`), same determinism (pure function of input), same replay behavior, no copy or behavioral change. Removes SHA-256 usage from the file entirely; canonical identity authors remain the sole SHA-256 sites.

```ts
function hashUtterance(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + (s.length >>> 0).toString(16).padStart(8, "0");
}
```

Call sites updated to drop `await` (function becomes sync). No other behavioral change.

Constitutional safety: deterministic, replay-stable, no collision-resistance requirement at this site (utterance_ref is interpretive lineage, not identity), no new primitive, no schema change.

## 4. Audit addendum

Append to `docs/asb/rr-8-organism-coherence-audit.md`:

- **§12 Parent Visibility Closure** — one-line additive guard in `prepareRows`; matrix test + doc truth table updated; coach/self/org/external isolation proven; parent lawful visibility preserved; demo firewall and safeguarding precedence unchanged.
- **§13 Preflight Integrity Restoration** — SHA-256 invariant root cause (utterance_ref using crypto.subtle outside canonical identity authors); resolution via FNV-1a fingerprint (deterministic, replay-stable, sync); preflight clean.

## 5. Final verification

Sequential:
1. `bunx tsc --noEmit`
2. full relational vitest suite
3. RR-5 + RR-8 suites together
4. `bash scripts/preflight.sh`

Deliverables in final response: files changed, exact production lines changed (2 files, ~1 line in `types.ts`, hash helper swap in `HammerConversationPanel.tsx`), pass/fail totals, replay-behavior delta (expected: none), remaining risks, final RR-8 verdict.

## Stop gate

No RR-6/7/9/10. No recruiter/injury/exposure/career-arc/commercial. No new primitives. No replay-engine rewrites. No schema changes.
