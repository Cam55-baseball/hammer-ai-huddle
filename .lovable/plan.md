## Audit findings

I read the edge function, the hook, both call sites, and queried the cache table.

**1. The server-side hash is mostly stable, but not fully.**
`hashSnapshot` sorts keys and coarsens `hour` (4 bands) and `staleHours` (4 bands) before hashing — good. However these fields still enter the hash raw and change during a normal day:
- `mpi.score` (a numeric adjusted score)
- `recentActivity.sessionsLast7Days` / `checkInsLast7Days`
- `escalationCount`
- readiness/fatigue/soreness/sleep/stress scores (expected — but every new check-in legitimately regenerates)

Each change produces a new hash → a new AI generation, up to the 6/day cap.

**2. The "only run when the card is expanded" gate is bypassed.**
`CommunicationAI.tsx:108` correctly passes `{ enabled: everOpened }`. But there is a **second, ungated call site**:

```
HammerDailyPlan.tsx:1132 → useHammerChat → useHammerNextStep:115 → useCoachHammerNextStep()   // no enabled option
```

`HammerDailyPlan` mounts on the Today plan, so the hook runs on every load regardless of whether the collapsible was expanded. This is the main reason AI is still being called.

**3. The client React Query key is built from the RAW snapshot, not the coarsened one.**
`hashKey` in `useCoachHammerNextStep.ts` stringifies the full snapshot including raw `hour` and raw `staleHours`. So the key changes at least every hour → new cache entry → new edge invocation on every hour tick, even when the server hash is unchanged. Those are wasted function calls (DB reads, not always AI), plus any band crossing does become a real AI call.

**4. The cache table is empty.**
`select ... from coach_hammer_steps` returns zero rows across all users/dates, and the function's recent logs show only boot/shutdown — no successful invocation. So the cache has never demonstrably written. Whether this is because the write is failing or simply because no request has completed since deployment is **not yet confirmed** — verifying it is step 1 below.

## Plan

1. **Confirm the cache write path.** Invoke the function with a test snapshot, then re-query `coach_hammer_steps` for the row and check the function logs for `coach_hammer_steps cache write failed`. Fix grants/insert if it errors. Do not change anything else until this is proven working.
2. **Close the ungated call site.** Give `useHammerNextStep` an `enabled` option, default `false` for AI, and have `useHammerChat`/`HammerDailyPlan` rely on the deterministic heuristic step unless the user actually opens Coach Hammer. Only `CommunicationAI` (expanded) opts into the AI path.
3. **Make the client key match the server hash.** Extract the `coarsen` + `stableStringify` logic into a shared module used by both the hook and the edge function, so the React Query key is the coarse hash + day. Identical coarse state on a later page load then never re-invokes the function at all.
4. **Coarsen the remaining volatile fields server-side**: round `mpi.score` to the nearest whole number, bucket `sessionsLast7Days`/`checkInsLast7Days` into small bands (0 / 1-2 / 3-5 / 6+), and clamp `escalationCount` to 0 / 1 / 2+.
5. **Verify.** Load the dashboard twice, confirm exactly one row in `coach_hammer_steps` for the day and that the second response returns `cached: true`.

### Technical notes
- Files: `supabase/functions/coach-hammer-next-step/index.ts`, `src/hooks/useCoachHammerNextStep.ts`, `src/hooks/useHammerNextStep.ts`, `src/hooks/useHammerChat.ts`, plus a new shared snapshot-hash module.
- The 6/day generation cap stays as a backstop.
- No schema change needed; the unique index on `(user_id, plan_date, snapshot_hash)` is already correct.
