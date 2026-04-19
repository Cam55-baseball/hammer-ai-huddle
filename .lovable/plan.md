

## Plan — Wire "Adapt" to actually apply preference changes + add full observability

### Root cause
The current `adaptBlock` calls `adapt-training-block`, which only tweaks volume from RPE/missed-session rules. It never reads `training_preferences` and cannot reflect a goal/availability/equipment change. Meanwhile `updateGoal` just sets `pending_goal_change=true` on the block and waits for the "next block." So changing preferences and clicking Adapt is, by design, a no-op for preference deltas — exactly the symptom reported.

Fix: route Adapt through a regeneration path when preferences have changed (or block is `ready_for_regeneration` / `pending_goal_change=true`), otherwise keep the existing volume-tuning adapt. Add the requested logs, response handling, change-verification guard, and temp debug strip.

### Files to change
1. `src/hooks/useTrainingBlock.ts` — rewrite `adaptBlock` to:
   - Log click with `{ blockId, preferences }`.
   - Branch:
     - If `activeBlock.pending_goal_change === true` OR `activeBlock.status === 'ready_for_regeneration'` OR caller passes `{ regenerate: true }` → archive current block, then invoke `generate-training-block` with `{ sport, blockId: oldId, preferences }` (same fn as initial generation, with old blockId for traceability).
     - Else → keep existing `adapt-training-block` call (RPE/missed tuning).
   - Log `ADAPT REQUEST` payload (blockId, preferences, startDate, availability) before invoke.
   - Log `ADAPT RESPONSE` after invoke.
   - On regen success: explicitly `setQueryData(['training-block','active', user.id], response.block)` to replace state (no append), then invalidate.
   - Compare old `blockId` / `updated_at` vs new; `console.warn("Adapt produced no change")` if identical.
   - On error: `console.error("ADAPT FAILED:", error)` + `toast.error("Failed to adapt plan")`.
2. `src/components/training-block/TrainingBlockView.tsx` — pass intent to `adaptBlock.mutate({ regenerate: hasPendingChange })` and add a temp debug strip (gated by `import.meta.env.DEV`) showing:
   - current `activeBlock.id`
   - `activeBlock.updated_at` (or `created_at` if no updated_at column)
   - JSON snapshot of `preferences` from `useTrainingPreferences`
3. `src/components/training-block/TrainingPreferencesEditor.tsx` — after successful preference save, if an active block exists, surface a "Apply changes to current block" button that calls `adaptBlock.mutate({ regenerate: true })` so the user has a clear path to actually see changes.

### Out of scope
- No edge function changes. `generate-training-block` already accepts preferences via DB lookup; no new params needed beyond what it already reads.
- No new validation.
- No DB migrations (relying on existing `pending_goal_change` flag and statuses).

### Verification
1. Open `/training-block?mode=block` with active block.
2. Change goal in `TrainingPreferencesEditor` → toast confirms; debug strip still shows old blockId.
3. Click Adapt (now labeled to regenerate when pending). Console shows: `ADAPT CLICKED` → `ADAPT REQUEST` → `ADAPT RESPONSE` → new blockId in debug strip → workouts list visibly replaced.
4. Click Adapt again with no preference change and no RPE triggers → console warns `Adapt produced no change` and toast confirms no-op.
5. Force a network failure → `ADAPT FAILED` logged + error toast.

