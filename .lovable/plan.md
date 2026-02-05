

# Fix Missing Translations and Add Sport Filter to Advanced Search

## Overview
This plan addresses two issues:
1. Missing translation keys causing raw text like "scout.players" and "scout.typeToSearch" to display
2. Adding a sport filter option to the advanced search filters for scouts and coaches

---

## Problem 1: Missing Translation Keys

### Current Behavior
The following translation keys are used but not defined, causing raw key names to display:
- `scout.players` (ScoutDashboard.tsx line 510) - Shows as "scout.players"
- `scout.typeToSearch` (ScoutDashboard.tsx line 547) - Shows as "scout.typeToSearch"
- `coach.players` (CoachDashboard.tsx line 546) - Exists but as a fallback

### Solution
Add the missing translation keys to the English locale file and replace the raw text with proper translations.

### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/locales/en.json` | Add missing `scout.players` and `scout.typeToSearch` keys |
| `src/pages/ScoutDashboard.tsx` | Already uses `t()` function, will work once keys exist |
| `src/pages/CoachDashboard.tsx` | Already uses `t()` function with fallbacks |

---

## Problem 2: Sport Filter in Advanced Search

### Current Behavior
- The dashboard has a sport filter tab at the top ("All Sports", "Baseball", "Softball") that filters the "Following" list
- However, the advanced filters for searching players don't include a sport filter
- Players' sports are determined by their `subscribed_modules` (prefixes like `baseball_` or `softball_`)

### Solution
Add a "Sport" filter option to the PlayerSearchFilters component that allows scouts/coaches to filter search results by sport. This requires:

1. **Update PlayerSearchFilters component** to include a sport selector
2. **Update the filter state** in both dashboards to include sport
3. **Update the search-players edge function** to filter by sport using the subscriptions table

### Technical Details

#### 1. FilterState Interface Update
Add `sportPreference` to the filter state:
```typescript
interface FilterState {
  // ... existing fields
  sportPreference: 'all' | 'baseball' | 'softball' | null;
}
```

#### 2. PlayerSearchFilters Component Update
Add a sport selection dropdown in the advanced filters panel:
```tsx
{/* Sport Filter */}
<div>
  <Label className="text-sm font-semibold mb-2 block">
    {t('playerFilters.sport')}
  </Label>
  <Select
    value={filters.sportPreference || ""}
    onValueChange={(value) =>
      onFilterChange({
        ...filters,
        sportPreference: value === "" ? null : value as 'baseball' | 'softball',
      })
    }
  >
    <SelectTrigger>
      <SelectValue placeholder={t('playerFilters.any')} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="baseball">{t('dashboard.baseball')}</SelectItem>
      <SelectItem value="softball">{t('dashboard.softball')}</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### 3. Edge Function Update
The `search-players` edge function needs to:
1. Accept a new `sport` parameter
2. Join with the `subscriptions` table to filter by `subscribed_modules`
3. Filter players whose modules contain the appropriate prefix

```typescript
// In search-players/index.ts
const { sport, ...otherParams } = await req.json();

// After getting profiles, filter by sport if specified
if (sport && (sport === 'baseball' || sport === 'softball')) {
  // Get subscriptions for the profile IDs
  const { data: subs } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, subscribed_modules')
    .in('user_id', profiles.map(p => p.id));
  
  // Filter to only include users with matching sport modules
  const sportPrefix = sport + '_';
  const matchingUserIds = new Set(
    subs?.filter(s => 
      s.subscribed_modules?.some(m => m.startsWith(sportPrefix))
    ).map(s => s.user_id) || []
  );
  
  filteredProfiles = filteredProfiles.filter(p => matchingUserIds.has(p.id));
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/locales/en.json` | Add `playerFilters.sport` translation key |
| `src/components/PlayerSearchFilters.tsx` | Add sport filter dropdown, update FilterState interface |
| `src/pages/ScoutDashboard.tsx` | Add `sportPreference` to filter state initialization and reset |
| `src/pages/CoachDashboard.tsx` | Add `sportPreference` to filter state initialization and reset |
| `supabase/functions/search-players/index.ts` | Add sport parameter handling and subscription-based filtering |

---

## Translation Keys to Add

```json
{
  "scout": {
    "players": "Players",
    "typeToSearch": "Start typing to search for players..."
  },
  "playerFilters": {
    "sport": "Sport"
  }
}
```

---

## Summary of Changes

1. **Translation fixes** - Add missing keys to prevent raw text display
2. **Sport filter UI** - New dropdown in advanced filters for baseball/softball selection
3. **Backend filtering** - Edge function updated to filter players by their subscribed sport modules
4. **Filter state updates** - Both dashboard components updated to track sport preference in filter state

This allows scouts and coaches to narrow their player search by sport, complementing the existing tab-based filtering for their followed players list.

