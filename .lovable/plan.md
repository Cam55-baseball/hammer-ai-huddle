

# Session Linking System — Full Integrity Audit

## Verdict: ❌ NOT FULLY WORKING

The system has **9 confirmed failure points** ranging from critical race conditions to missing functionality. Below is the exhaustive analysis.

---

## 1. Core Linking Integrity

### ❌ FAILURE: No Unique Constraint on Active Link Codes Per User

**Problem**: A user can generate multiple link codes without any guard. There is no constraint preventing a user from having multiple `pending` links simultaneously. If User A generates 3 codes and shares different ones, the system has orphaned pending links with no cleanup mechanism.

**Type**: Missing guard

### ❌ FAILURE: Joiner RLS Blocks Join Flow

**Problem**: When User B tries to join with a code, the lookup query uses `.in('status', ['pending', 'active'])`. The RLS policies allow:
- `"Anyone can lookup pending links"` → status = 'pending' (SELECT only)
- `"Users see own links"` → creator_user_id OR joiner_user_id = auth.uid()

When the link is `pending`, User B can SELECT it via the public policy. But the UPDATE at line 101-104 sets `joiner_user_id = user.id`. The UPDATE policy requires `creator_user_id = auth.uid() OR joiner_user_id = auth.uid()`. At the time of the UPDATE, `joiner_user_id` is still NULL — **User B is neither creator nor joiner yet**. The UPDATE will be silently rejected by RLS.

**Type**: Logic flaw (CRITICAL — joining is broken for non-creators)

### ❌ FAILURE: No Atomicity on Join

**Problem**: The join flow is SELECT → UPDATE (two separate operations). Two users could both SELECT the same pending link and both attempt to UPDATE, creating a race condition. There is no `FOR UPDATE` lock or atomic compare-and-swap.

**Type**: Race condition

---

## 2. Pitcher ↔ Catcher Linking

### ❌ NOT IMPLEMENTED

There is no pitcher-to-catcher linking concept in the codebase. The `live_ab_links` system is a generic "two players share a session code" mechanism. It does not:
- Distinguish pitcher vs catcher roles
- Enforce directional pairing
- Share game context between positions
- Auto-link based on position

The `game_opponents` table tracks pitcher↔hitter matchup names but is entirely separate from session linking — it's a scouting/memory system, not a session pairing system.

**Type**: Missing feature entirely

---

## 3. Game Linking Behavior

### ❌ PARTIAL: No Game-Level Grouping

When a session is saved with a `link_code`, it stores `link_code` and optionally `linked_session_id` on the `performance_sessions` row. However:
- There is no "game group" concept — linking is 1:1 (creator ↔ joiner), not N:N
- No cross-game contamination protection exists because there's no game grouping to contaminate
- The `linked_session_id` is only set for the **joiner** (the joiner gets the creator's session ID from `creator_session_id`). The creator does NOT get the joiner's session ID set on their row at insert time — it's written later to `live_ab_links.creator_session_id` but NOT back to the creator's `performance_sessions.linked_session_id`.

**Type**: Data model gap — linking is asymmetric

---

## 4. Auto Stats Propagation

### ❌ NOT IMPLEMENTED

There is zero stats aggregation across linked sessions. The `calculate-session` edge function has no awareness of `link_code` or `linked_session_id` (confirmed: no matches in edge function code). Linked sessions are computed entirely independently. No "combined" or "game-level" analytics exist.

**Type**: Missing feature

---

## 5. Edge Function Execution

### ⚠️ PARTIAL: No Linking Awareness

`calculate-session` processes sessions individually. It does not:
- Query linked sessions
- Aggregate across linked pairs
- Respect linking state during computation

This is technically "correct" in the sense that it doesn't break, but it means linking has zero impact on analytics. The lock system works independently of linking.

**Type**: Missing integration (not a bug per se)

---

## 6. Realtime + Invalidation Consistency

### ✅ PARTIALLY WORKING

- `useLiveRepBroadcast` correctly uses Supabase Realtime Broadcast for live rep sharing between linked users. Queue-until-subscribed pattern is sound.
- `useLiveAbSync` subscribes to postgres_changes on the partner's session row for `micro_layer_data` updates. This works if `linkedSessionId` is provided.
- `useUnifiedDataSync` invalidates session + analytics keys on `performance_sessions` changes.

### ❌ FAILURE: Joiner Never Gets `linkedSessionId` at Realtime Setup Time

When the joiner joins (LiveAbLinkPanel line 110), it passes `(link as any).creator_session_id` as the linked session ID. But the creator hasn't saved their session yet at this point — `creator_session_id` is NULL on the `live_ab_links` row (it's only written post-save at PracticeHub line 308-322). So the joiner's `linkedSessionId` is always `undefined`, meaning `useLiveAbSync` never activates for the joiner.

**Type**: Logic flaw — realtime sync is broken for the joiner

---

## 7. Race Condition Testing

### ❌ FAILURE: Simultaneous Join Race

Two users entering the same code simultaneously can both read the pending link and both attempt to update it. No database-level guard prevents this. The first update sets `joiner_user_id`; the second overwrites it silently.

### ❌ FAILURE: Save Order Race

If the joiner saves before the creator, the post-save linking update (PracticeHub line 308-322) correctly uses `isCreator` to decide which column to write. But:
- If both save simultaneously, both do a `maybeSingle()` lookup on the same link row
- Both could read the row before either writes their session ID
- This is safe because they write to different columns (`creator_session_id` vs `joiner_session_id`), so no data loss — **this specific case is OK**

---

## 8. Data Integrity

### ❌ FAILURE: Orphaned Links Never Cleaned

There is no cleanup mechanism for:
- Expired pending links (client-side check only, never server-enforced)
- Links where one party never saves a session
- Links where `status` stays `pending` forever

The `expires_at` column is set but never queried or enforced.

### ✅ OK: No Circular Linking

`linked_session_id` is a single FK to `performance_sessions`. Circular linking is structurally impossible (A→B and B→A would require both to exist before insert, which is impossible).

### ❌ FAILURE: Asymmetric `linked_session_id`

The creator's `performance_sessions.linked_session_id` is never set. Only the joiner gets it (from `creator_session_id` on the link row — which is itself null at join time as noted above). The post-save update only writes to `live_ab_links.creator_session_id` / `joiner_session_id`, not back to `performance_sessions.linked_session_id`.

---

## 9. Failure & Recovery

### ⚠️ PARTIAL

- If linking fails midway (e.g., network drop during join UPDATE), the link stays `pending` — no corrupt state, but no recovery path either.
- If the post-save linking update fails (PracticeHub line 318-321), the session is saved but the bidirectional link in `live_ab_links` is incomplete. No retry, no error toast — failure is silently ignored.
- Edge function errors are handled by the lock system's `finally` block — this is correct.

---

## Summary of All Failures

| # | Issue | Severity | Type |
|---|-------|----------|------|
| 1 | RLS blocks joiner UPDATE | **CRITICAL** | Logic flaw |
| 2 | No atomic join (race condition) | **HIGH** | Race condition |
| 3 | Joiner never gets `linkedSessionId` (creator hasn't saved yet) | **HIGH** | Logic flaw |
| 4 | Asymmetric linking — creator's `linked_session_id` never set | **MEDIUM** | Data model gap |
| 5 | No pitcher↔catcher linking | **N/A** | Missing feature |
| 6 | No stats propagation across linked sessions | **N/A** | Missing feature |
| 7 | `calculate-session` has zero linking awareness | **LOW** | Missing integration |
| 8 | No orphaned link cleanup | **MEDIUM** | Missing guard |
| 9 | Post-save link update silently fails with no retry | **MEDIUM** | Missing guard |

## Required Fixes (for production safety)

### Fix 1: RLS Policy for Joiner (CRITICAL)
Add an UPDATE policy allowing any authenticated user to set `joiner_user_id` on a `pending` link:
```sql
CREATE POLICY "Anyone can join pending links" ON public.live_ab_links
  FOR UPDATE TO authenticated
  USING (status = 'pending' AND joiner_user_id IS NULL);
```

### Fix 2: Atomic Join via RPC
Replace the SELECT→UPDATE with a single RPC that atomically claims the link:
```sql
CREATE FUNCTION claim_ab_link(p_code TEXT, p_user_id UUID)
RETURNS live_ab_links AS $$
  UPDATE live_ab_links
  SET joiner_user_id = p_user_id, status = 'active', used_at = now()
  WHERE link_code = p_code
    AND status = 'pending'
    AND joiner_user_id IS NULL
    AND creator_user_id != p_user_id
    AND created_at > now() - interval '2 hours'
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;
```

### Fix 3: Bidirectional `linked_session_id` on Save
After both sessions are saved, update BOTH `performance_sessions` rows with each other's IDs (not just the joiner's).

### Fix 4: Deferred Realtime Activation
Since `creator_session_id` is null at join time, use the `link_code` for broadcast channel (already works via `useLiveRepBroadcast`) and defer `useLiveAbSync` activation until both session IDs are available.

### Fix 5: Orphaned Link Cleanup
Add a scheduled cleanup or use `expires_at` in queries.

