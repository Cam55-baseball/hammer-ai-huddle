

# Pitch Labels, Menu Optimization, and Session Locking

## 1. Use Full Pitch Names Instead of Abbreviations

**Problem**: Hitting pitch type buttons show `pt.abbreviation` (e.g., "FF", "FT", "FC", "SL") which are unrecognizable to most users. Pitching section already uses `pt.name` but is capped at 8 items.

**File: `src/components/practice/RepScorer.tsx`**

- **Line 405**: Change `{pt.abbreviation ?? pt.name}` to `{pt.name}` for hitting pitch type buttons
- **Line 393**: Remove `.slice(0, 10)` limit -- show all pitch types
- **Line 532**: Remove `.slice(0, 8)` limit on pitching pitch types -- show all
- Both hitting and pitching will display full readable names: "4-Seam Fastball", "Slider", "Riseball", etc.

## 2. Optimize Practice Hub Menu UI

**Problem**: 7 category tabs (`grid-cols-4 md:grid-cols-7`) overflow on mobile, creating clutter.

**File: `src/pages/PracticeHub.tsx`**

- Replace the 7-column TabsList grid with a horizontally scrollable row using `overflow-x-auto` and `flex` instead of `grid`
- Use compact pill-style triggers: icon only on mobile, icon + label on desktop
- Reduce visual weight with smaller padding and tighter spacing
- Add `whitespace-nowrap` to prevent wrapping

## 3. Lock Category Tabs During Active Session

**Problem**: Users can freely switch between Hitting/Pitching/Fielding tabs mid-session, which would discard their in-progress work without warning.

**File: `src/pages/PracticeHub.tsx`**

- Disable tab switching when `step !== 'select_type'` (i.e., user is in readiness, config, or logging steps)
- Add `pointer-events-none opacity-50` to the TabsList when a session is active
- The existing "Back" button flow already handles exiting cleanly -- users must back out to step 1 or save before switching categories

**Implementation**: Wrap the `onValueChange` handler to check if a session is in progress. If so, block the change (tabs appear visually disabled).

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/practice/RepScorer.tsx` | Use `pt.name` for all pitch type labels; remove slice limits |
| `src/pages/PracticeHub.tsx` | Scrollable tab bar; lock tabs during active session |

