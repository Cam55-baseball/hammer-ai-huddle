# Athlete Development Intelligence Audit

**Sprint:** Hammers Modality — Athlete Development Intelligence Architecture Audit & Constitution
**Date:** 2026-06-06
**Status:** Audit complete. Implementation-blocked until P0 gaps closed.
**Authority subordination:** Eternal Laws, RR-1…RR-10, RW-1…RW-10, EI-1…EI-10, all sealed phases.
**Scope:** Read-only. No code, schema, surface, or recommendation changes.

> **Mission.** Determine whether Hammers Modality possesses enough athlete-
> development intelligence to prescribe elite individualized workouts, speed
> programs, six-week plans, long-term pathways, lifecycle-aware adaptation,
> and sport-/position-specific development for baseball and softball.

> **Verdict in one line.** No. The platform has rich domain libraries
> (sport/position/age/pitch/competition data) and a strong constitutional
> substrate (modulators, developmental stage projection, PIE V2, athlete
> load tracking), but the **athlete-context layer is hollow** — the
> `profiles` row stores almost none of the variables Hammer needs, and the
> richer per-domain tables are not wired into any prescription pipeline.

---

## A — Athlete Development Context Inventory

For each variable: **source · authority owner · confidence · update path ·
Hammer access · workout access · roadmap access · recommendation access**.

> **Legend.** Present = column/projection exists *and* an active write path
> populates it. Partial = column exists but no active write path, or only
> partially derivable. Absent = no canonical home.

| Variable | Source | Authority owner | Update path | Hammer | Workout | Roadmap | Recommend | Status |
|---|---|---|---|---|---|---|---|---|
| Chronological age | `profiles.date_of_birth` | athlete | onboarding form | ✓ | ✓ | ✓ | ✓ | **Present** |
| Biological age | — | — | — | ✗ | ✗ | ✗ | ✗ | **Absent** |
| School year / grade | `profiles.school_grade` (read by `athleteContext.ts:96`) | athlete | — | ✗ (column missing) | ✗ | ✗ | ✗ | **Absent — code references column that does not exist** |
| Training age (general) | `profiles.experience_level` | athlete | onboarding | ✓ low-fidelity (categorical) | partial | partial | partial | **Partial** |
| Lifting age (years) | `profiles.lifting_age_years` referenced in `athleteContext.ts:96` | athlete | — | ✗ column missing | ✗ | ✗ | ✗ | **Absent** |
| Sport age (years in sport) | — | — | — | ✗ | ✗ | ✗ | ✗ | **Absent** |
| Time away from training | — | implied via `athlete_load_tracking` gaps | not aggregated | ✗ | ✗ | ✗ | ✗ | **Absent (derivable, not derived)** |
| Injury history | `physio_health_profiles.injury_history` (text) + `user_injury_progress` + `profiles.injury_history` referenced in context | mixed (athlete + physio) | physio form | partial | ✗ | ✗ | partial via `rtp` modulator | **Partial — three competing surfaces, not unified** |
| Injury recurrence | `user_injury_progress` time series | athlete | self-report | partial | ✗ | ✗ | ✗ | **Partial** |
| Position | `profiles.position` (free text) | athlete | onboarding | ✓ | ✓ | partial | partial | **Present (free text — not enum-bound)** |
| Handedness (throw / bat) | `profiles.throwing_hand`, `batting_side`, `primary_*`, `is_switch_hitter`, `is_ambidextrous_thrower` | athlete | onboarding | ✓ | partial | ✗ | partial | **Present** |
| Bodyweight | `profiles.weight` (text) | athlete | onboarding | low-fidelity | ✗ | ✗ | ✗ | **Partial (string, not numeric, no longitudinal series)** |
| Height | `profiles.height` (text) + `height_inches` (numeric) | athlete | onboarding | partial | ✗ | ✗ | ✗ | **Partial** |
| Limb proportions / anthropometry | — | — | — | ✗ | ✗ | ✗ | ✗ | **Absent** |
| Movement restrictions | — | — | — | ✗ | ✗ | ✗ | ✗ | **Absent** |
| Mobility profile | — | — | — | ✗ | ✗ | ✗ | ✗ | **Absent** |
| Recovery profile | `hammer_state_snapshots.recovery_score`, `athlete_load_tracking.recovery_debt` | engine | foundation cron | ✓ via `hie_snapshots` | partial | ✗ | partial | **Partial (snapshot only, no profile)** |
| Schedule / weekly availability | `profiles.weekly_availability` referenced in context | athlete | — | ✗ column missing | ✗ | ✗ | ✗ | **Absent** |
| Equipment access | `profiles.equipment_access` referenced in context | athlete | — | ✗ column missing | ✗ | ✗ | ✗ | **Absent** |
| Facility access | — | — | — | ✗ | ✗ | ✗ | ✗ | **Absent** |
| Season phase | `useDayState.dayType` | engine | derived | ✓ | partial | ✗ | partial | **Partial (categorical day-state, not season-phase model)** |
| Goals / aspirations | `profiles.goal_summary` referenced in context | athlete | — | ✗ column missing | ✗ | ✗ | ✗ | **Absent** |
| Workload history | `athlete_load_tracking` (cns_load, fascial_load, volume_load, intensity_avg, recovery_debt) | engine | daily aggregation | partial | partial | ✗ | partial | **Partial — table populated, not exposed to Hammer context** |
| Readiness history | `behavioral.readiness` events | athlete + engine | daily check-in | ✓ latest only | ✗ | ✗ | partial | **Partial (no longitudinal projection)** |
| Speed profile | `sprint_analyses` (acceleration_profile, split_times, steps_per_split, grade_breakdown) + `speed_sessions` (rpe, readiness_score) | engine | per-session capture | ✗ not wired to Hammer | ✗ | ✗ | ✗ | **Partial — captured, not projected** |
| Strength profile | `block_workouts` + `training_blocks` | athlete | training entry | ✗ | partial | ✗ | ✗ | **Partial** |
| Throwing profile | PIE V2 (`src/lib/pieV2/types.ts`) — 13 signals (energy_angle, separation, stride, head_stability, extension, arm_slot, …) | engine | per-rep capture | ✓ via PIE V2 brief panel | partial | ✗ | partial | **Present (baseball only)** |
| Hitting profile | sport-specific outcome tags + `verifiedStatBoosts` | engine + athlete | session log | partial | partial | ✗ | partial | **Partial** |
| Defensive profile | position-weights + `drill_assignments` | engine | drill completion | partial | ✗ | ✗ | ✗ | **Partial** |
| Development priorities | `profiles.development_priorities` referenced in context | athlete | — | ✗ column missing | ✗ | ✗ | ✗ | **Absent** |
| Developmental stage | `relational.developmental.*` projection (`developmentalState.ts`) | engine | event-derived | ✓ projection exists | ✗ not consumed by Hammer | ✗ | ✗ | **Present but unconsumed** |

### Critical instrumentation gap

`src/lib/hammer/context/athleteContext.ts:96` selects **9 columns that do not exist** in `profiles`:

> `sport`, `weight_lbs`, `school_grade`, `training_focus`, `goal_summary`,
> `equipment_access`, `weekly_availability`, `lifting_age_years`,
> `injury_history`, `development_priorities`

Every gap-resolution answer in `knowledgeGaps.ts` therefore has **no
persistence target** — Hammer asks but cannot remember. This is the
single largest blocker to elite individualization.

**Section A completeness: 9 / 32 fields with active update path = 28%.**

---

## B — Lifecycle Development Model

| Stage | Library knowledge | Projection | Wired to Hammer | Wired to workouts |
|---|---|---|---|---|
| 0–7 (movement foundations) | absent | absent | ✗ | ✗ |
| 7–14 (skill acquisition) | `ageCurves.ts` per sport (light) | `developmentalState` stages `youth_intro`, `youth_developmental` | partial | ✗ |
| 15–22 (peak development) | `ageCurves`, `competitionLevels`, `summerLeagues` | `adolescent_*`, `adult_emerging` | partial | partial |
| 23–30 (athletic prime) | `competitionLevels` (collegiate/pro), `tierMultipliers` | `adult_competitive`, `adult_pro` | partial | ✗ |
| 31–40 (sustain / longevity) | absent | `adult_pro` only | ✗ | ✗ |
| 40+ (legacy / coach-player) | absent | absent | ✗ | ✗ |

Lifecycle constitutional doctrine (what to train / avoid · CNS · fascial ·
strength · skill priorities per stage) **does not exist anywhere in code or
docs**. `developmentalGates.ts` encodes only load-ceiling, recruiter/exposure
gates, and parent-consent rules — not developmental training priorities.

**Section B completeness: 1 dimension (gating) of 5 required (CNS · fascial · strength · skill · safeguarding) = 20%.**

---

## C — Training Age Intelligence

Hammer currently distinguishes athletes only by the four-bucket
`experience_level` enum (`youth | high_school | college | pro`). It
**cannot** separate:

- 14-year-old advanced vs 14-year-old novice (same enum bucket)
- 18-year-old detrained vs 18-year-old elite (same bucket)
- 23-year-old returning from injury vs 23-year-old peak

Required signals — none present:

- `lifting_age_years` (column missing)
- `sport_age_years` (column missing)
- `time_away_from_training_days` (derivable from `athlete_load_tracking` gaps, not derived)
- `novice / intermediate / advanced classification` (no projection)
- `detrained / returning` classification (no projection)

**Section C completeness: 1 / 5 signals = 20%.**

---

## D — Equipment Adaptation Intelligence

`profiles.equipment_access` referenced in `athleteContext.ts:124` and
`knowledgeGaps.ts:80` — column does not exist. `dailyPlan.ts` branches on
the variable in three places (hitting, defense, …) but always falls into
the `awaiting-input` path because the value is permanently missing.

No environment enum exists for: `commercial_gym | home_gym | bands_only |
bodyweight_only | field_only | travel | hotel | in_season_facility`. The
`environment` modulator at `src/lib/runtime/modulators/environment.ts`
modulates for **weather**, not equipment. Workouts and six-week plans
cannot adapt to equipment changes — there is nothing to adapt against.

**Section D completeness: 0 / 8 environments = 0%.**

---

## E — Speed Development Intelligence

| Required signal | Captured in | Projected to Hammer / workouts |
|---|---|---|
| First-step | `sprint_analyses.acceleration_profile` | ✗ |
| Acceleration curve | `sprint_analyses.acceleration_profile`, `split_times` | ✗ |
| Stride count | `sprint_analyses.total_steps`, `steps_per_split` | ✗ |
| Stride length | derivable (distance ÷ steps) | ✗ |
| Top speed | derivable from split_times | ✗ |
| Sprint profile | `grade_20_80`, `grade_breakdown` | ✗ |
| Asymmetries | absent | ✗ |
| Force profile (F-V) | absent | ✗ |

Speed data **is captured** but no projection feeds it into `athleteContext`,
`buildHammerDailyPlan`, the roadmap, or recommendation pipelines. The
`speed` block in `dailyPlan.ts:88` is a fixed template — it does not read
`sprint_analyses` at all.

**Section E completeness: 6 captured / 8 required, 0 projected = 0% wired, 75% raw.**

---

## F — Fascial Development Intelligence

| Capability | State |
|---|---|
| Fascial load tracking | `athlete_load_tracking.fascial_load` (present, daily aggregate) |
| Fascial adaptation model | **absent** |
| Elastic / SSC qualities | **absent** |
| Barefoot development | **absent** |
| Multi-sport development | **absent** |
| Rotational development | partial (pitch/swing tagged in PIE V2, not aggregated) |
| Locomotion development | partial (sprint_analyses) |
| Force transfer | **absent** |

A column exists for fascial load; nothing reads it. Adaptation, elasticity,
and force-transfer models do not exist in code or doctrine.

**Section F completeness: 1 / 8 = 13%.**

---

## G — Baseball / Softball Specialization Model

| Layer | Baseball | Softball |
|---|---|---|
| Pitch types | `src/data/baseball/pitchTypes.ts` | `src/data/softball/pitchTypes.ts` |
| Pitch-type weights | ✓ | ✓ |
| Position weights | ✓ | ✓ |
| Outcome tags | ✓ | ✓ |
| Drill catalog | ✓ + PIE V2 catalog | ✓ |
| Age curves | ✓ | ✓ |
| Tier multipliers | ✓ | ✓ |
| Competition levels | ✓ | ✓ |
| Probability baselines | ✓ | ✓ |
| Velocity bands | ✓ | ✓ |
| League distances | ✓ | ✓ |
| Steal benchmarks | ✓ | ✓ |
| Pitcher styles | — | ✓ |
| **PIE V2 mechanical model** | ✓ (13 signals) | **✗ absent** |
| **Pitcher / catcher / IF / OF / utility adaptation in Hammer prescription** | ✗ (only enum branch on `pos === "DH"` in `dailyPlan.ts:170`) | ✗ |

Domain libraries are excellent. Position-specific adaptation in the
prescription layer is **near-zero** — `dailyPlan.ts` has one position
branch (DH skip) and one position label echo (defense title). Softball has
no PIE-V2-equivalent mechanical model.

**Section G completeness: library 95% · prescription wiring 10% → blended 35%.**

---

## H — Six-Week Program Generation Audit

Hostile generation attempted in prose using only currently available
context for a hypothetical athlete. Decisions classified:

| Decision | Basis | Verdict |
|---|---|---|
| Weekly training-day count | `profiles.weekly_availability` | **assumption — column missing** |
| Equipment-appropriate lifts | `profiles.equipment_access` | **assumption — column missing** |
| Strength intensity progression | `profiles.lifting_age_years` | **assumption — column missing** |
| Throwing volume ramp | PIE V2 + position | partial evidence (baseball only) |
| Speed prescription | `sprint_analyses` aggregate | **assumption — not projected** |
| Hitting block selection | `verifiedStatBoosts` + outcome tags | partial |
| Recovery / deload cadence | `athlete_load_tracking` + `developmentalState.deload_window` | partial — present, unconsumed by Hammer |
| Injury accommodations | `physio_health_profiles.injury_history` + `user_injury_progress` | partial — three competing surfaces, not unified |
| Position-specific defensive work | `profiles.position` (free text) | partial |
| Season-phase alignment | `useDayState.dayType` | partial — day-level, not 6-week-arc |
| Goal alignment | `profiles.goal_summary` | **assumption — column missing** |
| Development-priority weighting | `profiles.development_priorities` | **assumption — column missing** |

**Six decisions of twelve are pure assumption. Top-0.01% personalization is structurally impossible at present.**

**Section H completeness: 6 / 12 evidence-based = 50% — and only because partial wins count; zero of the six evidence-based items are end-to-end wired to a generator.**

---

## I — Longitudinal Adaptation Model

| Capability | Present | Notes |
|---|---|---|
| Progression tracking (per signal) | ✗ | PIE V2 stores per-rep; no cross-session arc projection consumed by Hammer |
| Regression tracking | ✗ | none |
| Plateau detection | ✗ | none |
| Adaptation detection | ✗ | none |
| Workload adaptation | partial | `athlete_load_tracking` populated, not consumed in prescription |
| Injury adaptation | partial | `rtp` modulator exists; not driven by `user_injury_progress` time series |
| Season adaptation | partial | `useDayState` day-level only |
| Cross-session memory in chat | ✗ | `useHammerChat.ts` does not load prior `hammer.chat.message` lineage |
| Engine-version-pinned replay of adaptation | ✗ | no Hammer reasoning emits `adaptation_event` with engine_version |

**Section I completeness: 3 partial / 9 required = 17%.**

---

## J — Athlete Development Completeness Scorecard

| Dimension | Score | Basis |
|---|---|---|
| A — Context completeness | **28%** | 9 / 32 fields with active update path |
| B — Lifecycle completeness | **20%** | 1 / 5 lifecycle dimensions (gating only) |
| C — Training-age completeness | **20%** | 1 / 5 training-age signals |
| D — Equipment completeness | **0%** | 0 / 8 environments |
| E — Speed completeness | **0% wired** (75% raw) | captured but not projected |
| F — Fascial completeness | **13%** | 1 / 8 capabilities |
| G — Sport-specialization completeness | **35%** | library 95% · prescription wiring 10% (blended) |
| H — Six-week-program completeness | **50%** | 6 / 12 decisions evidence-based — none end-to-end |
| I — Longitudinal completeness | **17%** | 3 partial / 9 required |
| **Overall athlete-development intelligence** | **20%** | unweighted mean of A–I (wired scores) |

> **Constitutional reading.** The platform has the *materials* for elite
> coaching (excellent sport libraries · PIE V2 · modulators · developmental
> stage projection · workload table · sprint analyses) but the **athlete-
> context spine is missing**. Until the spine is built, every downstream
> system — workouts, six-week plans, roadmap, speed, recovery — is
> structurally prevented from individualizing.

---

## Hostile findings (attempt-to-disprove)

1. **Persistence ghost.** `athleteContext.ts:96` and `knowledgeGaps.ts` reference 9 columns that do not exist. Hammer questions have no destination. *Verified via `information_schema.columns` query.*
2. **Capture / projection gap.** `sprint_analyses` is rich (acceleration_profile, split_times, grade_breakdown) and **completely unread** by any prescription code. The same is true of `athlete_load_tracking`, `physio_health_profiles`, `user_injury_progress`, `hammer_state_snapshots.recovery_score`.
3. **Free-text authority leak.** `profiles.position` is free text. Position-specific reasoning is therefore unreliable even when wired.
4. **Sport asymmetry.** Softball has no PIE-V2 mechanical model — the platform cannot interpret softball pitching mechanics at the same constitutional fidelity as baseball.
5. **Single-day temporal horizon.** `useDayState` is day-level. The platform cannot reason in 6-week, season, or year-over-year arcs because no such projection exists.
6. **No engine-pinned adaptation events.** Hammer's recommendations are not replay-certifiable as adaptations under EI-1…EI-10 / AR-1…AR-10 because no `adaptation_event` carries Hammer's reasoning lineage.

---

## Reality Feedback Ledger entries

Roadmap classification is in `docs/asb/athlete-development-intelligence-roadmap.md`.
Ledger entries `RFL-023`, `RFL-024`, `RFL-025` opened in
`docs/asb/reality-feedback-ledger.md`.

---

## Exit confirmation

- ☑ Every intelligence domain audited (A–I)
- ☑ Completeness scores calculated (J)
- ☑ Missing context, adaptation, lifecycle, speed, specialization systems identified
- ☑ Roadmap classified (separate document)
- ☑ Overall athlete-development intelligence percentage returned: **20%**

**Workstream: OPEN.** Coach Hammer architecture remains GO; **Coach Hammer
intelligence depth = INSUFFICIENT** for elite individualization at any
lifecycle stage.
