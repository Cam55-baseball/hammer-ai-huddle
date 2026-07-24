## Goal
Add a per-user toggle on the Dashboard's Game Plan card that collapses the entire plan body, leaving only the "THE GAME PLAN" header and two working buttons — **Log Meal** and **Quick Note**.

## Behavior
- New "Show plan" switch lives in the header action row of `GamePlanCard` (next to Sort mode / Lock buttons).
- Preference persists per-user in `localStorage` via `safeStorage` under key `gamePlan.hidden.v1` (client-only preference, no schema change needed).
- Default: shown (existing behavior preserved).
- When toggled **off**:
  - Hide: `StandardAwarenessHeader`, all task sections (check-ins, training, tracking, custom activities, coach activities, pending approvals, timeline, calendar), NN strip, and every header action button except the new toggle itself.
  - Keep: The bold header block (Target icon, "THE GAME PLAN" title, date/subtitle) + a compact action row with just two buttons — **Log Meal** (calls existing `handleQuickLogClick`) and **Quick Note** (opens existing `QuickNoteDialog` via `setQuickNoteOpen(true)`).
  - `QuickNoteDialog` remains mounted so it opens correctly.
- When toggled **on**: everything returns to current state.

## Files to change
- `src/components/GamePlanCard.tsx`
  - Add `const [planHidden, setPlanHidden] = useState(() => safeGet('gamePlan.hidden.v1') === '1')`.
  - Add a `Switch` (from `@/components/ui/switch`) or small `Button` toggle with `EyeOff/Eye` icon in the header action row, always visible.
  - When `planHidden`, early-return a slim `Card` containing just the header block + the two buttons + the `QuickNoteDialog` mount.
  - Persist toggle via `safeSet`.

## No backend changes
Pure UI/state change; no DB, RLS, or edge function work.
