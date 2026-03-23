

# Three Fixes: Supplements Navigation, Field Diagram Geometry, Multi-Video Both Hubs

## 1. Track Supplements Button — Scroll to Tabs

**Problem**: The wiring is correct — `onSwitchTab` calls `setActiveTab('supplements')` and the `Tabs` component uses the controlled `value={activeTab}`. However, the Quick Actions card is rendered far above the Tabs section (line 460 vs 466). When the user clicks "Track Supplements", the tab value changes but the user can't see it because the page doesn't scroll down to the Tabs area.

**Fix in `src/components/nutrition-hub/NutritionHubContent.tsx`**:
- Add a `useRef` on the `Tabs` container (e.g., `tabsRef`)
- Pass a modified `onSwitchTab` to `QuickLogActions` that both sets `activeTab` AND calls `tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })`

## 2. Field Diagram — Accurate Baseball/Softball Geometry

**Problem**: The current diagram uses a circular infield dirt shape, SS/2B fielding positions are too centered, and outfield positions have incorrect spacing.

**Fix in `src/components/game-scoring/FieldPositionDiagram.tsx`**:

Replace the circular infield dirt with a diamond (rotated square) matching the basepaths:
- Remove the two `<circle>` elements for infield dirt and grass cutout (lines 177-180)
- Replace with a rotated square `<polygon>` using the `home`, `first`, `second`, `third` coordinates, expanded slightly outward to represent the dirt beyond the basepaths
- Add an inner grass cutout as a smaller rotated square polygon

Update `POSITION_ZONES` to accurate coordinates:
```
P:  { x: 0.50, y: 0.65 }   — on the HP-2B line
C:  { x: 0.50, y: 0.85 }   — behind home
1B: { x: 0.70, y: 0.70 }   — near first base
2B: { x: 0.56, y: 0.50 }   — behind second, offset right  
SS: { x: 0.42, y: 0.58 }   — between 2B and 3B, closer to 2B, behind dirt line
3B: { x: 0.30, y: 0.70 }   — near third base
LF: { x: 0.30, y: 0.30 }   — on arc between 3B foul line and CF
CF: { x: 0.50, y: 0.20 }   — directly above HP-2B line
RF: { x: 0.70, y: 0.30 }   — on arc between 1B foul line and CF
```

Key geometry rules enforced:
- Home→1B and Home→3B at 45° angles (already correct via `diagDist` math)
- Pitcher on straight HP→2B line (already correct, `cx`)
- All 3 OF positions on same arc distance from home
- SS positioned between 2B and 3B, slightly closer to 2B, behind the dirt edge

## 3. Multi-Video Upload — Game Hub & Practice Hub

**Game Hub** (`src/components/game-scoring/GameVideoPlayer.tsx`): Already supports multiple videos (implemented in prior change). No further changes needed for upload.

**Practice Hub** (`src/components/practice/SessionVideoUploader.tsx`): Already supports multiple videos with tagging. No upload changes needed.

**Viewing saved videos in both hubs:**

**Game Hub — View game videos in session details:**
- File: `src/components/practice/RecentSessionsList.tsx` — Add video display in the expanded session details. When a session has `session_type === 'game'`, query `session_videos` for that session_id and render `<video>` elements with playback controls.
- The `session_videos` table stores `storage_path`, so use `supabase.storage.from('videos').getPublicUrl(path)` to get playable URLs.

**Practice Hub — View practice videos in session details:**
- Same file: `src/components/practice/RecentSessionsList.tsx` — For any session, query `session_videos` for matching session_id and render video players in the expanded collapsible section.
- Add a new sub-section in `CollapsibleContent` showing thumbnails/players for each video.

**Implementation approach:**
- Create a small `SessionVideos` component that takes a `sessionId` and fetches/displays videos from `session_videos` table
- Embed this component inside `RecentSessionsList`'s `CollapsibleContent`
- Videos render as compact `<video>` elements with controls
- Lazy-load: only fetch when the session row is expanded

## Files

| File | Change |
|------|--------|
| `src/components/nutrition-hub/NutritionHubContent.tsx` | Add ref to Tabs, scroll into view on tab switch |
| `src/components/game-scoring/FieldPositionDiagram.tsx` | Replace circular dirt with diamond, update position zones, fix SS/OF placement |
| `src/components/practice/RecentSessionsList.tsx` | Add video display in expanded session details |
| New: `src/components/practice/SessionVideosDisplay.tsx` | Reusable component to fetch and display session videos |

