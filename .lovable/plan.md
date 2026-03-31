
Fix: Custom Activity Builder forced exits / data loss

Do I know what the issue is? Yes. The remaining issue is not just Radix outside-click behavior.

Root cause

The builder already blocks `pointerDownOutside`, `interactOutside`, and `focusOutside`, so if it still disappears the remaining paths are:
1. a parent sets `open=false`, or
2. the parent component unmounts.

From the code, the main unstable path is the dashboard flow:
- `GamePlanCard` owns `builderOpen`.
- `Dashboard.tsx` still swaps the entire dashboard body to a loading skeleton with `if (authLoading || loading || subLoading || scoutLoading)`.
- `useScoutAccess` still depends on the full `user` object, so auth/session refreshes can retrigger loading and tear down the open builder.
- `useAdminAccess` also depends on the full `user` object.
- The builder has no draft persistence, so any unexpected teardown loses work.

The earlier dialog fixes were necessary, but they only covered one close path.

Implementation plan

1. Stabilize auth/role lifecycle so the dashboard does not tear down an open builder
- Update `useScoutAccess.ts` and `useAdminAccess.ts` to depend on `user?.id`, not the whole `user` object.
- Keep `useOwnerAccess.ts` as-is since it is already keyed to `user?.id`.
- In `Dashboard.tsx`, introduce an initial bootstrap gate only. After the first auth/subscription/role resolution, keep the dashboard mounted during background refreshes instead of replacing it with a full skeleton.
- Include owner/admin loading in that first-load gate so access state resolves once, not repeatedly.

2. Move builder ownership out of volatile containers
- For the dashboard flow, lift the dialog/controller state out of `GamePlanCard` into a stable page-level owner.
- Reuse that same pattern for other entry points that currently mount the dialog inside list/card containers where practical.
- Result: card/grid rerenders no longer close the builder.

3. Make every close explicit
- Add dirty-state tracking in `CustomActivityBuilderDialog.tsx`.
- Replace the shared auto-X close path with a controlled close path so X, Cancel, and Escape can be intercepted.
- If the draft is dirty, prevent silent dismissal and require explicit discard/continue editing.
- Keep the existing outside-interaction blocks in place.

4. Preserve in-progress work automatically
- Add an autosaved draft layer for the full builder payload:
  - activity type
  - title/description
  - exercises
  - block-system toggle
  - workout blocks
  - running sessions
  - scheduling
  - reminders
  - appearance fields
  - view mode
- Restore the draft after unexpected close/remount/reload.
- Clear drafts only on successful save/delete or confirmed discard.

5. Contain failures inside the builder
- Wrap volatile builder sections (`BlockContainer`, drag/drop workout builder, nested selectors/popovers) in a local error boundary so a section failure does not eject the user from the whole experience.
- Add structured logging for:
  - open source/context
  - close reason
  - dirty state
  - unexpected unmount while open
- Add a proper `DialogDescription` to remove the current accessibility warning.

Files

- `src/hooks/useScoutAccess.ts`
- `src/hooks/useAdminAccess.ts`
- `src/pages/Dashboard.tsx`
- `src/components/GamePlanCard.tsx`
- `src/components/custom-activities/CustomActivityBuilderDialog.tsx`
- `src/components/ui/dialog.tsx`
- likely new helper(s):
  - `src/hooks/useCustomActivityDraft.ts`
  - `src/components/custom-activities/CustomActivityBuilderBoundary.tsx`

Technical details

- Current dashboard teardown risk comes from replacing the page with a loading skeleton after first render.
- Current dialog teardown risk comes from shared parent ownership plus no draft recovery.
- Current shared `DialogContent` always renders its own close button, so builder-specific discard handling should be made controllable there.
- Draft keys should be user- and context-scoped, e.g. `custom-activity-draft:{userId}:{context}`.
- No backend/schema change is required for this stabilization pass.

QA

I will validate the full flow end-to-end on desktop and mobile:
- open builder from dashboard/game plan
- open builder from My Custom Activities
- scroll to the block builder section
- add a block
- open nested block picker
- use selects/popovers/drawers
- cancel/close with dirty state
- save successfully
- refresh/reopen and confirm draft recovery
- confirm the builder never exits unless the user explicitly closes/discards
