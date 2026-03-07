

# UX Clarity, Coach Scroll Fix, Steps in Custom Activities, and Players Club Integration

## 1. Steps Label Clarity (SpeedTimeEntry)

**File: `src/components/speed-lab/SpeedTimeEntry.tsx`**

Currently time and steps inputs are inline with no visible labels — just placeholders. Restructure each rep entry from a single row into a stacked layout with clear labels:

```text
Rep 1
┌─────────────────────┐  ┌──────────────┐
│ Time (sec)          │  │ Steps Taken  │
│ [ 3.92 ]       sec  │  │ [ 14 ]       │
└─────────────────────┘  └──────────────┘
```

- Add `<Label>` elements above each input: "Time (sec)" and "Steps Taken"
- Keep the inline layout but wrap time+steps in a grid with labels
- Maintain existing stride analytics badges below
- Keep mobile-friendly compact sizing

## 2. Steps Input in Custom Activity Logging

**File: `src/components/folders/FolderItemPerformanceLogger.tsx`**

The `SetRow` interface already has a `distance` field. Add a `steps` field to `SetRow`:

```typescript
interface SetRow {
  set: number;
  weight?: number;
  reps?: number;
  time?: number;
  distance?: number;
  steps?: number;  // NEW
  unit?: string;
}
```

In the `flexible` mode rendering (which shows distance), add a "Steps" input next to distance:

```text
Dist  Steps
[ 30 ] [ 14 ]
```

This appears only in `flexible` mode (which covers running, speed, custom drills). The steps field persists via the existing `exerciseSets` JSONB path — no schema change needed since it's stored in JSONB `performance_data`.

## 3. Coach Selector Scroll Fix

**File: `src/components/practice/CoachSelector.tsx`**

The `ScrollArea` currently uses `className={connectedCoaches.length > 3 ? 'max-h-64' : ''}` but Radix ScrollArea needs an explicit fixed height to enable scrolling. Fix:

- Change to always apply `max-h-48` (or `max-h-64`) with `overflow-hidden` on the ScrollArea wrapper when there are more than 3 coaches
- Ensure the ScrollArea has a proper `h-` or `max-h-` style that enables the internal scrollbar
- The actual fix: `<ScrollArea className="max-h-48">` — always constrain height and let ScrollArea handle the overflow

## 4. Practice Sessions Auto-Save to Players Club

**Current state:** Players Club (`get-player-library` edge function) queries only the `videos` table where `saved_to_library = true`. Practice sessions (`performance_sessions`) are completely separate.

**Approach:** Extend the Players Club page and edge function to also return practice sessions alongside video sessions. This avoids duplicating data.

### Edge Function Update

**File: `supabase/functions/get-player-library/index.ts`**

Add a second query to fetch `performance_sessions` (non-deleted) for the target user, then merge both datasets into the response with a `source` field (`'video'` or `'practice'`).

### Frontend Update

**File: `src/pages/PlayersClub.tsx`**

- Add a new filter tab/chip: "Videos" | "Practice Sessions" | "All"
- Render practice sessions as cards showing: session type, date, module, sport, drill count, coach name, notes, and rep tags (from `drill_blocks` JSONB)
- Practice sessions don't need the "Save to Library" manual step — they appear automatically

### Session Detail

**File: `src/components/SessionDetailDialog.tsx`** (or new component)

- When clicking a practice session card, show session details: drill blocks, tags, notes, grades
- Rep tags are already stored in `drill_blocks[].outcome_tags` — display them as badges

## 5. Rep Tag Persistence and Display

Rep tags are already persisted in `drill_blocks[].outcome_tags` on `performance_sessions`. The change needed is purely display:

- In the Players Club practice session cards, render `outcome_tags` as colored badges
- In the session detail view, show tags per drill block

No schema changes needed — tags are already saved.

---

## Files to Modify

| File | Change |
|------|--------|
| `SpeedTimeEntry.tsx` | Add visible labels above time and steps inputs |
| `FolderItemPerformanceLogger.tsx` | Add `steps` field to SetRow, render steps input in flexible mode |
| `CoachSelector.tsx` | Fix ScrollArea height constraint for proper scrolling |
| `get-player-library/index.ts` | Add `performance_sessions` query alongside videos |
| `PlayersClub.tsx` | Add practice session rendering, filter tabs, tag display |

## No Schema Changes Needed

- Steps in custom activities: stored in JSONB `performance_data`
- Rep tags: already in `drill_blocks[].outcome_tags`
- Practice sessions: already in `performance_sessions` table
- Players Club: extended via edge function query, no new tables

