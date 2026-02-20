
# Remove Mental Readiness, Emotional State & Physical Readiness from Morning Check-In

## What's Being Changed

The three `RatingButtonGroup` scale selectors — **Mental Readiness**, **Emotional State**, and **Physical Readiness** — currently render unconditionally for all three quiz types (morning, pre-workout, night). They need to be hidden for the morning check-in only.

## Where the Code Lives

**File:** `src/components/vault/VaultFocusQuizDialog.tsx`

The three components are rendered at lines **1488–1514** inside a `<div className="mt-6 space-y-4">` block:

```tsx
<div className="mt-6 space-y-4">
  {/* Mental Readiness */}
  <RatingButtonGroup ... />

  {/* Emotional State */}
  <RatingButtonGroup ... />

  {/* Physical Readiness */}
  <RatingButtonGroup ... />

  {/* Night Quiz Mood & Stress + Reflections */}
  {quizType === 'night' && ( ... )}
```

## The Fix

Wrap all three `RatingButtonGroup` components in a single `{quizType !== 'morning' && (...)}` conditional — this hides them during the morning check-in while keeping them visible for pre-workout and night check-ins.

```tsx
{quizType !== 'morning' && (
  <>
    {/* Mental Readiness */}
    <RatingButtonGroup ... />
    {/* Emotional State */}
    <RatingButtonGroup ... />
    {/* Physical Readiness */}
    <RatingButtonGroup ... />
  </>
)}
```

## Data / Backend Considerations

- The `handleSubmit` function always includes `mental_readiness`, `emotional_state`, and `physical_readiness` in the payload (they default to `3` from `useState(3)`). Since they're never touched during a morning check-in, the submitted values will just stay at `3` — harmless, and no breaking change to the data contract.
- No database schema changes needed.
- No hook changes needed.

## File Changed

**`src/components/vault/VaultFocusQuizDialog.tsx`** — one conditional wrapper added around three existing components, zero logic changes.
