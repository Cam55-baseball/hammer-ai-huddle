## Goal

Make Game Plan activities draggable **only** via the six-dot grip handle on the left of each card. Touching anywhere else on the card (title, body, badges, empty space) should never initiate a drag, so users can scroll their Game Plan freely without accidentally reordering activities.

This applies to both **Manual** mode (per-section reorder) and **Timeline** mode (unified reorder).

## Current behavior (the bug)

In `src/components/GamePlanCard.tsx`, each activity is wrapped in a Framer Motion `<Reorder.Item drag={!todayLocked}>`. With Framer Motion's default settings, the **entire item** is the drag listener, so any pointer-down on the card body starts a drag. The `<GripVertical>` icon is purely decorative — it isn't wired to anything.

Result on mobile: a vertical scroll gesture that begins on a card frequently triggers a reorder instead of scrolling the page.

## Fix

Use Framer Motion's standard "drag handle" pattern: disable the item's built-in drag listener and only start a drag when the user presses the grip icon.

### Changes (single file: `src/components/GamePlanCard.tsx`)

1. **Import `useDragControls`** from `framer-motion` alongside the existing `Reorder` import.

2. **Create a per-item wrapper component** (e.g. `DraggableTaskItem`) so each row can own its own `useDragControls()` instance (hooks can't be called inside `.map`). It accepts: `task`, `disabled` (`todayLocked`), drag lifecycle callbacks (`onDragStart`/`onDragEnd`/`onDrag` for timeline auto-scroll), and a `renderContent(controls, disabled)` render prop.

   Inside, render:
   ```tsx
   <Reorder.Item
     value={task}
     drag={disabled ? false : 'y'}
     dragListener={false}          // <-- key change: body no longer initiates drag
     dragControls={controls}
     onDragStart={...}
     onDragEnd={...}
     onDrag={...}
   >
     {renderContent(controls, disabled)}
   </Reorder.Item>
   ```

3. **Update `renderTask`** to accept the `dragControls` (and `disabled` flag) and attach them to the existing grip handle:
   ```tsx
   <div
     onPointerDown={(e) => {
       if (disabled) return;
       e.preventDefault();         // prevents text-selection on desktop
       dragControls?.start(e);
     }}
     style={{ touchAction: 'none' }}  // ensures touch drag isn't stolen by scroll
     className={cn(
       "flex-shrink-0 text-white/60 select-none",
       disabled ? "opacity-30" : "cursor-grab active:cursor-grabbing hover:text-white"
     )}
     role="button"
     aria-label="Drag to reorder"
   >
     <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
   </div>
   ```
   The handle is only rendered in `manual` and `timeline` modes (already the case), so `auto` mode is unaffected.

4. **Wire the wrapper into both reorder sites:**
   - Manual section list (around line 1519–1525): replace `<Reorder.Item>` with `<DraggableTaskItem>`.
   - Timeline list (around line 2012–2024): same replacement, passing through `onDragStart`, `onDragEnd`, `handleDrag` so `useAutoScrollOnDrag` keeps working.

5. **Mobile hit-target tweak:** add `p-1 -m-1` (or similar) to the grip wrapper so the touch target is comfortably ≥32px without changing visual layout. Keep the icon size as-is.

### Auto mode

No change. Auto mode never wraps items in `Reorder.Item` (line 1510–1517 just uses plain divs), so cards there are inherently non-draggable.

### What this does NOT change

- Sort-mode persistence, ordering persistence, completion strike-through, mobile typography work, NN behavior, time badges, edit/coach/complete buttons — all untouched.
- The card body remains fully clickable (opens the activity detail dialog) because the body is still a `<button>` with its own `onClick`, and the body no longer competes with a drag listener.

## Validation checklist

- Manual mode: pressing and dragging anywhere on a card body only scrolls/clicks; only the grip icon reorders.
- Timeline mode: same, plus auto-scroll near viewport edges still works while dragging from the grip.
- Auto mode: no grip, no drag, unchanged.
- `todayLocked`: grip is dimmed and pointer-down is a no-op (no drag starts).
- Desktop mouse: cursor shows `grab`/`grabbing` on the handle only.
- Mobile (≤402px viewport): vertical page scroll started on a card body works without triggering reorder.
