

# Highlight Coach-Tagged Sessions in the Session Feed

## Overview
When a player logs a coach-led session and selects a specific coach, that coach's ID is stored in `performance_sessions.coach_id`. Currently the Session Feed doesn't fetch or use this field. This change will:
1. Add a new "My Sessions" filter to prioritize sessions where the coach was the tagged leader
2. Show a visual "Coach-Led" badge on sessions where the current coach was specifically tagged
3. Sort coach-tagged sessions to the top by default

## Changes

### `src/components/coach/SessionFeed.tsx`

**Query update:**
- Add `coach_id` to the selected columns in the Supabase query
- Add it to the `SessionSummary` interface

**New filter:**
- Add a third filter dropdown: "Role" with options: "All Sessions", "My Sessions" (where `coach_id` matches the logged-in coach)
- When "My Sessions" is selected, add `.eq('coach_id', user.id)` to the query

**Visual indicator:**
- On each session row, if `coach_id` matches the current user, show a "Coach-Led" badge (using a distinct color like amber/primary) alongside existing badges
- Coach-tagged sessions get a subtle left border accent (e.g., `border-l-2 border-l-primary`) for quick scanning

**Default sort:**
- When no role filter is active ("All Sessions"), sort results so coach-tagged sessions appear first, then the rest by date

### `src/components/coach/SessionDetailView.tsx`

- Add `coach_id` to the session interface
- In the detail header metadata, show "You led this session" text when `coach_id` matches the current user

## Technical Details

**Updated query in SessionFeed:**
```tsx
// Add coach_id to select
.select('id, user_id, coach_id, module, session_type, ...')

// New role filter
if (roleFilter === 'my_sessions') {
  query = query.eq('coach_id', user.id);
}
```

**Sorting coach-tagged sessions first (client-side):**
```tsx
const sorted = [...data].sort((a, b) => {
  const aTagged = a.coach_id === user.id ? 0 : 1;
  const bTagged = b.coach_id === user.id ? 0 : 1;
  if (aTagged !== bTagged) return aTagged - bTagged;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
});
```

**Visual badge on each row:**
```tsx
{s.coach_id === user?.id && (
  <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
    Coach-Led
  </Badge>
)}
```

No database changes needed -- `coach_id` already exists on `performance_sessions`.
