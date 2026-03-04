

# Practice Hub Scheduling Integration with Game Plan

## Overview

This is a large, multi-phase feature that connects Practice Hub sessions with the Game Plan and Calendar systems. It involves a new database table, new UI components for scheduling, deep-link routing, and coach assignment capabilities.

## Database Changes

### New Table: `scheduled_practice_sessions`

Stores scheduled practice sessions for both players and coaches:

```sql
CREATE TABLE public.scheduled_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_module TEXT NOT NULL, -- hitting, pitching, fielding, etc.
  session_type TEXT NOT NULL, -- solo_work, team_session, lesson, game, live_abs
  title TEXT NOT NULL, -- e.g. "Fielding Solo Work"
  description TEXT,
  scheduled_date TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT, -- HH:MM
  end_time TEXT,
  recurring_active BOOLEAN DEFAULT false,
  recurring_days INTEGER[] DEFAULT '{}', -- 0=Sun..6=Sat
  sport TEXT NOT NULL DEFAULT 'baseball',
  organization_id UUID REFERENCES organizations(id),
  team_id UUID, -- future use
  assignment_scope TEXT DEFAULT 'individual', -- individual, team, organization
  coach_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scheduled_practice_sessions ENABLE ROW LEVEL SECURITY;

-- Players see their own scheduled sessions
CREATE POLICY "Users can view own scheduled sessions"
  ON public.scheduled_practice_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid());

-- Players can create their own schedules
CREATE POLICY "Users can insert own scheduled sessions"
  ON public.scheduled_practice_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_linked_coach(auth.uid(), user_id));

-- Users can update their own, coaches can update what they created
CREATE POLICY "Users can update own scheduled sessions"
  ON public.scheduled_practice_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid());

-- Users can delete their own, coaches can delete what they created
CREATE POLICY "Users can delete own scheduled sessions"
  ON public.scheduled_practice_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid());
```

## Implementation Plan

### Phase 1: Player Self-Scheduling (Core)

**1. New hook: `src/hooks/useScheduledPracticeSessions.ts`**
- CRUD operations for `scheduled_practice_sessions` table
- Query scheduled sessions for a date range
- Create/update/delete scheduled sessions
- Mark sessions as completed

**2. New component: `src/components/practice/SchedulePracticeDialog.tsx`**
- Dialog allowing users to schedule a Practice Hub session
- Fields: Module (Hitting/Pitching/etc.), Session Type (Solo/Team/Lesson/Game/Live ABs), Date, Start Time, End Time
- Optional: Recurring toggle with day-of-week picker
- Auto-generates title like "Fielding Solo Work"

**3. Update `src/pages/PracticeHub.tsx`**
- Add a "Schedule Session" button in the header area
- Accept URL query params for deep-linking (e.g., `?module=fielding&type=solo_work`) so clicking from Game Plan pre-selects the correct session

**4. Integrate into Game Plan (`src/hooks/useGamePlan.ts`)**
- Fetch today's `scheduled_practice_sessions` alongside existing tasks
- Map each scheduled session to a `GamePlanTask` with:
  - `link: /practice?module={module}&type={type}&scheduled={id}`
  - Appropriate icon based on module
  - Completion status synced with the scheduled session status

**5. Integrate into Calendar (`src/hooks/useCalendar.ts`)**
- Fetch `scheduled_practice_sessions` in the calendar data query
- Map to `CalendarEvent` objects with deep-link URLs
- Show with a distinct color (e.g., practice-specific teal/green)

### Phase 2: Coach Scheduling

**6. New component: `src/components/practice/CoachScheduleDialog.tsx`**
- Extended scheduling dialog for coaches
- Additional fields: Assignment scope (Organization/Team/Individual), Player selector
- Uses `is_linked_coach` to validate coach-player relationships
- Creates one `scheduled_practice_sessions` row per assigned player

**7. Coach Game Plan integration**
- Coach-created sessions appear on both the coach's and player's Game Plans
- Coach clicks navigate to the coach session environment
- Player clicks navigate to the player Practice Hub with pre-selected config

### Phase 3: Deep-Link Routing

**8. Update `src/pages/PracticeHub.tsx` routing**
- Parse URL search params on mount: `module`, `type`, `scheduled`
- Auto-advance through the flow steps (skip type selection, pre-fill config)
- Mark the scheduled session as "in progress" or "completed" when the session is saved

## Technical Details

### Deep-Link URL Format
```
/practice?module=fielding&type=solo_work&scheduled=<uuid>
```

### Game Plan Task Mapping
Scheduled sessions use order key prefix `ps:` (practice-scheduled) for canonical ordering:
```
ps:{scheduled_session_id}
```

### Calendar Event Mapping
- `type: 'scheduled_practice'`
- `source: scheduled_session_id`
- `link: /practice?module=...&type=...&scheduled=...`

### Completion Flow
When a user saves a performance session through Practice Hub with a `scheduled` param, the corresponding `scheduled_practice_sessions` row is updated to `status = 'completed'`. This triggers Game Plan completion state.

## Files to Create/Modify

| File | Action |
|------|--------|
| `scheduled_practice_sessions` table | Create (migration) |
| `src/hooks/useScheduledPracticeSessions.ts` | Create |
| `src/components/practice/SchedulePracticeDialog.tsx` | Create |
| `src/components/practice/CoachScheduleDialog.tsx` | Create |
| `src/pages/PracticeHub.tsx` | Modify (add schedule button + deep-link params) |
| `src/hooks/useGamePlan.ts` | Modify (fetch + render scheduled sessions) |
| `src/hooks/useCalendar.ts` | Modify (fetch + render scheduled sessions) |

## Recommended Approach

Given the scope, I recommend implementing this in two passes:
1. **First pass**: Player self-scheduling with Game Plan + Calendar integration and deep-linking (Phases 1 + 3)
2. **Second pass**: Coach scheduling with organization/team assignment (Phase 2)

This keeps the first implementation focused and testable while establishing the data model that supports coach features.

