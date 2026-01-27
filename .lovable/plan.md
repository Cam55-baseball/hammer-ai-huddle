
# Enhanced Multi-View Body Map with Detailed Pain Tracking

## Overview

Transform the current single-view body map into a comprehensive multi-view system with significantly more detailed anatomical zones. Users will be able to select from Front, Back, Left Side, and Right Side views, with granular body regions like "Left Hamstring", "Right Inside Ankle", "Left Chest", etc.

## Current State

The body map currently shows:
- Single front-facing view only
- 17 body areas (head/neck, shoulders, back, elbows, wrists, hips, knees, ankles, feet)
- Left/right differentiation for bilateral parts
- No muscle-specific zones (e.g., hamstring, quad, calf)
- No front/back distinction for torso (chest vs back)

## Design Approach

### Multi-View Navigation

Users will see a tab/toggle bar above the body map to switch between views:

```text
┌─────────┬─────────┬─────────┬─────────┐
│  Front  │  Back   │ L Side  │ R Side  │
└─────────┴─────────┴─────────┴─────────┘
```

Each view displays a different SVG silhouette with view-specific zones.

### Expanded Body Area Categories

| Category | Front View | Back View | Side Views |
|----------|------------|-----------|------------|
| **Head/Neck** | Face, Neck (front) | Head (back), Neck (back) | Temple, Jaw |
| **Shoulders** | L/R Shoulder (front) | L/R Shoulder (back) | Deltoid |
| **Chest/Upper Back** | L/R Chest, Sternum | L/R Upper Back, L/R Lat | Ribs |
| **Arms** | L/R Bicep, L/R Forearm (front) | L/R Tricep, L/R Forearm (back) | - |
| **Core** | Abs (upper/lower) | Lower Back, L/R Oblique | - |
| **Hips/Glutes** | L/R Hip Flexor, L/R Groin | L/R Glute | - |
| **Upper Legs** | L/R Quad (inner/outer) | L/R Hamstring (inner/outer) | L/R IT Band |
| **Knees** | L/R Knee (front) | L/R Knee (back) | L/R Knee (side) |
| **Lower Legs** | L/R Shin | L/R Calf (inner/outer) | - |
| **Ankles/Feet** | L/R Ankle (inside/outside), L/R Foot (top) | L/R Achilles, L/R Heel | Arch, Ball of Foot |
| **Hands/Wrists** | L/R Wrist, L/R Palm | L/R Wrist (back), L/R Hand (back) | Thumb, Fingers |
| **Elbows** | L/R Elbow (inner) | L/R Elbow (outer) | - |

### New Body Area IDs (Comprehensive List)

**Head & Neck:**
- `head_front`, `head_back`, `neck_front`, `neck_back`

**Shoulders:**
- `left_shoulder_front`, `right_shoulder_front`
- `left_shoulder_back`, `right_shoulder_back`

**Chest & Upper Back:**
- `left_chest`, `right_chest`, `sternum`
- `left_upper_back`, `right_upper_back`
- `left_lat`, `right_lat`

**Arms:**
- `left_bicep`, `right_bicep`
- `left_tricep`, `right_tricep`
- `left_forearm_front`, `right_forearm_front`
- `left_forearm_back`, `right_forearm_back`

**Core:**
- `upper_abs`, `lower_abs`
- `left_oblique`, `right_oblique`
- `lower_back_left`, `lower_back_right`, `lower_back_center`

**Hips & Glutes:**
- `left_hip_flexor`, `right_hip_flexor`
- `left_groin`, `right_groin`
- `left_glute`, `right_glute`

**Upper Legs:**
- `left_quad_inner`, `left_quad_outer`, `right_quad_inner`, `right_quad_outer`
- `left_hamstring_inner`, `left_hamstring_outer`, `right_hamstring_inner`, `right_hamstring_outer`
- `left_it_band`, `right_it_band`

**Knees:**
- `left_knee_front`, `right_knee_front`
- `left_knee_back`, `right_knee_back`

**Lower Legs:**
- `left_shin`, `right_shin`
- `left_calf_inner`, `left_calf_outer`, `right_calf_inner`, `right_calf_outer`

**Ankles & Feet:**
- `left_ankle_inside`, `left_ankle_outside`, `right_ankle_inside`, `right_ankle_outside`
- `left_achilles`, `right_achilles`
- `left_heel`, `right_heel`
- `left_foot_top`, `right_foot_top`
- `left_foot_arch`, `right_foot_arch`

**Wrists & Hands:**
- `left_wrist_front`, `right_wrist_front`
- `left_wrist_back`, `right_wrist_back`
- `left_palm`, `right_palm`
- `left_hand_back`, `right_hand_back`

**Elbows:**
- `left_elbow_inner`, `right_elbow_inner`
- `left_elbow_outer`, `right_elbow_outer`

---

## Technical Implementation

### Component Architecture

```text
BodyMapSelector (container)
├── View Tab Bar (Front/Back/L Side/R Side)
├── SVG Container (switches based on view)
│   ├── BodyMapFront.tsx (SVG component)
│   ├── BodyMapBack.tsx (SVG component)
│   ├── BodyMapLeftSide.tsx (SVG component)
│   └── BodyMapRightSide.tsx (SVG component)
├── Selected Areas Chips (all views combined)
└── Helper Text
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/vault/quiz/BodyMapSelector.tsx` | **Major Modify** | Add view tabs, state management, import sub-components |
| `src/components/vault/quiz/body-maps/BodyMapFront.tsx` | **Create** | Front view SVG with detailed zones |
| `src/components/vault/quiz/body-maps/BodyMapBack.tsx` | **Create** | Back view SVG with detailed zones |
| `src/components/vault/quiz/body-maps/BodyMapLeftSide.tsx` | **Create** | Left side view SVG |
| `src/components/vault/quiz/body-maps/BodyMapRightSide.tsx` | **Create** | Right side view SVG |
| `src/components/vault/quiz/body-maps/bodyAreaDefinitions.ts` | **Create** | Shared constants for all body area IDs and labels |
| `src/components/vault/VaultPainPatternAlert.tsx` | **Modify** | Add all new area ID labels for pattern detection |
| `src/components/vault/VaultPainHeatMapCard.tsx` | **Modify** | Add multi-view support and new area IDs |

### Shared Body Area Definitions

Create a centralized file for all body area definitions:

```typescript
// bodyAreaDefinitions.ts
export const BODY_AREAS = {
  front: [
    { id: 'head_front', label: 'Head (Front)' },
    { id: 'neck_front', label: 'Neck (Front)' },
    { id: 'left_shoulder_front', label: 'L Shoulder (Front)' },
    { id: 'right_shoulder_front', label: 'R Shoulder (Front)' },
    { id: 'left_chest', label: 'L Chest' },
    { id: 'right_chest', label: 'R Chest' },
    { id: 'left_bicep', label: 'L Bicep' },
    { id: 'right_bicep', label: 'R Bicep' },
    { id: 'left_forearm_front', label: 'L Forearm (Front)' },
    { id: 'right_forearm_front', label: 'R Forearm (Front)' },
    { id: 'upper_abs', label: 'Upper Abs' },
    { id: 'lower_abs', label: 'Lower Abs' },
    { id: 'left_hip_flexor', label: 'L Hip Flexor' },
    { id: 'right_hip_flexor', label: 'R Hip Flexor' },
    { id: 'left_groin', label: 'L Groin' },
    { id: 'right_groin', label: 'R Groin' },
    { id: 'left_quad_inner', label: 'L Quad (Inner)' },
    { id: 'left_quad_outer', label: 'L Quad (Outer)' },
    { id: 'right_quad_inner', label: 'R Quad (Inner)' },
    { id: 'right_quad_outer', label: 'R Quad (Outer)' },
    { id: 'left_knee_front', label: 'L Knee (Front)' },
    { id: 'right_knee_front', label: 'R Knee (Front)' },
    { id: 'left_shin', label: 'L Shin' },
    { id: 'right_shin', label: 'R Shin' },
    { id: 'left_ankle_inside', label: 'L Ankle (Inside)' },
    { id: 'left_ankle_outside', label: 'L Ankle (Outside)' },
    { id: 'right_ankle_inside', label: 'R Ankle (Inside)' },
    { id: 'right_ankle_outside', label: 'R Ankle (Outside)' },
    { id: 'left_foot_top', label: 'L Foot (Top)' },
    { id: 'right_foot_top', label: 'R Foot (Top)' },
    // ... more front areas
  ],
  back: [
    { id: 'head_back', label: 'Head (Back)' },
    { id: 'neck_back', label: 'Neck (Back)' },
    { id: 'left_shoulder_back', label: 'L Shoulder (Back)' },
    { id: 'right_shoulder_back', label: 'R Shoulder (Back)' },
    { id: 'left_upper_back', label: 'L Upper Back' },
    { id: 'right_upper_back', label: 'R Upper Back' },
    { id: 'left_lat', label: 'L Lat' },
    { id: 'right_lat', label: 'R Lat' },
    { id: 'left_tricep', label: 'L Tricep' },
    { id: 'right_tricep', label: 'R Tricep' },
    { id: 'left_forearm_back', label: 'L Forearm (Back)' },
    { id: 'right_forearm_back', label: 'R Forearm (Back)' },
    { id: 'lower_back_left', label: 'Lower Back (L)' },
    { id: 'lower_back_center', label: 'Lower Back (Center)' },
    { id: 'lower_back_right', label: 'Lower Back (R)' },
    { id: 'left_glute', label: 'L Glute' },
    { id: 'right_glute', label: 'R Glute' },
    { id: 'left_hamstring_inner', label: 'L Hamstring (Inner)' },
    { id: 'left_hamstring_outer', label: 'L Hamstring (Outer)' },
    { id: 'right_hamstring_inner', label: 'R Hamstring (Inner)' },
    { id: 'right_hamstring_outer', label: 'R Hamstring (Outer)' },
    { id: 'left_knee_back', label: 'L Knee (Back)' },
    { id: 'right_knee_back', label: 'R Knee (Back)' },
    { id: 'left_calf_inner', label: 'L Calf (Inner)' },
    { id: 'left_calf_outer', label: 'L Calf (Outer)' },
    { id: 'right_calf_inner', label: 'R Calf (Inner)' },
    { id: 'right_calf_outer', label: 'R Calf (Outer)' },
    { id: 'left_achilles', label: 'L Achilles' },
    { id: 'right_achilles', label: 'R Achilles' },
    { id: 'left_heel', label: 'L Heel' },
    { id: 'right_heel', label: 'R Heel' },
    // ... more back areas
  ],
  leftSide: [
    { id: 'left_temple', label: 'L Temple' },
    { id: 'left_it_band', label: 'L IT Band' },
    { id: 'left_oblique', label: 'L Oblique' },
    { id: 'left_ribs', label: 'L Ribs' },
    // ... side-specific areas
  ],
  rightSide: [
    { id: 'right_temple', label: 'R Temple' },
    { id: 'right_it_band', label: 'R IT Band' },
    { id: 'right_oblique', label: 'R Oblique' },
    { id: 'right_ribs', label: 'R Ribs' },
    // ... side-specific areas
  ],
};

export const ALL_BODY_AREAS = [
  ...BODY_AREAS.front,
  ...BODY_AREAS.back,
  ...BODY_AREAS.leftSide,
  ...BODY_AREAS.rightSide,
];

export const BODY_AREA_LABELS: Record<string, string> = 
  Object.fromEntries(ALL_BODY_AREAS.map(a => [a.id, a.label]));
```

### Updated BodyMapSelector Structure

```typescript
type BodyView = 'front' | 'back' | 'left' | 'right';

export function BodyMapSelector({ selectedAreas, onChange }: BodyMapSelectorProps) {
  const [activeView, setActiveView] = useState<BodyView>('front');
  
  const toggleArea = (areaId: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (selectedAreas.includes(areaId)) {
      onChange(selectedAreas.filter(a => a !== areaId));
    } else {
      onChange([...selectedAreas, areaId]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Localized pain today?</p>
      
      {/* View Selector Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-muted/50 p-1">
          {(['front', 'back', 'left', 'right'] as BodyView[]).map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                activeView === view
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view === 'left' ? 'L Side' : view === 'right' ? 'R Side' : view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Body Map SVG - switches based on view */}
      <div className="flex justify-center">
        {activeView === 'front' && <BodyMapFront selectedAreas={selectedAreas} onToggle={toggleArea} />}
        {activeView === 'back' && <BodyMapBack selectedAreas={selectedAreas} onToggle={toggleArea} />}
        {activeView === 'left' && <BodyMapLeftSide selectedAreas={selectedAreas} onToggle={toggleArea} />}
        {activeView === 'right' && <BodyMapRightSide selectedAreas={selectedAreas} onToggle={toggleArea} />}
      </div>

      {/* Selected Areas Summary - shows selections from ALL views */}
      {selectedAreas.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {selectedAreas.map(areaId => (
            <button key={areaId} onClick={() => toggleArea(areaId)} className="...">
              {BODY_AREA_LABELS[areaId] || areaId} ×
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic text-center">
          No pain areas selected (that's great!)
        </p>
      )}
    </div>
  );
}
```

### SVG View Components

Each view component receives the same props and renders its specific SVG:

```typescript
interface BodyMapViewProps {
  selectedAreas: string[];
  onToggle: (areaId: string) => void;
}

export function BodyMapFront({ selectedAreas, onToggle }: BodyMapViewProps) {
  const isSelected = (id: string) => selectedAreas.includes(id);
  const getZoneClasses = (id: string) => cn(
    "cursor-pointer transition-all duration-150",
    isSelected(id)
      ? "fill-red-500/30 stroke-red-500 stroke-[2] animate-pulse-subtle"
      : "fill-muted/50 stroke-muted-foreground/30 stroke-[1] hover:fill-muted-foreground/20"
  );

  return (
    <svg viewBox="0 0 200 380" className="w-full max-w-[180px] h-auto">
      {/* Head (Front) */}
      <g onClick={() => onToggle('head_front')} className={getZoneClasses('head_front')}>
        <ellipse cx="100" cy="28" rx="22" ry="26" />
      </g>
      
      {/* Left Chest */}
      <g onClick={() => onToggle('left_chest')} className={getZoneClasses('left_chest')}>
        <path d="M100 70 L128 65 L130 95 L100 100 Z" />
      </g>
      
      {/* Right Chest */}
      <g onClick={() => onToggle('right_chest')} className={getZoneClasses('right_chest')}>
        <path d="M100 70 L72 65 L70 95 L100 100 Z" />
      </g>
      
      {/* Left Quad Inner */}
      <g onClick={() => onToggle('left_quad_inner')} className={getZoneClasses('left_quad_inner')}>
        <rect x="100" y="175" width="15" height="55" rx="4" />
      </g>
      
      {/* Left Quad Outer */}
      <g onClick={() => onToggle('left_quad_outer')} className={getZoneClasses('left_quad_outer')}>
        <rect x="115" y="175" width="15" height="55" rx="4" />
      </g>
      
      {/* ... more zones */}
    </svg>
  );
}
```

---

## Mobile Optimization

- View tabs are touch-friendly with adequate spacing
- SVG maintains proportional scaling
- Selected area chips scroll horizontally if many selections
- Each zone has minimum 44x44px tap target
- Haptic feedback on every selection

## Backward Compatibility

- Legacy area IDs (e.g., `left_shoulder`, `lower_back`) will be mapped to appropriate new IDs
- Existing pain data will display correctly in heat maps
- VaultPainPatternAlert will include all new area labels
- No database migration required - `pain_location` column accepts any string array

## Heat Map Updates

The VaultPainHeatMapCard will also need:
1. Multi-view support with the same tab interface
2. All new area IDs added to the frequency mapping
3. Updated SVG rendering for each view

---

## Summary

This enhancement transforms the pain tracker into a professional-grade anatomical assessment tool:
- **4 body views** instead of 1
- **60+ specific body zones** instead of 17
- Athletes can specify exactly "left hamstring inner" or "right ankle inside"
- Better injury pattern detection for recurring issues
- More actionable data for recovery and training decisions

The modular component structure keeps each SVG view maintainable while sharing selection state across all views.
