## What's actually happening when the owner clicks "Fix now"

The button **does** fire — but its handler is wired to the wrong thing, so nothing visible changes:

1. **The nudge counts apples; the filter checks oranges.**
   - The "11 videos are throttled" count comes from `useVideoConfidenceMap` and counts videos whose locally-computed `ConfidenceTier === 'needs_work'` (score < 70). See `src/lib/videoConfidence.ts:86` and `src/components/owner/OwnerCoachingNudge.tsx:40`.
   - The handler `filterThrottled` in `VideoLibraryManager.tsx:155` just calls `setShowOnlyIncomplete(true)`.
   - But `visibleVideos` (line 108-114) filters by `readinessMap.get(v.id)?.is_ready === false` — a totally different signal (from `useVideoReadiness`, server-side row).
   - These three concepts (`needs_work` confidence tier, `distribution_tier === 'throttled'` from `library_videos`, and `is_ready` from readiness rows) are **not equivalent**. The nudge can say "11 throttled" while `is_ready=false` matches 0 videos — so the list either doesn't change or shows the wrong subset.

2. **No tab switch.** If the owner is on the Tags / Analytics / Hammer Suggestions tab when they click "Fix now", the Videos tab is never activated. State flips silently, owner sees no change.

3. **No scroll.** Even on the Videos tab, the filter toggle doesn't scroll the list into view, and the Videos tab counter just changes from `(N)` to `(M / N)` — easy to miss.

4. **No toast / no confirmation.** Click → silent state mutation → owner thinks the button is broken.

5. **No way back.** Even if the filter does engage, there's no obvious "Show all" affordance besides re-toggling the (small) Health Strip filter pill.

## Fix

Make "Fix now" a real, observable action that filters to **actually-throttled videos** and takes the owner straight to the work.

### 1. Add a dedicated "throttled-only" filter mode

`src/components/owner/VideoLibraryManager.tsx`
- Replace the binary `showOnlyIncomplete: boolean` with a small union: `videoFilter: 'all' | 'incomplete' | 'throttled'` (keep `setShowOnlyIncomplete` as a thin wrapper for the existing Health Strip pill so we don't break it).
- Update `visibleVideos` so:
  - `'incomplete'` → existing `is_ready === false` behavior (unchanged).
  - `'throttled'` → `normalizeTier((video as any).distribution_tier) === 'throttled'`. This is the **same** signal the per-card "Throttled" badge already uses (see line 217), so what the nudge promises is what the owner sees.
- The Videos tab count label updates to `Videos (visible / total · filter: throttled)` so the active filter is obvious.

### 2. Rewire `filterThrottled` to do all four things

`src/components/owner/VideoLibraryManager.tsx`
```ts
const filterThrottled = () => {
  setVideoFilter('throttled');
  // Switch to the Videos tab if not already there
  setActiveTab('videos');
  // Scroll the list into view on next paint
  requestAnimationFrame(() => {
    document.getElementById('owner-video-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // Confirm the action so the owner knows the click registered
  toast({
    title: 'Filtered to throttled videos',
    description: 'Open each one and use Quick Fix to restore reach.',
  });
};
```
- Convert the `<Tabs defaultValue="videos">` to a controlled `<Tabs value={activeTab} onValueChange={setActiveTab}>` so the programmatic switch actually happens.
- Add `id="owner-video-list"` to the wrapper around `visibleVideos.map(...)`.

### 3. Fix the count consistency so the nudge's number matches the filter's result

`src/components/owner/OwnerCoachingNudge.tsx`
- Today the nudge counts `confidenceMap` `tier === 'needs_work'`. The filter target is `distribution_tier === 'throttled'`. These can diverge.
- Switch the nudge to read `distribution_tier` directly (it's already on `library_videos` and already in the `videos` query result that `VideoLibraryManager` fetches). Pass a `throttledCount` prop from `VideoLibraryManager` instead of recomputing inside the nudge. Single source of truth → the "11 videos" claim and the filtered list always agree.
- Lower the threshold to `>= 1` (currently `>= 3`): if even one video is throttled, the owner should know.

### 4. Add a clear empty/active-filter state on the Videos tab

`src/components/owner/VideoLibraryManager.tsx`
- When `videoFilter === 'throttled'`:
  - If `visibleVideos.length === 0`: show a small success card — "No throttled videos. You're clear." — with a "Show all" button that resets the filter.
  - If `> 0`: render a sticky filter chip at the top of the list — "Showing throttled only · [Show all]" — so the owner can always escape.

### 5. Make Quick Fix the obvious next step on each throttled card

`src/components/owner/VideoLibraryManager.tsx`
- Throttled cards already render `SYSTEM_TONE.throttledOwnerCard` text (line 255). Add a primary "Quick Fix" button right next to it that calls the existing `openQuickFix(video, 'auto_suggest')`. This wires the nudge → filter → fix loop end-to-end in two clicks.

---

## Files to change

| File | Change |
|------|--------|
| `src/components/owner/VideoLibraryManager.tsx` | New `videoFilter` state; controlled Tabs; `filterThrottled` switches tab, scrolls, toasts; pass `throttledCount` to nudge; sticky filter chip + Quick Fix button |
| `src/components/owner/OwnerCoachingNudge.tsx` | Accept `throttledCount` prop instead of recomputing; lower threshold; same wording |
| (optional) `src/components/owner/LibraryHealthStrip.tsx` | If it reads `showOnlyIncomplete`, point it at the new state shape |

No DB, RPC, or edge-function changes. No migrations.

## Behavior after the fix

1. Owner sees: *"11 videos are throttled — fix now to restore reach."*
2. Click **Fix now** →
   - Tab switches to **Videos** if not already there.
   - List filters to exactly the 11 videos with `distribution_tier === 'throttled'`.
   - Page smooth-scrolls to the list.
   - Toast confirms: *"Filtered to throttled videos."*
   - Sticky chip at the top of the list shows the active filter with a one-click **Show all** escape.
3. Each throttled card shows a **Quick Fix** button that opens the editor with auto-suggest pre-armed.
4. Save in the editor → `recompute_library_video_tier` trigger fires → `distribution_tier` flips off `throttled` → the card drops out of the filtered list → counter ticks down → done.

## Risks

- Tabs becoming controlled could regress if other code calls `document.querySelector('[data-value="upload"]').click()` — there's one such call in the empty-state CTA (line 204). Replaced with `setActiveTab('upload')` in the same edit.
- Anyone else reading `showOnlyIncomplete` directly: only the Health Strip uses it; updated in lockstep.
