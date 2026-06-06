# Operational Readiness Audit

**Sprint:** Production Path Activation
**Scope:** What does the live system require from operators / developers for each role to onboard cleanly?

## New athlete

| Requirement | Source | Manual? |
|---|---|---|
| Auth account | Self-serve `/auth` | No |
| Sport selection | `/select-sport` | No |
| DOB → developmental gating | `OnboardingFlow` → `emitOnboardingBootstrap` | No |
| Recruiting consent row | Lazy-created via `useRecruitingConsent`; default fail-closed | No |
| Parent invite (if minor, to unlock recruiting) | `/parent-invite` | No |
| Manual SQL | — | **No** |
| Admin approval | — | **No** |

## New parent

| Requirement | Source | Manual? |
|---|---|---|
| Email invite | `send-parent-invite` edge function | No (best-effort delivery, dispatch logged) |
| Token-encoded relationship | `parentLinking.ts:encodeInviteToken` | No |
| Auth (account or sign-in) | `/auth` with `?redirect=/accept-parent-invite?token=…` | No |
| Accept | `/accept-parent-invite` → emits `relational.relationship.confirmed` | No |
| Linkage activation | DB trigger `project_relationship_to_parent_link` | **No (was the gap; now closed)** |
| Authorize recruiting | `/parent/athletes/:id/recruiting` | No |

## New coach

| Requirement | Source | Manual? |
|---|---|---|
| Auth | `/auth` | No |
| Role assignment | `user_roles` insert via existing coach onboarding | No |
| Athlete linkage | Existing coach↔athlete relationship surfaces | No |
| Recruiting visibility | `RecruitingVisibilityGate` resolves per-athlete via `resolve_recruiting_visibility` | No |

## New recruiter / scout

| Requirement | Source | Manual? |
|---|---|---|
| Application | `/scout-application` → `scout_applications` table | Reviewed (existing flow) |
| Approval | `approve-scout-application` edge function | Operator step (pre-existing) |
| Role | `user_roles` insert on approval | No |
| Recruiting visibility | `RecruitingVisibilityGate` enforces RR-9/RR-10 | No |

## Environment assumptions

| Item | Status |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Provisioned via Lovable Cloud (auto-managed) |
| Email transport for parent invites | Best-effort via `send-transactional-email`; absence falls back to `skipped_disabled` status without blocking activation (token is in URL and can be shared manually if needed) |
| `is_minor()` server-side | Active |
| `resolve_recruiting_visibility()` server-side | Active |
| `is_authorizing_parent()` server-side | Active |
| `enforce_parent_authorization_authority` trigger | Active (RR-10 enforcement) |
| `project_relationship_to_parent_link` trigger | **Active (this sprint)** |

## Hidden dependencies

None introduced. Linkage is a pure projection of the canonical event ledger.

## Missing seed data

None. The system bootstraps every needed row on demand:
- `athlete_recruiting_consent` — lazy via hook
- `parent_athlete_links` — created by trigger from event
- `developmental_state` — derived from `relational.developmental.age_observed`

## Operator-side runbook items (pre-existing, unchanged)

- Scout application approvals
- Subscription / billing customer-portal escalations
- Safeguarding notifications review

## Verdict

System survives new athlete, new parent, new coach, and (after the pre-existing scout-application review) new recruiter onboarding **without developer intervention**.
