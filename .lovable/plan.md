## Issues confirmed

1. **No Exit button** — `DemoLayout` header only has a "Skip" button. There's no way to bail out to the dashboard/home.
2. **Skip doesn't work** — `SkipDemoDialog` is two-step (1: "I'll skip anyway" → 2: "Skip for now"). Step 2's button calls `onConfirm`, which calls `skip()` then `navigate('/select-modules', { replace: true })`. The likely failure is that `navigate('/select-modules')` lands on a guarded route (or `/select-modules` no longer accepts pre-checkout traffic) so the user appears stuck. Either way the UX is broken — too many clicks and wrong destination.
3. **Demo button label varies** — `DemoButton.tsx` switches between `Start Here`, `Resume Demo`, `Explore`, and `Demo` based on `progress.demo_state`. Should always read `Demo`.

## Changes

### `src/components/demo/DemoButton.tsx`
- Hard-code label to `"Demo"`. Keep adaptive routing (resume mid-flow when `demo_state === 'in_progress'`) but no label changes.

### `src/components/demo/DemoLayout.tsx`
- Add a dedicated **Exit** button (icon: `LogOut`) to the right of Skip. On click → `navigate('/dashboard')` (or `/` for unauthenticated visitors — detect via `useAuth`).
- Keep Skip button visible but fix its action (see below).

### `src/components/demo/SkipDemoDialog.tsx`
- Collapse to a **single step**. One title, one description, two actions: `Keep exploring` / `Skip for now`. Removes the broken second-step flow and the dead "Resume Demo" reference.

### `src/components/demo/DemoLayout.tsx` — `handleSkip`
- Change destination from `/select-modules` to `/dashboard`. `/select-modules` is post-checkout territory and is the root cause of the apparent "doesn't function" behavior.
- Add a `try/catch` around `await skip()` so a network failure still navigates the user away (current code silently fails before navigation if the update throws).

## Out of scope
- Removing `SkipNudgeBanner`'s "Resume demo" copy elsewhere — that's a separate banner component, untouched.
- Changing `/start-here` flow.

## Files touched
- `src/components/demo/DemoButton.tsx`
- `src/components/demo/DemoLayout.tsx`
- `src/components/demo/SkipDemoDialog.tsx`
