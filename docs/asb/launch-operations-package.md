# Launch Operations Package

**Sprint:** Production Path Activation
**Purpose:** Operational doctrine for go-live. No architecture, no new doctrine.

## Launch checklist

- [ ] Verify `project_relationship_to_parent_link` trigger present on `public.asb_events`.
- [ ] Verify `enforce_parent_authorization_authority` trigger present on `public.athlete_recruiting_consent`.
- [ ] Smoke-test athlete signup → onboarding → recruiting consent surface loads.
- [ ] Smoke-test parent invite issuance (creates `parent_invite_dispatches` row).
- [ ] Smoke-test parent accept (creates `parent_athlete_links` row `status='active'`).
- [ ] Smoke-test parent authorization (audit row appended, ASB event emitted).
- [ ] Confirm coach + recruiter views respect `RecruitingVisibilityGate`.
- [ ] Confirm `is_minor()` fail-closed for unknown DOB.

## Rollback checklist

| Failure | Rollback action |
|---|---|
| Trigger causes ledger writes to error (should be impossible — wrapped) | `DROP TRIGGER trg_project_relationship_to_parent_link ON public.asb_events;` Linkage stops updating; existing rows untouched. |
| Linkage row corruption | Re-run backfill block from migration; idempotent. |
| RR-10 trigger blocks legitimate parent | Verify `parent_athlete_links` row is `status='active'` and `revoked_at IS NULL`; re-emit `relational.relationship.confirmed` from parent if necessary. |
| Recruiting visibility wrong | Inspect `resolve_recruiting_visibility(athlete_id)`; verify consent row + parent_authorized column. |

## Monitoring checklist

| Metric | Source | Alert threshold |
|---|---|---|
| `relational.relationship.confirmed` event rate | `asb_events WHERE topic_id=...` | > 0 daily once parents onboarding |
| `parent_athlete_links` insert rate | table | tracks confirmed event rate |
| RR-10 trigger denials (`SQLSTATE 42501`) | Postgres logs | Spike investigated for hostile probes |
| `parent_invite_dispatches.status='failed'` | table | Alert if > 10% over rolling hour |
| `relational.exposure.gate_blocked` event volume | `asb_events` | Spikes investigated |
| Recruiting consent audit gaps | `athlete_recruiting_consent_audit` vs `athlete_recruiting_consent` updates | Should match 1:1 |

## Support checklist

| User report | First-line check |
|---|---|
| "Parent can't authorize my recruiting" | Verify `parent_athlete_links` row for that pair exists and is active. |
| "I accepted but it didn't work" | Check most recent `relational.relationship.confirmed` event for that parent; trigger should have created/updated link row. |
| "Recruiter says they can't see me" | Verify `resolve_recruiting_visibility` for the athlete; check consent + (if minor) parent_authorized. |
| "Email never arrived" | Check `parent_invite_dispatches.status`; share invite URL directly if `failed`/`skipped_disabled`. |

## Escalation checklist

| Severity | Trigger | Action |
|---|---|---|
| P0 | Recruiting surfaces leak for minors without parent_authorized | Disable affected views; verify `resolve_recruiting_visibility`; emit incident. |
| P0 | Parent authorization bypass observed | Verify `enforce_parent_authorization_authority` active; emergency `REVOKE` on `athlete_recruiting_consent` if needed. |
| P1 | Linkage projection drift | Re-run backfill DO-block. |
| P2 | Email delivery degraded | Configure `send-transactional-email`; share invite URL manually. |

## Critical dashboards

- ASB Replay (`/asb/replay`) — relationship + exposure event lineage
- ASB Timeline (`/asb/timeline`) — per-athlete event chronology
- Ops Health (`/ops/health`) — system heartbeat, trigger status
- Ops Drift (`/ops/drift`) — projection vs ledger consistency

## Critical ASB topics

- `relational.developmental.age_observed`
- `relational.relationship.created`
- `relational.relationship.confirmed`
- `relational.relationship.revoked`
- `relational.exposure.consent_changed`
- `relational.exposure.gate_blocked`

## Critical database tables

- `asb_events` (canonical ledger; never mutate)
- `asb_event_lineage` (lineage edges)
- `parent_athlete_links` (projection — RR-10 authority)
- `athlete_recruiting_consent` (consent state)
- `athlete_recruiting_consent_audit` (append-only audit)
- `parent_invite_dispatches` (dispatch log)
- `user_roles` (role assignments)

## Critical failure alerts

| Alert | Condition |
|---|---|
| `rr10.linkage_projection_failed` | WARNING log from `project_relationship_to_parent_link` |
| `rr10.parent_auth_blocked` | `42501` from `enforce_parent_authorization_authority` (informational unless spike) |
| `rr9.gate_blocked_spike` | > N `relational.exposure.gate_blocked` per minute |
| `rr10.consent_audit_drift` | Audit row count diverges from consent update count |
