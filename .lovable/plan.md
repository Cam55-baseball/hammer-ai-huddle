
# Coach Activity Folders System

## Overview

A folder system allowing coaches to build structured, scheduled collections of activities and send them to players. Folders integrate into the Game Plan alongside Hammers Modality programs, with strict role-based editing permissions. Players can also create personal folders.

---

## Database Schema

### New Tables

**`activity_folders`** -- Core folder entity

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid NOT NULL | FK to auth.users (coach or player) |
| owner_type | text NOT NULL | 'coach' or 'player' |
| name | text NOT NULL | e.g. "Off-Season Development" |
| description | text | optional |
| label | text | 'offseason', 'in_season', 'recovery', 'preseason', 'general' |
| sport | text NOT NULL | 'baseball' or 'softball' |
| start_date | date | null = starts immediately |
| end_date | date | null = ongoing |
| frequency_days | integer[] | Days per week [1,3,5] = Mon/Wed/Fri |
| cycle_type | text | 'weekly', 'custom_rotation', 'date_based' |
| cycle_length_weeks | integer | For custom rotation (e.g. 4) |
| placement | text DEFAULT 'after' | 'before', 'after', 'separate_day', 'layered' |
| priority_level | integer DEFAULT 0 | Ordering priority |
| status | text DEFAULT 'draft' | 'draft', 'active', 'completed', 'archived' |
| color | text DEFAULT '#3b82f6' | Visual tag color |
| icon | text DEFAULT 'folder' | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`activity_folder_items`** -- Activities inside a folder

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| folder_id | uuid NOT NULL | FK to activity_folders |
| title | text NOT NULL | |
| description | text | |
| item_type | text | 'exercise', 'skill_work', 'mobility', 'recovery', 'activity', 'custom' |
| assigned_days | integer[] | [1,3,5] = Mon/Wed/Fri within folder schedule |
| cycle_week | integer | Which week in rotation (1, 2, 3, 4) |
| order_index | integer | Sort order |
| exercises | jsonb | Reuses existing Exercise[] format |
| attachments | jsonb | [{type:'video'|'pdf'|'link', url:string, name:string}] |
| duration_minutes | integer | |
| notes | text | Coach notes |
| completion_tracking | boolean DEFAULT true | |
| created_at | timestamptz | |

**`folder_assignments`** -- Coach-to-player folder send/accept

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| folder_id | uuid NOT NULL | FK to activity_folders |
| sender_id | uuid NOT NULL | Coach who sent it |
| recipient_id | uuid NOT NULL | Player receiving it |
| status | text DEFAULT 'pending' | 'pending', 'accepted', 'declined' |
| accepted_at | timestamptz | |
| declined_at | timestamptz | |
| sent_at | timestamptz DEFAULT now() | |
| player_notes | jsonb | Player personal notes per item |

**`folder_item_completions`** -- Per-day completion tracking

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| folder_item_id | uuid NOT NULL | FK to activity_folder_items |
| user_id | uuid NOT NULL | Player |
| folder_assignment_id | uuid | FK to folder_assignments (null for self-created) |
| entry_date | date NOT NULL | |
| completed | boolean DEFAULT false | |
| completed_at | timestamptz | |
| notes | text | Player notes for this completion |
| UNIQUE(folder_item_id, user_id, entry_date) | | |

### RLS Policies

- **activity_folders**: Owner can CRUD. Players can SELECT folders assigned to them via folder_assignments.
- **activity_folder_items**: Owner of parent folder can CRUD. Assigned players can SELECT.
- **folder_assignments**: Sender can INSERT/SELECT. Recipient can SELECT and UPDATE (accept/decline).
- **folder_item_completions**: User can CRUD their own rows.

---

## Core Logic

### Folder Lifecycle

```text
Coach creates folder (draft)
  --> Coach adds items with day/cycle assignments
  --> Coach sends to player(s) via folder_assignments
  --> Player receives notification, accepts/declines
  --> On acceptance: status stays 'pending' until start_date
  --> On start_date: folder auto-activates in Game Plan
  --> On end_date: folder auto-removes from Game Plan
  --> If no end_date: runs until manually archived
```

### Game Plan Integration

In `useGamePlan.ts`, after existing custom activity loading (~line 530), add a new section:

1. Query `folder_assignments` where `recipient_id = user.id` AND `status = 'accepted'`
2. Join `activity_folders` to get folder metadata
3. Filter: `start_date <= today` AND (`end_date IS NULL OR end_date >= today`)
4. For active folders, query `activity_folder_items` where `assigned_days` includes today's day-of-week
5. For custom rotation cycles: calculate current cycle week from `start_date` and `cycle_length_weeks`, filter items by `cycle_week`
6. Query `folder_item_completions` for today to get completion state
7. Inject folder items into the task list with:
   - `section: 'folder'` (new section type)
   - `taskType: 'folder-item'` (new task type)
   - Visual badge showing folder name and color
   - Placement logic: 'before' = insert before training section, 'after' = insert after training, 'separate_day' = only show on non-Hammers days, 'layered' = intersperse within training

Also load player-created folders the same way (where `owner_id = user.id` AND `owner_type = 'player'`).

### Conflict Handling with Hammers Modality

- Hammers programs (Iron Bambino, Heat Factory, The Unicorn, Speed Lab) remain PRIMARY
- Folder items are ADDITIVE -- they never replace Hammers tasks
- The `placement` field controls where folder items appear relative to Hammers
- If The Unicorn is active and overrides individual programs, folder items still appear alongside
- No automatic overload warning in v1 (noted as future feature)

### Editing Permissions

Coach-created folders (sent via `folder_assignments`):
- Player CANNOT modify: folder settings, items, frequency, duration, cycle logic
- Player CAN: mark items complete, add personal notes (stored in `folder_item_completions.notes` and `folder_assignments.player_notes`)
- Player CAN: request modification (sends a notification/message to coach -- uses existing `sent_activity_templates` messaging pattern)

Player-created folders (`owner_type = 'player'`):
- Full CRUD on everything
- Coaches can view if they follow the player (via `scout_follows`) but cannot edit unless player grants permission (future feature)

---

## Frontend Components

### New Files

| File | Purpose |
|------|---------|
| `src/types/activityFolder.ts` | TypeScript types for folders, items, assignments, completions |
| `src/hooks/useActivityFolders.ts` | Coach-side: CRUD folders and items, send to players |
| `src/hooks/useReceivedFolders.ts` | Player-side: fetch assigned folders, accept/decline, completions |
| `src/hooks/usePlayerFolders.ts` | Player-created personal folders |
| `src/components/folders/FolderBuilder.tsx` | Coach folder creation form (name, dates, frequency, cycle, placement, label) |
| `src/components/folders/FolderItemEditor.tsx` | Add/edit items inside a folder (exercises, attachments, day assignments, cycle week) |
| `src/components/folders/FolderCard.tsx` | Display card for a folder (shows status badge, dates, item count, progress %) |
| `src/components/folders/FolderDetailDialog.tsx` | Full folder view with all items, progress tracking, completion % |
| `src/components/folders/FolderAssignDialog.tsx` | Coach selects players to send folder to (reuses `useSentActivities.fetchFollowedPlayers`) |
| `src/components/folders/ReceivedFolderCard.tsx` | Player-facing accept/decline card (similar to PendingCoachActivityCard) |
| `src/components/folders/FolderGamePlanSection.tsx` | Renders folder items within Game Plan with visual distinction |
| `src/components/folders/PlayerFolderBuilder.tsx` | Simplified builder for player-created folders |

### Integration Points

**MyCustomActivities.tsx**: Add new tab "Folders" with icon `FolderOpen`. Shows:
- Coach view: folder builder, list of created folders, send history
- Player view: received folders (pending/active/completed), personal folders

**Dashboard.tsx / Game Plan**: Folder items render in a visually distinct section:
- Folder name badge with color tag
- Grouped under folder heading (e.g. "Off-Season Development Folder")
- Each item shows completion checkbox
- Coach-locked items show lock icon

**CoachDashboard.tsx**: Add folder management section showing:
- Active folders sent to players
- Folder completion tracking per player
- Duplicate/archive folder actions

### UX Flow -- Coach Creating a Folder

1. Navigate to My Custom Activities -> Folders tab
2. Tap "Create Folder"
3. Fill: Name, Description, Label (dropdown), Start Date, End Date (optional)
4. Set Frequency: tap day circles (Mon-Sun) 
5. Set Cycle Type: Weekly (default) / Custom Rotation (specify weeks) / Date-Based
6. Set Placement: Before Workout / After Workout / Separate Days / Layered
7. Add Items: tap "+ Add Item", fill title, type, exercises (reuses existing exercise picker), assign to specific days/weeks, attach video/PDF/link
8. Save as Draft or Send immediately
9. Select Players dialog (reuses followed players list)
10. Players receive real-time notification

### UX Flow -- Player Receiving a Folder

1. Notification appears (toast + badge on Folders tab)
2. Player opens received folder card showing: coach name, folder name, date range, item count
3. Tap Accept or Decline
4. If accepted: folder appears in Game Plan on start_date
5. Daily: folder items show alongside Hammers tasks with visual badge
6. Player taps checkbox to complete items
7. Optional: add personal notes per item

### Folder Progress Tracking

`FolderDetailDialog` calculates:
- `completionPercentage`: completed items / total scheduled items across the folder's date range
- Per-week breakdown for custom rotation cycles
- Visual progress bar

---

## Technical Details

### GamePlanTask Extension

```typescript
// Add to existing GamePlanTask interface
export interface GamePlanTask {
  // ... existing fields
  folderData?: {
    folderId: string;
    folderName: string;
    folderColor: string;
    itemId: string;
    isCoachLocked: boolean;
    placement: 'before' | 'after' | 'separate_day' | 'layered';
  };
}
```

### Cycle Week Calculation

```typescript
function getCurrentCycleWeek(startDate: Date, cycleLengthWeeks: number): number {
  const daysSinceStart = differenceInDays(new Date(), startDate);
  const weeksSinceStart = Math.floor(daysSinceStart / 7);
  return (weeksSinceStart % cycleLengthWeeks) + 1; // 1-indexed
}
```

### Realtime

Enable realtime on `folder_assignments` so players see new folder sends instantly:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.folder_assignments;
```

---

## Files Modified

| File | Change |
|------|---------|
| `src/hooks/useGamePlan.ts` | Add folder item loading after custom activities (~line 535), inject folder tasks into task list |
| `src/pages/MyCustomActivities.tsx` | Add "Folders" tab |
| `src/pages/CoachDashboard.tsx` | Add folder management section |
| `src/pages/Dashboard.tsx` | Render FolderGamePlanSection for active folder items |

## What is NOT in v1

- Auto-pause if player is injured (future)
- Overload warnings when folder + Hammers exceed thresholds (future)
- Coach editing player-created folders (permission model needed)
- Folder template library (coaches sharing folders with other coaches)
- Date-based scheduling (individual item on specific calendar dates vs. recurring days) -- simplified to day-of-week in v1
