

# Add "Quick Note" Button to Game Plan

## Overview
Add a "Quick Note" button next to the existing Quick Add buttons at the bottom of the Game Plan. It opens a simple dialog where users can type a note and save it directly to their Vault's free notes section (`vault_free_notes` table). No character limit, unlimited submissions.

## Changes

### 1. New Component: `src/components/game-plan/QuickNoteDialog.tsx`
- Simple dialog with a Textarea (no character limit) and a Save button
- Accepts `open`, `onOpenChange` props
- Uses `useVault().saveFreeNote` to persist the note
- Shows toast on success/error, clears input on success
- Keeps dialog open after save so users can submit multiple notes quickly

### 2. `src/components/GamePlanCard.tsx`
- Import `QuickNoteDialog` and the `NotebookPen` icon
- Add state: `quickNoteOpen` (boolean)
- Add a "Quick Note" button in the quick-add buttons section (line ~1797), styled with a distinct color (e.g., blue/indigo)
- Render `QuickNoteDialog` alongside other dialogs at the bottom of the component

### No database changes needed
The `vault_free_notes` table and `saveFreeNote` hook already exist and support unlimited notes with no character constraints. Notes saved here already appear in the Vault's free notes section.

