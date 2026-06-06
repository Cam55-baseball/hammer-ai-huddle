# Onboarding Production Audit

**Sprint:** Production Path Activation
**Verdict:** PASS — no dead ends, no manual SQL, no admin intervention required.

## Entry surfaces

| # | Route | Owner | Purpose | Reachable without admin? | Dead-end? |
|---|---|---|---|---|---|
| 1 | `/auth` | `src/pages/Auth.tsx` | Athlete / parent / coach / recruiter sign-in & sign-up | Yes | No |
| 2 | `/onboarding` | `src/pages/OnboardingFlow.tsx` | Athlete onboarding; DOB → `relational.developmental.age_observed` | Yes | No |
| 3 | `/parent-invite` | `src/pages/ParentInvite.tsx` | Athlete-side: issues invite, emits `relational.relationship.created`, dispatches email via `send-parent-invite` | Yes | No |
| 4 | `/accept-parent-invite?token=…` | `src/pages/AcceptParentInvite.tsx` | Parent-side: emits `relational.relationship.confirmed`. Trigger `project_relationship_to_parent_link` activates `parent_athlete_links` row server-side. | Yes | No |
| 5 | `/parent/athletes` | `src/pages/ParentAthletes.tsx` | Parent lists linked athletes from `parent_athlete_links` | Yes | No |
| 6 | `/parent/athletes/:id/recruiting` | `src/pages/ParentRecruitingAuthorization.tsx` | Parent flips `parent_authorized` on `athlete_recruiting_consent`. Trigger `enforce_parent_authorization_authority` enforces RR-10. | Yes | No |
| 7 | `/athlete/recruiting-consent` | `src/pages/RecruitingConsent.tsx` | Athlete owns own consent surface | Yes | No |

## End-to-end activation chain (minor athlete)

```text
athlete /auth signup
    ↓
/onboarding → relational.developmental.age_observed (DOB)
    ↓
is_minor(athlete) = true  (resolved server-side, fail-closed)
    ↓
athlete_recruiting_consent default row created on demand → resolve_recruiting_visibility() = false
    ↓
/parent-invite → relational.relationship.created (+ send-parent-invite dispatch)
    ↓
parent receives email → /accept-parent-invite?token=…
    ↓
parent /auth signup or sign-in (auto-redirect preserves token)
    ↓
acceptParentInvite() → relational.relationship.confirmed
    ↓
trg_project_relationship_to_parent_link (DB) → parent_athlete_links row activated  ← NEW
    ↓
/parent/athletes shows athlete
    ↓
/parent/athletes/:id/recruiting → flip parent_authorized = true
    ↓
enforce_parent_authorization_authority verifies is_authorizing_parent(auth.uid(), athlete)
    ↓
athlete_recruiting_consent_audit row appended (actor_role='parent', change_type='grant')
    ↓
resolve_recruiting_visibility() = true  for that minor
    ↓
coach / recruiter surfaces unhide via RecruitingVisibilityGate
```

## Dead-end / orphan check

| Concern | Result | Evidence |
|---|---|---|
| Does invite acceptance require admin SQL? | NO | Trigger `project_relationship_to_parent_link` on `asb_events` activates linkage automatically. |
| Does parent need to be pre-seeded? | NO | Parent self-signs-up via `/auth`; token preserves through auth redirect (`AcceptParentInvite.tsx:121`). |
| Are there orphan routes? | NO | All seven routes are reachable; `/parent/athletes` is empty-state-safe (`ParentAthletes.tsx`). |
| Hidden default visibility? | NO | Recruiting hidden by default for minors; opens only when both consent and (for minors) parent authorization resolve true. |
| Manual `parent_athlete_links` insert ever needed? | NO | Eliminated by this sprint. |

## Outcome

Zero dead ends. Zero required admin steps. Zero hidden dependencies introduced.
