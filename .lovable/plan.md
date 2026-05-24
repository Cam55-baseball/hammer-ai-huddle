
# Implementation Mode — ASB Build Backlog

Phases 1–150+ are sealed. From here on, work ships as code. This plan converts the existing constitutional architecture into a buildable backlog and defines the first execution slice.

## Mode Transition

- Architecture: **FROZEN** (Phases 1–150+ sealed, no new doctrine).
- Memory doctrine docs become **reference only** — no new `mem://architecture/*` files.
- All future requests are interpreted as Epic → Feature → Task work items against the backlog below.
- One memory write only in this plan: add a `mem://build/backlog.md` index so the backlog is durable across sessions (replaces further phase expansion).

## The 8 Epics (compression of Phases 1–150+)

```text
EPIC 1  Athlete Intelligence Core      ← organism truth, athlete profile, identity
EPIC 2  ASB State Engine               ← readiness, fatigue, load, confidence, missingness
EPIC 3  Sensor & Data Ingestion        ← wearables, video, manual entry, external APIs
EPIC 4  Replay & Event Timeline        ← append-only event ledger + deterministic replay
EPIC 5  Coaching Intelligence UI       ← coach dashboard, athlete view, translation layer
EPIC 6  Recruiting & Evaluation        ← scout profiles, projections, comparison
EPIC 7  Competitive Analytics          ← forecasting, scenario sim, opponent/context
EPIC 8  Infrastructure & Observability ← auth, RLS, edge functions, logging, lineage view
```

## Epic → Features (high level)

**EPIC 1 — Athlete Intelligence Core**
- F1.1 Athlete profile + roles (athlete/coach/recruiter/admin)
- F1.2 Organism truth record (canonical per-athlete state pointer)
- F1.3 Authority/role guard (separate `user_roles` table)

**EPIC 2 — ASB State Engine**
- F2.1 State snapshot table (readiness, fatigue, load, confidence, missingness)
- F2.2 Derivation service (pure functions over events → snapshot)
- F2.3 Confidence + missingness propagation
- F2.4 Survivability gate (block recommendations below thresholds)

**EPIC 3 — Sensor & Data Ingestion**
- F3.1 Manual entry forms (workout, RPE, sleep)
- F3.2 Generic webhook ingest edge function (HMAC-signed)
- F3.3 Wearable adapter (one provider first — pick in build mode)
- F3.4 Video/clip upload via Lovable Cloud storage

**EPIC 4 — Replay & Event Timeline**
- F4.1 Append-only `events` ledger (immutable, versioned)
- F4.2 Replay engine (rebuild snapshot from events at version pin)
- F4.3 Timeline UI (athlete event history)

**EPIC 5 — Coaching Intelligence UI**
- F5.1 Coach dashboard (roster + flags)
- F5.2 Athlete detail view (state + lineage drilldown)
- F5.3 Translation layer (state → human guidance with confidence bounds)

**EPIC 6 — Recruiting & Evaluation**
- F6.1 Recruiter view + saved athletes
- F6.2 Projection card (bounded, lineage-visible)
- F6.3 Comparison view

**EPIC 7 — Competitive Analytics**
- F7.1 Scenario inputs + bounded forecast service
- F7.2 Forecast display with confidence envelope

**EPIC 8 — Infrastructure & Observability**
- F8.1 Auth (email/password + Google), email confirm ON
- F8.2 RLS on every table, role-based via `has_role()`
- F8.3 Edge function logging + lineage event taps
- F8.4 Admin observability page (event volume, failures)

## Execution Order (first slices)

1. **Supabase schema v1** — auth, roles, athletes, events ledger, state snapshots.
2. **Ingestion v1** — manual entry + generic webhook edge function.
3. **ASB engine v1** — derive readiness/fatigue/load/confidence from events.
4. **Replay v1** — rebuild snapshot from event range.
5. **UI v1** — auth, athlete dashboard, coach roster, event timeline.
6. **Integrations v1** — one wearable adapter + video upload.
7. **Deployment readiness** — RLS audit, linter pass, secrets, observability.

## Data Model (v1 sketch — to be finalized in build mode)

- `profiles(user_id, display_name, role_default, ...)`
- `user_roles(user_id, role)` — enum: `athlete | coach | recruiter | admin`
- `athletes(id, owner_user_id, name, dob, sport, position, ...)`
- `athlete_coaches(athlete_id, coach_user_id)` — access grants
- `events(id, athlete_id, event_type, source, payload jsonb, occurred_at, ingested_at, engine_version, reasoning_version, lineage jsonb)` — append-only
- `state_snapshots(id, athlete_id, as_of, readiness, fatigue, load, confidence, missingness jsonb, engine_version, derived_from_event_range int8range)`
- `ingest_sources(id, athlete_id, kind, config jsonb, secret_ref)`
- `recruiter_watchlist(recruiter_user_id, athlete_id)`

All tables: RLS on. Roles checked via `public.has_role(auth.uid(), 'role')` security-definer function.

## First Build-Mode Deliverable

When approved and switched to build mode, the first action is a single migration creating: roles enum, `user_roles`, `has_role()`, `profiles`, `athletes`, `athlete_coaches`, `events`, `state_snapshots`, plus RLS policies and timestamp triggers. Then auth UI (email/password + Google) and a minimal athlete dashboard that lists events.

## Out of Scope (permanent)

- New phases, megaphases, doctrines, invariants, or constitutional layering.
- New `mem://architecture/*` files.
- Any further compression beyond these 8 Epics.

## Open Choices (answer in build mode, not blockers for plan approval)

- Primary sport vertical for v1 (baseball implied by prior context — confirm).
- First wearable adapter (Garmin / Whoop / Apple Health via webhook / none yet).
- Whether to ship recruiter + competitive analytics in v1 or defer to v2.

Approve to switch to build mode and begin with the Supabase schema v1 migration.
