Hammer Today Checklist Tracking

Goal: Give every card in Hammer Today a persistent, per-drill checklist that athletes can check off while keeping the existing card-level Done/Skip button. Checking all tasks marks the card done; marking the card done checks all tasks.


### What we'll build

1. Database table for task completions
   - New table `public.hammer_daily_task_completions` keyed by `user_id`, `plan_date`, `task_id`.
   - Columns: `source` (wk_prescription | block_drill), `source_ref` (modality or prescription id), `payload` JSONB (drill name/dosage), `completed` boolean, `completed_at`, `created_at`, `updated_at`.
   - RLS policy: users can only see/change their own rows.
   - GRANTs: `authenticated` gets SELECT/INSERT/UPDATE/DELETE; `service_role` gets ALL.
   - `updated_at` trigger.

2. Stable task identifiers
   - Wk cards: `task_id = <prescription_id>`; card-level status comes from `wk_prescriptions.status`.
   - Block cards (warmup, hitting, throwing, defense, baserunning, game_iq, fueling, recovery): `task_id = <modality>:<drill.slug or slugified name>:<plan_date>`; `source_ref = modality`.

3. Data hook
   - New `useHammerDailyTasks(planDate)` hook in `src/hooks/useHammerDailyTasks.ts`.
   - Fetches all completion rows for the user + date.
   - Returns helpers: `toggleTask(taskId, completed)`, `completeAll(sourceRef, tasks[])`, `resetAll(sourceRef)`.
   - Optimistic UI updates + invalidates `wk-rx` and `hammer-context` queries as needed.
   - For Wk tasks, it will also read `wk_prescriptions.status` from the canonical `HammersTodayProvider` snapshot and treat `completed` as checked, `skipped` as skipped.

4. Card-level UI
   - `WkPrescriptionCard`: add a checkbox in the card header. Checked = `status === 'completed'`. Unchecking returns status to `planned`. Keep the existing Complete/Skip buttons inside the expanded content (they do the same thing).
   - `BlockCard`: add a checkbox to each `DrillRow`. Checked = task completion row exists and `completed = true`. When all drills are checked, the card-level `BlockCompletionControls` shows "Done" and the card visually dims/completes.
   - Progress mini-badge: each card shows "X/Y done" in the header when partially complete.

5. Bidirectional sync
   - Card-level "Done" (BlockCompletionControls / WkCardCompletion) writes:
     - For Wk: bulk update `wk_prescriptions.status = 'completed'` for all rows in that slot + insert/update task rows.
     - For Block: insert/update all task rows to `completed = true` and record the localStorage engagement state as done.
   - Card-level "Skip" writes all tasks skipped (or suppressed) and updates engagement state.
   - Checking the last unchecked task in a card automatically triggers the card-level "Done" path.
   - Unchecking the only checked task in a done card reverts the card to "planned".
   - All mutations emit canonical row-level updates and the Learning Loop session-log insert where applicable (already done for Wk prescriptions; Block drills are best-effort only via the existing Game Plan path).

6. Streaks & engagement continuity
   - Keep `dailyEngagement` localStorage for the streak/rotation engine, but derive the card-level completion state from the database first when available.
   - `BlockCompletionControls` and `WkCardCompletion` will read actual task/prescription status rather than relying solely on localStorage so buttons stay accurate after refresh.


### Files to change

- `supabase/migrations/...` (new migration for `hammer_daily_task_completions`)
- `src/integrations/supabase/types.ts` (regenerated after migration)
- `src/hooks/useHammerDailyTasks.ts` (new)
- `src/components/hammer/WkPrescriptionCard.tsx` (add checkbox + sync)
- `src/components/hammer/WkCardCompletion.tsx` (derive state from DB + bulk sync)
- `src/components/hammer/BlockCompletionControls.tsx` (derive state from DB + bulk sync)
- `src/components/hammer/HammerDailyPlan.tsx` (wire task hook into `BlockCard` and `DrillRow`, show progress badge)
- `src/components/hammer/HammersTodayProvider.tsx` (expose `planDate` so cards can build stable task IDs)


### Technical details

- The plan date used by `HammersTodayProvider` defaults to `todayStr()`; we'll expose it in the context so `BlockCard` and `DrillRow` can build `task_id` without recomputing it.
- Wk prescription rows are already uniquely identified by `id` and have a `status` column; the checklist will mirror that status through the new hook, writing a task row on completion to keep Block and Wk cards consistent.
- For Block cards that do not have a drill slug (warmup drills are sometimes dynamic), we fall back to a deterministic slugified version of the drill name + dosage so the same drill on the same day gets the same id.
- UI checkboxes use the `Checkbox` component from `@/components/ui/checkbox`.
- Mutations use TanStack Query for optimistic updates and `toast` for success/error.


### Verification

1. Build passes and TypeScript types are consistent.
2. Manual preview check: open Hammer Today, verify each card shows checkboxes, check individual drills, confirm "Done" state updates.
3. Test bidirectional sync: mark a card done → all boxes check; uncheck one box → card reverts to in-progress.
4. Refresh the page → completed state persists.
5. Streaks/Daily Intent header still react to card-level completion.
6. No duplicate or missing task IDs (slugified names unique per modality per day).