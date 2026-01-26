
Goal: Make the “Complete your 6-week check in” button (the one shown inside the Vault’s cycle/recap card) reliably scroll the user to the “6-Week Tracking” section (Performance Tests + Progress Photos), with an “elite / no hiccups” feel.

## What’s happening (root cause)
You currently have two different “complete your progress reports / 6-week check-in” entry points:

1) From Game Plan (outside Vault):
- `GamePlanCard.tsx` navigates to `/vault?openSection=six-week-checkin` and Vault’s URL-param effect handles tab switch + scroll.

2) Inside Vault (this is the one in your screenshot):
- `VaultStreakRecapCard.tsx` renders a button:
  - `onClick={onGoToProgressReports}`
  - But in `src/pages/Vault.tsx`, the component is rendered WITHOUT passing `onGoToProgressReports`.
- Result: the button click does nothing (no navigation, no scroll), which matches your report.

## Implementation plan (what I will change)

### 1) Wire the Vault-internal button to an actual scroll action (primary fix)
File: `src/pages/Vault.tsx`

- Create a dedicated handler (e.g. `handleGoToProgressReports`) that:
  1. Forces the Vault tab to “today” (because the 6-week section lives in the Today tab).
  2. Sets `autoOpenSection` to `'six-week-checkin'` so BOTH Performance Tests and Progress Photos expand.
  3. Executes a “bulletproof” scroll to `sixWeekCheckinRef` using the existing centralized `scrollToVaultSection(sectionRefs, 'six-week-checkin')`.

- Pass that handler into the left-column card:
  - Add prop: `onGoToProgressReports={handleGoToProgressReports}` on `<VaultStreakRecapCard ... />`

This makes the exact button in your screenshot functional immediately.

### 2) Make the scroll “elite” (timing + retry hardening)
Even after wiring the handler, scrolling can still “feel flaky” if it fires before the Today tab finishes rendering. To prevent that:

File: `src/pages/Vault.tsx`
- In `handleGoToProgressReports`, run scroll in a short staged sequence (fast + reliable):
  - Attempt immediately
  - Retry after small delays (ex: 50ms, 150ms, 350ms, 700ms, 1200ms)
- This ensures it works even on slow devices or heavy renders.

Optional (but recommended) hardening in the shared utility:
File: `src/utils/vaultNavigation.ts`
- Improve `scrollToVaultSection()` so it only counts as “success” if the element is actually scrollable/visible (not just `ref.current` existing).
  - For example, require `ref.current.getClientRects().length > 0` before treating it as a successful attempt.
- Extend retry window slightly (up to ~2–2.5s) to cover worst-case render timing.

This protects both:
- deep-links coming from Game Plan (`/vault?openSection=six-week-checkin`)
- same-page scroll requests from within Vault

### 3) Add a short “you landed here” visual confirmation (no confusion)
File: `src/pages/Vault.tsx`
- Add a transient highlight state (e.g. `highlightSection: VaultSection | null`)
- When scrolling to `'six-week-checkin'`, set highlight on, then clear after ~1.5–2 seconds.
- Apply a subtle ring/outline/pulse class to the 6-week container while highlighted.

Outcome: users instantly see where they landed, even if they were already near that area.

## Validation checklist (what I will verify in Preview)
1) Go to `/vault`, stay near the top.
2) Click the Vault’s internal “Complete your 6-week check in” button (from the recap/cycle card).
   - Expected:
     - Switches to Today tab if needed
     - Scrolls down to the 6-Week Tracking section
     - Both Performance Tests + Progress Photos are expanded
     - Section briefly highlights
3) From Game Plan, click its “Complete your 6-week check in” CTA.
   - Expected:
     - Navigates to Vault and scrolls to the same section, same behavior
4) Repeat the click multiple times to ensure it works consistently (no “first click only” issues).

## Files that will be updated
- `src/pages/Vault.tsx`
  - Pass `onGoToProgressReports`
  - Add robust scroll handler + optional highlight state/classes
- (Recommended) `src/utils/vaultNavigation.ts`
  - Hardening: visibility-aware scroll + longer retry window
- (Optional) `src/components/vault/VaultStreakRecapCard.tsx`
  - Defensive fallback: if `onGoToProgressReports` is missing, disable/hide the button to prevent silent failure in the future

## Expected result
- The Vault’s internal “Complete your 6-week check in” button becomes 100% functional.
- It scrolls users directly to the 6-week check-in section reliably and quickly.
- Both required cards are open immediately, with clear visual confirmation so there’s no confusion.
