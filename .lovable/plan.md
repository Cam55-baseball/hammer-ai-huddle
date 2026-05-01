## The bug

Library Health says **0/11 ready** but the list is empty and "Show only incomplete" shows nothing. Confirmed via DB: **all 11 videos are currently tier `blocked`** (every video is missing all 4 engine fields — format, skill, description, ≥2 tag assignments — so `recompute_library_video_tier` classified them as `blocked`).

Two compounding rules conspire to hide them from the owner:

1. **Fetch-side block**: `src/hooks/useVideoLibrary.ts` always appends `.neq('distribution_tier', 'blocked')` to the SQL query. This is a Phase-6 "athletes never see blocked" rule — but the owner dashboard reuses this same hook, so the owner never receives the rows either.
2. **Render-side block**: `VideoLibraryManager.tsx` has a "safety" early-return `if (tier === 'blocked') return null;` inside the map. Even if the rows were fetched, every card would be skipped.

Result: the readiness view (queried separately) sees 11 rows → "0/11 ready", but the video list is empty → owner has nothing to click and is stuck.

## The fix

Make the blocked-tier exclusion **audience-aware**, not absolute. Athletes still never see blocked videos. The owner must see them prominently — they're the highest-priority backfill targets.

### 1. `src/hooks/useVideoLibrary.ts`
- Add an `includeBlocked?: boolean` option (default `false` to preserve athlete safety).
- When `includeBlocked` is true, omit the `.neq('distribution_tier', 'blocked')` clause.

### 2. `src/components/owner/VideoLibraryManager.tsx`
- Pass `includeBlocked: true` when calling `useVideoLibrary` (this is the owner-only manager — gated by `useOwnerAccess`, mounted on the owner dashboard).
- Remove the `if (tier === 'blocked') return null;` early return in the card map. Owner must be able to see and edit Empty videos.
- Update the per-card UX so blocked videos are unmistakable:
  - The existing `ReadinessBadge` already renders a red **Empty** badge when all 4 fields are missing — keep it.
  - Reuse the throttled treatment (red helper line + **Quick Fix** button) for blocked videos so the owner can one-click into the editor with `auto_suggest`. Change the trigger from `isThrottled` to `isThrottled || tier === 'blocked'`, and pick a tier-appropriate helper line (e.g. `SYSTEM_TONE.blockedOwnerCard` if it exists, otherwise reuse the throttled string with a small prefix like "Hidden from athletes — fix to publish.").
- Recompute `throttledCount` is fine as-is. Add a parallel `blockedCount` and surface it in the existing OwnerCoachingNudge (or a sibling line) so the nudge truthfully reflects "11 hidden — fix now to publish" instead of "0 throttled".

### 3. `LibraryHealthStrip` / "Show only incomplete"
No code change required once the hook returns blocked rows. The current `incomplete` filter is `r && !r.is_ready`, which already includes empty rows. The list will populate immediately.

### 4. Sanity sweep
Search for other consumers of `useVideoLibrary` to confirm none of them are owner-side and accidentally relying on the blocked-exclusion. Athlete-facing pages (`VideoLibrary.tsx`, `VideoLibraryPlayer.tsx`, etc.) keep the default `includeBlocked: false` and behavior is unchanged.

## What the owner will see after the fix

- Library Health: **0/11 ready (0%)** — unchanged, still accurate.
- Video list: **11 cards visible**, each with a red **Empty** badge, a "Hidden from athletes — fix to publish" line, and a **Quick Fix** button that opens the editor with auto-suggest.
- Coaching nudge updates to reflect blocked count.
- "Show only incomplete" and "Backfill missing data" both work end-to-end.

## Files touched

- `src/hooks/useVideoLibrary.ts` — add `includeBlocked` option.
- `src/components/owner/VideoLibraryManager.tsx` — pass the flag, drop the render guard, extend Quick Fix to blocked tier, add blockedCount to nudge.
- `src/components/owner/OwnerCoachingNudge.tsx` — accept optional `blockedCount` and render a line for it (small additive change).

No DB migration. No engine logic change. Athlete experience unchanged.