

# Add Bat Speed to Performance Tests + Per-Set Logging for Folder Items

## Overview
Two enhancements: (1) Add bat speed as a metric in the 6-week performance tests for the hitting module, and (2) add the ability for users to log per-set data (weight, time, reps, etc.) on folder item exercises from the Game Plan and folder detail views.

---

## Part 1: Add Bat Speed to Hitting Performance Tests

### File: `src/components/vault/VaultPerformanceTestCard.tsx`

**Add `bat_speed` metric to the hitting test arrays** for both baseball and softball:

- `TEST_TYPES_BY_SPORT.baseball.hitting`: Add `'bat_speed'` to the array
- `TEST_TYPES_BY_SPORT.softball.hitting`: Add `'bat_speed'` to the array
- `TEST_METRICS`: Add `bat_speed: { unit: 'mph', higher_better: true }`

Additionally, add switch-hitter bilateral support:
- `SWITCH_HITTER_BILATERAL_GROUPS`: Add `bat_speed: ['bat_speed_left', 'bat_speed_right']`
- `TEST_METRICS`: Add `bat_speed_left` and `bat_speed_right` entries (both `mph`, `higher_better: true`)

### File: `src/i18n/locales/en.json`

Add translation key under `vault.performance.metrics`:
- `"bat_speed": "Bat Speed"`
- `"bat_speed_left": "Bat Speed (L)"`
- `"bat_speed_right": "Bat Speed (R)"`

(Same translations added to the other 7 locale files: es, ja, ko, zh, de, fr, pt)

---

## Part 2: Per-Set Exercise Logging on Folder Items

### Problem
Currently, folder items on the Game Plan only toggle a simple completed/not-completed checkbox. There's no way to log specific data like weight lifted, time ran, or reps completed for each set of an assigned exercise.

### Database Change

**Add a `performance_data` JSONB column to `folder_item_completions`**:
```sql
ALTER TABLE folder_item_completions ADD COLUMN performance_data jsonb DEFAULT '{}'::jsonb;
```

This stores per-set logging data in a flexible JSON format:
```json
{
  "sets": [
    { "set": 1, "weight": 135, "reps": 10, "unit": "lbs" },
    { "set": 2, "weight": 145, "reps": 8, "unit": "lbs" }
  ]
}
```

### New Component: `src/components/folders/FolderItemPerformanceLogger.tsx`

A compact expandable form that appears when a user clicks on a folder item (in the Game Plan or Folder Detail Dialog). It provides:

- **Dynamic input rows per set**: Each set row has fields for weight, reps, time, or distance depending on the item type
- **Add Set button** to append more rows
- **Auto-detect input type** from `item.item_type`:
  - `exercise` / `skill_work`: weight (lbs/kg) + reps
  - `mobility` / `recovery`: duration (minutes/seconds)
  - `activity` / `custom`: flexible -- weight, reps, time, or distance fields
- **Save button** that writes to `folder_item_completions.performance_data`

### File: `src/components/folders/FolderDetailDialog.tsx`

- Import and render `FolderItemPerformanceLogger` inside each item card (below the title/description)
- Pass the item and current completion data
- On save, upsert `folder_item_completions` with the `performance_data` field

### File: `src/components/GamePlanCard.tsx`

- Update `handleTaskClick` for folder items: instead of just toggling completion, open a small inline expansion or dialog showing the `FolderItemPerformanceLogger`
- After logging data, auto-mark the item as completed
- Show a small summary badge (e.g., "3 sets logged") on completed folder tasks

### File: `src/hooks/useGamePlan.ts`

- Update the `toggleFolderItemCompletion` function to accept optional `performance_data` parameter
- When upserting completion rows, include the `performance_data` JSONB

---

## Technical Details

### Performance data schema (flexible JSONB)

```text
{
  "sets": [
    { "set": 1, "weight": number, "reps": number, "unit": "lbs"|"kg", "time": number, "distance": number }
  ],
  "notes": "string"
}
```

Each field in a set row is optional -- users fill in whatever is applicable.

### Files Modified

| File | Change |
|------|--------|
| `src/components/vault/VaultPerformanceTestCard.tsx` | Add bat_speed metric to hitting arrays and TEST_METRICS |
| `src/i18n/locales/*.json` (8 files) | Add bat_speed translation keys |
| Database migration | Add `performance_data` JSONB column to `folder_item_completions` |
| `src/components/folders/FolderItemPerformanceLogger.tsx` | New component for per-set data logging |
| `src/components/folders/FolderDetailDialog.tsx` | Integrate performance logger into item cards |
| `src/components/GamePlanCard.tsx` | Open logger on folder item click, show summary badge |
| `src/hooks/useGamePlan.ts` | Update completion toggle to include performance_data |

