# Hammer Wave 3 — Build Implementation Plan

Implements C3 (Onboarding Presence) + C5 (First Setback Guidance) per `docs/asb/hammer-wave-3-execution-package.md`. Wave 1 + Wave 2 primitives consumed only.

## Files to Create

1. **`src/lib/runtime/onboarding/types.ts`** — `OnboardingStateKind` union (7 states), `OnboardingInput`, `OnboardingDescriptor`, `OnboardingResult`.
2. **`src/lib/runtime/onboarding/resolver.ts`** — pure `resolveOnboardingPresence(input)`. Composes `getHammerIdentity`, `classifySilenceZone`, `resolveGuidanceSlots`, `resolveHandoff`. Per-state silence-zone mapping; no copy, no I/O, no `Date.now`/`Math.random`.
3. **`src/lib/runtime/onboarding/tests/resolver.test.ts`** — 7-state coverage, lawful silence, identity reuse, safeguarding precedence, replay byte-equivalence.
4. **`src/lib/runtime/setback/types.ts`** — `SetbackStateKind` union (6 states), `SetbackInput`, `SetbackDescriptor`, `SetbackResult` with explicit `missingnessVisible` + `knownSignals` / `unknownSignals` arrays.
5. **`src/lib/runtime/setback/resolver.ts`** — pure `resolveSetbackGuidance(input)`. Emits only factual missingness + lawful handoff candidate. No invented reasons, emotions, predictions, narrative, diagnosis.
6. **`src/lib/runtime/setback/tests/resolver.test.ts`** — 6-state coverage, missingness visibility, safeguarding precedence, replay determinism, forbidden-token grep on output.
7. **`src/components/onboarding/HammerOnboardingPresence.tsx`** — thin renderer of resolver output; labels via `getHammerIdentity()`; renders nothing on lawful verdicts.
8. **`src/components/runtime/HammerSetbackGuidance.tsx`** — thin renderer of resolver output; surfaces missingness; renders nothing on lawful verdicts or when safeguarding active.

## Files to Edit

- **`src/pages/Onboarding.tsx`** — mount `HammerOnboardingPresence` additively (preserve existing onboarding flow).
- **`src/pages/Today.tsx`** — mount `HammerSetbackGuidance` next to `TodayGuidanceSlots` (no removal).
- **`.lovable/plan.md`** — append sealed Wave 3 build entry.

## State Mapping (§3)

| State | Silence-zone input | Slot behavior |
|---|---|---|
| first-login | `awaiting-input` | entry lawful-silent; next → identity intro via handoff |
| first-completed-action | `unpopulated-surface-with-signal` | context refs the action event |
| first-prescription | `unpopulated-surface-with-signal` | context refs Rx event id |
| first-week | `unpopulated-surface-with-signal` | context refs aggregate refs |
| incomplete-onboarding | `awaiting-input` | next → resume onboarding handoff |
| partial-profile | `awaiting-input` | next → profile handoff |
| no-activity | `unpopulated-surface-no-signal` | all lawful-silent |
| missed-day | `unpopulated-surface-with-signal` | missingness visible, no reason |
| missed-week | `unpopulated-surface-with-signal` | missingness visible, no reason |
| interrupted-prescription | `unpopulated-surface-with-signal` | factual + next handoff |
| incomplete-logging | `unpopulated-surface-with-signal` | missingness only |
| recovery-interruption | `missing-data-dominant` | lawful-silent (RR-6) |
| unavailable-signal | `unpopulated-surface-no-signal` | lawful-silent |

`safeguardingActive=true` short-circuits all → lawful silence.

## Intentionally Untouched (§4)

`src/lib/hammer/identity.ts`, `src/lib/runtime/silence/**`, `src/lib/runtime/handoff/**`, `src/lib/runtime/guidance/**`, `src/branding.ts`, `prepareRows`, `demoFirewall.ts`, `DemoModeContext.tsx`, `relational/**`, `supabase/migrations/**`, `supabase/config.toml`, all parent/recruiter/commercial/RR-7/9/10 paths.

## Verification (§5)

Run Wave 1 + Wave 2 + new onboarding + new setback Vitest suites. Audits: replay determinism (byte-identical), safeguarding precedence, identity reuse (zero raw "Hammer State" / "Hammer" literals in new files outside identity import), forbidden-token grep (`diagnose|prescribe|authorize|cleared|predict|guarantee|will recover`), missingness visibility, authority audit (no writes to `organism_truth|athlete_intent|authority_override|hard_stop|rehabilitation_state`).

## Output (§6)

Wave 3 Build Execution Report: Scope · Implementation Log · Build · Verification · Acceptance Matrix · Constitutional Audit · Escalations · Ratification · Exit Gate · Stop Gate.

## Stop Gate (§7)

Wave 3 only. No Wave 4. No RR-7/9/10. No capability additions. No scope expansion.
