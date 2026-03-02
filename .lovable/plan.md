

# Add Head Coach Selection to Connections Tab

## Overview

Add a "Set as Head Coach" button next to each active linked coach in the ConnectionsTab, allowing players to designate their Head Coach directly from the UI. This updates `athlete_mpi_settings.primary_coach_id` and immediately reflects across FolderPermissionMatrix, CoachSelector, SessionConfigPanel, and CollaborativeWorkspace.

---

## Changes

### 1. File: `src/components/connections/ConnectionsTab.tsx`

**Fetch current head coach setting:**
- Add a query for `athlete_mpi_settings.primary_coach_id` (same pattern used in FolderPermissionMatrix)

**Add "Set as Head Coach" mutation:**
- `useMutation` that calls `supabase.from('athlete_mpi_settings').update({ primary_coach_id: coachId }).eq('user_id', user.id)`
- On success: invalidate `['coach-connections']`, `['athlete-mpi-settings']`, and `['folder-permission-matrix']` query keys
- Toast: "Head Coach updated"

**Update active coaches UI (each coach row):**
- If coach is current head coach: show a gold "Head Coach" badge and a subtle "Remove" button to clear the designation
- If coach is NOT head coach: show a "Set as Head Coach" button (crown/star icon) next to the Revoke button
- Only linked coaches (not follow-only) should show the head coach option

**Add "Remove Head Coach" action:**
- Sets `primary_coach_id` to `null` on `athlete_mpi_settings`
- Clears the designation without revoking the link

### 2. File: `src/components/connections/FolderPermissionMatrix.tsx`

**Minor fix -- reactivity:**
- Currently loads head coach ID in a `useEffect` with no external trigger to reload
- Add the `athlete_mpi_settings` query key dependency so when head coach changes in ConnectionsTab, the matrix re-fetches and updates the "Full Access" column accordingly

### 3. Review and audit of existing systems

No code changes needed for these -- they already read `primary_coach_id` dynamically:
- **CoachSelector** (`src/components/practice/CoachSelector.tsx`): Already queries `primary_coach_id` from `athlete_mpi_settings` and shows it as an option. Will pick up changes automatically.
- **FolderDetailDialog** (`src/components/folders/FolderDetailDialog.tsx`): Already checks `primary_coach_id` for head coach auto-access. Works correctly.
- **CollaborativeWorkspace** (`src/components/coach/CollaborativeWorkspace.tsx`): Already queries `athlete_mpi_settings` where `primary_coach_id = user.id`. Works correctly.
- **DataBuildingGate** (`src/components/analytics/DataBuildingGate.tsx`): Already reads `primary_coach_id`. Works correctly.

---

## Technical Details

### ConnectionsTab Changes (detailed)

New state/queries added:
```text
- useQuery for athlete_mpi_settings.primary_coach_id (queryKey: ['head-coach', user.id])
- useMutation for updating primary_coach_id
```

Active coach row layout update:
```text
[Avatar] [Name] [Head Coach Badge OR Set as Head Coach Button] [Revoke Button]
```

The "Set as Head Coach" button:
- Only appears for coaches with `relationship_type === 'linked'`
- Uses a Crown icon from lucide-react
- Shows confirmation: updates immediately with optimistic UI

### FolderPermissionMatrix Reactivity

Add a `key` prop or refetch trigger tied to the head coach query so when a player changes their head coach, the matrix immediately re-renders with the correct "Full Access" column assignment.

---

## No Database Changes Required

The `athlete_mpi_settings.primary_coach_id` column already exists and the player already has RLS UPDATE access to their own row. No migration needed.

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/connections/ConnectionsTab.tsx` | Add head coach query, set/remove mutation, UI buttons and badge |
| `src/components/connections/FolderPermissionMatrix.tsx` | Add reactivity to head coach changes |

## Execution Order

1. Update ConnectionsTab with head coach query + mutation + UI
2. Update FolderPermissionMatrix reactivity
