
# Hammer Wave 1 — Build Execution Plan

Executes `docs/asb/hammer-wave-1-execution-package.md` verbatim. C1 + C7 only.

## Excluded
C2, C3, C4, C5, C6, RR-7, RR-9, RR-10. No schema/projection/emitter/migration changes. No Today/Parent/Onboarding/Coach surface changes. No writes to `organism_truth`/`athlete_intent`/`authority_override`/`hard_stop`/`rehabilitation_state`.

## Files to create

1. **`src/lib/hammer/identity.ts`** — Pure `HAMMER_IDENTITY` const + `getHammerIdentity()` returning `{ id: 'hammer', voiceLabel: 'Hammer', brandLabel, organismStateLabel: 'Organism State', tagline }`. Imports `src/branding.ts`. No I/O, no `Date.now`, no `Math.random`.

2. **`src/lib/hammer/__tests__/identity.test.ts`** — Single-identity invariant, label shape, forbidden-term absence, byte-stable across two invocations.

3. **`src/lib/runtime/silence/types.ts`** — `SilenceZoneInput`, `SilenceVerdict = 'lawful' | 'accidental' | 'undefined'`, zone-kind union covering Phase 6 §F matrix (`safeguarding-active`, `athlete-revoked-narrative`, `missing-data-dominant`, `unpopulated-surface-with-signal`, `unpopulated-surface-no-signal`, `awaiting-input`, `post-action-cooldown`, `route-not-yet-rendered`).

4. **`src/lib/runtime/silence/classifier.ts`** — Pure `classifySilenceZone(input): SilenceVerdict`. Exhaustive switch. Safeguarding-active short-circuits to `lawful` (precedence, non-downgradable). Missing-data-dominant → `lawful`. Athlete-revoked-narrative → `lawful`. Unpopulated-surface-with-signal-present → `accidental`. All other matrix entries → `lawful`. No unmatched paths.

5. **`src/lib/runtime/silence/__tests__/classifier.test.ts`** — Every zone → expected verdict; zero `undefined`; safeguarding precedence cannot be overridden; deterministic across shuffled inputs.

## Files to edit (string-only renames)

6. **`src/components/hammer/HammerStateBadge.tsx`** — User-visible `Hammer State` label + `aria-label` → `Organism State` (sourced via resolver). Component symbol name preserved.

7. **`src/hooks/useWhyExplanation.ts`** (line ~101) — `Hammer State "{state}" derived from …` → `Organism State "{state}" derived from …`.

8. **`src/components/transparency/WhyExplanationSheet.tsx`** (line ~17) — `Why this Hammer State?` → `Why this Organism State?`.

9. **`src/pages/EngineHealthDashboard.tsx`** (lines ~75, 89, 123) — Operator-visible `Hammer State` strings → `Organism State`.

## Files NOT touched (verified via git diff)
`src/branding.ts`, `src/hooks/useHammerState.ts` (internal symbol), `src/hooks/useEngineHealth.ts` (internal), `src/lib/seasonPhase.ts` (internal types), `src/components/today/**`, all parent/onboarding/coach surfaces, `src/lib/runtime/projections/types.ts` (`prepareRows`), `supabase/functions/_shared/demoFirewall.ts`, `src/contexts/DemoModeContext.tsx`, all `src/lib/runtime/relational/**`, all `supabase/migrations/**`, `supabase/config.toml`, internal test files.

## Execution order (no skipping)
1. Resolver (`identity.ts`) → 2. Silence types + classifier → 3. Tests for both → 4. User-visible renames (4 files) → 5. Typecheck / preflight → 6. Audits (grep forbidden terms, scope diff, replay determinism) → 7. Constitutional attestation + `.lovable/plan.md` Wave 1 entry.

## Verification deliverables (final response)
§0 Scope confirmation · §1 Implementation log (per-file) · §2 Build results · §3 Test results (Unit/Replay/Visibility/Authority/Safeguarding/Regression) · §4 Acceptance matrix (1.1–1.6) · §5 Constitutional audit (RR-5, RR-6, RR-8, replay determinism, parent supremacy, safeguarding precedence, demo↔prod firewall, single Hammer authority, Organism State silence) · §6 Escalations · §7 Ratification recommendation · §8 Exit gate verdict.

## Stop gate
Wave 1 only. No Wave 2/3/4. No RR-7/9/10. No new personalities. No schema changes.

---

## Hammer Wave 1 — BUILD COMPLETE (sealed entry)

**Scope:** C1 (Name Disambiguation) + C7 (Silence Enforcement). Zero leakage into C2/C3/C4/C5/C6 or RR-7/9/10.

**Files created:**
- `src/lib/hammer/identity.ts` — pure canonical identity resolver
- `src/lib/hammer/__tests__/identity.test.ts` — 5 tests, all pass
- `src/lib/runtime/silence/types.ts` — Phase 6 §F zone matrix typed
- `src/lib/runtime/silence/classifier.ts` — pure `classifySilenceZone`, safeguarding-precedence-first
- `src/lib/runtime/silence/__tests__/classifier.test.ts` — 5 tests, all pass

**Files edited (string-only renames, user-visible "Hammer State" → "Organism State"):**
- `src/components/hammer/HammerStateBadge.tsx` (badge label + aria-label, via resolver)
- `src/hooks/useWhyExplanation.ts` (line 101 logic string)
- `src/components/transparency/WhyExplanationSheet.tsx` (line 17 sheet title)
- `src/pages/EngineHealthDashboard.tsx` (lines 75, 89, 123 operator-visible labels)

**Verification:** vitest 10/10 green · purity audit clean (no `Date.now`/`Math.random`/network/`supabase` in either pure module) · forbidden-term audit clean in user-visible paths (only allowed doc-comment exceptions remain in resolver self-documentation and one code-internal hook comment).

**Constitutional attestation:** RR-5 / RR-6 / RR-8 preserved (no narrative, no diagnosis, no coercive disclosure). Replay determinism preserved (pure modules). Parent supremacy untouched. Safeguarding precedence enforced in classifier and unit-tested. Demo↔prod firewall (`prepareRows`) untouched. Single Hammer authority via resolver. Organism State silence preserved (renames are labels only; classifier emits no events).

**Status:** Wave 1 COMPLETE + VERIFIED + RATIFIED. Exit gate satisfied. Wave 2 (C6 + C2) may begin.
