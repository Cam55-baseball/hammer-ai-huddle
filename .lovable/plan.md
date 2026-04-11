

# First-Time User Onboarding Flow for Baserunning IQ

## Summary
Show a focused onboarding screen when a user has zero completed lessons AND zero daily attempts. After clicking "Start Training", auto-load the first lesson. Skips permanently once the user completes any lesson or daily attempt.

## Detection Logic
In `BaserunningIQ.tsx`, derive `isFirstTime` from existing hook data:
```
isFirstTime = completedLessons === 0 && todayAttempts.length === 0 && streak === 0 && !isLoading
```
No database changes needed — uses data already available from `useBaserunningProgress` and `useBaserunningDaily`.

## New File: `src/components/baserunning-iq/OnboardingHero.tsx`

Full-page hero card with:
- Brain icon + title "Build Your Baserunning IQ"
- Subtitle "Master decisions that separate average from elite"
- 3 quick bullet points (what they'll learn)
- "Start Training" button that calls `onStart()`

Clean, centered layout matching existing page style.

## Modified File: `src/pages/BaserunningIQ.tsx`

- Import `OnboardingHero` and pull `todayAttempts` from `useBaserunningDaily`
- Add `isFirstTime` check: `completedLessons === 0 && todayAttempts.length === 0 && streak === 0`
- When `isFirstTime && !activeLessonId && !isLoading`:
  - Render `<OnboardingHero onStart={handleStart} />` instead of normal page content
- `handleStart` finds the lesson with `order_index === 0` (or first lesson) and sets it as `activeLessonId`
- Once user completes that lesson → progress is saved → `isFirstTime` becomes false → normal page renders on return

## Flow
```text
User visits /baserunning-iq (first time)
  → Sees OnboardingHero
  → Clicks "Start Training"
  → First lesson loads (LessonDetail)
  → Completes lesson → progress saved
  → Returns to main page → normal view (LevelBadge + Daily + Lessons)
```

## Files Summary
| File | Action |
|------|--------|
| `src/components/baserunning-iq/OnboardingHero.tsx` | New — onboarding screen |
| `src/pages/BaserunningIQ.tsx` | Edit — add first-time detection + render onboarding |

No database changes. No new tables. Pure client-side logic from existing data.

