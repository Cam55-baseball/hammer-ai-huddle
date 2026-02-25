

# Player Notes for Coaches and Scouts

## Overview

Add a "Player Notes" section to both the Scout Dashboard and Coach Dashboard, allowing coaches and scouts to write free-text notes about specific players they follow. Each note is tied to a player and includes a timestamp, making it easy to track observations over time.

---

## Database Changes

### New Table: `player_notes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `author_id` | uuid (FK auth.users, NOT NULL) | The scout/coach writing the note |
| `player_id` | uuid (FK auth.users, NOT NULL) | The player being noted about |
| `content` | text (NOT NULL) | Free-text note content |
| `created_at` | timestamptz | Default now() |
| `updated_at` | timestamptz | Default now() |

### RLS Policies

- **SELECT**: Authors can read their own notes (`auth.uid() = author_id`)
- **INSERT**: Authenticated users can insert where `auth.uid() = author_id`
- **UPDATE**: Authors can update their own notes
- **DELETE**: Authors can delete their own notes

No cross-user visibility -- notes are private to the coach/scout who wrote them.

### Trigger

- `update_updated_at_column` trigger on UPDATE to auto-set `updated_at`

---

## New Component: `PlayerNotesSection`

**File: `src/components/scout/PlayerNotesSection.tsx`**

A card-based section that includes:

1. **Player Selector** -- A dropdown/select at the top populated with the list of followed players (passed as a prop from the parent dashboard). The coach/scout picks which player to view/write notes for.

2. **Note Input** -- A free-text textarea with a "Save Note" button. Saves a new row to `player_notes`.

3. **Notes History** -- A scrollable list of previous notes for the selected player, ordered by most recent first. Each note shows:
   - The note content
   - Date/time it was written
   - A "View Profile" button linking to `/profile?userId={playerId}`
   - Edit and delete options (inline edit with save/cancel)

4. **Empty State** -- When no player is selected or no notes exist for the selected player.

---

## UI Integration

### Scout Dashboard (`src/pages/ScoutDashboard.tsx`)

After the "Following" card (around line 464), add the `PlayerNotesSection` component:

```text
[Following Card]
[Player Notes Card]  <-- NEW
[Find Players Card]
```

Pass the `following` array as the player list prop.

### Coach Dashboard (`src/pages/CoachDashboard.tsx`)

Same placement -- after the "My Players" card, before "Find Players":

```text
[My Players Card]
[Player Notes Card]  <-- NEW
[Sent Activities History]
[Find Players Card]
```

Pass the `following` array as the player list prop.

---

## Technical Details

### Files Created

| File | Purpose |
|------|---------|
| `src/components/scout/PlayerNotesSection.tsx` | Shared component for player notes (used by both dashboards) |

### Files Modified

| File | Change |
|------|--------|
| `src/pages/ScoutDashboard.tsx` | Import and render `PlayerNotesSection` with `following` players |
| `src/pages/CoachDashboard.tsx` | Import and render `PlayerNotesSection` with `following` players |

### Hook Logic (inline in component)

The `PlayerNotesSection` component will manage its own state:
- `selectedPlayerId` -- which player is selected in the dropdown
- `notes` -- fetched notes for the selected player
- `newNote` -- textarea content for new note
- `editingNoteId` / `editContent` -- for inline editing

Queries:
- **Fetch**: `SELECT * FROM player_notes WHERE author_id = auth.uid() AND player_id = :selectedPlayerId ORDER BY created_at DESC`
- **Insert**: `INSERT INTO player_notes (author_id, player_id, content) VALUES (auth.uid(), :playerId, :content)`
- **Update**: `UPDATE player_notes SET content = :content WHERE id = :noteId AND author_id = auth.uid()`
- **Delete**: `DELETE FROM player_notes WHERE id = :noteId AND author_id = auth.uid()`

