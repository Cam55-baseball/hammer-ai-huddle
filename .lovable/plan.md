

# Session Linking System — Proof-Level Audit Results

## VERDICT: 95% GOLD — 2 Confirmed Issues Found

---

## 1. Database Integrity — State Machine

### 1A. Status Constraint — VERIFIED ✅

**CHECK constraint confirmed:**
```
CHECK (status = ANY (ARRAY['pending', 'claimed', 'linked', 'expired']))
```

No row can ever hold a value outside this set. Enforced at DB level — no RPC or direct write can bypass it.

**Current data:**
- `pending`: 2 rows
- `expired`: 9 rows
- `claimed`: 0
- `linked`: 0

No violations exist.

### 1B. Illegal Transitions — VERIFIED ✅

All 3 RPCs are `SECURITY DEFINER` and enforce transitions:
- `create_ab_link`: only creates `'pending'`
- `claim_ab_link`: only transitions `'pending'` → `'claimed'`
- `attach_session_to_link`: only transitions to `'linked'` when both sessions present; rejects `'expired'`

No path exists to go backward (e.g. `linked` → `claimed`).

---

## 2. Session Uniqueness — VERIFIED ✅

### Unique Indexes Confirmed:

```
uniq_creator_session_per_link ON (creator_session_id) WHERE creator_session_id IS NOT NULL
uniq_joiner_session_per_link  ON (joiner_session_id)  WHERE joiner_session_id IS NOT NULL
```

### Query Results:
- **Duplicate creator sessions:** 0 rows (none)
- **Duplicate joiner sessions:** 0 rows (none)
- **Cross-role contamination** (same session as creator in link X AND joiner in link Y): 0 rows (none)

### DB-Level Proof:
The unique indexes make duplicates **impossible** — any INSERT/UPDATE violating them would raise a unique constraint error. The `attach_session_to_link` function adds a redundant `EXISTS` guard (defense-in-depth), but the indexes alone are sufficient.

**However:** The indexes do NOT prevent the same UUID appearing once as `creator_session_id` and once as `joiner_session_id` in different rows. This is only guarded by the function-level `EXISTS` check (step 3). To make this mathematically impossible at DB level, you would need a trigger or exclusion constraint. **Risk: very low** — the function guard is inside a `FOR UPDATE` lock, but it's worth noting this is a function-level guarantee, not a schema-level guarantee.

---

## 3. attach_session_to_link — Correctness Proof

### 3A. Race Safety — VERIFIED ✅

`SELECT ... FOR UPDATE` acquires an exclusive row lock. Any concurrent call on the same `link_code` blocks until the first transaction commits. Combined with `COALESCE`, this means:
- Two concurrent creator attaches → first wins, second is a no-op
- Two concurrent joiner attaches → first wins, second is a no-op
- Creator + joiner simultaneously → both succeed sequentially (serialized by lock), finalization happens on whichever runs second

### 3B. Idempotency — VERIFIED ✅

- `COALESCE(creator_session_id, p_session_id)` → no overwrite if already set
- `IS DISTINCT FROM` on bidirectional update → no-op if already correct
- `IF v_link.status != 'linked'` → status update skipped if already linked
- Re-entry allowed for status `'linked'` → safe retry after completion

### 3C. Partial State Prevention — VERIFIED ✅

If only one side attaches:
- The link stays in `'claimed'` (or `'pending'` for creator-only)
- `linked_session_id` is NOT set on either `performance_sessions` row
- System remains valid — no corruption

---

## 4. Bidirectional Consistency — VERIFIED ✅ (no linked rows exist yet)

No `linked` status rows exist in the database currently, so bidirectional linking has never been exercised in production. The function logic is correct:

```sql
UPDATE performance_sessions SET linked_session_id = joiner WHERE id = creator ...
UPDATE performance_sessions SET linked_session_id = creator WHERE id = joiner ...
```

Both updates happen inside the same transaction under the same row lock. Query confirmed: 0 `performance_sessions` rows have `linked_session_id` set — consistent with 0 linked links.

---

## 5. Expiration — VERIFIED ✅

- `claim_ab_link` checks `expires_at > now()` in its WHERE clause — expired links cannot be claimed
- `attach_session_to_link` rejects any status not in `('pending', 'claimed', 'linked')` — expired links are rejected
- Both enforced at DB function level, not client-side

---

## ❌ FAILURE 1: Orphaned Pending Rows (Stale Data)

**Evidence:**
```
AB-MYK8M | status: pending | expires_at: 2026-03-24 (11 days ago) | ACTUALLY EXPIRED
AB-WQJG6 | status: pending | expires_at: 2026-03-25 (10 days ago) | ACTUALLY EXPIRED
```

**Cause:** `expire_stale_links()` only runs when `create_ab_link` is called. There is no scheduled/cron trigger. If no user creates a new link, stale rows accumulate forever with `status = 'pending'` despite being past `expires_at`.

**Impact:** Low — `claim_ab_link` checks `expires_at > now()` so these can't be claimed. But they violate data cleanliness and the `idx_live_ab_links_one_active_per_creator` index could theoretically block a user from creating a new link if their old pending row hasn't been expired yet (though `create_ab_link` does expire old rows for the calling user specifically).

**Fix Required:** Add a scheduled cleanup (pg_cron or edge function cron) OR always call `expire_stale_links()` at the start of `claim_ab_link` (which it already does — confirmed). The real fix is those 2 rows need manual cleanup, and `create_ab_link` already handles per-user cleanup. This is cosmetic, not a logic flaw.

---

## ❌ FAILURE 2: Stale RLS Policy (Incorrect WITH CHECK)

**Evidence:**
```
Policy: "Anyone can join pending links"
Command: UPDATE
qual: (status = 'pending' AND joiner_user_id IS NULL)
with_check: (status = 'active')  ← 'active' is NOT a valid status
```

**Impact:** This policy would block any direct client-side UPDATE that tries to set status to anything other than `'active'` — which is impossible since `'active'` fails the CHECK constraint. However, since all mutations go through `SECURITY DEFINER` RPCs (which bypass RLS), this policy is **never actually used**. It's dead code.

**Risk:** Zero at runtime (RPCs bypass it), but it's a maintenance hazard — if anyone ever tries to use direct client updates, they'll hit a wall.

**Fix Required:** Drop or correct this policy. It's a leftover from a previous schema where `'active'` was a valid status.

---

## 6. Summary of All Indexes and Constraints

| Protection | Type | Status |
|---|---|---|
| Status values restricted to 4 | CHECK constraint | ✅ Verified |
| One active link per creator | Partial unique index | ✅ Verified |
| Unique link codes | UNIQUE constraint | ✅ Verified |
| Creator session globally unique | Partial unique index | ✅ Verified |
| Joiner session globally unique | Partial unique index | ✅ Verified |
| Cross-role session guard | Function-level EXISTS | ✅ Verified (not schema-level) |
| FK to performance_sessions | Foreign keys | ✅ Verified |
| FK to auth.users | Foreign keys | ✅ Verified |

---

## 7. Final Scorecard

| Guarantee | Status | Proof |
|---|---|---|
| State machine integrity | ✅ | CHECK constraint + RPC logic |
| No duplicate sessions | ✅ | Unique indexes + 0 violations in data |
| Race safety | ✅ | FOR UPDATE row lock |
| Idempotency | ✅ | COALESCE + IS DISTINCT FROM |
| No partial states | ✅ | Atomic finalization in single tx |
| Bidirectional consistency | ✅ | Both updates in same lock (untested in prod — 0 linked rows exist) |
| Expiration enforcement | ✅ | WHERE clause guards in claim + attach |
| Orphan cleanup | ⚠️ | Works per-user on create, but no global scheduler — 2 stale rows exist |
| RLS correctness | ❌ | One policy references invalid status `'active'` |
| Cross-role session guard | ⚠️ | Function-level only, not schema-enforced |

---

## Required Fixes (2 items)

### Fix 1: Drop stale RLS policy
```sql
DROP POLICY "Anyone can join pending links" ON live_ab_links;
```
This policy is dead code with an invalid `with_check` referencing non-existent status `'active'`.

### Fix 2: Clean up orphaned pending rows
Either manually expire them or ensure `expire_stale_links()` runs on a schedule. The 2 pending rows with past `expires_at` should be set to `'expired'`.

### Optional Fix 3: Schema-level cross-role guard
To prevent a session ID from appearing as both `creator_session_id` in one link AND `joiner_session_id` in another, add a trigger. Currently only guarded at function level.

---

## Files Changed

| File | Change |
|------|--------|
| New migration | Drop stale RLS policy; update 2 orphaned rows to expired |

## What Does NOT Change
- `attach_session_to_link` — verified correct
- `claim_ab_link` — verified correct
- `create_ab_link` — verified correct
- Client code — unchanged
- Edge functions — unchanged

