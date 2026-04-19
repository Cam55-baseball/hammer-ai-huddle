

## Plan — "No Schedule" must hide activity from Game Plan

### Problem
When a user picks **No Schedule** in the Custom Activity Builder, the activity still appears every day on the Game Plan.

Root cause (two layers):

1. **Builder save payload** (`CustomActivityBuilderDialog.tsx`, line ~351): selecting `scheduleMode='none'` writes `recurring_days: []`, `recurring_active: false`, and `specific_dates: undefined` — but never sets `display_on_game_plan: false`. The DB row keeps whatever value it had (default `true`).

2. **Game Plan fetch fallback** (`useGamePlan.ts`, line ~564):
   ```ts
   const scheduledDays = template.recurring_active 
     ? (template.recurring_days as number[]) || []
     : (template.display_days as number[] | null) || [0, 1, 2, 3, 4, 5, 6];
   ```
   When `recurring_active=false` and `display_days=null`, it defaults to **all 7 days** — so the activity shows every day even though the user intentionally chose "No Schedule."

`buildCalendarEvents.ts` (calendar widget) is already correct because it requires `display_on_game_plan=true` AND a non-empty `recurring_days`/`display_days`.

### Fix

**1. `src/components/custom-activities/CustomActivityBuilderDialog.tsx` (line ~351)**
Derive and pass `display_on_game_plan` based on schedule mode:
```ts
recurring_days: scheduleMode === 'weekly' ? recurringDays : [],
recurring_active: scheduleMode === 'weekly' && recurringActive,
specific_dates: scheduleMode === 'specific_date' ? specificDates.map(...) : undefined,
display_on_game_plan: scheduleMode !== 'none',   // ← NEW
```
This guarantees "No Schedule" stores an explicit `false` on the template so both Game Plan and Calendar paths exclude it.

**2. `src/hooks/useGamePlan.ts` (line ~564)**
Tighten the fallback so an unscheduled template never silently defaults to every day. Treat "no recurring + no display_days + no specific_dates + not on game plan flag" as **not scheduled**:
```ts
// If no scheduling signal exists at all, treat as "no schedule" → exclude
const hasWeekly = template.recurring_active && (template.recurring_days?.length ?? 0) > 0;
const hasDisplayDays = (template.display_days?.length ?? 0) > 0;
const hasSpecificDates = specificDates.length > 0;

if (!hasWeekly && !hasDisplayDays && !hasSpecificDates) {
  // No schedule at all — only show if user has an explicit log for today
  if (!todayLog) return;
}

const scheduledDays = hasWeekly
  ? (template.recurring_days as number[])
  : hasDisplayDays
  ? (template.display_days as number[])
  : []; // no longer defaults to all 7 days
```

**3. Backfill existing templates (data migration)**
For currently-broken rows where the user previously saved "No Schedule" but `display_on_game_plan` is still `true`, run a one-time UPDATE so they immediately disappear from the Game Plan:
```sql
UPDATE custom_activity_templates
SET display_on_game_plan = false
WHERE display_on_game_plan = true
  AND (recurring_active = false OR recurring_active IS NULL)
  AND (recurring_days IS NULL OR jsonb_array_length(to_jsonb(recurring_days)) = 0)
  AND (display_days IS NULL OR jsonb_array_length(to_jsonb(display_days)) = 0)
  AND (specific_dates IS NULL OR jsonb_array_length(to_jsonb(specific_dates)) = 0)
  AND deleted_at IS NULL;
```
Run via insert tool (data update, not schema change).

### Out of scope
- No changes to My Activities module — unscheduled templates already live there (TemplatesGrid lists every non-deleted template regardless of schedule).
- No changes to Calendar projection — already handles this correctly.
- No changes to Folders, Received, Recurring weekly skips, or reminders.

### Verification
1. Create activity → select **No Schedule** → save → activity does NOT appear on today's Game Plan; it DOES appear in My Activities → Templates.
2. Edit that activity → switch to **Weekly** + pick Mon/Wed → save → it appears on Game Plan on Mon/Wed only.
3. Switch back to **No Schedule** → save → it disappears from Game Plan again.
4. Activities scheduled on **Specific Dates** still appear on those dates only.
5. Pre-existing unscheduled templates (post-backfill) no longer crowd the Game Plan.

