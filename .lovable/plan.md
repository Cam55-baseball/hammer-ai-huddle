

# Upgrade CoachSelector to Show All Connected Coaches

## Problem
Currently, the CoachSelector only shows 3 options: Head Coach (if designated), External Coach, and Self-Directed. Players cannot choose from their other connected coaches -- only the head coach or type in an external name.

## Solution
Rebuild the CoachSelector to:
1. Fetch all active linked coaches from `scout_follows` (where player_id = current user, status = 'accepted', relationship_type = 'linked')
2. Show a selectable list of all connected coaches, with the Head Coach highlighted and auto-selected when "Coach-Led" or "Lesson" is chosen
3. Keep the "External Coach" (free-text) and "Self-Directed" options

## Changes

### `src/components/practice/CoachSelector.tsx`
- Add a query to fetch all connected coaches from `scout_follows` joined with profile names (via `profiles_public` or the `get-coach-connections` edge function)
- Replace the current single "assigned" option with a list of all connected coaches
- Mark the Head Coach with a badge (e.g., crown icon or "Head Coach" label)
- Auto-select the Head Coach by default when the component mounts (if one is designated)
- Allow selecting any other connected coach from the list
- Keep "External Coach" (with text input) and "Self-Directed" as additional options
- Update the `CoachSelection` type to always include `coach_id` and `coach_name` when a connected coach is selected (type stays `'assigned'`)

### `src/components/practice/SessionConfigPanel.tsx`
- When `coachSessionType` changes to `'coached'` or `'lesson'`, auto-populate `coachSelection` with the Head Coach if one exists
- When switching back to `'solo'`, reset to `{ type: 'none' }`

## Technical Details

**Fetching connected coaches (in CoachSelector):**
```tsx
const { data: connectedCoaches } = useQuery({
  queryKey: ['connected-coaches', user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('scout_follows')
      .select('scout_id')
      .eq('player_id', user!.id)
      .eq('status', 'accepted')
      .eq('relationship_type', 'linked');
    if (!data?.length) return [];
    const coachIds = data.map(d => d.scout_id);
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('id, full_name')
      .in('id', coachIds);
    return profiles ?? [];
  },
  enabled: !!user,
});
```

**Auto-select Head Coach in SessionConfigPanel:**
When `coachSessionType` switches to `'coached'` or `'lesson'`, check if `mpiSettings.primary_coach_id` exists and set `coachSelection` to `{ type: 'assigned', coach_id: headCoachId, coach_name: headCoachName }`.

**UI layout:**
- Connected coaches shown as selectable cards/chips with name and optional Head Coach badge
- Scrollable if many coaches
- "External Coach" and "Self-Directed" remain as separate options below the coach list

No database changes needed -- `scout_follows` RLS already allows players to read their own rows.
