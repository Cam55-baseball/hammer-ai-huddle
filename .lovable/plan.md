

# Create `game_plan_days` Table — DB-Enforced Day Completion

## Migration (single SQL file)

### 1. Create `game_plan_days` table
```sql
CREATE TABLE public.game_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.game_plan_days ENABLE ROW LEVEL SECURITY;
```

### 2. RLS policies
```sql
CREATE POLICY "Users can read own game_plan_days"
  ON public.game_plan_days FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own game_plan_days"
  ON public.game_plan_days FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own game_plan_days"
  ON public.game_plan_days FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
```

### 3. Day completion trigger function
Uses `INSERT ... ON CONFLICT DO UPDATE` to upsert the day row and derive `is_completed` from whether any incomplete activity logs remain for that date+user.

```sql
CREATE OR REPLACE FUNCTION public.update_game_plan_day_completion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.game_plan_days (user_id, date, is_completed, updated_at)
  VALUES (
    NEW.user_id,
    NEW.entry_date,
    NOT EXISTS (
      SELECT 1 FROM public.custom_activity_logs
      WHERE user_id = NEW.user_id
        AND entry_date = NEW.entry_date
        AND completed = false
    ),
    now()
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    is_completed = NOT EXISTS (
      SELECT 1 FROM public.custom_activity_logs
      WHERE user_id = NEW.user_id
        AND entry_date = NEW.entry_date
        AND completed = false
    ),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 4. Trigger
```sql
CREATE TRIGGER trigger_update_day_completion
AFTER INSERT OR UPDATE OF completed
ON public.custom_activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_game_plan_day_completion();
```

### 5. Backfill existing data
```sql
INSERT INTO public.game_plan_days (user_id, date, is_completed)
SELECT
  user_id,
  entry_date,
  NOT EXISTS (
    SELECT 1 FROM public.custom_activity_logs cal2
    WHERE cal2.user_id = cal.user_id
      AND cal2.entry_date = cal.entry_date
      AND cal2.completed = false
  )
FROM public.custom_activity_logs cal
GROUP BY user_id, entry_date
ON CONFLICT (user_id, date) DO NOTHING;
```

### 6. Updated_at trigger
```sql
CREATE TRIGGER trigger_game_plan_days_updated_at
BEFORE UPDATE ON public.game_plan_days
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

## Frontend: `useGamePlan.ts`

### Read `is_completed` from DB
- Add a query to `game_plan_days` for the selected date in `fetchTaskStatus`
- Replace line 1402 (`const completedCount = tasks.filter(t => t.completed).length`) with the DB-sourced value
- Actually — `completedCount` is task-level (how many tasks are done), not day-level. The day completion (`allComplete`) at line 269 in GamePlanCard is `completedCount === totalCount`. So the change is:
  - Keep `completedCount` computed from tasks (it's a count, not a boolean)
  - Add `isDayComplete` field to the hook return, sourced from `game_plan_days.is_completed`
  - `GamePlanCard.tsx` uses `isDayComplete` instead of computing `allComplete` from counts

### Realtime subscription
- Enable realtime on `game_plan_days` so cross-device updates propagate instantly
- Subscribe in `useGamePlan` to `game_plan_days` changes for the current user

## Files modified

| File | Changes |
|------|--------|
| `supabase/migrations/[new].sql` | Create table, RLS, trigger function, trigger, backfill, updated_at trigger |
| `src/hooks/useGamePlan.ts` | Add `isDayComplete` from DB query; add realtime subscription for `game_plan_days` |
| `src/components/GamePlanCard.tsx` | Use `isDayComplete` from hook instead of computing `allComplete` |

