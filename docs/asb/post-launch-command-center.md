# Post-Launch Command Center

**Sprint:** Post-Launch Observability & Reality Validation
**Posture:** Single operational source of truth for post-launch operations. Supersedes ad-hoc operational sections by reference; does not replace `docs/asb/launch-operations-package.md` (which remains the launch-day runbook).

## Critical dashboards

| surface | url | purpose |
|---|---|---|
| Ops Health | `/ops/health` | system heartbeat, trigger status |
| Ops Drift | `/ops/drift` | projection vs ledger consistency |
| Ops Replay | `/ops/replay` | replay equivalence audit |
| Ops Deployment | `/ops/deployment` | deployment legality state |
| ASB Replay | `/asb/replay` | full event-lineage audit |
| ASB Timeline | `/asb/timeline` | per-athlete chronology |
| Athlete Digest | `/digest` | athlete-facing projection |

## Critical ASB topics

- `relational.developmental.age_observed`
- `relational.relationship.created`
- `relational.relationship.confirmed`
- `relational.relationship.revoked`
- `relational.exposure.consent_changed`
- `relational.exposure.gate_blocked`
- `relational.safeguarding.*` (reserved)
- `athlete.readiness`, `athlete.fatigue`, `athlete.recovery`, `athlete.schedule`
- `prescription.override.requested`, `prescription.override.acknowledged`
- `session.block.modified`, `session.block.skipped`, `session.block.substituted`, `session.deviation.logged`

## Critical alerts

| alert | condition | severity |
|---|---|---|
| `rr10.linkage_projection_failed` | WARNING from `project_relationship_to_parent_link` | high |
| `rr10.parent_auth_blocked` | `42501` spike from `enforce_parent_authorization_authority` | warn |
| `rr9.gate_blocked_spike` | > N `relational.exposure.gate_blocked` per minute | warn |
| `rr10.consent_audit_drift` | audit row count ≠ consent update count | P0 |
| `safeguarding.unacked_minor` | parent_ack > 24h for minor signal | P0 |
| `safeguarding.unacked_coach` | coach_ack > 72h | high |
| `projection.replay_divergence` | derived view diverges from canonical replay | P0 |

## Critical tables

- `asb_events` (canonical ledger — never mutate)
- `asb_event_lineage` (lineage edges)
- `asb_topic_registry`
- `parent_athlete_links` (RR-10 authority projection)
- `athlete_recruiting_consent` + `athlete_recruiting_consent_audit`
- `parent_invite_dispatches`
- `safeguarding_notifications`
- `foundation_recommendation_traces`
- `foundation_video_outcomes`
- `user_roles`

## Daily review checklist

- [ ] `/ops/health` green
- [ ] `/ops/drift` no divergence
- [ ] `safeguarding.unacked_minor` count = 0
- [ ] `rr10.consent_audit_drift` = 0
- [ ] New `RFL-NNN` rows triaged (severity assigned)
- [ ] `parent_invite_dispatches.status='failed'` < 10% rolling 24h

## Weekly review checklist

- [ ] Funnel reducers run for athlete / coach / recruiter / parent
- [ ] Recommendation reducer top-N ignored vs completed recommendations reviewed
- [ ] Intelligence utilization reducer surface-by-surface review (gated rows acknowledged)
- [ ] Safeguarding reducer invariant_violations = 0
- [ ] Scoreboard targets compared against Day 1 / 7 / 30 cohort metrics
- [ ] Reality feedback ledger reviewed; high-severity entries proposed for next sprint

## Escalation procedures

| severity | first responder | escalation |
|---|---|---|
| P0 (safeguarding, audit drift, replay divergence) | on-call engineer | immediately to owner + safeguarding lead |
| high | on-call engineer | within 4h to engineering lead |
| warn | weekly triage | next sprint planning |
| info | weekly triage | optional |

## RACI — who investigates what

| concern | responsible | accountable | consulted |
|---|---|---|---|
| RR-9 / RR-10 violations | safeguarding lead | owner | engineering, legal |
| Replay / lineage divergence | engine lead | owner | engineering |
| Recommendation effectiveness | foundations lead | owner | coaching |
| Intelligence consumption gaps | intelligence lead | owner | product |
| Parent authorization issues | parent-flow lead | owner | safeguarding |
| Coach engagement | coaching lead | owner | product |
| Recruiter engagement | recruiting lead | owner | safeguarding |

## What this command center does NOT do

- Does not authorize organism truth mutation.
- Does not initiate redesigns.
- Does not bypass constitutional sprint process for any architecture change.
- Does not optimize for engagement.
