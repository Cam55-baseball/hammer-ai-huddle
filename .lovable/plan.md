

# Fix: Coach Cannot See Shared Folders in Collaborative Workspace

## Root Cause
The RLS (Row Level Security) policies on `activity_folders` and `activity_folder_items` only check the **legacy** `folder_allows_coach_edit()` function, which looks at the old `coach_edit_allowed` and `coach_edit_user_id` columns. They do NOT check the newer `folder_coach_permissions` table or the head coach (`athlete_mpi_settings.primary_coach_id`) relationship.

The Collaborative Workspace code correctly reads folder IDs from `folder_coach_permissions`, but when it then queries `activity_folders` and `activity_folder_items` to get the actual data, RLS blocks those rows because the coach doesn't match any allowed policy.

## Solution: Database Migration

Update the SELECT RLS policies on both `activity_folders` and `activity_folder_items` to also grant access when:
1. The coach has an active (non-revoked) record in `folder_coach_permissions`
2. The coach is the head coach (via `athlete_mpi_settings.primary_coach_id`) and not explicitly revoked

### Changes

**1. New SELECT policy on `activity_folders`** -- "Coaches with folder permissions can view"

Allows a coach to SELECT a folder if they have a non-revoked `folder_coach_permissions` entry OR are the head coach (without explicit revocation).

```sql
CREATE POLICY "Coaches with folder permissions can view"
ON public.activity_folders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.folder_coach_permissions fcp
    WHERE fcp.folder_id = activity_folders.id
      AND fcp.coach_user_id = auth.uid()
      AND fcp.revoked_at IS NULL
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.athlete_mpi_settings ams
      WHERE ams.user_id = activity_folders.owner_id
        AND ams.primary_coach_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.folder_coach_permissions fcp
      WHERE fcp.folder_id = activity_folders.id
        AND fcp.coach_user_id = auth.uid()
        AND fcp.revoked_at IS NOT NULL
    )
  )
);
```

**2. New SELECT policy on `activity_folder_items`** -- "Coaches with folder permissions can view items"

Same logic, joined through the folder:

```sql
CREATE POLICY "Coaches with folder permissions can view items"
ON public.activity_folder_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.folder_coach_permissions fcp
    WHERE fcp.folder_id = activity_folder_items.folder_id
      AND fcp.coach_user_id = auth.uid()
      AND fcp.revoked_at IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.activity_folders af
    JOIN public.athlete_mpi_settings ams ON ams.user_id = af.owner_id
    WHERE af.id = activity_folder_items.folder_id
      AND ams.primary_coach_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.folder_coach_permissions fcp2
        WHERE fcp2.folder_id = af.id
          AND fcp2.coach_user_id = auth.uid()
          AND fcp2.revoked_at IS NOT NULL
      )
  )
);
```

## No Code Changes Needed
The `CollaborativeWorkspace.tsx` component logic is already correct. The only issue is the database policies blocking the data from being returned.

## Technical Details
- These are additive SELECT policies (Postgres OR's PERMISSIVE policies together), so existing access for owners, assigned players, and templates remains unaffected.
- The head coach revocation check mirrors the logic already in the `can_edit_folder_item` database function.

