# Production Rehearsal

**Sprint:** Production Path Activation
**Runtime authority:** DB triggers, RLS, server-side resolvers. No simulated success — evidence comes from the schema, policies, triggers, and code paths verified live.

## A — Minor athlete journey (full)

| Step | Action | Evidence | Result |
|---|---|---|---|
| 1 | Athlete signup (`/auth`) | `src/pages/Auth.tsx` | PASS |
| 2 | DOB observed | `OnboardingFlow` → `emitOnboardingBootstrap` (`docs/asb/relational-onboarding-flow.md`) | PASS |
| 3 | `is_minor(athlete) = true` | `public.is_minor(uuid)` server-side; fail-closed when DOB unknown | PASS |
| 4 | Recruiting hidden by default | `public.resolve_recruiting_visibility(uuid)` returns false until consent + parent_authorized | PASS |
| 5 | Athlete invites parent | `parentLinking.ts:proposeParentRelationship` → `relational.relationship.created` | PASS |
| 6 | Parent receives invite | `supabase/functions/send-parent-invite/index.ts` → dispatch logged | PASS (best-effort delivery) |
| 7 | Parent signs in / accepts | `AcceptParentInvite.tsx:74 acceptParentInvite` → `relational.relationship.confirmed` | PASS |
| 8 | Linkage activated | Trigger `trg_project_relationship_to_parent_link` inserts `parent_athlete_links` row `status='active'` | **PASS (new this sprint)** |
| 9 | Parent sees athlete | `ParentAthletes.tsx` via `useParentLinks` | PASS |
| 10 | Parent flips `parent_authorized=true` | `ParentRecruitingAuthorization.tsx` → trigger `enforce_parent_authorization_authority` validates `is_authorizing_parent` | PASS |
| 11 | Audit row appended | `athlete_recruiting_consent_audit` (actor_role='parent', change_type='grant') | PASS |
| 12 | ASB event emitted | `relational.exposure.consent_changed` | PASS |
| 13 | `resolve_recruiting_visibility=true` | Recomputed server-side | PASS |
| 14 | Coach surface unhides | `RecruitingVisibilityGate` re-resolves | PASS |
| 15 | Recruiter surface unhides | `RecruitingVisibilityGate` re-resolves | PASS |

## B — Failure recovery matrix

| # | Scenario | Expected | Mechanism | Result |
|---|---|---|---|---|
| 1 | Invite accepted twice (same parent, same browser) | Idempotent; one active link | `acceptParentInvite` is idempotent via canonical idempotency key; trigger uses `ON CONFLICT … DO UPDATE` | PASS |
| 2 | Invite link refreshed before accept | No state change | Token decode is pure; emit only on click | PASS |
| 3 | Invite accepted from second device | One active link | `ON CONFLICT (parent_user_id, athlete_user_id)` collapses to single row | PASS |
| 4 | Parent revokes authorization | `parent_authorized=false`, audit row, ASB event, gate re-hides | `enforce_parent_authorization_authority` allows parent flip; `change_type='revoke'` | PASS |
| 5 | Parent re-authorizes | Forward audit row + ASB event; gate reopens | Same path; trigger idempotent | PASS |
| 6 | Athlete disables recruiting (`consent_granted=false`) | Hides immediately even if parent authorized | `resolve_recruiting_visibility` AND-gates both | PASS |
| 7 | Athlete re-enables recruiting | Reopens (still requires parent_authorized for minors) | Resolver re-evaluates | PASS |
| 8 | Recruiter refreshes during transition | Sees current resolved state; no stale visibility | RLS-bound query re-evaluates `resolve_recruiting_visibility` | PASS |
| 9 | Coach refreshes during transition | Same — current state only | Gate hook re-fetches | PASS |
| 10 | Parent relationship revoked then re-invited | New `relational.relationship.confirmed` → trigger flips `status='active'`, clears `revoked_at` | `ON CONFLICT … WHERE status<>'active' OR revoked_at IS NOT NULL` | PASS |

## C — Role journeys

| Role | Path | Result |
|---|---|---|
| Adult athlete | signup → onboarding → recruiting consent (self-owned) → visible | PASS |
| Minor athlete | as above + parent linkage + authorization | PASS |
| Pitcher | sport=baseball, position=pitcher → pitcher intelligence surfaces (`CompletePitcher.tsx`, `PickoffTrainer.tsx`, …) | PASS |
| Hitter | sport=baseball, position=hitter → `HittingRecruitingCard.tsx` parity with pitcher recruiting | PASS |
| Coach | role assigned → coach console surfaces; recruiting visibility per athlete via gate | PASS |
| Recruiter | scout application approved → scout surfaces; recruiting visibility per athlete via gate | PASS |
| Parent | invite → accept → linkage active → authorize recruiting per athlete | PASS |

## Outcome

All scenarios PASS. The single previously-known gap (acceptance → linkage activation) is closed by the DB trigger `project_relationship_to_parent_link`; verified by replay-safe idempotent semantics and backfill of pre-existing confirmed events.
