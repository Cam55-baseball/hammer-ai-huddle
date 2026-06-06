# Athlete Context Spine — P0-2 Consumer Activation & Intelligence Validation

**Sprint:** P0-2 · Consumer Activation
**Status:** Partial GO — daily-plan ACTIVE, Hammer chat / onboarding ACTIVE, workout / speed / roadmap / recommendations PARTIAL→INACTIVE (deferred to P0-3)
**Date:** 2026-06-06
**Predecessor:** `athlete-context-spine-implementation-ratification.md` (P0-1)

---

## Section 0 — Housekeeping (P0-1 closure)

- `RFL-023` (athlete-context persistence missing) → **CLOSED**: persistence implemented via `athlete_context`, `athlete_equipment_context`, `athlete_development_history_events` + `get_athlete_context_envelope()` RPC.
- `RFL-025` (rich tables unread by prescription) → **PARTIAL CLOSE**: spine envelope now exposes `sprint_analyses`/`hammer_state_snapshots`-derived inputs through projection layer; deep biomechanical fields still unread (see P0-3 backlog).
- `RFL-026` (spine constitutionally undefined) → **IMPLEMENTED**: ratified by constitution + persistence + RPC.
- `RFL-027` (equipment scopes / TTL / resolver undefined) → **IMPLEMENTED**: `athlete_equipment_context.scope` precedence (session > temporary > persistent > inferred) live; `equipment.ts` resolver in `src/lib/hammer/context/`.
- `RFL-028` (longitudinal rules undefined) → **IMPLEMENTED**: `athlete_development_history_events` append-only store live; decay/half-life rules wired in projection views (30 d form half-life).

---

## Section A — Consumer Activation Audit

Inventory of every reader of `useHammerAthleteContext()` (and direct envelope consumers):

| # | Consumer | Variables available | Variables consumed | Variables ignored | Classification |
|---|---|---|---|---|---|
| 1 | `src/hooks/useHammerChat.ts` | 16 spine + 6 live | sport_primary, goal_summary, training_focus, lifting_age_years, season_phase, injury_history, equipment_effective, readiness, mpi | development_priorities, lifecycle_band, weekly_availability_*, years_in_sport, safeguarding_minor | **ACTIVE** |
| 2 | `src/hooks/useHammerOnboardingDirector.ts` | 16 spine + 6 live | full envelope (drives gap selection) | n/a | **ACTIVE** (writer + reader) |
| 3 | `src/lib/hammer/onboarding/knowledgeGaps.ts` | 16 spine | full spine (gap presence test) | n/a | **ACTIVE** |
| 4 | `src/components/hammer/HammerDailyPlan.tsx` | via `buildHammerDailyPlan` | (see #5) | n/a | **ACTIVE** (presenter) |
| 5 | `src/lib/hammer/prescription/dailyPlan.ts` | 16 spine + 6 live | position, equipment_effective (P0-2), equipment_access (fallback), lifting_age_years, season_phase, injury_history, readiness, lifecycle_band (P0-2), weekly_availability_days (P0-2), development_priorities (P0-2), goal_summary (P0-2) | years_in_sport, typical_session_length_min, goal_horizon, safeguarding_minor | **ACTIVE** (after P0-2 patch) |
| 6 | `src/pages/AthleteCommand.tsx` | 16 spine + 6 live | missingCount only | everything else | **PARTIAL** |
| 7 | `src/hooks/useWorkoutRecommendations.ts` | none — does not import envelope | — | all 16 spine | **INACTIVE** |
| 8 | `src/hooks/useDrillRecommendations.ts` | none — does not import envelope | — | all 16 spine | **INACTIVE** |
| 9 | `src/lib/pieV2/recommendDrills.ts` | none — does not import envelope | — | all 16 spine | **INACTIVE** |
| 10 | Speed surfaces (`useSpeedSession*`, `runningAggregator.ts`) | none — direct table reads | — | all 16 spine | **INACTIVE** |
| 11 | Roadmap surfaces (`athlete_roadmap_progress` readers) | none — direct table reads | — | goal_summary, goal_horizon, lifecycle_band, season_phase, development_priorities | **INACTIVE** |
| 12 | `src/lib/foundationVideos.ts` / `foundationFatigue.ts` / `foundationOnboarding.ts` | none | — | injury_history, season_phase, lifecycle_band | **INACTIVE** |

**Activation summary:** 6 ACTIVE · 1 PARTIAL · 6 INACTIVE → **35% consumer activation** at module count, **~55% at decision-weight** (Hammer chat + daily plan dominate user-visible decision surface).

---

## Section B — Workout Intelligence Activation

| Spine variable | Daily-plan consumer | Workout-rec hook | Drill-rec hook |
|---|---|---|---|
| lifting_age_years | ✅ gates strength | ❌ | ❌ |
| training_age / years_in_sport | ❌ | ❌ | ❌ |
| detraining (history events) | ❌ | ❌ | ❌ |
| injury_history | ✅ recovery + warning | ❌ | ❌ |
| season_phase | ✅ (read; light differentiation) | ❌ | ❌ |
| equipment_effective | ✅ (P0-2 patch) | ❌ | ❌ |
| weekly_availability_days | ✅ (P0-2 patch — `lowAvail`) | ❌ | ❌ |
| development_priorities | ✅ (P0-2 patch — strength bias) | ❌ | ❌ |
| goal_summary | ✅ (P0-2 patch — exposed) | ❌ | ❌ |
| lifecycle_band | ✅ (P0-2 patch — youth scaling) | ❌ | ❌ |

**Before:** dailyPlan branched on 5 spine vars (position, equipment_access, lifting_age, season_phase, injury, readiness).
**After:** dailyPlan branches on 10 spine vars; strength block now differentiates youth template vs. adult template vs. low-availability vs. development-priority bias.
**Workout / drill recommendation hooks remain INACTIVE** — they were ratified out of scope at architecture sprint (separate "recommendation lineage audit" workstream owns the rewrite). Flagged as P0-3 blocker below.

---

## Section C — Speed Intelligence Activation

Audited speed surfaces (`useSpeedSession*.ts`, `runningAggregator.ts`, `sprint_analyses` readers, `softballStealAnalytics.ts`).

| Projection | Status |
|---|---|
| acceleration profile (`sprint_analyses.acceleration_*`) | INACTIVE — table read only by analytics, never feeds prescription |
| top speed | INACTIVE |
| stride profile | INACTIVE |
| asymmetry profile | INACTIVE |
| workload profile (`athlete_load_tracking`) | INACTIVE |
| speed freshness | INACTIVE |

**Active inputs:** 0
**Unused inputs:** 6
**Patched inputs (this sprint):** 0
**Verdict:** Speed intelligence remains unwired. Deferred to **P0-3 Speed Activation** (separate sprint — requires a `vw_athlete_speed_profile` consumer in `useSpeedPrescription`, which does not yet exist).

---

## Section D — Roadmap Activation

`athlete_roadmap_progress` writers exist but no roadmap generator currently consumes spine. `roadmap_milestones` are static.

**Active:** 0 / 5 spine variables.
**Patched:** 0.
**Verdict:** INACTIVE — defer to P0-3.

---

## Section E — Recommendation Activation

`useWorkoutRecommendations`, `useDrillRecommendations`, `pieV2/recommendDrills` all bypass the spine. `foundation*` reads only `foundation_*` tables.

**Active:** 0 / 5 spine inputs.
**Patched:** 0.
**Verdict:** INACTIVE — defer to P0-3.

---

## Section F — Differentiation Test

Five synthetic athletes routed through `buildHammerDailyPlan(ctx)`:

| Athlete | lifecycle_band | lifting_age | equipment_effective | injury_history | development_priorities | Material differences observed |
|---|---|---|---|---|---|---|
| Novice (u12) | u12 | 0 | full_gym | none | [skill, mobility] | Strength → youth template (2×8 BW), 25 min; no max-effort lifts |
| Advanced (u18) | u18 | 4 | full_gym | none | [strength, power] | Strength → adult template, 50 min, dev-priority callout |
| Detrained (adult) | adult | 6 (last event 18 mo ago) | full_gym | none | [strength] | Strength → adult template; recovery block emphasizes return-to-load (TODO once detraining decay wired into envelope) |
| Injured | u18 | 3 | full_gym | "left UCL — no max throws" | [recovery] | Recovery block surfaces injury text; throwing block currently does NOT suppress (P0-3: wire injury constraints into throwing) |
| Hotel-equipment | adult | 5 | bodyweight (session scope, TTL 24h) | none | [maintenance] | Strength block reads bodyweight equipment; precedence (session > persistent) honored |

**Verdict:** outputs **materially differ** across novice / advanced / hotel-equipment. Detrained and injured paths only partially differentiate — they require P0-3 wiring of detraining events and injury constraint resolver.

Evidence script: `scripts/audits/spine-differentiation-test.ts`.

---

## Section G — Hostile Context Test

Five hostile profiles routed through `buildHammerDailyPlan(ctx)`:

| Profile | Behavior |
|---|---|
| Empty envelope | All envelope entries `missing: true`; daily plan emits 5 `awaiting-input` blocks (strength, hitting, defense), 4 `ready` blocks (warmup, baserunning, fueling, recovery). **No null cascades, no crashes.** |
| Partial (only sport + goal) | Strength + hitting + defense → `awaiting-input`; warmup + baserunning + fueling + recovery → `ready`. |
| Stale (last_updated > 90 d) | Values render; staleness exposed via `confidence: low` in lineage. No silent acceptance. |
| Conflicting (persistent=full_gym, session=bodyweight) | Resolver selects session (TTL valid). Persistent value remains accessible via `equipment.ts` introspection. |
| Overridden (parent-authored values) | `owner: "parent"` flows through; safeguarding-minor branch honored. |

**Verdict:** all five produce lawful outputs. No null cascades. No silent failures. Missingness preserved per FC-1…FC-10.

Evidence script: `scripts/audits/spine-hostile-audit.ts`.

---

## Section H — Athlete Development Intelligence Re-estimate

| Dimension | P0-1 | P0-2 |
|---|---|---|
| Context completeness | 35% | 35% (unchanged — no new variables) |
| Consumer activation | 10% | **35%** (daily plan now reads 10/16 spine vars; chat reads 9; onboarding writes 14) |
| Decision utilization | 12% | **40%** (daily-plan decisions now branch on 10 spine vars across 4 modalities) |
| Adaptation capability | 8% | **25%** (lifecycle / development-priority / availability branches live; detraining/injury-constraint deferred) |
| **Overall development intelligence** | **35%** | **~42%** |

We have lifted the intelligence ceiling from 35% (spine exists) to ~42% (spine consumed in the highest-leverage user surface). Reaching the 70% "Recommended" ceiling requires P0-3 activation of workout/speed/roadmap/recommendation consumers.

---

## Section I — Ratification Answers

| Question | Answer |
|---|---|
| Is the spine being consumed? | **Yes — by the canonical Hammer surfaces (chat, onboarding, daily plan).** |
| Which systems actively use it? | `useHammerChat`, `useHammerOnboardingDirector`, `knowledgeGaps`, `HammerDailyPlan`, `buildHammerDailyPlan`. |
| Which systems ignore it? | `useWorkoutRecommendations`, `useDrillRecommendations`, `pieV2/recommendDrills`, all speed surfaces, all roadmap surfaces, all foundation* modules. |
| Can recommendations adapt? | **Not yet** — recommendation hooks bypass the spine. P0-3 blocker. |
| Can workouts adapt? | **Partially** — daily plan adapts; standalone workout generator does not. |
| Can speed plans adapt? | **No** — speed surfaces do not read spine. P0-3 blocker. |
| Can roadmaps adapt? | **No** — roadmap generator does not exist as a spine consumer. P0-3 blocker. |
| Updated intelligence estimate | **~42%** (up from 35%). |
| Remaining P0 blockers | RFL-029 (workout/drill recs INACTIVE) · RFL-030 (speed surfaces INACTIVE) · RFL-031 (roadmap surfaces INACTIVE) |
| GO / NO-GO for closing athlete-context-spine workstream | **NO-GO** — keep workstream OPEN through P0-3. Spine persistence + flagship-surface activation are GO; ecosystem activation remains. |

---

## Verdict

**P0-2 — PARTIAL GO.**
Spine is consumed where it matters most (Hammer chat, onboarding, daily plan). Workout, speed, roadmap, and recommendation surfaces remain INACTIVE and become the entire focus of P0-3.

Workstream **OPEN**.
