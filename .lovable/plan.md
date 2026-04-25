# Phase 10.5 — System Integrity Lock + Anti-Duplication Pass

Pure correctness pass. No features, no scoring changes, no DB changes, no evaluator changes. The audit shows the architecture is already largely clean — this phase closes the remaining gaps.

---

## Audit Findings (what's already correct)

| Concern | Status |
|---|---|
| Duplicate outcome logic | ✅ None. `useDailyOutcome` is the sole deriver. `VaultDayRecapCard` is a history viewer for *past* days, not a verdict producer. |
| Evaluator writing outcome state | ✅ Clean. `evaluate-behavioral-state` writes only behavioral scores + suggestions; no `standard_met` anywhere. |
| NN counting drift | ✅ `fetchNNProgressToday` is already used by both `useDailyOutcome` and `NonNegotiableProgressStrip`. Other `is_non_negotiable` refs are for editing/scheduling, not outcome counting. |
| DB dedupe for night quiz | ✅ Exists via `onConflict: 'user_id,entry_date,quiz_type'`. |
| Language consistency | ✅ Standardized in 10.4. |

## Remaining Gaps (what this phase fixes)

1. **Client-side duplicate submission** — Even with DB onConflict, the night quiz dialog runs full submit logic each open and re-fires success animations. Should detect existing entry and jump straight to success view.
2. **Race-condition flicker** — `useDailyOutcome` reads NN counts, dayType, and snapshot from independent sources. When the final NN flips, brief mismatched frames are possible.
3. **Scroll override after manual scroll** — `GamePlanCard` smart-scroll currently always fires; should bail if the user already scrolled before mount stabilizes.
4. **Defensive comment block** in evaluator + suggestion engine to prevent future drift.
5. **Dev-only tracing** for outcome / NN / nightly events.

---

## Part 1 — Nightly Check-In Authority Lock

**File:** `src/components/vault/VaultFocusQuizDialog.tsx`

- Add `existingNightQuiz?: VaultFocusQuiz | null` prop (passed by callers).
- In a `useEffect` watching `open && quizType === 'night' && existingNightQuiz`:
  - Skip form rendering, set `showNightSuccess = true` immediately.
  - Do **not** call `onSubmit`. The success screen renders from existing data + live `nightStats`.
- In `handleSubmit` (night branch), pre-check `existingNightQuiz` and short-circuit to `setShowNightSuccess(true)` without write.

**Callers:**
- `src/pages/Vault.tsx` (line 865): pass `existingNightQuiz={todaysQuizzes.find(q => q.quiz_type === 'night') ?? null}`.
- `src/components/GamePlanCard.tsx` (line 2114): same — `useVault()` already exposes `todaysQuizzes`; thread it in.

**Result:** Cannot submit twice. Reopening today's night check-in lands directly on the verdict screen.

---

## Part 2 — Duplicate Outcome Prevention (audit-only enforcement)

No code changes needed; instead lock the invariant:

- Add a top-of-file comment block in `src/hooks/useDailyOutcome.ts`:
  ```ts
  // ⚠ SINGLE SOURCE OF TRUTH for daily outcome.
  // Do NOT create parallel "daily summary" / "outcome card" / "day recap" derivers.
  // All UI surfaces that show today's verdict MUST consume this hook.
  ```
- Add a matching comment in `src/lib/nnProgress.ts` declaring it the only NN counter for "today" derivations.

(`VaultDayRecapCard` reviewed and confirmed scope = past-day history, not today's verdict — left untouched.)

---

## Part 3 — Evaluator Consistency Guard

**File:** `supabase/functions/evaluate-behavioral-state/index.ts`

Add a defensive header comment (no logic change):
```ts
// ⚠ INVARIANTS — DO NOT VIOLATE
// This function is strictly behavioral scoring + NN suggestion generation.
// It must NOT:
//   - derive or write daily outcome (standard met / not met)
//   - mutate NN completion state
//   - produce day-summary text
// Outcome is derived client-side via useDailyOutcome only.
```

---

## Part 4 — NN Progress Integrity Lock

Already enforced. Add a single guarding comment in `src/lib/nnProgress.ts`:
```ts
// ⚠ The ONLY allowed NN-completion counter for "today" derivations.
// Game Plan, Daily Outcome, and Nightly Check-In all route through this.
```

(Other files that touch `is_non_negotiable` — builder, calendar, scheduling — are scope-correct and not counters; no refactor needed.)

---

## Part 5 — Race Condition Protection in `useDailyOutcome`

**File:** `src/hooks/useDailyOutcome.ts`

- Compute the raw outcome as today, then run it through a **300 ms trailing debounce** before returning. Implementation: `useEffect` writes raw values to a `pendingRef`; `setTimeout(300)` flushes into a `committedState` `useState`. Cancel pending timeout on each new change.
- Until `nn.isLoading === false` AND `snapshot` defined AND `dayType` defined, return the previous committed value (or `loading: true` on first frame).
- Keeps `streakImpact` derivation intact (still reacts to `prevStreak`).

**Result:** No flicker when the final NN flips and the snapshot/recompute trails by a few hundred ms. Status transitions are atomic per stable frame.

---

## Part 6 — Edge Cases (verify + harden)

**File:** `src/components/GamePlanCard.tsx`

- The "remaining required actions" line already gates on `n.nnTotal > 0 && n.nnCompleted < n.nnTotal` — confirmed correct, will not render when `nnTotal === 0`. ✅
- `useDailyOutcome` already returns `STANDARD NOT MET` for `nnTotal === 0 && !anyActivityLogged`. ✅
- `useDailyOutcome` already returns `RECOVERY DAY / standardMet=true` regardless of NN count on rest days. ✅

No changes — just confirmed in audit. Add a unit-style comment in `useDailyOutcome.ts` documenting the three edge cases adjacent to the decision block.

---

## Part 7 — UX Friction Polish

**File:** `src/components/GamePlanCard.tsx`

- **Scroll guard:** track a `userScrolledRef = useRef(false)` set on the first `wheel` / `touchstart` / `scroll` event after mount. Skip the smart-scroll-to-NN effect if `userScrolledRef.current`.
- **Single pulse / single toast:** the existing pulse effect already keys off the `< → ===` transition; verify the dependency array does not include values that would re-fire. If it does, gate with a `pulsedRef.current` boolean reset on dayType change.
- **Suggestion panel filter:** `useNNSuggestions` already filters `!s.template.is_non_negotiable` client-side. ✅ Confirmed.

---

## Part 8 — Dev-Only Tracing

Add `if (import.meta.env.DEV) console.log(...)` in three places:

1. `src/hooks/useDailyOutcome.ts` — log `[HM-OUTCOME]` whenever committed status changes.
2. `src/lib/nnProgress.ts` — log `[HM-NN]` with `{done, total}` per fetch.
3. `src/components/vault/VaultFocusQuizDialog.tsx` — log `[HM-NIGHT]` on submit attempt + on duplicate-bypass.

Stripped automatically from production via Vite's `import.meta.env.DEV` tree-shake.

---

## Files Touched

| File | Change |
|---|---|
| `src/components/vault/VaultFocusQuizDialog.tsx` | Add `existingNightQuiz` prop, duplicate-bypass logic, dev log |
| `src/pages/Vault.tsx` | Pass `existingNightQuiz` to dialog |
| `src/components/GamePlanCard.tsx` | Pass `existingNightQuiz`, add `userScrolledRef` guard, single-pulse gate |
| `src/hooks/useDailyOutcome.ts` | 300 ms debounce commit, invariant header comment, edge-case docs, dev log |
| `src/lib/nnProgress.ts` | Invariant header comment, dev log |
| `supabase/functions/evaluate-behavioral-state/index.ts` | Invariant header comment only — no logic change |

## Acceptance Criteria

- ✅ Night check-in cannot submit twice for the same day; reopening lands on verdict screen
- ✅ No duplicate outcome derivers exist (audited & locked via comments)
- ✅ All NN counts route through `fetchNNProgressToday` (already true; locked)
- ✅ No status flicker during NN completion / snapshot recompute (300 ms debounce)
- ✅ Edge cases (0 NN, rest day, new user) verified correct
- ✅ Smart scroll respects manual user scroll
- ✅ Single pulse + single toast on standard completion
- ✅ Evaluator carries explicit invariant comment

## Out of Scope

- No DB migrations
- No evaluator logic changes
- No new components
- No scoring changes
- No new tables
