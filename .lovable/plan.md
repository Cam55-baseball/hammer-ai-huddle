

# Pain History Heat Map Visualization

## Overview

Create an interactive visualization that displays a heat map of body areas based on how frequently they've been logged with pain over time. The SVG body silhouette will use color intensity to indicate pain frequency, allowing athletes to quickly identify chronic problem areas.

## Design Approach

### Visual Concept
- Reuse the existing body map SVG structure from `BodyMapSelector.tsx`
- Instead of user selection, zones are color-coded based on frequency
- Heat map gradient: No pain (gray) -> Low (yellow) -> Medium (orange) -> High (red)
- Tooltips show exact occurrence counts on hover/tap
- Time period selector: 7 days, 30 days, 6 weeks (42 days), All time

### Color Intensity Scale
| Frequency | Color | Meaning |
|-----------|-------|---------|
| 0 | Gray (muted) | No pain logged |
| 1-2 | Yellow (#fbbf24) | Occasional |
| 3-5 | Orange (#f97316) | Moderate concern |
| 6-9 | Light Red (#ef4444) | Frequent |
| 10+ | Dark Red (#b91c1c) | Chronic / High Priority |

### Placement
The component will be added to the **Weekly tab** in the Vault, alongside existing trend cards (`VaultDisciplineTrendCard`, `VaultMentalWellnessTrendCard`). This is the appropriate location because:
- Weekly tab focuses on trends and patterns over time
- Complements existing wellness trend visualizations
- Users reviewing their week will naturally want to see pain patterns

---

## Technical Implementation

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/vault/VaultPainHeatMapCard.tsx` | **Create** | New heat map visualization component |
| `src/pages/Vault.tsx` | **Modify** | Add component to Weekly tab |

### Component Architecture

```
VaultPainHeatMapCard
├── Time Period Selector (tabs: 7d, 30d, 6wk, All)
├── SVG Body Heat Map (reuses zone geometry from BodyMapSelector)
│   └── Interactive zones with hover/tap tooltips
├── Legend (color scale explanation)
└── Summary Stats (top 3 problem areas)
```

### Data Flow

1. **Fetch Pain Data**
   - Query `vault_focus_quizzes` table
   - Filter: `quiz_type = 'pre_lift'` AND `pain_location IS NOT NULL`
   - Time filter based on selected period
   - Extract all `pain_location` arrays

2. **Aggregate Frequencies**
   - Count occurrences of each body area ID across all entries
   - Handle both new IDs (`left_shoulder`) and legacy IDs (`shoulder`)

3. **Map to Colors**
   - Calculate intensity based on frequency thresholds
   - Apply gradient fill to SVG zones

### VaultPainHeatMapCard.tsx Structure

```typescript
interface PainHeatMapProps {
  isLoading?: boolean;
}

// Time period options
type TimePeriod = '7d' | '30d' | '6wk' | 'all';

// Frequency data structure
interface AreaFrequency {
  areaId: string;
  label: string;
  count: number;
  intensity: 'none' | 'low' | 'medium' | 'high' | 'chronic';
}
```

### SVG Zone Rendering

Each zone will be rendered with:
- Dynamic fill color based on frequency intensity
- Stroke highlight for non-zero zones
- `onMouseEnter`/`onTouchStart` for tooltip display
- Accessible `aria-label` with frequency info

```typescript
const getZoneColor = (count: number): string => {
  if (count === 0) return 'hsl(var(--muted))';
  if (count <= 2) return '#fbbf24';  // yellow
  if (count <= 5) return '#f97316';  // orange
  if (count <= 9) return '#ef4444';  // light red
  return '#b91c1c';                  // dark red
};

const getZoneOpacity = (count: number): number => {
  if (count === 0) return 0.3;
  if (count <= 2) return 0.5;
  if (count <= 5) return 0.65;
  if (count <= 9) return 0.8;
  return 0.95;
};
```

### Tooltip Implementation

On hover/tap, display a small tooltip showing:
- Body area name (e.g., "Left Knee")
- Occurrence count (e.g., "Logged 7 times")
- Percentage of check-ins with this pain

### Summary Statistics

Below the heat map, show:
1. **Top 3 Problem Areas** - Body areas with highest frequency
2. **Total Pain Entries** - How many days had any pain logged
3. **Pain-Free Days** - Percentage of days without pain

---

## Database Query

```typescript
const fetchPainHistory = async (userId: string, daysBack: number | null) => {
  let query = supabase
    .from('vault_focus_quizzes')
    .select('entry_date, pain_location')
    .eq('user_id', userId)
    .eq('quiz_type', 'pre_lift')
    .not('pain_location', 'is', null);
  
  if (daysBack) {
    const startDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
    query = query.gte('entry_date', startDate);
  }
  
  return query.order('entry_date', { ascending: false });
};
```

---

## Integration with Vault.tsx

Add to the Weekly tab content (around line 786-795):

```tsx
<TabsContent value="weekly" className="mt-4 space-y-6">
  <VaultWeeklySummary 
    fetchWeeklyData={fetchWeeklyData}
    streak={streak}
  />
  <VaultNutritionWeeklySummary 
    fetchWeeklyNutrition={fetchWeeklyNutrition}
    goals={nutritionGoals}
  />
  {/* NEW: Pain Heat Map */}
  <VaultPainHeatMapCard />
</TabsContent>
```

---

## Accessibility Features

- ARIA labels on all zones with frequency information
- Keyboard navigation with focus indicators
- Screen reader announcements for pain summary
- High contrast mode support via CSS variables
- Touch-friendly tooltip activation on mobile

---

## Responsive Design

- SVG scales proportionally on all screen sizes
- Tooltip positions adjust to avoid edge clipping
- Time period selector uses compact tabs on mobile
- Legend stacks vertically on narrow screens

---

## Animation Details

Following app animation standards:
- Zone hover: 150ms color transition
- Tooltip fade-in: 100ms
- Period switch: subtle fade between data states
- No pulse animations (reserved for active selection in BodyMapSelector)

---

## Summary

This feature transforms historical pain data into an intuitive visual overview. Athletes can quickly identify which body areas need attention, spot patterns they might not notice otherwise, and make informed decisions about recovery, training modifications, or seeking professional help for chronic issues.

The implementation reuses the proven SVG body map structure while adding a new data visualization layer, ensuring visual consistency with the pain selection UI and seamless integration with the Vault's existing trend tracking features.

