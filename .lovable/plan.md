# Phase 10.6 — Verification Matrix + Production Readiness Pass

**Final pre-publish gate.** No new features, no architecture changes, no UI redesign. This phase proves the existing system is correct and locks production readiness.

---

## Audit findings (already in place ✅)

From a read-only sweep of the current code:

- **Single source of truth** — `useDailyOutcome.ts` carries the SINGLE SOURCE OF TRUTH header comment and a 300 ms commit debounce (race-condition guard).
- **Only NN counter** — `src/lib/nnProgress.ts` carries the ONLY-NN-COUNTER lock. The two other places that reference `is_non_negotiable` (`useNNSuggestions.ts`, `useQuickActionExecutor.ts`) **filter/identify** NN templates for suggestions and quick actions — they do not produce the daily verdict count, so they don't violate the lock.
- **Evaluator invariant** — `supabase/functions/evaluate-behavioral-state/index.ts` lines 6–13 explicitly forbid outcome derivation/writes.
- **Smart scroll guard** — `userScrolledRef` in `GamePlanCard.tsx` (line 1003) cancels auto-scroll if the user scrolls first.
- **Pulse single-fire** — `pulsedRef` (line 1037) latches per `__dayType`, preventing re-pulse on re-render or navigation.
- **Night check-in authority** — `VaultFocusQuizDialog.tsx` lines 274 & 470 bypass submission when an entry already exists for today.
- **Dev logs gated** — `[HM-OUTCOME]` and `[HM-NN]` are wrapped in `import.meta.env.DEV`. **Two `[HM-NIGHT]` logs in `VaultFocusQuizDialog.tsx` (lines 274, 470, 476) are NOT gated** — they will fire in production. Needs a one-line fix.

---

## Part 1 — Tiny Code Cleanup (1 file)

**`src/components/vault/VaultFocusQuizDialog.tsx`** — wrap the three `[HM-NIGHT]` `console.log` calls (lines 274, 470, 476) in `if (import.meta.env.DEV)` so they are stripped from production builds.

No other code changes. Everything else already passes audit.

---

## Part 2 — Live Verification Matrix (manual interactive QA)

Use the live preview to walk through every scenario. I'll drive this with browser automation if you want, or you can run through the matrix yourself. For each row I'll capture screenshots + console traces.

| # | Scenario | Setup | Expected |
|---|----------|-------|----------|
| 1 | **STANDARD MET** | Complete all NNs | GamePlan header → emerald `STANDARD MET` <1s; pulse + toast fire exactly once; ProgressDashboard banner matches; NightCheckInSuccess shows same verdict |
| 2 | **STANDARD NOT MET** | Leave ≥1 NN incomplete | Header stays red `STANDARD NOT MET`; remaining count accurate; auto-scroll fires once on mount only |
| 3 | **RECOVERY DAY** | DayControl → Rest | Status `RECOVERY DAY` everywhere; no remaining-actions text; pulse cannot fire |
| 4 | **SKIP REGISTERED** | DayControl → Skip | Status `SKIP REGISTERED` everywhere; streakImpact = `broken`; NN count irrelevant |
| 5 | **ZERO NN — activity logged** | Remove all NNs, log 1 activity | `STANDARD MET` via `anyActivityLogged` fallback; no remaining-actions text |
| 6 | **ZERO NN — nothing logged** | Remove all NNs, log nothing | `STANDARD NOT MET` |
| 7 | **Realtime consistency** | Complete final NN | No flicker NOT MET → MET → NOT MET (300 ms debounce); all surfaces sync |

## Part 3 — Night Check-In Authority

1. Open night check-in → submit → close.
2. Reopen → form is skipped, success screen renders immediately, no second submission, no duplicate animations.

## Part 4 — Scroll Behavior

- Load Game Plan with incomplete NNs from cold mount → auto-scroll to `#nn-section` fires once.
- Reload + manually scroll before mount settles → auto-scroll suppressed (verified by `userScrolledRef`).

## Part 5 — Pulse Integrity

- Complete final NN → pulse + toast fire exactly once.
- Navigate away and back → no re-trigger.
- Re-render via state change → no re-trigger (`pulsedRef` latch + `__dayType` reset).

## Part 6 — Performance Sanity

- React DevTools profiler: confirm `useDailyOutcome` consumers don't re-render more than once per state change.
- Confirm only ONE `daily-outcome-${user.id}` channel is created (cleanup on unmount).
- Confirm only ONE `day-state-${user.id}` channel.

## Part 7 — Dev Log Sweep (post-cleanup)

After Part 1 fix: `rg "HM-OUTCOME|HM-NN|HM-NIGHT"` should show every `console.log` wrapped in `import.meta.env.DEV`.

## Part 8 — Invariant Comment Confirmation

Already verified ✅:
- `useDailyOutcome.ts` → SINGLE SOURCE OF TRUTH (lines 1–17)
- `nnProgress.ts` → ONLY NN COUNTER (lines 1–4)
- `evaluate-behavioral-state/index.ts` → NO OUTCOME WRITES (lines 6–13)

## Part 9 — Production Build Test

```
npm run build
npm run preview
```

Verify:
- Build completes with no errors.
- Preview runs without runtime/hydration errors.
- Realtime channels reconnect after a manual page reload.
- All four outcome states still behave deterministically in the production bundle.

---

## Acceptance Criteria

- ✅ All four outcome states behave deterministically across all surfaces
- ✅ No flicker, no duplicate submissions, no duplicate pulses
- ✅ Scroll respects user input
- ✅ Night check-in is single-submit enforced
- ✅ All state derives from `useDailyOutcome` only
- ✅ All `[HM-*]` logs stripped from production
- ✅ App runs clean in production build

If all checks pass → **Phase 10 is COMPLETE** and the system is production-ready.

---

## Files touched

**Edit (1 file, ~3 line wraps):**
- `src/components/vault/VaultFocusQuizDialog.tsx` — gate the three `[HM-NIGHT]` console logs behind `import.meta.env.DEV`.

**No other code changes.** The rest of Phase 10.6 is verification work performed against the live preview + production build.
