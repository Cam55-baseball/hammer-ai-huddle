
# Activity Card Sharing + Coach Edit Permission System

## Overview

This plan extends the existing `folder_coach_permissions` table and folder editing architecture to support true bidirectional activity card collaboration between players and linked coaches. It adds version control, edit audit logging, conflict prevention, a head coach auto-access mechanism, and a player-facing permission matrix UI.

---

## Current State

What already exists:
- `folder_coach_permissions` table with `folder_id`, `coach_user_id`, `permission_level` (default 'edit'), `granted_by`, `revoked_at`
- `activity_folders.coach_edit_allowed` + `coach_edit_user_id` for primary coach access
- `FolderDetailDialog.tsx` checks both mechanisms to determine `isGrantedCoach`
- `scout_follows` with `relationship_type` ('follow' | 'linked') and `status` for bidirectional relationships
- `is_linked_coach()` security definer function
- `athlete_mpi_settings.primary_coach_id` for head coach designation
- `activity_folder_items.template_snapshot` JSONB for card data

What is missing:
- No version control on card edits
- No edit audit log
- No head coach auto-access override logic (currently manual per-folder toggle)
- No player-facing permission matrix UI
- No "Send to Coach" flow from individual activity cards
- No coach "Collaborative Workspace" dashboard section
- No optimistic locking / conflict detection
- No explicit "view" vs "edit" permission distinction in UI (table has `permission_level` but UI doesn't expose it)

---

## Phase 1: Database Schema Changes

### 1A. New Table: `activity_card_versions`

Tracks every edit to folder items (activity cards) for version history and restore capability.

```text
activity_card_versions
  id              uuid PK default gen_random_uuid()
  folder_item_id  uuid FK -> activity_folder_items(id) ON DELETE CASCADE
  edited_by       uuid NOT NULL (user who made the edit)
  editor_role     text NOT NULL ('player' | 'coach')
  version_number  integer NOT NULL
  snapshot_json   jsonb NOT NULL (full item state at this version)
  created_at      timestamptz default now()
  UNIQUE (folder_item_id, version_number)
```

RLS:
- Players can SELECT versions for items in their own folders
- Linked coaches can SELECT versions for items in folders they have permission to
- INSERT allowed for folder owners and permitted coaches (validated via security definer)

### 1B. New Table: `activity_edit_logs`

Lightweight audit trail for individual field-level changes.

```text
activity_edit_logs
  id              uuid PK default gen_random_uuid()
  folder_item_id  uuid FK -> activity_folder_items(id) ON DELETE CASCADE
  user_id         uuid NOT NULL
  action_type     text NOT NULL ('added_exercise' | 'removed_exercise' | 'reordered' | 'modified_sets' | 'renamed' | 'modified_description' | 'modified_fields' | 'restored_version')
  metadata        jsonb (details of change)
  created_at      timestamptz default now()
```

RLS: Same visibility rules as `activity_card_versions`.

### 1C. Add `editing_lock` columns to `activity_folder_items`

For optimistic locking / conflict prevention:

```text
ALTER TABLE activity_folder_items
  ADD COLUMN locked_by uuid DEFAULT NULL,
  ADD COLUMN locked_at timestamptz DEFAULT NULL;
```

A validation trigger clears stale locks older than 5 minutes.

### 1D. New Security Definer Function: `can_edit_folder_item()`

```text
can_edit_folder_item(p_user_id uuid, p_folder_item_id uuid) RETURNS boolean
```

Logic:
1. Get folder_id from the item
2. Check if user is folder owner -> true
3. Check if user is the primary_coach_id for the folder owner (head coach auto-access) -> true
4. Check folder_coach_permissions for this coach + folder with permission_level = 'edit' and revoked_at IS NULL -> true
5. Otherwise -> false

This function is used in RLS policies on `activity_folder_items` for UPDATE, and on version/log INSERT.

### 1E. Update RLS on `activity_folder_items`

Add UPDATE policy:
```text
USING (
  auth.uid() = (SELECT owner_id FROM activity_folders WHERE id = folder_id)
  OR public.can_edit_folder_item(auth.uid(), id)
)
```

---

## Phase 2: Head Coach Auto-Access Logic

### Current Problem
Head coach access is toggled per-folder via `coach_edit_allowed` + `coach_edit_user_id`. This requires manual toggling for every folder.

### Solution
The `can_edit_folder_item()` security definer function (Phase 1D) automatically checks `athlete_mpi_settings.primary_coach_id`. If the requesting user matches the folder owner's `primary_coach_id`, they get edit access to ALL folders without any per-folder toggle needed.

The existing `coach_edit_allowed` toggle remains as an additional mechanism for non-head coaches (assistant coaches).

**File: `src/components/folders/FolderDetailDialog.tsx`** -- Modified
- Update `isGrantedCoach` check to also consider head coach auto-access
- Show "Head Coach - Full Access" badge when applicable

---

## Phase 3: Send Activity Card to Coach Flow

### 3A. New Component: `src/components/custom-activities/SendCardToCoachDialog.tsx`

Triggered from activity card context menu or a "Send to Coach" button.

Flow:
1. Player selects a linked coach (only coaches with `relationship_type = 'linked'` and `status = 'accepted'`)
2. System checks if coach already has folder permission for the card's folder
3. If no permission: prompt "Grant folder access to [Coach Name] to continue?"
4. Player confirms -> inserts into `folder_coach_permissions` with `permission_level = 'edit'`
5. Toast: "Card shared with [Coach Name] for editing"

### 3B. File: `src/components/custom-activities/CustomActivityCard.tsx` -- Modified
- Add "Send to Coach for Edit" button (next to existing Send to Player button)
- Only visible when user has linked coaches
- Opens `SendCardToCoachDialog`

---

## Phase 4: Version Control System

### 4A. New Component: `src/components/folders/CardVersionHistory.tsx`

Shows version timeline for a folder item:
- List of versions with: version number, editor name, editor role badge, timestamp
- Click to preview version (read-only snapshot render)
- "Restore" button per version -> creates a NEW version with restored data (no destructive overwrite)
- "Compare" button to diff two versions (shows added/removed exercises, changed fields)

### 4B. File: `src/components/folders/FolderDetailDialog.tsx` -- Modified

When saving an item edit (`handleEditItemSave`):
1. Before writing the update, snapshot the current state as a new version in `activity_card_versions`
2. Insert an `activity_edit_logs` entry describing the change
3. Increment version counter
4. Then write the actual update

### 4C. File: `src/components/folders/FolderItemEditDialog.tsx` -- Modified
- Add "Version History" button in the edit dialog header
- Opens `CardVersionHistory` as a slide-over panel

---

## Phase 5: Optimistic Locking / Conflict Prevention

### 5A. Lock acquisition on edit open

When a user opens a card for editing:
1. Attempt to set `locked_by = auth.uid(), locked_at = now()` on the item
2. If `locked_by` is already set AND `locked_at` is less than 5 minutes ago AND `locked_by != auth.uid()`:
   - Show banner: "Currently being edited by [User Name]"
   - Open in read-only mode
3. If lock is stale (> 5 minutes), override it

### 5B. Lock release
- On save: clear `locked_by` and `locked_at`
- On dialog close without save: clear lock
- Stale lock cleanup: a DB trigger that auto-clears locks older than 10 minutes on any UPDATE

### 5C. File: `src/components/folders/FolderItemEditDialog.tsx` -- Modified
- Acquire lock on open
- Release lock on close
- Show conflict banner if locked by another user

---

## Phase 6: Player Permission Matrix UI

### 6A. New Component: `src/components/connections/FolderPermissionMatrix.tsx`

Accessible from player Settings or ConnectionsTab.

Layout:
- Rows = player's folders
- Columns = linked coaches
- Each cell = checkbox pair: View / Edit
- Head Coach column shows "Full Access" with no toggles (auto-granted)

Actions:
- Toggle view/edit inserts/updates `folder_coach_permissions`
- Revoke = sets `revoked_at = now()`

### 6B. File: `src/components/connections/ConnectionsTab.tsx` -- Modified
- Add "Folder Permissions" section below the coaches list
- Render `FolderPermissionMatrix`

---

## Phase 7: Coach Dashboard -- Collaborative Workspace

### 7A. New Component: `src/components/coach/CollaborativeWorkspace.tsx`

New tab in CoachDashboard showing:
- **Shared Cards**: all folder items where coach has edit permission (via `folder_coach_permissions` or head coach status)
- **Recently Edited**: items sorted by last edit timestamp, filtered to this coach
- **Folder Access Overview**: grouped by player, showing which folders and permission levels

Filters:
- By player
- By folder
- By last edited date
- By sport

### 7B. File: `src/pages/CoachDashboard.tsx` -- Modified
- Add "Collaborative Workspace" tab
- Render `CollaborativeWorkspace` component

---

## Phase 8: AI Card Editability Rule

### No code change needed
AI-generated cards are already stored as regular `activity_folder_items` with `template_snapshot` JSONB. They use the same `FolderItemEditDialog` as manually created cards. There is no read-only flag or locked state on AI cards.

Confirmation: AI-generated cards are fully editable by both player and permitted coach. No structural change required -- this is already the architecture.

The only addition: ensure the version control system (Phase 4) captures a "base_blueprint" flag on the first version of an AI-generated card, so users can always restore to the original AI recommendation.

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/custom-activities/SendCardToCoachDialog.tsx` | Send card to coach with permission auto-grant |
| `src/components/folders/CardVersionHistory.tsx` | Version timeline, restore, compare |
| `src/components/connections/FolderPermissionMatrix.tsx` | Player-facing folder x coach permission grid |
| `src/components/coach/CollaborativeWorkspace.tsx` | Coach dashboard collaborative cards tab |

### Modified Files
| File | Change |
|------|--------|
| `src/components/custom-activities/CustomActivityCard.tsx` | Add "Send to Coach for Edit" button |
| `src/components/folders/FolderDetailDialog.tsx` | Version snapshots on save, head coach auto-access |
| `src/components/folders/FolderItemEditDialog.tsx` | Lock acquisition/release, version history button |
| `src/components/connections/ConnectionsTab.tsx` | Add folder permissions section |
| `src/pages/CoachDashboard.tsx` | Add Collaborative Workspace tab |

### Database Changes
| Change | Type |
|--------|------|
| Create `activity_card_versions` table with RLS | Migration |
| Create `activity_edit_logs` table with RLS | Migration |
| Add `locked_by`, `locked_at` to `activity_folder_items` | Migration |
| Create `can_edit_folder_item()` security definer function | Migration |
| Update RLS on `activity_folder_items` for coach UPDATE | Migration |
| Stale lock cleanup trigger on `activity_folder_items` | Migration |

### Permission Validation Flow
```text
Edit Request
  -> can_edit_folder_item(user_id, item_id)
     -> Is folder owner? YES -> allow
     -> Is head coach (primary_coach_id match)? YES -> allow
     -> Has folder_coach_permissions with edit + not revoked? YES -> allow
     -> NO -> deny
```

### Conflict Resolution Method
- Optimistic locking via `locked_by` / `locked_at` columns
- 5-minute active lock window
- Stale locks auto-cleared after 10 minutes
- Second editor sees read-only mode with "Currently being edited by [Name]" banner
- No simultaneous writes possible

### Execution Order
1. Database migration (tables, functions, RLS, trigger)
2. `SendCardToCoachDialog` + `CustomActivityCard` button (independent)
3. `CardVersionHistory` + `FolderItemEditDialog` integration (independent)
4. Lock system in `FolderItemEditDialog` (depends on migration)
5. `FolderPermissionMatrix` + `ConnectionsTab` update (independent)
6. `CollaborativeWorkspace` + `CoachDashboard` update (independent)
7. `FolderDetailDialog` head coach auto-access + version snapshots (depends on migration)
