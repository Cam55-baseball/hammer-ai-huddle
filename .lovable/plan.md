## Goal

Make the dashboard feel calmer. Pull Weekly Recap and What's Likely Next up to the top, shrink them, put them side-by-side with stronger borders, and tighten a few other busy spots.

## Changes

### 1. Weekly Recap + What's Likely Next — compact side-by-side row at the top

In `src/pages/Dashboard.tsx`:
- Remove the existing `<WeeklyDigestPreview />` and `<ForecastPreview />` block from below the Game Plan.
- Add a new compact row directly under the hero image (above the Identity card) for athletes only:
  ```
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <WeeklyDigestPreview />
    <ForecastPreview />
  </div>
  ```

In `src/components/dashboard/WeeklyDigestPreview.tsx` and `ForecastPreview.tsx`:
- Swap `border-border` → `border-2 border-foreground/20` for a darker, more defined edge.
- Reduce padding `p-5 sm:p-6` → `p-4`.
- Show only the top 2 bullets max (truncate from current 3 in Weekly, current 2 in Forecast stays).
- Shrink bullet text to `text-xs sm:text-sm`, tighten line-height.
- Shorten header link copy: "Open weekly digest" → "Full recap", "Open forecast" → "See more".

### 2. Other cleanup moves to reduce overwhelm

- **Hero image**: drop `aspect-[16/9] sm:aspect-[21/9]` → `aspect-[21/9] sm:aspect-[32/9]` so it takes less vertical space on mobile.
- **Command Center wrapper**: remove the extra `<section className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">` wrapper — it double-frames the cards inside. Render `<CommandCenterSection />` directly.
- **Spacing**: change root container `space-y-4 sm:space-y-6` → `space-y-3 sm:space-y-5` for tighter rhythm.
- **Merch card**: this is a heavy gradient block at the bottom. No structural change requested, but flag for future: could be collapsed into a small banner.

## Out of scope

- Game Plan, Identity Card, Command Center internals, Communication AI, module cards, merch card visuals — all untouched.
- No data, hook, or routing changes.

## Files

- edit `src/pages/Dashboard.tsx`
- edit `src/components/dashboard/WeeklyDigestPreview.tsx`
- edit `src/components/dashboard/ForecastPreview.tsx`
