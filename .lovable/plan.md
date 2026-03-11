

# Fix 4 Issues: Video Library Post Error, Video+Log Upload, Video Controls, Recent Sessions

## Issue 1: Video Library Post Error (Owner Can't Insert)

**Root Cause**: The RLS policy on `library_videos` requires `user_has_role(auth.uid(), 'owner')`, but the app owner's `user_roles` table only has a `player` role — no `owner` row exists. The insert is blocked by RLS.

**Fix**: Insert an `owner` role row for this user into `user_roles`. This is a data operation, not a schema change.

Additionally, confirm the `owner_id` column in the insert matches `user.id` (it does in current code — line 54 of `useVideoLibraryAdmin.ts`).

**Action**: Use the insert tool to add the owner role:
```sql
INSERT INTO public.user_roles (user_id, role, status)
VALUES ('2e49357d-8f7e-4c0a-9724-fd1a81a6f9df', 'owner', 'active')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Issue 2: Video+Log Upload Malfunctioning

**Root Cause**: The `VideoRepLogger.tsx` uses `URL.createObjectURL()` which works fine, but the video element has no `controls` attribute and no scrubber. The `loadedmetadata` event listener is added inside a `useEffect` that depends on `videoSrc`, but the video element may not have loaded by the time the effect runs. Additionally, there are no frame-by-frame controls.

**Fix in `VideoRepLogger.tsx`**:
- Add a range input scrubber (like `GameVideoPlayer` has)
- Add frame-by-frame forward/back buttons (ChevronLeft/ChevronRight, ±0.033s)
- Add `playsInline` and ensure the video element has proper event handling
- Add a pause & seek UI for precise timestamp capture

## Issue 3: Video Scrubber/Timeline for Video+Log

Same as Issue 2 — the `VideoRepLogger` needs:
- Range input scrubber (`<input type="range">`) synced to video currentTime
- Frame-by-frame buttons (±1/30th sec)
- Time display showing current/total

**Changes to `VideoRepLogger.tsx`**:
- Add scrubber slider between video and controls
- Add ChevronLeft/ChevronRight frame step buttons
- Add formatted time display

## Issue 4: Recent Sessions Not Showing Contents

**Root Cause**: `RecentSessionsList.tsx` displays session cards but they're not clickable/expandable. The user wants to view the actual session contents (reps, drill blocks, notes, etc).

**Fix in `RecentSessionsList.tsx`**:
- Make each session card clickable to expand/show details
- Show drill block details (drill names, volumes, outcomes) when expanded
- Show notes if present
- Show composite indexes if present
- Alternatively, navigate to a session detail view on click

## Files to Edit

| File | Changes |
|------|---------|
| `src/components/practice/VideoRepLogger.tsx` | Add scrubber slider, frame-by-frame controls, time display |
| `src/components/practice/RecentSessionsList.tsx` | Make sessions expandable to show drill_blocks, notes, composite_indexes content |

## Data Operation

Insert owner role for the app owner user via the insert tool.

