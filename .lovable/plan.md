

# Atomic HIE Execution Lock — Final Deterministic Fixes

## Current State
`calculate-session/index.ts` lines 488-495: single fire-and-forget `hie-analyze` call with no locking, no retries, no rerun guarantee.

## Changes

### 1. Database Migration — Lock Table + Atomic Acquire Function

```sql
CREATE TABLE public.hie_execution_locks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rerun_requested BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.hie_execution_locks ENABLE ROW LEVEL SECURITY;

-- Atomic lock acquisition: returns true if lock was acquired, false if already held
CREATE OR REPLACE FUNCTION public.try_acquire_hie_lock(p_user_id UUID, p_stale_seconds INT DEFAULT 120)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  acquired BOOLEAN;
BEGIN
  -- Delete stale locks first
  DELETE FROM hie_execution_locks
  WHERE user_id = p_user_id
    AND locked_at < now() - (p_stale_seconds || ' seconds')::interval;

  -- Atomic insert — ON CONFLICT DO NOTHING means only one caller wins
  INSERT INTO hie_execution_locks (user_id, locked_at, rerun_requested)
  VALUES (p_user_id, now(), false)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS acquired = ROW_COUNT;
  -- ROW_COUNT = 1 means we inserted (acquired). 0 means lock already held.
  RETURN acquired > 0;
END;
$$;
```

This guarantees exactly one caller acquires the lock — no SELECT→UPSERT race.

### 2. Edge Function Change — `supabase/functions/calculate-session/index.ts` (lines 488-495)

Replace fire-and-forget with lock-based loop:

```typescript
// ── Deterministic HIE execution with atomic lock ──
let hie_completed = false;

const lockAcquired = await supabase
  .rpc('try_acquire_hie_lock', { p_user_id: user.id, p_stale_seconds: 120 })
  .then(r => r.data === true)
  .catch(() => false);

if (!lockAcquired) {
  // Another execution owns the lock — request rerun
  await supabase
    .from('hie_execution_locks')
    .update({ rerun_requested: true })
    .eq('user_id', user.id);
  // hie_completed = false signals client analysis is pending
} else {
  try {
    // Loop until no more reruns requested
    let shouldRun = true;
    while (shouldRun) {
      // Extend lock timestamp before each run
      await supabase
        .from('hie_execution_locks')
        .update({ locked_at: new Date().toISOString(), rerun_requested: false })
        .eq('user_id', user.id);

      // 3-attempt retry with backoff
      let runSucceeded = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await supabase.functions.invoke('hie-analyze', {
            body: { user_id: user.id, sport: 'baseball' },
          });
          runSucceeded = true;
          hie_completed = true;
          break;
        } catch (hieErr) {
          console.warn(`HIE attempt ${attempt + 1}/3 failed:`, hieErr);
          if (attempt < 2) await new Promise(r => setTimeout(r, [2000, 5000, 10000][attempt]));
        }
      }

      // Check if rerun was requested during this execution
      const { data: lockState } = await supabase
        .from('hie_execution_locks')
        .select('rerun_requested')
        .eq('user_id', user.id)
        .maybeSingle();

      shouldRun = lockState?.rerun_requested === true;

      if (!runSucceeded && !shouldRun) {
        // All retries failed and no rerun pending — log governance flag
        await supabase.from('governance_flags').insert({
          user_id: user.id,
          flag_type: 'hie_analysis_failed',
          severity: 'warning',
          status: 'pending',
          source_session_id: session_id,
          details: { attempts: 3, timestamp: new Date().toISOString() },
        }).catch(() => {});
      }
    }
  } finally {
    // GUARANTEED lock release — even on unexpected errors
    await supabase
      .from('hie_execution_locks')
      .delete()
      .eq('user_id', user.id);
  }
}
```

### How It Works

| Scenario | Behavior |
|----------|----------|
| Single session | RPC acquires lock → run → release |
| 10 sessions in 10s | Session 1 acquires lock. Sessions 2-10 fail acquire → set `rerun_requested`. Session 1 finishes → sees flag → resets flag → runs again → checks again → flag is false → exits loop → releases lock. Exactly 2 runs, all 10 sessions covered. |
| Session arrives during rerun | Sets `rerun_requested` again → loop continues for another iteration |
| Crash mid-execution | `finally` releases lock. If process dies before `finally`, 2-min stale cleanup in RPC handles it on next call. |
| Long execution | `locked_at` extended at loop top → prevents premature stale-lock takeover |
| Two simultaneous acquires | `INSERT ON CONFLICT DO NOTHING` — only one gets `ROW_COUNT = 1`. Atomic. |

### Files Changed

| File | Change |
|------|--------|
| New migration | `hie_execution_locks` table + `try_acquire_hie_lock` RPC |
| `supabase/functions/calculate-session/index.ts` | Replace lines 488-495 with atomic lock + loop-until-stable + guaranteed release |

### What Does NOT Change
- Zero formula modifications
- `hie-analyze` function unchanged
- All other approved changes (client invalidation, reconciliation, realtime hardening) remain as planned

