# RR-9 Authority Ratification

**Sprint:** RR-9 / RR-10 Authority Correction
**Date:** 2026-06-06
**Engine:** `rr9-1.0.0`
**Status:** RATIFIED

---

## 1. Authority owner

**The athlete.** And only the athlete.

For minor athletes, the athlete's authority is gated by an additional
parent-authorization flag (`parent_authorized`) per RR-10 minor protection.
No coach, recruiter, scout, admin, or viewing party may grant, modify, or
override the athlete's consent.

The previous violation (viewer-controlled `Switch` in `CoachAthleteDetail.tsx`)
has been removed in the same sprint.

## 2. Storage location

| Layer | Object | Purpose |
|---|---|---|
| Canonical state | `public.athlete_recruiting_consent` (one row per athlete) | Single source of truth |
| Audit lineage | `public.athlete_recruiting_consent_audit` (append-only) | Replay-safe history |
| Server authority | `public.resolve_recruiting_visibility(uuid)` | Deterministic visibility resolver |
| Minor predicate | `public.is_minor(uuid)` | Derives from `profiles.date_of_birth`, fail-closed (unknown → minor) |
| Lineage events | `asb_events` topic `relational.exposure.consent_changed` and `relational.exposure.gate_blocked` | RR-9 namespace, interpretive only |

No duplicated consent state exists. No local React state, no session
state, no temporary state, no localStorage holds visibility authority.

## 3. Read path

```
component (RecruitingVisibilityGate)
   ↓
useRecruitingConsent(athleteId)        — src/hooks/useRecruitingConsent.ts
   ↓ parallel:
   ├─ supabase.from('athlete_recruiting_consent').select(...)   — RLS-gated
   ├─ supabase.rpc('is_minor', { _user_id })                    — fail-closed
   └─ supabase.rpc('resolve_recruiting_visibility', { _athlete_id })
                                                                ↓
                                                  server-side single truth
```

RLS on `athlete_recruiting_consent` (policy `viewers read resolved-visible
consent`) only returns rows to non-self viewers when
`resolve_recruiting_visibility(athlete_id) = true`. Direct-link bypass,
query-string bypass, role-switch bypass, and cache-replay bypass all
terminate at this RLS boundary.

## 4. Write path

```
RecruitingConsent page (athlete-only route /athlete/recruiting-consent)
   ↓
useRecruitingConsent().setVisibility(next)
   ↓
supabase.from('athlete_recruiting_consent').upsert({
  athlete_id: auth.uid(),        — enforced by RLS WITH CHECK
  visibility_enabled: next,
  parent_authorized: <unchanged>,
  last_changed_by: auth.uid(),
  engine_version: 'rr9-1.0.0',
})
   ↓
trigger trg_record_recruiting_consent_change
   ↓
INSERT INTO athlete_recruiting_consent_audit (prev, new, changed_by, ...)
   ↓
emitAsbEvent('relational.exposure.consent_changed', ...)
```

RLS policies `athlete inserts own consent` / `athlete updates own consent`
both pin `athlete_id = auth.uid()`. No viewer can write another athlete's row.

## 5. Audit path

- Every insert/update fires `record_recruiting_consent_change()` which
  appends a row to `athlete_recruiting_consent_audit` with full
  `(previous_state, new_state, changed_by, changed_at, actor_role,
   engine_version)`.
- Athletes read their own history via `useRecruitingConsentAudit(athleteId)`
  (`athlete reads own consent audit` policy).
- ASB lineage parallel: `relational.exposure.consent_changed` event in
  `asb_events` carries the same prev/next payload bound to engine_version.

## 6. Replay path

The audit table is the deterministic replay-source for visibility state:

```
state_at(t) = REPLAY(
  athlete_recruiting_consent_audit
  WHERE athlete_id = X AND changed_at <= t
  ORDER BY changed_at ASC
)
```

`resolve_recruiting_visibility(athlete_id)` is a pure function of
the latest consent row + `is_minor(athlete_id)`. Both functions are
`STABLE SECURITY DEFINER` with pinned `search_path = public` —
deterministic under identical ledger inputs at pinned `engine_version`.

ASB lineage events in `asb_events` (`relational.exposure.consent_changed`)
provide the cross-system replay surface; `asb_event_lineage` continues to
bind these to canonical lineage edges where applicable.

---

## Subordination

Subordinate to Eternal Laws, RR-1…RR-10, Megaphase 151–160 (relational
organism architecture), and all prior immutable invariants.

This ratification opens RR-9 *implementation*; it does not modify sealed
doctrine.
