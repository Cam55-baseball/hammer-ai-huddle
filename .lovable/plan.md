

## Plan — Refactor Calendar into Pure Derived Projection Layer

### Premise check (must verify during exploration)

Before committing, I need to inspect:
- `src/components/calendar/CalendarView.tsx` and children — current data sources
- `src/hooks/useCalendar*` — what's fetched, what's written
- `calendar_events`, `calendar_skipped_items`, `calendar_day_orders`, `game_plan_skipped_tasks` tables — which are "calendar-owned" vs "source of truth"
- `useTrainingBlock`, `useGamePlan`, `useCustomActivities` — existing source-of-truth hooks
- Anywhere calendar performs writes (`schedulingService.setCalendarSkip`, `removeCalendarSkip`, calendar_events inserts in `generate-training-block`)

The premise is **mostly correct** but with one important nuance: `calendar_events` is currently written by the training block generator (confirmed earlier). User wants this removed — calendar derives from `block_workouts` directly instead.

### Architecture

```text
SOURCE OF TRUTH                 PROJECTION                 UI
─────────────────               ──────────────             ───────────
game_plan_days        ─┐
custom_activity_logs  ─┤   buildCalendarEvents()    →  CalendarView
activities/templates  ─┤   (pure, deterministic)       (read-only)
training_blocks       ─┤
  └─ block_workouts   ─┘
        │
        ├─ realtime subs on all 4 tables
        └─ on change → refetch → rebuild → rerender
```

### Implementation

**1. New pure builder** — `src/lib/calendar/buildCalendarEvents.ts`
```ts
export type CalendarEvent = {
  id: string;                    // deterministic: `${source}:${sourceId}:${date}`
  date: string;                  // YYYY-MM-DD
  title: string;
  source: 'game_plan' | 'custom_activity' | 'training_block';
  sourceId: string;
  completed: boolean;
  partial?: boolean;             // partial day completion
  meta: Record<string, unknown>;
};

export function buildCalendarEvents(input: {
  gamePlanDays: GamePlanDay[];
  logs: CustomActivityLog[];     // filtered: not deleted
  activities: Activity[];        // filtered: not deleted
  blocks: TrainingBlockWithWorkouts[]; // active + nearing_completion only
}): CalendarEvent[]
```
Rules:
- Skip logs whose parent activity is deleted/missing
- Skip blocks with `status='archived'`
- Sort: date asc, then source order, then sourceId
- Deduplicate by `id` (idempotent)
- `completed` derived from log `completed` flag or `block_workouts.status='completed'`
- `partial` = `game_plan_days.is_completed=false` but ≥1 log completed that date

**2. New aggregator hook** — `src/hooks/useCalendarProjection.ts`
- React Query queries (parallel): `game_plan_days`, `custom_activity_logs` + parent activities, `training_blocks` + `block_workouts`
- `useMemo` → `buildCalendarEvents(...)`
- Returns `{ events, isLoading, byDate(date) }`

**3. Realtime** — extend `useSchedulingRealtime.ts`
- Already subscribes to `game_plan_*`, add/confirm: `custom_activity_logs`, `training_blocks`, `block_workouts`, `activities`/`custom_activity_templates`
- On change → invalidate `['calendar-projection']` query keys

**4. Refactor CalendarView**
- Replace current data sources with `useCalendarProjection()`
- Remove `useCalendarSkips` writes from calendar UI (skips are a Game Plan concern, not calendar)
- Calendar becomes purely render-only: no Add/Edit/Delete buttons that write to calendar tables

**5. Remove direct calendar writes**
- `generate-training-block/index.ts` (lines 692-706): **delete** the `calendar_events` insert block. Calendar will derive from `block_workouts` directly.
- `useTrainingBlock.ts` reschedule: **delete** the `calendar_events` sync update (no longer needed).
- `schedulingService.setCalendarSkip` / `removeCalendarSkip`: keep for Game Plan use, but Calendar UI no longer calls them.

**6. Deprecation (non-destructive)**
- Leave `calendar_events` table intact (no migration this round) but stop writing to it. Mark hook `useCalendarEvents` (if exists) as deprecated with comment. Removal in follow-up after verification.

### Edge cases handled

| Case | Behavior |
|---|---|
| Activity deleted after scheduled | Builder filters logs whose activity is missing → event disappears next rebuild |
| Activity edited after completion | Title/meta reflects current activity row; `completed=true` preserved from log |
| Training block swapped mid-cycle | Old block status→`archived` (excluded); new block's `block_workouts` appear immediately via realtime |
| Partial day completion | `partial=true` flag rendered distinctly from full `completed` |
| Idempotency | Deterministic IDs + sort + dedupe → identical input ⇒ identical output |

### Files touched
- **New**: `src/lib/calendar/buildCalendarEvents.ts`, `src/lib/calendar/buildCalendarEvents.test.ts` (unit tests for idempotency + edge cases), `src/hooks/useCalendarProjection.ts`
- **Modified**: `src/hooks/useSchedulingRealtime.ts`, `src/components/calendar/CalendarView.tsx` (+ children that read events), `supabase/functions/generate-training-block/index.ts` (remove calendar_events insert), `src/hooks/useTrainingBlock.ts` (remove calendar_events sync)
- **Unchanged**: source-of-truth tables, Game Plan, training block generation logic itself

### Out of scope
- Dropping `calendar_events` table (follow-up after soak)
- Game Plan UI changes
- Skip/recurring-skip semantics (still owned by Game Plan)

### Verification
1. Generate 6-week block → calendar shows all workouts (derived from `block_workouts`, no `calendar_events` row needed).
2. Mark a workout complete in Practice Hub → calendar event flips to completed within ~1s (realtime).
3. Delete a custom activity → its scheduled instances disappear from calendar on next render.
4. Archive active block → all its workouts vanish from calendar instantly.
5. Log 1 of 3 activities for a day → that day shows `partial`, not `completed`.
6. Hard reload calendar repeatedly → identical event list each time (idempotency).

