

# Left/Right Body Side Differentiation for Pain Tracking

## Overview

Enhance the interactive body map to allow users to specify exactly which side of their body is experiencing pain. Instead of selecting "Shoulder" for both sides, users can now tap "Left Shoulder" or "Right Shoulder" independently.

## Current State

The body map currently groups bilateral body parts together:
- Shoulders (both)
- Elbows (both)  
- Wrists/Hands (both)
- Hips (combined zone)
- Knees (both)
- Ankles (both)
- Feet (both)

Tapping any part of a bilateral zone selects the entire area, losing specificity about which side hurts.

## Design Approach

### Visual Changes
- Split each bilateral body part into separate tappable SVG zones
- Left side zones appear on the right side of the SVG (anatomical view - facing the user)
- Right side zones appear on the left side of the SVG
- Each zone highlights independently when selected
- Color coding remains consistent (red glow for pain)

### New Body Area IDs

| Current ID | New Left ID | New Right ID |
|------------|-------------|--------------|
| `shoulder` | `left_shoulder` | `right_shoulder` |
| `elbow` | `left_elbow` | `right_elbow` |
| `wrist_hand` | `left_wrist_hand` | `right_wrist_hand` |
| `hip` | `left_hip` | `right_hip` |
| `knee` | `left_knee` | `right_knee` |
| `ankle` | `left_ankle` | `right_ankle` |
| `foot` | `left_foot` | `right_foot` |

Centerline areas remain unchanged:
- `head_neck`
- `upper_back`
- `lower_back`

### User Experience
- Each side is independently tappable
- Summary chips show specific side (e.g., "L Shoulder", "R Knee")
- Haptic feedback on each selection
- Clear visual distinction between left and right zones

---

## Technical Implementation

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `src/components/vault/quiz/BodyMapSelector.tsx` | **Modify** | Split SVG zones into left/right, update IDs and labels |
| `src/components/vault/VaultPainPatternAlert.tsx` | **Modify** | Add new left/right labels to the mapping |

### 1. BodyMapSelector.tsx Changes

#### Update BODY_AREAS Array
Replace bilateral entries with left/right variants:

```typescript
const BODY_AREAS = [
  { id: 'head_neck', labelKey: 'Head/Neck' },
  // Shoulders - split
  { id: 'left_shoulder', labelKey: 'L Shoulder' },
  { id: 'right_shoulder', labelKey: 'R Shoulder' },
  { id: 'upper_back', labelKey: 'Upper Back' },
  { id: 'lower_back', labelKey: 'Lower Back' },
  // Elbows - split
  { id: 'left_elbow', labelKey: 'L Elbow' },
  { id: 'right_elbow', labelKey: 'R Elbow' },
  // Wrists - split
  { id: 'left_wrist_hand', labelKey: 'L Wrist/Hand' },
  { id: 'right_wrist_hand', labelKey: 'R Wrist/Hand' },
  // Hips - split
  { id: 'left_hip', labelKey: 'L Hip' },
  { id: 'right_hip', labelKey: 'R Hip' },
  // Knees - split
  { id: 'left_knee', labelKey: 'L Knee' },
  { id: 'right_knee', labelKey: 'R Knee' },
  // Ankles - split
  { id: 'left_ankle', labelKey: 'L Ankle' },
  { id: 'right_ankle', labelKey: 'R Ankle' },
  // Feet - split
  { id: 'left_foot', labelKey: 'L Foot' },
  { id: 'right_foot', labelKey: 'R Foot' },
];
```

#### Split SVG Zones
Convert each bilateral `<g>` group into two separate groups:

**Before (Shoulders):**
```xml
<g onClick={() => toggleArea('shoulder')} ...>
  <ellipse cx="62" cy="78" ... />  <!-- Left shoulder -->
  <ellipse cx="138" cy="78" ... /> <!-- Right shoulder -->
</g>
```

**After (Shoulders):**
```xml
<!-- Left Shoulder (appears on viewer's right - anatomical view) -->
<g onClick={() => toggleArea('left_shoulder')} className={getZoneClasses('left_shoulder')} ...>
  <ellipse cx="138" cy="78" rx="18" ry="12" />
</g>
<!-- Right Shoulder (appears on viewer's left) -->
<g onClick={() => toggleArea('right_shoulder')} className={getZoneClasses('right_shoulder')} ...>
  <ellipse cx="62" cy="78" rx="18" ry="12" />
</g>
```

Apply the same pattern to: elbows, wrists/hands, hips, knees, ankles, and feet.

### 2. VaultPainPatternAlert.tsx Changes

#### Expand Label Mapping
Add the new left/right area IDs to support pain pattern detection and display:

```typescript
const BODY_AREA_LABELS: Record<string, string> = {
  head_neck: 'Head/Neck',
  // Shoulders
  left_shoulder: 'Left Shoulder',
  right_shoulder: 'Right Shoulder',
  shoulder: 'Shoulder', // Keep for backward compatibility
  upper_back: 'Upper Back',
  lower_back: 'Lower Back',
  // Elbows
  left_elbow: 'Left Elbow',
  right_elbow: 'Right Elbow',
  elbow: 'Elbow',
  // Wrists
  left_wrist_hand: 'Left Wrist/Hand',
  right_wrist_hand: 'Right Wrist/Hand',
  wrist_hand: 'Wrist/Hand',
  // Hips
  left_hip: 'Left Hip',
  right_hip: 'Right Hip',
  hip: 'Hip',
  // Knees
  left_knee: 'Left Knee',
  right_knee: 'Right Knee',
  knee: 'Knee',
  // Ankles
  left_ankle: 'Left Ankle',
  right_ankle: 'Right Ankle',
  ankle: 'Ankle',
  // Feet
  left_foot: 'Left Foot',
  right_foot: 'Right Foot',
  foot: 'Foot'
};
```

---

## Anatomical Orientation Note

The body map uses **anatomical position** (facing the viewer):
- The figure's LEFT side appears on the VIEWER'S RIGHT
- The figure's RIGHT side appears on the VIEWER'S LEFT

This is the standard medical convention and matches what users expect when looking at a body diagram.

---

## Backward Compatibility

- Existing pain data with old IDs (`shoulder`, `knee`, etc.) will still display correctly in pain alerts
- The label mapping includes both old and new IDs
- No database migration required - the `pain_location` column accepts any string array

---

## Summary

This enhancement provides precise pain location tracking by splitting 7 bilateral body areas into 14 individual zones. Users can now specify exactly which shoulder, knee, or ankle hurts, enabling more accurate injury pattern detection and recovery insights.

