

# Three Fixes: Supplements Button, Field Diagram Labels, Multi-Video Upload

## 1. Track Supplements Button Fix

**Problem**: The `Tabs` component uses `defaultValue="today"` (uncontrolled). When `QuickLogActions` calls `setSearchParams({ tab: 'supplements' })` and tries `document.querySelector('[data-value="supplements"]').click()`, the query selector may not find the element because Radix uses `data-state` not `data-value`, or the element is scrolled out of view.

**Fix in `src/components/nutrition-hub/NutritionHubContent.tsx`**:
- Convert `Tabs` from uncontrolled (`defaultValue`) to controlled (`value` + `onValueChange`) using a state variable `activeTab`
- Read `tab` from URL search params on mount and set `activeTab` accordingly
- Remove the DOM query hack from `QuickLogActions` — instead, pass `onSwitchTab` callback prop to `QuickLogActions`

**Fix in `src/components/nutrition-hub/QuickLogActions.tsx`**:
- Accept `onSwitchTab?: (tab: string) => void` prop
- Replace the `setSearchParams` + `querySelector` hack with a simple `onSwitchTab?.('supplements')` call

## 2. Field Diagram Base Label Alignment

**Problem**: The position labels (1B, 2B, 3B, SS, etc.) are rendered at `POSITION_ZONES` coordinates, which represent **fielding positions** (where players stand), not the actual base locations. The bases (white diamonds) are rendered at computed pixel coordinates (`first`, `second`, `third`, `home`) but have no labels. This makes the diagram confusing — labels don't align with bases.

**Fix in `src/components/game-scoring/FieldPositionDiagram.tsx`**:
- Add explicit base labels ("1B", "2B", "3B", "HP") positioned adjacent to the actual base diamonds using the computed `first`, `second`, `third`, `home` pixel coordinates with small offsets
- Keep the position zone labels but rename them to show just the position abbreviation without the base designation (e.g., keep "P", "SS", "LF", "CF", "RF") — these are fielding positions
- For the base labels, use slightly larger font and brighter white so they stand out as landmark labels

## 3. Multi-Video Upload for Game Hub

**Problem**: `GameVideoPlayer` only accepts a single video file. Practice Hub already supports multiple videos via `SessionVideoUploader`, but Game Hub does not.

**Fix in `src/components/game-scoring/GameVideoPlayer.tsx`**:
- Change from single `videoUrl` state to `videos: { id, file, url }[]` array
- Accept `multiple` on the file input
- Render a horizontal strip of video thumbnails (like `SessionVideoUploader` does)
- Active video plays in the main player area; click a thumbnail to switch
- Keep all existing controls (scrubber, frame-step, pause & log) working on the active video
- Update `onVideoLoaded` to pass all URLs or the active URL

**Fix in `src/components/practice/SessionVideoUploader.tsx`**: Already supports multiple — no changes needed.

## Files

| File | Change |
|------|--------|
| `src/components/nutrition-hub/NutritionHubContent.tsx` | Controlled Tabs with `activeTab` state, pass `onSwitchTab` to QuickLogActions |
| `src/components/nutrition-hub/QuickLogActions.tsx` | Accept `onSwitchTab` prop, remove DOM query hack |
| `src/components/game-scoring/FieldPositionDiagram.tsx` | Add base labels at actual base positions |
| `src/components/game-scoring/GameVideoPlayer.tsx` | Support multiple video uploads with thumbnail strip and active video switching |

