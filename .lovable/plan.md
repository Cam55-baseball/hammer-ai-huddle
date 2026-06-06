# Athlete Context Spine Implementation (P0-1)

Implements the ratified spine constitutionally defined in `docs/asb/athlete-context-spine-constitution.md`. No new doctrine. No new constitutional architecture.

## Approach

A dedicated `athlete_context` table (NOT new columns on `profiles`) holds the Minimum Context Set. Rationale: `profiles` is identity-grade and already 58 columns; the spine is development-grade with per-variable confidence + lineage envelopes; keeping them separate preserves authority owners (FC-9, EI-9) and avoids polluting identity with derived/missing-prone fields. The existing `athleteContext.ts` projection is rewritten on top of the new table + projection layer; the broken `profiles.*` selects (which currently silently return undefined for 9 columns) are removed.

## Sections

### A — Persistence Spine (migration)

Create:

1. `public.athlete_context` — one row per user, holds Minimum Context Set per Section H of constitution:
   - `user_id uuid PK → auth.users`
   - `sport_primary text`, `sport_secondary text[]`
   - `goal_summary text`, `goal_horizon text`, `goal_priority_rank int`
   - `weekly_availability_days int`, `weekly_availability_hours numeric`, `typical_session_length_min int`
   - `training_focus text[]`, `development_priorities text[]`
   - `lifting_age_years numeric`, `years_in_sport numeric`
   - `school_grade text`, `season_phase text` (off/pre/in/post — user-declared override; derived value comes from projection)
   - `injury_history jsonb`, lineage: `last_authored_at timestamptz`, `last_authored_by uuid`
   - per-field confidence map `confidence jsonb` (`{field: 'high'|'medium'|'low'|'self_report'|'corroborated'}`)
   - `created_at`, `updated_at`
   - GRANTs (authenticated select/insert/update; service_role all), RLS (`auth.uid() = user_id`), `updated_at` trigger.

2. `public.athlete_equipment_context` — equipment scopes (Section E):
   - `user_id uuid`, `scope text check in ('persistent','session','temporary','inferred')`
   - `equipment text[]`, `venue text` (commercial_gym|home_gym|field|hotel|travel|bodyweight|bands)
   - `valid_until timestamptz NULL` (TTL — required for `temporary` and `inferred`)
   - `source text` (onboarding|hammer_conversation|session_capture|profile_default)
   - `confidence text`, `created_at`
   - PK `(user_id, scope)` for persistent/session (single row); temporary/inferred allow multiple rows via composite `(user_id, scope, created_at)`.
   - GRANTs, RLS, retention trigger that purges rows past `valid_until`.

3. `public.athlete_development_history_events` — append-only event store for Section F (lifting age, training age, detraining, injury interruption, sport transition, coaching change, growth spurt, milestone):
   - `id uuid PK`, `user_id uuid`, `event_type text`, `event_date date`, `payload jsonb`, `source text`, `confidence text`, `created_at`
   - Index `(user_id, event_type, event_date desc)`.
   - GRANTs, RLS.

4. Postgres function `public.get_athlete_context_envelope(p_user uuid) returns jsonb` — single read returning `{variable: {value, source, confidence, missingness, last_updated, owner}}` for all P0 variables. SECURITY DEFINER, `auth.uid() = p_user OR has_role(auth.uid(),'admin')`.

5. Projection views (read-only, derived):
   - `vw_athlete_lifecycle_band` (DOB → band per Phase 154 matrix in Section C of constitution)
   - `vw_athlete_speed_profile` (latest `sprint_analyses` + `speed_sessions` projection: accel, top_speed, stride, force, asymmetry, start)
   - `vw_athlete_workload` (`athlete_load_tracking` → 4wk volume, ACWR, monotony)
   - `vw_athlete_recent_form_30d` (decayed `performance_sessions` projection per Section G half-life)

Authority owners: athlete (most fields), derived (training_age, lifecycle band, speed projection, workload, recent_form), event-sourced (development history).

### B — Acquisition Engine

1. New module `src/lib/hammer/context/acquisition.ts`:
   - `MINIMUM_CONTEXT_SET` constant — list of P0 variable keys.
   - `nextMissingContextPrompt(ctx)` — returns the highest-priority missing variable + canonical Hammer prompt for it.
   - `persistContextAnswer(userId, key, value, source)` — upserts to `athlete_context` with confidence + lineage envelope.
2. Extend `src/lib/hammer/onboarding/knowledgeGaps.ts` to read from `athlete_context` (not the non-existent `profiles.*` columns) and emit gaps from `MINIMUM_CONTEXT_SET`.
3. Acquisition trigger points (no UI overhaul — wire into existing surfaces):
   - Hammer chat: when missing count > 0, surface next prompt.
   - Onboarding flow: persist into `athlete_context`.
   - Speed assessment completion → writes `athlete_development_history_events` (lifting_age corroboration optional).
   - Injury workflow → appends `injury_interruption` event.
   - Session ledger → background derives `detraining_period` event when gap > 14d.

### C — Projection (athleteContext hook rewrite)

Rewrite `src/lib/hammer/context/athleteContext.ts`:

- Replace the broken `profiles.*` select with `useQuery` on `get_athlete_context_envelope(user.id)`.
- Replace `mk()` to consume envelope per-variable (`value`, `source`, `confidence`, `missing`, `lastUpdated`, `lineage`).
- Add `lineage` field to `ContextVariable` (owner, last_authored_by).
- Project every P0 variable plus equipment (resolved per Section E precedence), lifecycle band, speed profile summary, workload, recent_form.
- Keep existing readiness/sleep/MPI/plan_today projections (already work).
- Add `equipmentEffective` projection that resolves precedence: session > temporary > persistent > inferred (TTL-aware).

### D — Propagation

Audit consumers and wire them to the spine projection. For each P0 variable, mark `implemented | projected-but-unused | missing-consumer`. Add explicit consumption in:

- **Coach Hammer prompts** (`src/lib/hammer/**`) — already uses `useHammerAthleteContext()`; envelope upgrade is transparent.
- **Daily Plan** (`src/lib/udl/**` or `useDailyPlan*`) — add `equipmentEffective` + `weekly_availability` + `season_phase` reads.
- **Workout generation** (`src/lib/training/**`) — pull `equipmentEffective`, `lifting_age_years`, `training_focus`.
- **Speed systems** — replace generic prescription with `vw_athlete_speed_profile` + `vw_athlete_workload` reads.
- **Roadmap / Recommendations** — bind to `goal_summary`, `goal_horizon`, lifecycle band.

No business-logic rewrite of recommenders in this sprint — only the read path is changed; recommenders that already accept the missing inputs start receiving real values.

### E — Equipment Intelligence

Implemented entirely via `athlete_equipment_context` + `equipmentEffective` resolver (Section C above). Precedence resolver lives in `src/lib/hammer/context/equipment.ts`:

```text
session (today, TTL=end_of_day) > temporary (TTL ≤ 7d) > persistent > inferred
```

Hammer conversation handler: when user says "hotel today / bands only / at the field", write to `scope='session'` with `valid_until = end_of_day`. Persistent profile is never overwritten.

### F — Development History

- Storage: `athlete_development_history_events` (event-sourced per Section B of constitution).
- Projection: `vw_athlete_development_history` aggregates latest of each event_type + `training_age` derivation = `min(years_in_sport, max(lifting_age_years, session_age_years))` with detraining subtraction.
- Consumers: workout generation (training_age → program complexity), Hammer (narrative continuity per RR-5), roadmap.

### G — Longitudinal Adaptation Memory

Implement decay/accumulate/re-evaluate per Section G of constitution:

- **decay** — recent_form_30d half-life 30d (in `vw_athlete_recent_form_30d`); equipment `inferred` rows expire on `valid_until`; speed profile freshness flag at 60d.
- **accumulate** — `athlete_development_history_events` is append-only; workload from `athlete_load_tracking`.
- **forget** — `temporary` equipment auto-purged by trigger.
- **re-evaluate triggers** (cron-callable function `public.fn_reeval_context_triggers()`):
  - DOB anniversary → recompute lifecycle band.
  - 30d since speed assessment → set `speed_profile.stale = true`.
  - Goal_summary updated → flag roadmap for regeneration (writes ASB event, no destructive mutation).
- Inventory documented in ratification doc.

### H — Hostile Implementation Audit

Test fixtures + a one-shot script under `scripts/audits/spine-hostile-audit.ts` exercising:

1. Empty athlete (no `athlete_context` row) → `get_athlete_context_envelope` returns all `missing:true`, no throws; Hammer surfaces highest-priority prompt; no null cascades.
2. New athlete (only onboarding partial) → envelope shows mixed missingness; consumers tolerate.
3. Returning athlete (>180d gap) → detraining event materializes; recent_form decayed to low-confidence.
4. Missing context → consumers fall back to default-with-flag (never crash).
5. Conflicting context (athlete-reported pain vs. inferred readiness) → pain wins per RR-6.
6. Stale context (speed assessment >60d) → freshness flag visible; consumers may use with disclosure.

Script logs pass/fail per scenario and writes results into ratification doc.

### I — Ratification

Create `docs/asb/athlete-context-spine-implementation-ratification.md` covering:

- Implemented vs. remaining P0 variables (table).
- Storage location + authority owner + confidence owner per variable.
- Acquisition path table (variable → source → trigger → destination).
- Propagation table (variable → consumers, with implemented / projected-but-unused / missing-consumer flags).
- Equipment precedence model.
- Development history storage + projection + consumer map.
- Longitudinal decay/trigger inventory.
- Hostile audit results.
- Updated athlete-development intelligence estimate (target: 35% — Minimum Set ceiling per Section H of constitution).

Update `docs/asb/reality-feedback-ledger.md`:
- Close RFL-023 (context persistence) once `athlete_context` is live.
- Mark RFL-025 partially closed (speed/workload projections active; full consumer rewrite tracked separately).
- Update RFL-026/027/028 from "open" to "implemented".

Update `.lovable/plan.md` to point at next sprint (P0-2: full consumer rewrite — workout/speed/roadmap business logic actually using the new envelope vs. current "read but ignore").

## Technical details

**Migration order (single migration):** `athlete_context` → grants/RLS → `athlete_equipment_context` → grants/RLS → `athlete_development_history_events` → grants/RLS → views → `get_athlete_context_envelope` function → `fn_reeval_context_triggers` function → equipment TTL trigger.

**Files created:**
- `src/lib/hammer/context/equipment.ts` (precedence resolver)
- `src/lib/hammer/context/acquisition.ts` (Minimum Set + persist helper)
- `src/lib/hammer/context/envelope.ts` (typed envelope reader off the RPC)
- `scripts/audits/spine-hostile-audit.ts`
- `docs/asb/athlete-context-spine-implementation-ratification.md`

**Files edited:**
- `src/lib/hammer/context/athleteContext.ts` (rewrite onto envelope)
- `src/lib/hammer/onboarding/knowledgeGaps.ts` (read `athlete_context`)
- consumer surfaces (daily plan, workout generation, speed) — minimal read-path edits only
- `docs/asb/reality-feedback-ledger.md`
- `.lovable/plan.md`

**Out of scope (P0-2 or later):**
- Rewriting workout/speed/roadmap recommender business logic.
- UI changes to onboarding/Hammer chat surfaces (acquisition uses existing surfaces).
- Sensor adapters (HRV, force plates).
- Recommended/Elite tier context fields (this sprint targets Minimum Set ceiling of ~35%).
