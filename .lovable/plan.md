

## Premise mismatch — UI is already sending real data

Console proof from this session:
```
SAVE PREFS PAYLOAD: {"goal":"power","availability":{"days":[1,2,3,5]},
"equipment":["dumbbells","kettlebells","bands"],"injuries":[],
"experience_level":"intermediate"}
```

All requested guarantees are **already in place** in `TrainingPreferencesEditor.tsx` + `useTrainingPreferences.ts`:

| Requested change | Current state |
|---|---|
| `mutate(formValues)` not `mutate()` | ✅ `upsertPreferences.mutate({ goal, availability, equipment, injuries, experience_level })` (line 53–59) |
| Log form values at submit | ✅ `console.log("SAVE PREFS PAYLOAD:", ...)` already fires inside mutationFn — proven by console |
| Controlled inputs | ✅ All 5 fields use `useState` + `onChange`/toggle handlers |
| Hard guard before mutate | ✅ `if (!prefs \|\| Object.keys(prefs).length === 0) throw` already exists in mutationFn |

So the requested fix would change nothing.

## What's actually wrong

After `SAVE PREFS PAYLOAD:` log, there is **no follow-up** in console:
- No `SAVE PREFS ERROR:` line
- No `"Preferences saved"` success toast
- No `"Save failed: ..."` error toast

That means `supabase.from('training_preferences').upsert(...)` is **hanging** (never resolves) or the promise is being dropped silently. The form is innocent — the issue is downstream.

Likely culprits worth investigating (the user said "don't modify backend yet" — so this is a diagnostic plan, no code changes):

1. **Auth session not attached** — `user!.id` might be stale at click time. Add a pre-check log: `console.log("USER AT SUBMIT:", user?.id, "SESSION:", !!session)` right before the upsert.
2. **Network request blocked / pending** — confirm by checking the Network tab for the POST to `/rest/v1/training_preferences`. If it's pending forever or 401, that's a session/RLS issue.
3. **Realtime/sync interception** — `useUnifiedDataSync` or BroadcastChannel could intercept; less likely.

## Proposed diagnostic-only changes (no backend touched)

In `src/hooks/useTrainingPreferences.ts`, inside `upsertPreferences.mutationFn`, add three logs around the supabase call to find where it stalls:

```ts
console.log("SAVE PREFS PAYLOAD:", JSON.stringify(prefs));
console.log("USER AT SUBMIT:", user?.id);  // NEW
if (!user?.id) {
  console.error("No user — abort");
  throw new Error("Not authenticated");
}
console.log("SAVE PREFS → calling supabase upsert...");  // NEW
const { error } = await supabase.from('training_preferences').upsert({...});
console.log("SAVE PREFS → upsert returned. error:", error);  // NEW
```

This will reveal whether:
- `user.id` is undefined at click → auth race
- supabase call never returns → network/RLS hang
- supabase returns an error that isn't reaching the toast (impossible given current code, but proves it)

### Out of scope
- No form/UI changes (form is verified working).
- No backend / RPC / migration changes.

### Verification
- Click Save → console must now show all four log lines in sequence. Whichever line is missing identifies the failure point.

