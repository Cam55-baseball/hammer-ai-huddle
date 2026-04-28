# Dial In Posture Stability + CNS Reaction Time Accuracy

Two pre-workout/CNS check-in tests are misbehaving. The posture stability test flags asymmetry too aggressively, and the reaction time test is producing inflated/inaccurate scores compared to other industry tests. Both will be fixed end-to-end in their source components, scoring rules tightened, and the existing memory contract for the reaction test re-enforced (it was silently regressed).

---

## 1. Posture Stability Test — `src/components/vault/quiz/BalanceTest.tsx`

### Problems found
- Asymmetry triggers a "Significant asymmetry detected" warning at **>20%** difference, with **no minimum baseline duration**. A 4s vs 5s result (totally normal noise on a short hold) currently fires the warning at 20%.
- Timer truncates with `Math.floor(... / 1000)` — a 9.9s hold records as 9s, exaggerating tiny gaps.
- No floor on how short a leg can be before asymmetry math runs (1s vs 3s = 66% "asymmetry").

### Fixes
1. **Sub-second precision**: store seconds as a float (1 decimal) using `(Date.now() - start) / 1000`, not `Math.floor`. Display `Xs` rounded to 1 decimal during run, integer seconds in result summary.
2. **Asymmetry gating** — only evaluate asymmetry when BOTH legs held ≥ **8 seconds** (below that, balance noise dominates and asymmetry is meaningless). Below the gate, show neutral copy: "Hold longer on both sides for an asymmetry read."
3. **Raise threshold** from **>20%** to **>25%** AND require an absolute gap of **≥ 4 seconds**. Both conditions must be true for `isSignificant`.
4. **Cap meaningful read at 60s** — if either leg ≥ 60s, treat as ceiling-hit and suppress asymmetry warning (athlete is stable enough that the test is no longer diagnostic).
5. Update `getAsymmetry` return shape to include `belowGate: boolean` so the result UI can render the neutral state vs warning state vs balanced state.

### New thresholds (locked)
```ts
ASYMMETRY_PCT_THRESHOLD = 25      // was 20
ASYMMETRY_MIN_GAP_SEC   = 4       // new — absolute floor
ASYMMETRY_MIN_HOLD_SEC  = 8       // new — both legs must clear this
ASYMMETRY_CEILING_SEC   = 60      // new — suppress above this
```

---

## 2. CNS Reaction Time Test — `src/components/vault/quiz/QuickReactionTest.tsx`

The project memory `mem://features/physio/cns-readiness-test` already specifies the contract for this test (performance.now, onPointerDown, requestAnimationFrame, 200→100 / 600→0 scoring). The current implementation has **regressed from that contract** and is the root cause of inflated readings.

### Regressions to fix
| Item | Current (wrong) | Correct (per memory contract) |
|---|---|---|
| Timing source | `Date.now()` | `performance.now()` |
| Tap event | `onClick` | `onPointerDown` (eliminates ~50–300ms mobile tap delay) |
| Start timestamp | Set inside `setTimeout` callback before paint | Set inside `requestAnimationFrame` after target paints |
| First-tap warmup | Counted | Discarded (warm-up tap) |
| Outliers | All 5 averaged | Drop slowest tap, average remaining 4 |
| Anti-cheat floor | None | Reject taps `< 100ms` as anticipation, mark as "too early" |

### Additional accuracy improvements
1. **Increase sample size** from **5 → 7** taps (drop the warmup + slowest = 5 valid samples averaged). More samples = lower variance.
2. **Use `event.timeStamp`** when available (it's the actual hardware input time, more accurate than reading `performance.now()` inside the React handler which adds reconciliation lag). Fall back to `performance.now()` if `timeStamp` is 0/missing.
3. **Pre-render the green target** during the `waiting` phase (hidden via opacity), so transitioning to `tap` is just an opacity flip + class change — no layout, no paint thrash. The `requestAnimationFrame` then captures the exact frame the green becomes visible.
4. **`touch-action: manipulation`** + `user-select: none` on the tap surface to suppress browser gesture detection latency.
5. **Reject taps > 1500ms** as "missed" (user wasn't watching) — don't pollute the average.
6. **Show per-tap times** in the result so users can see consistency, not just the average.

### Scoring (kept per contract, clarified)
```ts
// 200ms → 100, 600ms → 0, linear, clamped
score = clamp(100 - ((avgMs - 200) / 4), 0, 100)
```
Rating bands stay: <250 Elite, <350 Fast, <450 Good, else Keep Training.

---

## 3. Memory update

Refresh `mem://features/physio/cns-readiness-test` to also lock in:
- 7 taps total, drop warmup + slowest, average remaining 5
- Reject < 100ms (anticipation) and > 1500ms (missed) taps
- Prefer `event.timeStamp` over `performance.now()` when non-zero

---

## Files changed
- `src/components/vault/quiz/BalanceTest.tsx` — fractional timing, gated asymmetry math, new thresholds, updated result UI copy
- `src/components/vault/quiz/QuickReactionTest.tsx` — full timing pipeline rewrite per contract, 7-tap protocol, outlier rejection
- `mem://features/physio/cns-readiness-test` — extend contract with new rules

## Out of scope
- No DB schema changes (both tests already report a single avg/score the consumer accepts).
- No changes to `VaultFocusQuizDialog.tsx` consumer wiring — same `onComplete(avgMs, score)` and `onComplete(left, right)` signatures preserved.
- No translation file edits for the few new neutral-state strings; English fallback strings will be inlined as `t(key, 'English fallback')` matching the existing pattern.
