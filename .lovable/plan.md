## Problem

The Hammer athlete onboarding chat card (the pink "Hammer · athlete onboarding 12/16" card in the screenshot) only exposes **Skip** and **Save & next**. Once a user answers or skips a question, there's no way to return to a previous one — the director hook advances the queue and never looks back.

## Fix — add a Back control next to Skip / Save & next

### 1. `src/hooks/useHammerOnboardingDirector.ts`
Add a lightweight session history so the previous question can be reopened without mutating persisted context:

- New session state:
  - `history: string[]` — ordered list of gap IDs the user has acted on this session (push on every successful `resolve` and `skip`).
  - `sessionReopened: Set<string>` — gap IDs to force back into the open queue even if the athlete context already has a saved value.
- New API:
  - `canGoBack: boolean` (true when `history.length > 0`).
  - `goBack(): void` — pops the last id from `history`, removes it from `sessionResolved` and `sessionSkipped`, and adds it to `sessionReopened`. That makes the openGaps filter surface it again as `nextGap`, so the user sees their previous question with a blank draft ready to overwrite. The persisted value on the server is left intact until they hit Save & next again (missingness/organism-truth invariants preserved — this is UX-only re-entry, never a silent mutation).
- `openGaps` filter: treat `sessionReopened.has(g.id)` as "open" for athlete audience regardless of `ctx.get(...).missing`.
- Update the `HammerOnboardingDirector` interface accordingly.

### 2. `src/components/hammer/HammerOnboardingChat.tsx`
- Pull `canGoBack` and `goBack` from the director.
- In the action row (currently `Skip` + `Save & next`), add a leading **Back** button:
  - `variant="ghost"`, `size="sm"`, `<ArrowLeft />` icon, disabled when `!canGoBack || busy`.
  - Clicking it calls `goBack()` and clears local `draft` state.
- Keep the row right-aligned; Back sits just to the left of Skip so the order is **Back · Skip · Save & next**, matching the screenshot placement the user asked for.

### 3. Verify
- Answer question 12 → Save & next advances to 13 → tap **Back** → question 12 re-appears with its Skip / Save & next buttons and a blank draft.
- Skip a question → tap **Back** → skipped question re-appears.
- On the very first question of a session, **Back** is disabled (no history).

## Files touched
- `src/hooks/useHammerOnboardingDirector.ts`
- `src/components/hammer/HammerOnboardingChat.tsx`

## Out of scope
- The separate multi-step `AthleteOnboarding` page shell (that already has a header Back button and clickable stepper from the previous turn) — this request is specifically about the in-card Hammer chat surface shown in the screenshot.
- Any change to persisted answers, gap ordering, or the director's resolve/skip semantics beyond reopening a question in the session queue.
