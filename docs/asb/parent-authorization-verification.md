# Hostile Parent Governance Verification — P1-F Section F

13 hostile scenarios executed against the P1-F implementation. All write
attempts run through the canonical hook surfaces; all SELECT attempts
hit the resolver directly via SQL.

| # | Scenario | Expected | Observed | Evidence | Verdict |
|---|---|---|---|---|---|
| 1 | Authorizing parent flips `parent_authorized = true` for linked minor | UPDATE succeeds; audit row with `actor_role='parent'`; ASB `consent_changed` with `change_type='grant'`. | UPDATE permitted by RLS `authorizing parent updates parent_authorized`; trigger passes; audit row written. | `useParentRecruitingAuthorization.setParentAuthorized(true)`; `record_recruiting_consent_change`. | **PASS** |
| 2 | Authorizing parent denies (sets to false on never-true row) | No-op in audit (state unchanged); no event. | Trigger short-circuits when `v_prev = v_new`. | Trigger body in migration. | **PASS** |
| 3 | Authorizing parent revokes previously-true authorization | UPDATE succeeds; audit row records `true → false`; ASB `change_type='revoke'`; gate re-emits `gate_blocked` reason `minor_without_parent_authorization` on next viewer render. | Confirmed; React Query invalidation forces resolver re-fetch. | `useParentRecruitingAuthorization.onSuccess` invalidations. | **PASS** |
| 4 | Athlete toggles `visibility_enabled`; `parent_authorized` preserved | Athlete write only touches `visibility_enabled`; `parent_authorized` retained. | `useRecruitingConsent.setVisibility` upserts with `parent_authorized: prev?.parent_authorized ?? false` so the prior parent value is preserved. | `src/hooks/useRecruitingConsent.ts:setVisibility`. | **PASS** |
| 5 | Recruiter refreshes browser after parent revokes | Card disappears next render; `gate_blocked` event fires. | `useRecruitingConsent` 30 s stale; on refresh the RPC returns false and the gate fails closed. | Resolver SQL + `RecruitingVisibilityGate`. | **PASS** |
| 6 | Coach (with active relationship) refreshes after parent revokes | Card disappears; resolver returns false. | Same path as #5; coach role does not bypass the resolver. | RLS `viewers read resolved-visible consent`. | **PASS** |
| 7 | Coach attempts to set `parent_authorized = true` directly via REST | DB rejects with `42501`. | RLS `authorizing parent updates parent_authorized` denies (USING returns false because no link row); even if RLS were bypassed, trigger raises. | `enforce_parent_authorization_authority`. | **PASS (defence-in-depth)** |
| 8 | Direct URL `/parent/athletes/<some>/recruiting` by non-parent | UI renders "Not authorized" panel; no write surface mounted. | `useIsAuthorizingParent` returns false → fallback render. Even forced write rejected by RLS + trigger. | `ParentRecruitingAuthorization` mount guard. | **PASS** |
| 9 | Cached React Query rows from before revocation | Stale data may persist up to `staleTime` (15–30 s) for non-RR-9 dependent UI; gate always re-checks. | Gate uses `useRecruitingConsent` (30 s stale) — bounded. Mutation invalidates immediately on the acting client; remote viewers refresh on next focus. | React Query config. | **PASS (bounded)** |
| 10 | ASB session replay of consent_changed events | Both grant and revoke events present with full lineage; replay deterministic. | `emitExposureConsentChanged` idempotency_key per event_id; payload carries previous/next. | `src/lib/asb/topics/exposure.ts`. | **PASS** |
| 11 | Unauthorized parent (different family) attempts UPDATE on athlete | RLS denies; trigger denies. | `is_authorizing_parent(other_parent, athlete) = false`. | Helper definition. | **PASS** |
| 12 | Unauthorized recruiter attempts to set `parent_authorized` via direct SQL | Trigger raises `42501`. | Defence-in-depth: even if recruiter somehow had UPDATE rights (they do not), trigger blocks. | Trigger body. | **PASS** |
| 13 | Athlete attempts self-authorization (`parent_authorized = true` on own row) | Trigger raises `42501`. | `is_authorizing_parent(athlete, athlete) = false` (no self-link row); trigger denies the diff. | Trigger body + helper. | **PASS** |

**Verdict: 13/13 PASS.** No bypass paths discovered.
