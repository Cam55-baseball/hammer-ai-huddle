# Phase 10.8 — Launch Validation + Failure Hardening

A correctness pass on the 10.7 surface. **No new features, no DB, no UI additions.** Pure hardening of existing localStorage-coupled paths so nothing breaks under real user behavior.

---

## Part 1 — Safe-Storage Wrapper (shared utility)

**New file:** `src/lib/safeStorage.ts`

Tiny module that wraps localStorage and survives QuotaExceeded / disabled storage / SSR. Exposes:

```ts
safeGet(key: string): string | null
safeSet(key: string, value: string): void
safeRemove(key: string): void
safeHas(key: string): boolean
```

All methods try/catch internally and additionally maintain an **in-memory `Map` mirror** so reads stay consistent within the session even when the underlying storage throws. Used by every site below.

---

## Part 2 — Banner Hardening

**File:** `src/components/identity/StandardActivationBanner.tsx`

1. Replace direct `localStorage` calls with `safeStorage` so the once-per-day stamp still works in-memory if storage fails (banner never re-spams the same session).
2. **Mid-session auto-hide:** add an effect watching `outcome.status` — if it flips to anything other than `'STANDARD NOT MET'` (or `nnTotal` becomes 0), set `show=false` immediately.
3. **Day-rollover support:** track the date the banner was last evaluated in a `useRef`. On every `useDailyOutcome` change, recompute `getTodayDate()`; if it differs from the stored date, clear the in-memory dismissal and re-evaluate visibility (so an app left open past midnight can show the new day's banner).

---

## Part 3 — Event Duplication Lock

**File:** `src/lib/launchEvents.ts`

Add an opt-in dedupe helper alongside the existing tracker:

```ts
export function trackOnce(
  event: LaunchEvent,
  dedupeKey: string,            // e.g. `standard_met:${date}`
  payload?: Record<string, unknown>,
): boolean
```

- Computes `hm:event:${dedupeKey}`; returns `false` and no-ops if already stamped.
- Uses `safeStorage` (Part 1) and falls back to a module-level `Set<string>` so dedupe survives even when storage throws.
- Stamps then calls the existing `trackLaunchEvent` so DEV log behavior is unchanged.

**Wire-in (replace existing single-fire calls):**
| Site | Old call | New call |
|---|---|---|
| `GamePlanCard.tsx:1054` | `trackLaunchEvent('STANDARD_MET', …)` | `trackOnce('STANDARD_MET', \`standard_met:${today}\`, …)` |
| `VaultFocusQuizDialog.tsx:587` | `trackLaunchEvent('NIGHT_CHECKIN_COMPLETED')` | `trackOnce('NIGHT_CHECKIN_COMPLETED', \`night_checkin:${today}\`)` |
| `useDayState.ts:122` | `trackLaunchEvent('DAY_SKIPPED')` | `trackOnce('DAY_SKIPPED', \`day_skipped:${today}\`)` |
| `useCustomActivities.ts:485` | manual `hm:nn:fired:…` + `trackLaunchEvent('NN_COMPLETED', …)` | `trackOnce('NN_COMPLETED', \`nn:${today}:${templateId}\`, { templateId })` (drop the now-redundant manual key writes) |

Net result: every event is **provably one-shot per logical unit per day**, even under spam clicks, double subscriptions, remounts, or storage failure.

---

## Part 4 — Reflection Integrity

**File:** `src/components/vault/quiz/NightCheckInSuccess.tsx` → `DailyOutcomeSection`

Tighten `persistReflection`:

1. Compute `next = reflection.trim().slice(0, 120)` first.
2. Track the last persisted value in a `useRef` initialized from the storage read.
3. If `next === lastPersistedRef.current` → no-op (no redundant writes).
4. If `next === ''` → `safeRemove(reflectionKey)` and update ref to `''`.
5. Else → `safeSet(reflectionKey, next)` and update ref.
6. Switch the initial read and all writes to `safeStorage` so the input still works (in-session only) when storage is blocked.

---

## Part 5 — Feedback Prompt Race Conditions

**File:** same file → `FeedbackPrompt`

1. Switch all storage access to `safeStorage`.
2. **Throttle decision before timer:** if the throttle gate fails, return early — **never schedule the `setTimeout`** (current code returns early but only after we've already fallen through to the timer in some refactors; make the early return explicit and unconditional).
3. **Single-timer guarantee:** store the timeout id in a `useRef` and clear it both in the cleanup and at the top of the effect, so a fast remount cannot stack two timers.
4. The cleanup already cancels the 2s timer if the dialog closes early — confirm and add a comment locking the invariant.
5. After a successful `stamp(...)`, set an in-memory ref so the prompt cannot reappear in the same mount even if `visible` is forced true by future logic.

---

## Part 6 — Clipboard Hardening

**File:** same file → `handleShare`

1. Feature-detect via `typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText` before the call.
2. Wrap the `await` in try/catch (already present) and additionally swallow `NotAllowedError` / `SecurityError` silently in production — only log via `import.meta.env.DEV` console.
3. On any failure, always show the same `'Copy not supported'` toast (no uncaught rejections, no console noise in prod).
4. No permission API call (`navigator.permissions.query({ name: 'clipboard-write' })` is unreliable across browsers and not needed once we feature-detect + try/catch).

---

## Part 7 — NN Dedupe Fallback

**File:** `src/hooks/useCustomActivities.ts` (around line 478–490)

After Part 3 the `hm:nn:fired:*` manual key is replaced by `trackOnce`. Confirm:
- The dedupe runs **inside** the success path of the log mutation, not optimistic.
- The dedupe key includes `templateId` so multiple NN templates each fire once.
- Storage failure does not prevent the in-memory dedupe (handled by `trackOnce`).

---

## Part 8 — Production Build Sweep

After implementation, run a single verification pass:

1. `npm run build`
2. Grep the built bundle for residual debug strings:
   ```
   rg -l "HM-EVENT|HM-OUTCOME|HM-NN|HM-NIGHT" dist/
   ```
   Expected: **zero matches** (all gated behind `import.meta.env.DEV`, dead-code-eliminated by Vite).
3. Confirm no new TS errors via the linter.

No runtime preview/manual flow checks are part of this implementation phase — the user owns the Part 8 (real-flow) acceptance test in their own browser per the spec.

---

## Files Touched

| File | Change |
|---|---|
| `src/lib/safeStorage.ts` | **NEW** — try/catch + in-memory mirror wrapper |
| `src/lib/launchEvents.ts` | Add `trackOnce(event, dedupeKey, payload)` helper |
| `src/components/identity/StandardActivationBanner.tsx` | safeStorage, mid-session auto-hide, day-rollover reset |
| `src/components/vault/quiz/NightCheckInSuccess.tsx` | safeStorage, reflection no-op-on-unchanged, single-timer guard, clipboard hardening |
| `src/components/GamePlanCard.tsx` | Switch `STANDARD_MET` to `trackOnce` |
| `src/components/vault/VaultFocusQuizDialog.tsx` | Switch `NIGHT_CHECKIN_COMPLETED` to `trackOnce` |
| `src/hooks/useDayState.ts` | Switch `DAY_SKIPPED` to `trackOnce` |
| `src/hooks/useCustomActivities.ts` | Replace manual NN dedupe key with `trackOnce` |

---

## Guardrails (verified, no code)

- ❌ No DB tables, columns, migrations, or RLS changes
- ❌ No changes to `useDailyOutcome`, `nnProgress.ts`, evaluator, or any scoring
- ❌ No new UI surfaces
- ✅ All persistence routes through one safe wrapper
- ✅ Every dev-only signal stays gated behind `import.meta.env.DEV`
- ✅ Single source of truth (`useDailyOutcome`) untouched

---

## Acceptance

1. Disabling localStorage in DevTools → banner still appears once, reflection still types, feedback still submits, NN dedupe still works, no crashes.
2. Spamming the final NN check / night check-in submit / skip toggle → each event fires **exactly once** per day, verified by DEV `[HM-EVENT]` log.
3. Completing the last NN while the banner is visible → banner disappears within one render.
4. Leaving the app open past midnight → banner re-evaluates against the new date and may show again.
5. `dist/` bundle contains zero `HM-EVENT|HM-OUTCOME|HM-NN|HM-NIGHT` strings.
6. No new console errors or unhandled promise rejections in production preview.
