
# Add Sport Badge to Following List for Coaches/Scouts

## Overview
Add a visual sport indicator (Baseball ⚾ / Softball 🥎) next to each player's name in the "My Players" or "Following" list on both the Coach Dashboard and Scout Dashboard. This helps coaches/scouts quickly identify which sport each player practices.

## Current State
- **Edge Function**: `get-following-players` returns only `id`, `full_name`, `avatar_url`
- **Sport Data Source**: Player sport is determined by their `subscriptions.subscribed_modules` array (e.g., `baseball_hitting`, `softball_pitching`)
- **No sport field** exists directly on the `profiles` table

## Implementation Plan

### Step 1: Update Edge Function
**File**: `supabase/functions/get-following-players/index.ts`

Modify the edge function to:
1. Join with the `subscriptions` table to get each player's `subscribed_modules`
2. Determine sport from module prefix (`baseball_*` or `softball_*`)
3. Return a `sport` field for each player (`'baseball'`, `'softball'`, or `'both'`)

```text
Current response:
{ id, full_name, avatar_url, followStatus }

New response:
{ id, full_name, avatar_url, followStatus, sport }
```

### Step 2: Update Player Interface
**Files**: 
- `src/pages/CoachDashboard.tsx`
- `src/pages/ScoutDashboard.tsx`

Update the `Player` interface to include sport:
```typescript
interface Player {
  id: string;
  full_name: string;
  avatar_url: string | null;
  followStatus?: 'none' | 'pending' | 'accepted';
  sport?: 'baseball' | 'softball' | 'both' | null;
}
```

### Step 3: Add Sport Badge UI
**Files**: 
- `src/pages/CoachDashboard.tsx`
- `src/pages/ScoutDashboard.tsx`

Add a badge next to each player's name showing their sport:

| Sport | Badge Style |
|-------|-------------|
| Baseball | Blue badge with "⚾ Baseball" |
| Softball | Pink badge with "🥎 Softball" |
| Both | Purple badge with "⚾🥎 Both" |
| Unknown | No badge shown |

---

## Technical Details

### Edge Function SQL Logic
```sql
-- Get subscribed modules for each player
SELECT p.id, p.full_name, p.avatar_url, s.subscribed_modules
FROM profiles p
LEFT JOIN subscriptions s ON s.user_id = p.id
WHERE p.id IN (player_ids...)
```

Then in TypeScript:
```typescript
function determineSport(modules: string[] | null): string | null {
  if (!modules || modules.length === 0) return null;
  
  const hasBaseball = modules.some(m => m.startsWith('baseball'));
  const hasSoftball = modules.some(m => m.startsWith('softball'));
  
  if (hasBaseball && hasSoftball) return 'both';
  if (hasBaseball) return 'baseball';
  if (hasSoftball) return 'softball';
  return null;
}
```

### Badge Component Example
```tsx
{player.sport && (
  <Badge 
    variant="outline" 
    className={cn(
      "ml-2 text-xs",
      player.sport === 'baseball' && "border-blue-500 text-blue-600",
      player.sport === 'softball' && "border-pink-500 text-pink-600",
      player.sport === 'both' && "border-purple-500 text-purple-600"
    )}
  >
    {player.sport === 'baseball' && '⚾ Baseball'}
    {player.sport === 'softball' && '🥎 Softball'}
    {player.sport === 'both' && '⚾🥎 Both'}
  </Badge>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/get-following-players/index.ts` | Join subscriptions table, add sport detection logic |
| `src/pages/CoachDashboard.tsx` | Update Player interface, add sport badge to player list |
| `src/pages/ScoutDashboard.tsx` | Update Player interface, add sport badge to player list |

---

## Summary
This feature adds clear visual indicators showing each player's sport (Baseball, Softball, or Both) next to their name in the Following list. Coaches and scouts can immediately see which sport each player trains, making it easier to manage mixed rosters of baseball and softball players.
