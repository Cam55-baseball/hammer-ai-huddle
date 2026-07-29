**What the error means**

React error #300 decodes to: `Rendered fewer hooks than expected. This may be caused by an accidental early return statement.` In plain English: one render of a component called a certain set of React hooks, then a later render skipped some of those hooks because the component returned early. React treats that as a crash.

**Confirmed likely source**

The console stack points at the Hammers Today conditioning section. In `WkConditioningCard`, the component calls hooks, then returns early for game days / empty states, then calls `useState` after those returns. That can produce exactly this error when the day state changes.

I also found the same hook-order risk in `WkLiftsCard`: it returns early for game day before later hooks are called.

**Fix plan**

1. **Repair hook order in Hammers Today cards**
   - Move all hooks in `WkConditioningCard` above any `return null` or early return.
   - Move all hooks in `WkLiftsCard` above the game-day return branch.
   - Keep the current UI behavior unchanged: conditioning can still hide on game days; lifts can still show the paused game-day card.

2. **Audit sibling workout cards for the same crash class**
   - Check Speed, Bat Speed, Pitching, Warmup, Arm Care, Recovery, and any Hammers Today subcard for hooks after conditional returns.
   - Fix any identical pattern found in the same pass.

3. **Add a regression guard**
   - Add/extend a small test or static guard around Hammers Today card rendering so game-day / non-game-day transitions do not trigger hook-order crashes.
   - Prefer targeted component-level coverage over a broad app rewrite.

4. **Verify the fix**
   - Run targeted tests for Hammers Today card rendering.
   - Use the live preview with a game-day-like state if possible to confirm the section renders instead of showing the ErrorBoundary fallback.

**Expected result**

Users should no longer see the “Something went wrong here… Minified React error #300” message on the Hammers Today Plan when the conditioning/lifts sections appear, disappear, or switch to game-day behavior.