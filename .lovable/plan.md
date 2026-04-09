

# Player Defensive Drill Library — Full Implementation

## Overview

Add a new player-facing "Defensive Drill Library" page at `/drill-library` with filtered, intelligent drill browsing. Players see drills matched to their sport, position, and progression level, with AI-driven "Recommended For You" badges.

## 1. Sidebar Navigation Update

**File: `src/components/AppSidebar.tsx`**

After the Video Library entry (line ~300), add a "Drill Library" item visible to any subscribed user (same condition as Video Library):

```
{ key: 'drill-library', title: 'Drill Library', url: '/drill-library', icon: Dumbbell }
```

## 2. New Hook: `usePlayerDrillLibrary`

**File: `src/hooks/usePlayerDrillLibrary.ts`** (new)

Fetches drills with intelligent filtering:
- Reads player's `sport`, `primary_position` from `athlete_mpi_settings`, and `experience_level` from `profiles`
- Maps experience_level to progression range (Beginner→1-3, Intermediate→3-5, Advanced/high_school→4-6, Professional→5-7)
- Queries `drills` table with `is_published = true`, `is_active = true`, `sport` match, `progression_level` within range
- Joins `drill_positions` to filter by player position (with fallback: if no drills match position, expand to all positions)
- Joins `drill_tag_map` + `drill_tags` for tag data
- Fetches player's `weakness_scores` from latest HIE run to compute "recommended for you" flags (tag intersection with detected issues)
- Returns: `drills`, `loading`, `filters` (sort, position override, search), `playerContext`
- Sort options: Recommended (default — scored drills first), Level, Recently Added

## 3. New Page: `DrillLibraryPlayer`

**File: `src/pages/DrillLibraryPlayer.tsx`** (new)

Layout:
- `DashboardLayout` wrapper
- Top bar: Search input, sort dropdown (Recommended / Level / Recently Added), position filter chips
- Grid of drill cards (responsive 1-2-3 columns)
- Subscription gate: if no active subscription, show blurred overlay with upgrade CTA

**Drill Card** shows:
- Video thumbnail (first frame or placeholder with `Play` icon)
- Title
- Position badges (SS, OF, etc.)
- Progression level badge (mapped: 1-2→Youth, 3→Middle School, 4→High School, 5→College, 6-7→Pro)
- Short "What this helps fix" (truncated `ai_context`, max 60 chars)
- "Recommended For You" badge if `drill.tags ∩ player.detectedIssues > 0`

## 4. Drill Detail Dialog (reuse + extend)

**File: `src/components/practice/DrillDetailDialog.tsx`** (minor update)

Already shows video, description, AI context, tags, positions, difficulty, save-to-vault. Add:
- "Recommended For You" section if the drill matches player weaknesses (pass `isRecommended` + `matchReasons` as optional props)
- No changes to lock logic (already gates on `!userHasPremium`)

## 5. Route Registration

**File: `src/App.tsx`**

Add lazy import and route:
```
const DrillLibraryPlayer = lazy(() => import('./pages/DrillLibraryPlayer'));
<Route path="/drill-library" element={<DrillLibraryPlayer />} />
```

## 6. Progression Level Mapping Utility

**File: `src/utils/progressionMapping.ts`** (new)

```
experienceLevel → progression range
Beginner → [1, 3]
Intermediate → [3, 5]
high_school / Advanced → [4, 6]
Professional / professional → [5, 7]
default → [2, 5]
```

Also maps progression numbers to display labels (Youth, Middle School, High School, College, Pro/Elite).

## Permissions

- Players: view + filter + search (read-only). No add/edit/delete.
- Video content gated behind subscription (existing `locked = !userHasPremium` logic).
- Owner/Coach: same view works for them too; they already have CMS/assignment elsewhere.

## Files Summary

| File | Action |
|------|--------|
| `src/utils/progressionMapping.ts` | New — level mapping utility |
| `src/hooks/usePlayerDrillLibrary.ts` | New — filtered drill fetch with recommendations |
| `src/pages/DrillLibraryPlayer.tsx` | New — player drill library page |
| `src/components/AppSidebar.tsx` | Add Drill Library nav item |
| `src/App.tsx` | Add route `/drill-library` |
| `src/components/practice/DrillDetailDialog.tsx` | Minor — accept optional recommendation context |

