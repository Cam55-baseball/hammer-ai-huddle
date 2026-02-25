

# Activate Remaining Missing Folder Features

## Overview

Four features deferred from v1 of the Coach Activity Folders System, now being fully implemented.

---

## Feature 1: Overload Warnings When Folder + Hammers Exceed Thresholds

When a player's combined daily load (Hammers Modality programs + active folder items) exceeds CNS or volume thresholds, the system surfaces warnings in the Game Plan and folder detail views.

### Database Changes

None -- uses existing `athlete_load_tracking` table and `detect-overlaps` edge function.

### Logic

**Extend `detect-overlaps` edge function** to accept an additional parameter `folder_item_loads` (array of `{itemId, estimatedCNS, estimatedVolume}`) representing folder items scheduled for the target date.

Add a new warning type `'folder_overload'` to the `OverlapWarning` interface.

**New check in detect-overlaps:**
- Sum `planned_cns_load` (Hammers) + folder item CNS estimates
- If combined total > 180: severity `warning`, message "Combined Hammers + folder load is very high"
- If combined total > 140: severity `advisory`, message "Moderate combined load today"

**Client-side estimation:** Each folder item gets a CNS estimate based on `item_type`:
- exercise: 30 CNS base
- skill_work: 25
- mobility: 10
- recovery: 5
- activity: 20
- custom: 15

Multiply by `duration_minutes / 30` for scaling.

### UI Changes

- Create `src/components/folders/FolderOverloadBanner.tsx` -- a dismissible alert shown at the top of the Game Plan when folder + Hammers overload is detected
- `FolderDetailDialog.tsx`: Show a small warning badge on the folder header if overload detected for today
- Create `src/hooks/useFolderOverloadCheck.ts` -- calls `detect-overlaps` with combined load data on Game Plan mount

### Edge Function Changes

- `detect-overlaps/index.ts`: Add `folder_cns_load` parameter, sum with `planned_cns_load`, add `folder_overload` warning type

---

## Feature 2: Coach Editing Player-Created Folders (Permission Model)

Players can grant their coach permission to edit their personal folders. Coaches cannot edit without explicit permission.

### Database Changes

**Add columns to `activity_folders`:**
- `coach_edit_allowed` (boolean DEFAULT false) -- player toggles this
- `coach_edit_user_id` (uuid, nullable) -- which coach is allowed to edit (FK to auth.users)

### Logic

**RLS policy update on `activity_folders`:**
- Add UPDATE policy: allow if `auth.uid() = coach_edit_user_id` AND `coach_edit_allowed = true`

**RLS policy update on `activity_folder_items`:**
- Add UPDATE/INSERT/DELETE policies: allow if parent folder's `coach_edit_user_id = auth.uid()` AND `coach_edit_allowed = true`
- Use a security definer function `folder_allows_coach_edit(folder_id uuid, coach_id uuid)` to avoid recursive RLS

### UI Changes

- `FolderDetailDialog.tsx` (player view): Add "Allow Coach to Edit" toggle that sets `coach_edit_allowed = true` and `coach_edit_user_id` to the player's primary coach (from `athlete_mpi_settings.primary_coach_id`)
- `FolderTabContent.tsx` (coach view): In a "Player Folders" section, show player-created folders where `coach_edit_allowed = true` AND `coach_edit_user_id = coach.id`
- When coach has edit permission, `FolderDetailDialog` renders the `FolderItemEditor` for adding items and shows delete buttons

### Hook Changes

- `useActivityFolders.ts`: Add `fetchEditableFolders()` for coaches to query folders they can edit
- `usePlayerFolders.ts`: Add `toggleCoachEdit(folderId, allowed)` method

---

## Feature 3: Folder Template Library (Coach-to-Coach Sharing)

Coaches can publish folders as reusable templates that other coaches can browse and duplicate.

### Database Changes

**Add columns to `activity_folders`:**
- `is_template` (boolean DEFAULT false) -- marks as a shareable template
- `template_category` (text) -- e.g. 'hitting', 'pitching', 'conditioning', 'recovery', 'general'
- `template_description` (text) -- public-facing description for the library
- `use_count` (integer DEFAULT 0) -- how many times duplicated
- `source_template_id` (uuid, nullable) -- FK to the original template if duplicated from one

### Logic

- Templates are folders with `is_template = true` and `status = 'active'`
- Any coach can SELECT templates (add RLS policy: allow SELECT on `activity_folders` WHERE `is_template = true`)
- Duplication: deep-copy the folder row (new ID, new owner_id, `is_template = false`, `source_template_id = original.id`) and all its `activity_folder_items`
- Increment `use_count` on the source template

### UI Changes

- Create `src/components/folders/FolderTemplateLibrary.tsx`:
  - Grid of template cards with name, category, description, use count, item count
  - Filter by category and sport
  - "Use Template" button duplicates into coach's folders
- `FolderCard.tsx`: Add "Publish as Template" option in the dropdown menu (sets `is_template = true`)
- `FolderBuilder.tsx`: Add optional "Template Category" dropdown (only shown when publishing)
- `FolderTabContent.tsx`: Add a "Template Library" sub-section for coaches with a browse/search UI

### Hook Changes

- Create `src/hooks/useFolderTemplates.ts`:
  - `fetchTemplates(sport, category?)` -- query public templates
  - `duplicateTemplate(templateId)` -- deep-copy folder + items
  - `publishAsTemplate(folderId, category, description)` -- mark folder as template
  - `unpublishTemplate(folderId)` -- remove from library

---

## Feature 4: Date-Based Scheduling

Allow folder items to be assigned to specific calendar dates instead of (or in addition to) recurring day-of-week patterns.

### Database Changes

**Add column to `activity_folder_items`:**
- `specific_dates` (date[]) -- specific dates this item should appear on (null = use assigned_days pattern)

### Logic

- When `specific_dates` is populated, the item appears ONLY on those dates (overrides `assigned_days`)
- When both `specific_dates` and `assigned_days` are null, the item appears every day the folder is active
- Game Plan integration: check `specific_dates @> ARRAY[today]::date[]` OR fall back to day-of-week logic

### UI Changes

- `FolderItemEditor.tsx`: Add a "Schedule Type" toggle: "Weekly Pattern" (existing day circles) vs "Specific Dates" (date picker)
  - When "Specific Dates" selected, show a multi-date calendar picker
  - Store selected dates in `specific_dates` array
- `FolderDetailDialog.tsx`: Show specific dates on items (e.g. "Mar 15, Mar 22, Apr 1")
- Update `DAY_LABELS` display logic to handle both modes

### Types Update

Add `specific_dates: string[] | null` to `ActivityFolderItem` interface.

---

## Implementation Order

```text
Step  Feature                           Effort    Dependencies
----  --------------------------------  --------  ------------
1     DB migration (all 4 features)     Small     None
2     Overload warnings                 Medium    Migration + detect-overlaps
3     Coach edit permission model       Medium    Migration + RLS
4     Folder template library           Medium    Migration
5     Date-based scheduling             Medium    Migration
```

## Files Created

| File | Purpose |
|------|---------|
| `src/components/folders/FolderOverloadBanner.tsx` | Overload warning banner for Game Plan |
| `src/components/folders/FolderTemplateLibrary.tsx` | Browse/duplicate shared templates |
| `src/hooks/useFolderOverloadCheck.ts` | Client-side overload detection hook |
| `src/hooks/useFolderTemplates.ts` | Template CRUD and duplication |

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/detect-overlaps/index.ts` | Add `folder_cns_load` param, `folder_overload` warning type |
| `src/types/activityFolder.ts` | Add new fields to interfaces |
| `src/hooks/useActivityFolders.ts` | Add `fetchEditableFolders`, `publishAsTemplate` |
| `src/hooks/usePlayerFolders.ts` | Add `toggleCoachEdit` method |
| `src/components/folders/FolderBuilder.tsx` | Add template category |
| `src/components/folders/FolderItemEditor.tsx` | Add date-based scheduling toggle + multi-date picker |
| `src/components/folders/FolderDetailDialog.tsx` | Overload badge, coach edit toggle, specific dates display |
| `src/components/folders/FolderCard.tsx` | "Publish" menu option |
| `src/components/folders/FolderTabContent.tsx` | Template library section, editable player folders for coaches |

