# Plan: Make Onboarding Easy to Find in Settings

## Problem
The onboarding entry point lives inside `OnboardingStatusCard`, which is buried near the **bottom** of the Profile/Settings page (line ~1826 of `src/pages/Profile.tsx`) — below subscriptions, verified stats, practice intelligence, and color customization. Athletes who abandon or want to revisit onboarding have to scroll past everything to find it. The avatar `UserMenu` does have a "Setup" item, but there is no prominent, in-page affordance inside Settings itself.

## Current state (verified)
- `src/components/UserMenu.tsx` — already has a "Setup" dropdown item → `/onboarding/athlete?resume=1`, with a red "Finish" badge when incomplete.
- `src/components/settings/OnboardingStatusCard.tsx` — the only in-Settings onboarding surface; renders "Finish setup" / "Review setup" CTAs. Placed at Profile.tsx:1826.
- `src/hooks/command/useAthleteOnboardingState.ts` — derives `hasCompletedOnboarding` and sub-status (schedule, goals, notifications) read-only.
- `src/hooks/onboarding/useOnboardingAnswerStatus.ts` — derives per-step answered/open counts.
- Profile page header (`src/pages/Profile.tsx:623-631`) has only a back button + `UserMenu`; no quick action buttons.

## Changes

### 1. Add a prominent onboarding CTA banner at the top of the Profile/Settings page
In `src/pages/Profile.tsx`, directly under the page title row (`<h1>` block, ~line 635-687) and above the User Info Card, render a new compact **`OnboardingQuickAccess`** banner — but **only when viewing the user's own profile** (`!viewingOtherProfile`). 

The banner:
- Uses `useAthleteOnboardingState` + `useOnboardingAnswerStatus` to show live status.
- Two states mirroring `OnboardingStatusCard`:
  - **Incomplete**: primary button "Finish your setup" → `/onboarding/athlete?resume=1`, with an amber alert icon and the "x of y answered" line. Pulsing/glow emphasis (reuse the existing glow utility classes already used in the Hammers Today cards) so it's unmissable.
  - **Complete**: subtle outline button "Review / edit answers" → `/onboarding/athlete?step=review`, plus a small "Setup complete ✓" indicator.
- Always visible to owners/players on their own profile; hidden for scout/coach viewing-others.

This gives a single, obvious, above-the-fold button inside Settings that jumps straight to onboarding — the core request.

### 2. Promote `OnboardingStatusCard` higher in the page
Move the existing `<OnboardingStatusCard />` + `<CategoryGoalsCard />` grid (currently at line ~1824-1828) up to **right after the User Info Card** (immediately after the new quick-access banner, ~line 720 area). This keeps the detailed resume/review + injury-report + goal-ranking surfaces near the top instead of buried at the bottom. The existing placement block is removed from the bottom.

### 3. Extract `OnboardingQuickAccess` as a small component
Create `src/components/settings/OnboardingQuickAccess.tsx` so the banner logic is isolated and reusable (header CTA). It imports the two existing hooks and a `Link` — no new data sources, no writes.

## Non-goals
- No changes to the onboarding flow itself, routes, or the `UserMenu` dropdown item (it already works).
- No backend/RLS changes.
- No changes to `OnboardingStatusCard` internals (it stays as the detailed anchor card).

## Files touched
- `src/components/settings/OnboardingQuickAccess.tsx` (new)
- `src/pages/Profile.tsx` (add banner near top; move `OnboardingStatusCard` grid up; remove old bottom placement)
