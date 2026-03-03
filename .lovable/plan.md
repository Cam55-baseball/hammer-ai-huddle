

# Post-Session Summary Screen

## Problem
After a session is saved (whether self-logged or coach-submitted), the player sees a toast and the form resets. There's no summary showing what was computed — no composite scores, no AI prompts.

## Solution
Add a `PostSessionSummary` component and a new flow step `session_summary` that displays immediately after a successful save.

### New File: `src/components/practice/PostSessionSummary.tsx`
A card-based summary screen showing:
- **Session metadata**: module, type, date, coach name (if coach-led)
- **Composite scores**: BQI, FQI, PEI, Decision, Competitive Execution — fetched from the saved session's `composite_indexes` (polled once after a short delay since `calculate-session` runs async)
- **AI Development Prompts**: pulled from `useAIPrompts` hook, showing the carousel inline
- **Streak info**: current streak from `athlete_mpi_settings`
- **"Done" button**: resets flow back to `select_type`

The component will:
1. Accept `sessionId` as prop
2. Use a query to fetch the session's `composite_indexes` with a 2-second initial delay + retry until populated
3. Display scores as a simple grid of labeled values with color coding (red < 40, yellow 40-65, green > 65)
4. Show AI prompts from `useAIPrompts`

### Changes to `src/pages/PracticeHub.tsx`
- Add `'session_summary'` to the `FlowStep` type
- Store the returned session ID after `createSession` succeeds
- Instead of resetting to `select_type` on success, transition to `session_summary`
- Render `PostSessionSummary` when step is `session_summary`
- On "Done" click, reset all state as currently done

### Changes to `src/hooks/usePerformanceSession.ts`
- No changes needed — `createSession` already returns the session object with `id`

| File | Change |
|------|--------|
| `src/components/practice/PostSessionSummary.tsx` | New component — score display, AI prompts, done button |
| `src/pages/PracticeHub.tsx` | Add `session_summary` step, store session ID, render summary |

