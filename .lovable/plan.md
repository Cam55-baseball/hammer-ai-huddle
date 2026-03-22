

# Royal Timing — Master Controls One-Line & Session Video Playback

## 1. Master Controls: Single Line on Mobile

**File: `src/components/royal-timing/InlineTimer.tsx`**

The compact (mobile) layout currently uses two rows. Merge everything into a single row:

- Remove the `flex-col` two-row split in the `compact` branch
- Render all elements in one `flex items-center` row: label, time, synced badge, auto toggle, play/pause, reset, sync — all inline
- Shrink buttons to `h-5 w-5` with `h-2.5 w-2.5` icons
- Use `text-sm` for timer value (down from `text-base`)
- Remove label text entirely in compact mode (save space) or use a 1-char abbreviation
- Use `gap-0.5` throughout

**File: `src/components/royal-timing/RoyalTimingModule.tsx` (lines 338-373)**

- Merge the InlineTimer and the master playback buttons into a single row too
- Shrink master playback buttons to `h-5 w-5`
- Speed selector: `w-12 h-5 text-[10px]`
- Single `flex items-center gap-0.5` container for everything

## 2. Session Videos Viewable in Library

When a user clicks on a session in the Library, they currently just load it into the main editor. The videos stored at `video_1_path` / `video_2_path` get loaded via `getPublicUrl`. This already works — sessions with stored videos display them.

**However**, the session row in the library only shows a "Video" badge but doesn't let users preview videos without fully loading the session. Add an expandable video preview to session rows:

**File: `src/components/royal-timing/RoyalTimingLibrary.tsx`**

- In `SessionRow`, add a clickable expand toggle (e.g., eye icon) that shows video thumbnails/players inline below the session info
- When expanded, fetch signed URLs for `video_1_path` and `video_2_path` using `supabase.storage.from('videos').createSignedUrl()`
- Render compact `<video>` elements (small aspect ratio, controls) for each available video
- Use a local `useState` for expanded state per row
- Keep the row compact when collapsed (current behavior)

## Files

| File | Change |
|------|--------|
| `src/components/royal-timing/InlineTimer.tsx` | Merge compact mode into single row, shrink all elements |
| `src/components/royal-timing/RoyalTimingModule.tsx` | Merge master timer + playback into one compact row |
| `src/components/royal-timing/RoyalTimingLibrary.tsx` | Add expandable video preview to session rows |

