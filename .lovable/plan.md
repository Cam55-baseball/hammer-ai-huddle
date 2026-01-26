
# Interactive Body Map for Pain/Limitation Tracking

## Overview

Replace the current button-based pain selector with an interactive SVG human silhouette that users can tap to highlight specific body areas experiencing pain or limitations. This creates a more intuitive, visual experience for athletes during their pre-workout check-in.

## Current State

The `BodyAreaSelector` component currently displays 10 emoji-labeled buttons for body regions. Users tap buttons to toggle selection, which works but lacks visual context and feels less engaging than an anatomical diagram.

**Current body areas tracked:**
- Head/Neck, Shoulder, Upper Back, Lower Back
- Elbow, Wrist/Hand, Hip
- Knee, Ankle, Foot

## Design Approach

Create a front-facing human silhouette SVG with clearly defined, tappable zones for each body region. Selected areas glow red to indicate pain/limitation.

### Visual Design
- Clean, minimal human outline (gender-neutral athletic silhouette)
- Responsive sizing to fit mobile dialogs
- Color scheme:
  - Default zones: subtle gray/muted outline
  - Hover: light highlight
  - Selected (pain): red glow with pulsing animation
- Labels appear on hover/selection for accessibility

### User Experience
- Tap any body zone to toggle pain selection
- Haptic feedback on selection (existing vibration pattern)
- Selected areas visually "light up" in red
- Summary chips below the map show selected areas
- Works alongside existing pain scale and movement questions

---

## Technical Implementation

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/vault/quiz/BodyMapSelector.tsx` | **Create** | New interactive SVG body map component |
| `src/components/vault/quiz/BodyAreaSelector.tsx` | **Modify** | Update to use BodyMapSelector internally |
| `src/i18n/locales/en.json` | **Update** | Add new translation keys for body map labels |

### New Component: BodyMapSelector.tsx

The core component will contain:

1. **SVG Human Silhouette** with defined path regions for each body area
2. **Interactive Zones** - Each zone is a clickable SVG path/group with:
   - Unique ID matching existing area IDs (head_neck, shoulder, etc.)
   - Hover and selected states via CSS classes
   - Click handler to toggle selection
3. **Selected Area Chips** - Display selected areas below the map as visual confirmation

### SVG Zone Structure

```text
+-------------------+
|       HEAD        |  head_neck zone
|      /    \       |
|     SHOULDER      |  shoulder zone (symmetric)
|    /        \     |
|   UPPER BACK      |  upper_back zone
|   |   ARM   |     |  
|   | (ELBOW) |     |  elbow zone (symmetric)
|   |  WRIST  |     |  wrist_hand zone (symmetric)
|   LOWER BACK      |  lower_back zone
|      HIP          |  hip zone
|     /    \        |
|    KNEE   KNEE    |  knee zone (symmetric)
|    |      |       |
|   ANKLE  ANKLE    |  ankle zone (symmetric)
|   FOOT   FOOT     |  foot zone (symmetric)
+-------------------+
```

### Zone Mapping

| Zone ID | SVG Region | Position |
|---------|------------|----------|
| `head_neck` | Head + neck area | Top center |
| `shoulder` | Both shoulder caps | Upper sides |
| `upper_back` | Upper torso back | Upper center |
| `lower_back` | Lower torso back | Mid center |
| `elbow` | Both elbow joints | Mid arms |
| `wrist_hand` | Both wrists/hands | Lower arms |
| `hip` | Hip/pelvis area | Lower torso |
| `knee` | Both knee joints | Upper legs |
| `ankle` | Both ankle joints | Lower legs |
| `foot` | Both feet | Bottom |

### Interaction Behavior

1. **Tap/Click Zone** → Toggle selection state
2. **Haptic Feedback** → `navigator.vibrate(10)` on toggle (existing pattern)
3. **Visual Feedback**:
   - Unselected: `fill: hsl(var(--muted))` with subtle stroke
   - Hover: `fill: hsl(var(--muted-foreground)/20%)`
   - Selected: `fill: rgba(239, 68, 68, 0.3)` (red-500/30) with red stroke and subtle pulse animation

### Component Props (unchanged)

```typescript
interface BodyMapSelectorProps {
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
}
```

This maintains full backward compatibility with the existing `BodyAreaSelector` interface.

---

## Integration Points

### VaultFocusQuizDialog

No changes needed - the existing integration at lines 870-873 will work with the updated component:

```tsx
<BodyAreaSelector
  selectedAreas={painLocations}
  onChange={setPainLocations}
/>
```

### Pain Pattern Alert System

No changes needed - the `VaultPainPatternAlert` component uses the same area IDs stored in the database.

### Translations

Add body map specific labels if needed (existing area translations remain unchanged).

---

## Accessibility Considerations

- Each zone has an accessible role and aria-label
- Keyboard navigation support (Tab through zones, Enter/Space to toggle)
- Focus indicators for keyboard users
- Screen reader announces: "Body region [name], [selected/not selected]"
- Selected areas also shown as text chips below the map for clarity

---

## Mobile Optimization

- SVG scales responsively within the dialog container
- Touch targets sized for comfortable tapping (minimum 44x44px effective area)
- Zones sized proportionally to ensure easy selection on small screens
- No pinch-to-zoom interference (maintains dialog scroll behavior)

---

## Animation Details

Following the app's animation standards (fast, professional):

- Zone hover: 150ms transition
- Selection toggle: 100ms scale-in with red glow
- Pulse animation on selected zones: subtle 2s infinite pulse at reduced opacity

---

## Summary

This enhancement transforms the pain tracking experience from a list of buttons to an intuitive visual interface. Athletes can quickly tap exactly where they feel pain on a body silhouette, making the pre-workout check-in faster and more engaging while maintaining full compatibility with the existing data model and alert systems.
