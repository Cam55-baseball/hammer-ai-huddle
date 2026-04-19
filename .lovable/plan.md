

## Important — premise mismatch

Save Preferences does **not** go through an edge function. It's a direct client-side Supabase upsert in `useTrainingPreferences.ts` (`upsertPreferences` mutation). There is no `req.json()` anywhere in this flow to deduplicate, and no edge function body to log.

The "double-parse `req.json()`" pattern from the suggested fix doesn't apply here. I want to confirm what's actually broken before changing code.

## Questions before I proceed

1. What exactly is broken? Options:
   - Click "Save Preferences" → no toast, no DB change
   - Toast says "Preferences saved" but DB row unchanged
   - Toast shows but values revert on reload
   - Console error fires
2. Is this related to the Adapt flow we just stabilized (e.g., goal change via `updateGoal` not propagating), or the standalone `upsertPreferences` button in `TrainingPreferencesEditor`?

## If the goal is just hardening the existing client-side path

Tight, surgical changes to `src/hooks/useTrainingPreferences.ts` only:

1. **`upsertPreferences.mutationFn`** — log payload, surface real errors:
   ```ts
   console.log("SAVE PREFS PAYLOAD:", JSON.stringify(prefs));
   if (!prefs || Object.keys(prefs).length === 0) {
     console.error("Empty preferences payload — Save Preferences aborted");
     throw new Error("Empty preferences payload");
   }
   const { error } = await supabase.from('training_preferences').upsert({ user_id: user!.id, ...prefs, updated_at: new Date().toISOString() });
   if (error) {
     console.error("SAVE PREFS ERROR:", error);
     throw new Error(error.message);
   }
   ```

2. **`onError` handler** (currently missing) — toast the actual error so failures stop being silent:
   ```ts
   onError: (e: Error) => toast.error(`Save failed: ${e.message}`)
   ```

3. Same treatment in `updateGoal.mutationFn` for the preference upsert + `training_blocks` update calls (both currently swallow non-throw error states or lack `onError`).

### Out of scope
- No edge function changes (none exist for this flow).
- No changes to `generate-training-block` or the Adapt path.
- No UI changes in `TrainingPreferencesEditor`.

### Verification
- Click Save → console shows `SAVE PREFS PAYLOAD: {...}`, toast confirms; row visible in DB.
- Force a failure (e.g., revoke RLS temporarily in test) → toast shows real Postgres error string, console shows `SAVE PREFS ERROR:`.
- Change Goal via `updateGoal` → both upsert + block-flag steps log errors instead of failing silently.

