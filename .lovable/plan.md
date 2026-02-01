
# Follow the Target – Trackpad Control Area

## Problem Statement
Currently, the Follow the Target drill requires users to place their finger directly on the moving target. On touch devices, this causes the finger to obscure the target, degrading the visual training experience and making accurate tracking difficult.

## Solution: Decoupled Trackpad Control

Introduce a dedicated "trackpad" control zone at the bottom of the drill that translates finger movements into cursor position in the main viewing area above. This mirrors how a laptop trackpad controls cursor position without the finger being on the screen itself.

---

## Technical Architecture

### Layout Structure

```text
┌─────────────────────────────────────┐
│           VIEWING AREA              │
│   (Target moves here - read-only)   │
│                                     │
│       ●  ← Moving Target            │
│              ○ ← Cursor indicator   │
│                                     │
├─────────────────────────────────────┤
│         TRACKPAD CONTROL            │
│   (Finger moves here to control)    │
│                                     │
│        Touch/drag to track          │
└─────────────────────────────────────┘
```

### Key Implementation Details

1. **Dual-zone layout**: 
   - Top ~65%: Viewing area where target and cursor are displayed
   - Bottom ~35%: Trackpad control zone for touch input

2. **Movement mapping**: 
   - Finger position within trackpad zone maps to cursor position in viewing area
   - Uses percentage-based coordinates for responsive sizing
   - Both zones use the same 0-100% coordinate system

3. **Visual feedback in trackpad**:
   - Subtle finger indicator dot where user is touching
   - Border/background treatment to clearly delineate the control zone
   - "Touch here to track" prompt when not interacting

4. **Desktop fallback**:
   - Mouse users can still interact with the full area (existing behavior preserved)
   - Trackpad zone also responds to mouse for consistency

5. **Accuracy calculation unchanged**:
   - Distance between cursor position and target position still determines score
   - Same formula: `accuracy = max(0, 100 - distance * 2)`

---

## File Changes

### `src/components/tex-vision/drills/FollowTheTargetGame.tsx`

**Changes:**

1. Add a `trackpadRef` for the control zone
2. Split the container into two zones:
   - Viewing zone: Displays target + cursor indicator (touch events disabled)
   - Trackpad zone: Captures all touch/mouse input
3. Update touch/mouse handlers to use `trackpadRef` for coordinate calculation
4. Add trackpad visual styling with clear borders and hint text
5. Add a small finger indicator dot in the trackpad zone showing where user is touching
6. Preserve existing completion overlay, timer, and accuracy logic

**New state:**
- `fingerPosition`: Track finger position within trackpad for visual feedback

**Handler updates:**
- `handleTrackpadTouch`: Maps trackpad coordinates to viewing area coordinates
- Existing `handleMouseMove` updated to work with full area (desktop) or trackpad (touch)

**Visual updates:**
- Viewing area: Clean display of target and cursor, no touch interaction
- Trackpad area: Rounded rectangle with subtle grid pattern, border, and "Touch here" hint
- Finger indicator: Small dot showing current touch position in trackpad

---

## User Experience Flow

1. User opens Follow the Target drill
2. Target begins moving in the **viewing area** (top section)
3. User places finger on the **trackpad zone** (bottom section)
4. Finger movements in trackpad translate to cursor movements in viewing area
5. Cursor indicator follows finger movement proportionally
6. Target remains fully visible since finger is never on top of it
7. Accuracy calculated as before; completion overlay shows at timer end

---

## Technical Specifications

| Aspect | Value |
|--------|-------|
| Viewing area height | ~280px (65% of container) |
| Trackpad height | ~150px (35% of container) |
| Coordinate system | Percentage-based (0-100) |
| Touch handling | Prevent default to avoid scroll |
| Finger indicator | 20px semi-transparent dot |
| Trackpad border | 2px dashed with tex-vision-primary color |
