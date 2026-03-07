

# Fixes: Video Drag+Drop, Pitcher Position in Fielding, Field Diagram Visual Redesign

## 1. Video Player — Add Drag-and-Drop + Fix Error

**File: `src/components/game-scoring/GameVideoPlayer.tsx`**

The current video upload only supports click-to-browse via hidden `<Input type="file">`. No drag-and-drop support exists, which is what "video drag" refers to.

**Changes:**
- Add `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` handlers to the upload zone
- On drop, extract the file from `e.dataTransfer.files[0]`, run through `validateVideoFile`, create blob URL
- Add visual feedback (border color change) when dragging over the drop zone
- Add a scrubber/progress bar (`<input type="range">`) for video timeline seeking so users can drag through the video to find plays
- Add `controls` attribute to the `<video>` element as fallback for native video controls
- The error message is likely from file type validation being too strict or the upload zone not responding — ensure `accept="video/*"` on the drop handler and catch any exceptions in `URL.createObjectURL`

## 2. Pitcher (P) Position — Add to FieldingPositionSelector

**File: `src/components/practice/FieldingPositionSelector.tsx`**

`P` is already in `InfieldRepTypeFields.tsx` (line 51: `INFIELD_POSITIONS = ['P', '1B', '2B', '3B', 'SS']`) but is **missing from `FieldingPositionSelector.tsx`** which only has `1B, 2B, SS, 3B` in the Infield group.

**Change:** Add `{ value: 'P', label: 'P' }` to the `INFIELD_POSITIONS` array at line 4, making it:
```
const INFIELD_POSITIONS = [
  { value: 'P', label: 'P' },
  { value: '1B', label: '1B' },
  { value: '2B', label: '2B' },
  { value: 'SS', label: 'SS' },
  { value: '3B', label: '3B' },
];
```
Change the infield grid from `grid-cols-4` to `grid-cols-5` to accommodate.

## 3. Field Diagram — Complete Visual Redesign

**File: `src/components/game-scoring/FieldPositionDiagram.tsx`**

Current problems: uses transparent/muted fills like `fill-green-800/15` and `fill-amber-700/12` which look nearly invisible. No real field colors. Looks like a wireframe, not a field.

**Redesign with realistic field colors:**
- **Background/foul territory**: `fill-[#5a7d3a]` (darker green, like foul territory grass)
- **Fair territory outfield grass**: `fill-[#4a8c2a]` (vibrant green, primary grass color)
- **Infield dirt**: `fill-[#c4956a]` (tan/brown dirt color)
- **Infield grass cutout**: `fill-[#4a8c2a]` (same grass green)
- **Warning track**: `stroke-[#b8845a]` with thicker width (rust-colored track)
- **Basepaths**: `stroke-white/60` (white chalk lines)
- **Foul lines**: `stroke-white/50` (white chalk)
- **Bases**: `fill-white` (white bases)
- **Home plate**: `fill-white` (white pentagon)
- **Mound dirt circle**: `fill-[#c4956a]` with rubber `fill-white/80`
- **Outfield fence**: `stroke-[#2d5a1a]` strokeWidth 3 (darker green fence)
- **Grass mowing pattern**: Add alternating grass stripes using `<defs><pattern>` with slightly different green shades to simulate mowing lines (optional but elite)
- Remove all dark mode variants — use real field colors that work on any background
- Position zone highlight: use `fill-yellow-400/20 stroke-yellow-400/40` for better visibility against green
- Position labels: `fill-white/70` for readability on green field
- Dot labels: ensure contrast — "Player" in bold red, "Ball" in bold bright green
- Add a subtle drop shadow on dots for depth: `filter="drop-shadow(0 1px 2px rgba(0,0,0,0.3))"`

**Separate baseball vs softball visual differences** are already handled by geometry (baseDist, moundRatio). The color scheme is the same for both — the proportions change correctly.

## Files Modified

| File | Change |
|------|--------|
| `GameVideoPlayer.tsx` | Add drag-and-drop upload zone, video scrubber bar, error handling |
| `FieldingPositionSelector.tsx` | Add P to infield positions, adjust grid to 5 cols |
| `FieldPositionDiagram.tsx` | Realistic field colors (green grass, tan dirt, white lines/bases), grass pattern, improved dot visibility |

