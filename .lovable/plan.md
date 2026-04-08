

# Defensive Drill Library — Final Workflow Implementation

## What's Changing

Three updates to match the new workflow:

1. **Auto-populate goes live immediately** — AI-generated drills skip the pending queue and insert directly into the `drills` table with full tags/positions.
2. **Coach drill assignment** — New `drill_assignments` table lets coaches assign drills to linked players. Coaches cannot edit/delete library drills.
3. **CMS role enforcement** — Only owner can add/edit/delete drills. Coach view is read-only + assign.

## Current State

- `generate-drills` edge function inserts into `pending_drills` → owner reviews → accepts to `drills`. **Needs to change**: insert directly into `drills`.
- No `drill_assignments` table exists.
- `DrillCmsManager` has no role checks — it's in owner dashboard only, but coach assignment UI doesn't exist.
- `FixYourGame` is the player-facing recommendation UI. Coach-facing assignment flow doesn't exist.

---

## Phase 1 — Database

### New table: `drill_assignments`
```sql
CREATE TABLE public.drill_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid REFERENCES public.drills(id) ON DELETE CASCADE NOT NULL,
  coach_id uuid NOT NULL,
  player_id uuid NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  notes text,
  completed boolean DEFAULT false,
  completed_at timestamptz
);
```
RLS: Coach can insert/select for their linked players. Player can select their own assignments.

### Keep `pending_drills` table
Still useful for manual AI generation from CMS, but auto-populate path bypasses it.

---

## Phase 2 — Update `generate-drills` Edge Function

Change the function to:
1. Insert validated drills directly into `drills` table (not `pending_drills`)
2. Insert tag mappings into `drill_tag_map` (look up tag IDs by name)
3. Insert positions into `drill_positions`
4. Set `is_active = true`, `is_published = true`

Keep deduplication logic. Keep validation (reject if missing tags/level).

---

## Phase 3 — Coach Assignment UI

### New component: `src/components/coach/CoachDrillAssign.tsx`
- Coach sees the drill library (read-only) filtered by sport/position/level
- "Assign" button opens a player selector (from `scout_follows` linked players)
- Optional notes field
- Inserts into `drill_assignments`

### New component: `src/components/practice/AssignedDrills.tsx`
- Player sees drills assigned to them by coaches
- Can mark as completed
- Shows coach name and notes

---

## Phase 4 — Owner CMS Updates

### `DrillCmsManager.tsx`
- "Pending Review" tab becomes "AI Generated" — still shows pending drills from manual "Generate" button clicks
- Add "Auto-Populate Library" button that calls `generate-drills` and inserts directly (no review needed)
- Existing manual "Generate Drills" button in PendingDrillsQueue still works for owner review flow

### `PendingDrillsQueue.tsx`
- Keep as-is for owner manual review workflow (secondary path)

---

## Phase 5 — Integration Points

### Player Vault / Practice Hub
- Add "Assigned by Coach" section showing `drill_assignments` for current user
- Sits alongside "Fix Your Game" recommendations

---

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create `drill_assignments` table with RLS |
| `supabase/functions/generate-drills/index.ts` | Insert directly into `drills` + `drill_tag_map` + `drill_positions` |
| `src/components/coach/CoachDrillAssign.tsx` | New — coach drill assignment UI |
| `src/components/practice/AssignedDrills.tsx` | New — player assigned drills view |
| `src/components/owner/DrillCmsManager.tsx` | Add auto-populate button |
| `src/hooks/useDrillAssignments.ts` | New — fetch/create assignments |

