

# Kill Test V3.1 — Step 3 Execution: UI Truth Over Time

## Confirmed Pre-Flight
- ✅ User A authenticated as `55cam316@gmail.com` (`95de827d-7418-460b-8b79-267bf79bdca4`)
- ✅ Dashboard loaded at `/index`, viewport 440x782 (mobile)
- ✅ Hammer State badge currently rendering "Caution" (amber) per session replay

## Execution — Two Truth Loops

### Loop 1
1. `browser--navigate_to_sandbox` → `/index` (confirms auth, takes baseline)
2. `browser--screenshot` + `browser--extract` HammerStateBadge label/color + ReadinessChip score
3. `supabase--read_query`: `SELECT overall_state, computed_at, arousal_score, recovery_score FROM hammer_state_snapshots WHERE user_id = '95de827d…' ORDER BY computed_at DESC LIMIT 1`
4. **Assert baseline**: UI label === DB `overall_state`
5. `supabase--read_query` (INSERT via raw SQL not allowed — use edge function or accept that read_query is SELECT-only) → **fallback**: insert via `custom_activity_logs` requires INSERT capability. Will use `supabase--curl_edge_functions` to hit any logging endpoint, OR inject via a dedicated migration-free path. Plan: invoke `compute-hammer-state` directly after a manual log inserted via SQL through the existing Supabase managed access (read_query is select-only, so I'll use the `migration` path or call an existing log-write edge function if available).
   - **Actual approach**: inserts in V1/V2/V3 were done via the same migration mechanism. For V3.1 Step 3, I'll write a one-shot migration that inserts a single `kill v3.1 ui-truth-1` row for User A, then immediately invoke `compute-hammer-state` to force a fresh snapshot.
6. `project_debug--sleep` 45s (lets realtime postgres_changes subscription in `useHammerState.ts` line 65 push the new INSERT to the client)
7. `browser--screenshot` + `browser--extract` WITHOUT navigation — confirms in-place realtime update
8. Re-read DB
9. **Assert in-place match**: UI label === DB `overall_state` (post-insert)
10. `browser--navigate_to_sandbox` `/index` (hard refresh, forces React Query refetch)
11. `browser--screenshot` + `browser--extract`
12. **Assert post-refresh match**: UI label === DB `overall_state`

### Loop 2
Repeat steps 5-12 with `kill v3.1 ui-truth-2` tag.

## Pass Criteria
- All 3 assertions per loop = true (6 total)
- UI never reverts to stale state after refresh
- UI does not lead the backend (overall_state is derived, not optimistic)

## Final Output
Single JSON block reporting both loop results, plus full V3.1 PASS/FAIL verdict including all prior steps.

## Time Budget
~3 minutes (2 × 45s sleeps + screenshots + DB reads).

## Risk
Zero — no production code changes, only data inserts (already established as permanent smoke-test markers).

