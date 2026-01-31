
# Implementation Plan: Individual Pain Scales per Body Area

## Summary

Transform the Pre-Workout Check-in pain tracking from a single global pain scale to individual pain scales for each selected body area. If a user selects "lower abs" and "head front", they will see two separate 1-10 pain scales - one for each area - with the data stored per entry for longitudinal tracking.

---

## Current vs. New Design

| Aspect | Current | New |
|--------|---------|-----|
| Data structure | `pain_location: string[]`, `pain_scale: number` | `pain_location: string[]`, `pain_scales: { "area_id": level }` |
| UI | One TenPointScale for all areas | One TenPointScale per selected area |
| Display | "Pain: 7/10" globally | "Lower Abs: 3/10, Head: 7/10" |
| Heat map potential | Frequency only | Frequency + intensity |

---

## Database Changes

### New Column

Add a new JSONB column to store pain levels per body area:

```sql
ALTER TABLE vault_focus_quizzes
ADD COLUMN pain_scales JSONB DEFAULT NULL;

COMMENT ON COLUMN vault_focus_quizzes.pain_scales IS 
'Maps body area IDs to their pain levels (1-10). Example: {"lower_abs": 3, "head_front": 7}';
```

**Data Structure:**
```json
{
  "lower_abs": 3,
  "head_front": 7,
  "left_knee_front": 5
}
```

**Backward Compatibility:**
- Keep existing `pain_scale` column for legacy data
- New entries will populate `pain_scales` JSONB
- Reading code will check `pain_scales` first, fall back to `pain_scale`

---

## Files to Update

| File | Purpose |
|------|---------|
| `src/components/vault/VaultFocusQuizDialog.tsx` | Individual pain scales UI |
| `src/components/vault/quiz/TenPointScale.tsx` | Minor: add compact mode for multiple scales |
| `src/hooks/useVault.ts` | Update interface and submission logic |
| `src/components/vault/VaultDayRecapCard.tsx` | Display pain levels per area |
| `src/components/vault/VaultPainPatternAlert.tsx` | Update to use new structure |
| `src/components/vault/VaultPainHeatMapCard.tsx` | Optional: use intensity data |
| `supabase/functions/generate-vault-recap/index.ts` | Update pain analysis |
| Translation files (8 languages) | New translation keys |

---

## UI/UX Design

### Pre-Workout Check-in Pain Section

When user selects body areas, instead of one global pain scale, show stacked individual scales:

```text
┌─────────────────────────────────────────┐
│ Section 3 - Pain or Limitation Check    │
├─────────────────────────────────────────┤
│ [Body Map Selector]                     │
│                                         │
│ Selected: Lower Abs, Head (Front)       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠️ Lower Abs                    3/10│ │
│ │ [1][2][3][4][5][6][7][8][9][10]     │ │
│ │                 ▲                   │ │
│ │             Mild                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠️ Head (Front)                 7/10│ │
│ │ [1][2][3][4][5][6][7][8][9][10]     │ │
│ │                       ▲             │ │
│ │                 Significant         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Does pain increase with movement?       │
│ [Yes] [No]                              │
└─────────────────────────────────────────┘
```

### Key UX Considerations

1. **Compact Mode**: Each pain scale card is slightly smaller to fit multiple
2. **Area Labels**: Use readable labels from `getBodyAreaLabel()`
3. **Haptic Feedback**: Maintain 10ms vibration on selection
4. **Auto-remove**: When user deselects an area, remove its scale
5. **Default Value**: New areas start at 0 (not rated yet)
6. **Movement Question**: One global "increases with movement" still applies to all

---

## Detailed Component Changes

### 1. VaultFocusQuizDialog.tsx

**State Change:**
```tsx
// Before
const [painScale, setPainScale] = useState(0);

// After  
const [painScales, setPainScales] = useState<Record<string, number>>({});
```

**Update Pain Scale Handler:**
```tsx
const handlePainScaleChange = (areaId: string, value: number) => {
  setPainScales(prev => ({
    ...prev,
    [areaId]: value
  }));
};
```

**Clean Up When Areas Deselected:**
```tsx
const handlePainLocationsChange = (areas: string[]) => {
  setPainLocations(areas);
  // Remove scales for deselected areas
  setPainScales(prev => {
    const newScales: Record<string, number> = {};
    areas.forEach(area => {
      if (prev[area] !== undefined) {
        newScales[area] = prev[area];
      }
    });
    return newScales;
  });
};
```

**Submit Data:**
```tsx
data.pain_location = painLocations.length > 0 ? painLocations : undefined;
data.pain_scales = Object.keys(painScales).length > 0 ? painScales : undefined;
// Keep legacy pain_scale as max value for backward compatibility
data.pain_scale = Object.values(painScales).length > 0 
  ? Math.max(...Object.values(painScales)) 
  : undefined;
```

### 2. TenPointScale.tsx - Add Compact Variant

```tsx
interface TenPointScaleProps {
  // ... existing props
  compact?: boolean; // New prop for stacked display
  areaLabel?: string; // Optional area label for compact mode
}
```

**Compact Styling:**
- Reduced padding (p-3 instead of p-4)
- Smaller buttons (min-h-[36px] instead of min-h-[40px])
- Area label in header instead of generic label

### 3. VaultDayRecapCard.tsx

**Display per-area pain levels:**
```tsx
{preWorkoutQuiz.pain_location?.length > 0 && (
  <div className="mt-2 space-y-1">
    <span className="text-xs text-muted-foreground font-medium">
      {t('vault.quiz.pain', 'Pain')}:
    </span>
    <div className="flex flex-wrap gap-1">
      {preWorkoutQuiz.pain_location.map((loc, i) => {
        const level = preWorkoutQuiz.pain_scales?.[loc] || preWorkoutQuiz.pain_scale || 0;
        return (
          <Badge key={i} variant="destructive" className="text-xs py-0">
            {getBodyAreaLabel(loc)}: {level}/10
          </Badge>
        );
      })}
    </div>
  </div>
)}
```

### 4. VaultPainPatternAlert.tsx

**Update to use per-area severity:**
```tsx
// Can now include severity in pattern detection
// E.g., flag if same area has pain 5+ for 3 consecutive days
```

### 5. VaultPainHeatMapCard.tsx (Optional Enhancement)

**Use intensity data for weighted heat map:**
```tsx
// Instead of just counting occurrences, weight by severity
// Higher pain levels = more "heat" on the map
```

### 6. generate-vault-recap Edge Function

**Update pain analysis:**
```tsx
// Analyze average pain levels per area over the cycle
const painEntries = quizzes?.filter(q => q.pain_location?.length > 0) || [];
const areaStats: Record<string, { count: number; totalLevel: number }> = {};

painEntries.forEach(q => {
  (q.pain_location as string[]).forEach((loc: string) => {
    if (!areaStats[loc]) areaStats[loc] = { count: 0, totalLevel: 0 };
    areaStats[loc].count++;
    areaStats[loc].totalLevel += q.pain_scales?.[loc] || q.pain_scale || 5;
  });
});
```

---

## Interface Updates

### useVault.ts Interface

```tsx
interface QuizSubmitData {
  // ... existing fields
  pain_location?: string[];
  pain_scale?: number; // Legacy, will store max value
  pain_scales?: Record<string, number>; // New: per-area levels
  pain_increases_with_movement?: boolean;
}
```

---

## Translation Keys

Add to all 8 language files:

```json
{
  "vault.quiz.pain.areaScaleLabel": "Rate pain for {{area}}",
  "vault.quiz.pain.perAreaTitle": "Pain Level by Area"
}
```

---

## Migration Strategy

1. **New column**: Add `pain_scales` JSONB column
2. **Dual write**: New submissions write both `pain_scale` (max) and `pain_scales` (detailed)
3. **Read with fallback**: UI checks `pain_scales` first, falls back to `pain_scale`
4. **No data migration needed**: Historical data shows as single level per all areas

---

## Validation Checklist

| Check | Expected Behavior |
|-------|-------------------|
| Select 1 area | Shows 1 pain scale |
| Select 3 areas | Shows 3 stacked pain scales |
| Deselect an area | Its pain scale disappears |
| Submit with scales | `pain_scales` JSONB saved |
| View past entry | Shows per-area levels |
| Heat map | Works with new data |
| Pain pattern alert | Works with new structure |
| 6-week recap | Analyzes per-area data |
| Backward compat | Old entries still display |

---

## Summary

This implementation provides athletes with granular pain tracking - essential for identifying which specific areas need attention. The data structure supports future enhancements like severity-weighted heat maps and trend analysis per body area.
