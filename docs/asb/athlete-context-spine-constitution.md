# Athlete Context Spine Constitution

**Sprint:** Hammers Modality — Athlete Context Spine Constitution
**Date:** 2026-06-06
**Type:** Constitutional architecture only. No implementation, no schema, no UI, no prompts.
**Status:** Ratified.

Constitutionally subordinate to: Eternal Laws, RW-1…RW-10, PR-1…PR-10, EI-1…EI-10, IR-1…IR-10, EK-1…EK-10, SG-1…SG-10, FC-1…FC-10, AE-1…AE-10, DG-1…DG-10, and the Relational Organism Architecture (Phases 151–160), with explicit deference to RR-5 narrative continuity, RR-6 injury/recovery, RR-7 career arc, RR-8 life context.

---

## Preamble — Why a spine

Coach Hammer is architecturally GO and runtime-mounted, but adoption telemetry, prescription depth, speed intelligence, six-week planning, roadmap personalization, and longitudinal adaptation all draw from the same shallow well: a `profiles` table built for identity, not development. The Athlete Development Intelligence Audit (2026-06-06) measured overall intelligence at **20%**. The single root cause: **the platform has no canonical athlete-development context spine.**

The spine is not a table. It is the constitutionally declared **set of variables, owners, propagation rules, and lifecycle/longitudinal semantics** that all downstream developmental systems MUST consume. Implementation tables, columns, and projections are downstream artifacts of this constitution.

A variable not in the spine is not authoritative. A consumer reading outside the spine is constitutionally illegal. A spine variable without a declared authority owner does not exist.

---

## Section A — Canonical Athlete Context Model

The spine is composed of **17 profile groups**. Each variable carries six required attributes:

- **authority owner** — who is constitutionally permitted to write it (athlete, parent for minors, clinician, sensor, coach, derived projection, system-of-record).
- **update source** — the canonical surface that produces a new value (onboarding answer, daily log entry, sensor event, session capture, derived projection).
- **confidence source** — how confidence is computed (self-report, validated test, sensor calibration, sample-size derived, time-decayed).
- **missingness behavior** — what the system does when value is absent (block, soft-gate with disclosure, default-with-flag, ask Hammer, defer).
- **downstream consumers** — which surfaces are constitutionally permitted to read it.
- **authority precedence** — what supersedes it in conflict (always: safeguarding > clinician > parent-for-minor > athlete > coach > derived > sensor; per RR-6 athlete-reported pain outranks inferred readiness).

Notation: `[P]` persistent · `[S]` session-scoped · `[T]` temporary (TTL) · `[E]` event-derived · `[D]` derived projection.

### A.1 Core Identity `[P]`
| variable | owner | update source | confidence | missingness | consumers |
|---|---|---|---|---|---|
| user_id | system | auth | exact | block | all |
| full_name, first_name, last_name | athlete | onboarding | self-report | soft-gate | UI, comms |
| date_of_birth | athlete (parent if minor) | onboarding | self-report | **block** lifecycle band | lifecycle, safeguarding, gates |
| sex | athlete | onboarding | self-report | default-with-flag | growth/strength models |
| preferred_language | athlete | settings | self-report | default `en` | all surfaces |
| safeguarding_status (minor flag) | derived from DOB | system | exact | block | RR-9, RR-10, safeguarding |

### A.2 Development History `[E][D]` — see Section B for full model
| variable | owner | source | confidence | missingness | consumers |
|---|---|---|---|---|---|
| sport_primary | athlete | onboarding | self-report | block prescription | all dev surfaces |
| sport_secondary[] | athlete | onboarding | self-report | optional | adaptation engine |
| years_in_sport | athlete | onboarding | self-report | ask Hammer | training-age model |
| lifting_age_years | athlete | onboarding/journal | self-report → corroborated | ask Hammer | strength gating |
| training_age_years | derived | projection | derived | derived | program complexity |
| detraining_periods[] | event-sourced | journal/check-in | self-report | optional | re-entry gating |
| sport_transitions[] | event-sourced | journal | self-report | optional | adaptation engine |
| coaching_changes[] | event-sourced | journal | self-report | optional | narrative (RR-5) |
| growth_spurts[] | event-sourced | parent/athlete check-in | self-report | optional | youth gating |
| developmental_milestones[] | derived | projection | derived | derived | roadmap |

### A.3 Training History `[P][E]`
| variable | owner | source | confidence | missingness |
|---|---|---|---|---|
| weekly_availability (days, hours) | athlete | onboarding | self-report | ask Hammer |
| typical_session_length | athlete | onboarding | self-report | default-with-flag |
| training_focus[] | athlete | onboarding | self-report | ask Hammer |
| training_history_volume_4wk | derived | `athlete_load_tracking` | sample-derived | flag low-confidence |
| training_consistency_score | derived | `user_consistency_snapshots` | sample-derived | flag |
| modality_exposure_map | derived | session ledger | sample-derived | flag |

### A.4 Movement History `[E][D]`
| variable | owner | source | confidence | missingness |
|---|---|---|---|---|
| mobility_baseline | athlete | self-assessment / clinician | mixed | ask Hammer |
| asymmetry_flags[] | sensor/clinician | `sprint_analyses` / clinician | sensor-derived | optional |
| movement_pattern_competence{squat,hinge,push,pull,brace,rotate} | derived | session capture | sample-derived | default-low-flag |
| fascial_chain_state | derived | session capture | sample-derived | flag |

Consumers: warmup, strength, speed, recovery, RR-6.

### A.5 Performance History `[E][D]`
`performance_sessions`, `mpi_scores`, `weakness_scores`, `tex_vision_metrics`, `vault_performance_tests` — projected into:
- recent_form_30d (derived, sample-decayed)
- personal_bests (derived)
- regression_flags[] (derived, contradiction-aware per Phase 55 DG)

### A.6 Speed Profile `[E][D]` — see Section E
### A.7 Strength Profile `[P][E]` — 1RM estimates, training maxes, bar-velocity, work capacity, recovery between sets
### A.8 Throwing Profile `[E][D]` — velo, command, workload (`athlete_load_tracking`), arm-care state, RR-6 binding
### A.9 Hitting Profile `[E][D]` — bat speed, contact quality, plate discipline derivatives
### A.10 Recovery Profile `[P][E]` — sleep, HRV, soreness (`physio_daily_reports`), readiness, fatigue (`foundation_fatigue_decisions`)
### A.11 Equipment Profile `[P][S][T]` — see Section D
### A.12 Environment Profile `[P][S][T]` — see Section D (venue, weather, travel)
### A.13 Season Profile `[P]` — calendar phase (off / pre / in / post), competition density, championship windows
### A.14 Goal Profile `[P]` — goal_summary (free-text athlete authority), goal_horizon, goal_priority_rank
### A.15 Roadmap Profile `[D]` — current_milestone, milestone_progress, projected_next_milestone (derived, never identity-locking per RR-7)
### A.16 Risk Profile `[D]` — injury_history (RR-6), workload_risk (`athlete_load_tracking`), readiness_risk; never overrides athlete-reported pain
### A.17 Lifecycle Profile `[D]` — see Section C

> **Authority firewall:** No spine variable may be authored by AI, recommendation engine, sensor smoother, or vendor adapter beyond its declared owner (EI-7, RW-9, AE-2). Derived variables MUST expose lineage one interaction away (FC observability completion layer).

---

## Section B — Development History Model

Development history is **event-sourced** in `asb_events` under topic prefix `athlete.development.*` and projected into Section A.2 fields. Constitutional definitions:

| Concept | Definition | Owner | Re-evaluation trigger |
|---|---|---|---|
| **Lifting age** | Continuous years of structured resistance training, excluding detraining ≥ 8 weeks. | athlete self-report → corroborated by session ledger | New training_block start; gap ≥ 8 wk |
| **Training age** | Continuous years of structured sport-specific training, excluding detraining periods. | athlete self-report → derived | New season; detraining event |
| **Detraining period** | ≥ 14 days with zero structured training sessions logged. | event-sourced from session ledger | Auto-detect on gap; athlete may annotate cause |
| **Injury interruption** | Per RR-6 `injury_event`. RTP requires explicit human authorization (RR-6). | clinician + athlete | RR-6 RTP event |
| **Sport transition** | Change of `sport_primary`. | athlete | onboarding update; journal event |
| **Coaching change** | Replacement of primary coach relationship. | athlete | journal event; RR-5 narrative |
| **Growth spurt** | Height velocity > 6 cm / 6 mo OR parent-reported. | parent/athlete | youth check-in |
| **Developmental milestone** | Lifecycle-stage-defined capability (Section C). | derived projection | milestone completion event |

**Constitutional rule:** Development history is **append-only event lineage** (EI-3, RE-3). Projections may decay; events may not. A milestone may be revoked but not erased (per RR-5 narrative-revocation right).

---

## Section C — Lifecycle Intelligence Model

Six constitutional bands, mapped onto the relational `developmental_stage` primitive (Phase 154). **Bands define context requirements and adaptation priorities only — they prescribe no programs.**

| Band | Constitutional name | Required context (additive to Core) | Adaptation priorities | Decision variables | Training implications (declarative) |
|---|---|---|---|---|---|
| 0–7 | **foundational_movement** | parent_authority (mandatory), growth_spurts, play_volume | motor literacy, play-first, joy preservation | minutes-of-movement, modality variety | no loading prescriptions; system observes only |
| 7–14 | **developmental_youth** | parent_authority, school_grade, growth_spurts, sport_exposure | skill acquisition, multi-sport bias, neural development | growth_state, skill_breadth, sport_volume_ratio | youth-safe modality envelope; no maximal loading |
| 15–22 | **performance_emergent** | training_age, lifting_age, sport_specialization, recruiting_consent (RR-10) | strength foundation, speed development, sport mastery | competition_density, recruiting_exposure, readiness | full developmental modalities permitted within readiness ceiling |
| 23–30 | **performance_prime** | competition_level, professional_status, season_phase, workload | output maximization, durability, peaking | season_phase, workload_risk, recovery_depth | peak intensity gated by season + workload |
| 31–40 | **performance_sustain** | injury_history (RR-6), recovery_signal, modality_tolerance | durability, recovery-first, specificity | recovery_depth, modality_tolerance, injury_history_depth | volume conservation; sustainable intensity |
| 40+ | **performance_longevity** | medical_clearance, joint_history, recovery_signal | longevity, joint preservation, function | recovery_depth, joint_history, clearance_state | clearance-gated intensity ceilings; clinician precedence |

**Constitutional rules:**
- Band membership is derived from DOB. Missing DOB → block all band-dependent decisions (no default band; Phase 60 FC missingness preservation).
- Band transitions emit canonical `developmental_stage_event` (Phase 154 primitive).
- Adjacent-band interpolation is permitted only via derived projection with confidence decay, never as authority.
- Parent supremacy persists across the entire `0–18` continuum per Phase 151 minor-athlete doctrine, regardless of band.

---

## Section D — Equipment & Environment Model

The spine recognizes equipment/environment as a **multi-scope, multi-source** variable with explicit precedence.

### Canonical venue enum
`commercial_gym | home_gym | bands_only | bodyweight_only | field_only | travel_hotel | outdoor_park | school_facility | none_available`

### Canonical equipment enum (multi-select)
`barbell | dumbbells | kettlebells | machines | cables | bands | medicine_ball | plyo_boxes | sled | turf | full_field | mound | cage | radar | hitting_tee | bullpen | pool | track | none`

### Scopes (precedence: T > S > P, with explicit athlete override always winning)
| Scope | Notation | Source | TTL | Example |
|---|---|---|---|---|
| **Persistent** | `equipment.persistent` | onboarding / settings | ∞ until updated | "I train at LA Fitness" |
| **Session-specific** | `equipment.session` | session start prompt | session duration | "Today I'm at hotel" |
| **Temporary** | `equipment.temporary` | conversational with TTL | 1–30 days (declared) | "Out of town until Friday" |
| **Conversation-derived** | `equipment.inferred` | Hammer turn | needs confirmation | inferred → must confirm before authority |

### Seasonal availability
Calendar overlay: `season_window{start, end, venue_override, equipment_override}`. Snowbound, school-closure, travel-season, off-season tournament windows all collapse into this primitive.

### Constitutional rules
- **Confirmation requirement:** `equipment.inferred` may never directly drive prescription; must be promoted via athlete confirmation (turn or one-tap).
- **TTL transparency:** every temporary scope MUST be visible to the athlete and revocable.
- **Workout adapter:** all generators MUST resolve `effective_equipment = inferred ⊕ temporary ⊕ session ⊕ persistent` with documented precedence; producing an instruction that requires unavailable equipment is constitutionally illegal (RW-1).
- **Missingness:** absent equipment → degrade visibly to bodyweight modality (do not silently fabricate a venue).

---

## Section E — Speed Intelligence Model

Speed is the most data-rich, least-consumed surface today. Spine variables:

| Variable | Source | Confidence | Consumers |
|---|---|---|---|
| acceleration_profile{0–10y,10–20y,split_ratios} | `sprint_analyses` | sample-derived | speed sessions, six-week plan, Hammer |
| top_speed_max | `sprint_analyses` | sample-derived | speed, roadmap |
| stride_profile{length, frequency, contact_time} | `sprint_analyses` / sensor | sensor-derived | mechanics, warmup |
| force_profile{f0, v0, pmax, sfv_imbalance} | `sprint_analyses` (computed) | sample-derived | speed prescription |
| asymmetry_profile{left/right contact, force imbalance} | sensor | sensor-derived | warmup, RR-6 |
| start_profile{reaction, first-step quality} | `speed_sessions` | sample-derived | speed, sport-specific |
| adaptation_history | session ledger | sample-derived | overload modulation |
| readiness_for_max_effort | derived (recovery + workload) | derived | speed gating |

**Propagation:** sensor → ingestion (EK C1) → lineage → confidence/missingness → `sprint_analyses` (canonical owner) → derived `speed_profile` projection → consumers (Hammer, dailyPlan speed modality, six-week plan speed block, roadmap speed milestone, reports).

**Constitutional rules:**
- Sensors may never author `speed_profile`; they author canonical `sprint_analyses` rows. Projection is the only authority surface (EI-3, RW-4).
- Sparse sample (< 3 sessions in 60d) → confidence floor; system MUST expose floor in any surface that uses the variable.
- Asymmetry crossing a constitutional threshold routes to RR-6 evaluation, never directly to programming.

---

## Section F — Longitudinal Adaptation Model

What the spine **remembers, forgets, decays, accumulates, re-evaluates**.

| Class | Examples | Rule |
|---|---|---|
| **Remember forever** | DOB, sex, injury events (RR-6), milestones, sport transitions, training-age lineage | append-only event ledger; never deleted |
| **Forget (athlete-revocable)** | narrative threads (RR-5), life-context disclosures (RR-8), inferred preferences | athlete may revoke; system MUST honor without arbitration |
| **Decay (time-weighted)** | recent_form_30d (30d half-life), readiness (24h), speed_profile (90d half-life), strength estimates (60d), training_consistency (14d window) | confidence drops monotonically with age |
| **Accumulate** | training_history_volume, lifting_age, modality_exposure_map, milestone_completion | additive lineage |
| **Re-evaluate** | training_age (on detraining ≥ 8 wk), band membership (DOB-driven daily), goal_priority (on athlete update), risk_profile (on RR-6 event, on workload spike), roadmap (on milestone event or override) | listed trigger fires `re_evaluation_event` |

**Constitutional rules:**
- Decay is **never** silent. A surface using decayed value MUST surface the decay state (FC global confidence/missingness continuity).
- Forgetting an event-sourced datum produces a `redaction_event` preserving the redaction lineage (RR-5), not deletion of the antecedent.
- Re-evaluation triggers MUST be deterministic and replay-reconstructable (RE-1, DG-1).

---

## Section G — Context Propagation Map

```
                       ┌──────────────────────────────────────────────────────┐
                       │                  ATHLETE CONTEXT SPINE                │
                       │  (17 profile groups · constitutionally declared)      │
                       └──────────────────────────────────────────────────────┘
                                              │
   ┌────────────┬────────────┬────────────────┼────────────────┬────────────┬────────────┐
   ▼            ▼            ▼                ▼                ▼            ▼            ▼
collection   storage      update            Hammer         workouts      speed       roadmaps
   │            │            │                │                │            │            │
 onboarding  profiles +   trigger:          context.ts     dailyPlan    sprint_*    milestones
 daily log   asb_events   - new event      knowledgeGaps  prescription  speed_*     progress
 sensors     domain tbls  - decay tick     prompt         generators    projections
 sessions    derived      - re-eval        builder                                    │
 journal     projections  - revoke            │                │            │            ▼
   │            │            │                ▼                ▼            ▼      recommendations
   └────────────┴────────────┴────────────►  reports  ◄────────┴────────────┴────►  adaptation engine
                                              ▲                                       │
                                              └───────────────────────────────────────┘
                                                    (lineage one interaction away — FC obs)
```

### Propagation rules
1. **Single-direction authority.** Spine variables flow downward to consumers. Consumers may never write back to the spine outside their declared authority.
2. **Lineage envelope.** Every consumer read carries `{value, confidence, missingness, decay_state, last_authored_at, owner}`. Reading the raw value without the envelope is constitutionally illegal (FC global continuity, Phase 60).
3. **No lateral routing.** Hammer must not read `sprint_analyses` directly; it reads the `speed_profile` projection (EI-2 binding doctrine, no lateral binding).
4. **Replay equivalence.** Any consumer decision must be reconstructable from spine state at pinned engine_version + reasoning_version (RE-1).
5. **Missingness as signal.** Absent ≠ default. Consumers MUST distinguish "unknown" from "known-zero" (RR-6 missingness-as-signal generalized to the whole spine).

---

## Section H — Athlete Context Completeness Targets

| Tier | Variables required | Estimated intelligence ceiling | Practical meaning |
|---|---|---|---|
| **Minimum Context Set** | Core Identity (A.1) + sport_primary + weekly_availability + venue_persistent + goal_summary | **35%** | Hammer can give safe, generic, lifecycle-appropriate guidance. No individualization beyond age/sex/sport. |
| **Recommended Context Set** | Minimum + Training History (A.3) + Equipment (A.11 persistent + session) + Season (A.13) + Goal Profile (A.14) + Recovery snapshot (A.10 subset) + lifting_age + training_age | **70%** | Hammer + dailyPlan + roadmap produce coherent, personalized guidance. Speed, strength, throwing surfaces operate at meaningful resolution. |
| **Elite Context Set** | Recommended + full Movement (A.4) + Speed Profile (A.6, ≥ 6 sprint sessions) + Strength (A.7, validated maxes) + sport-specific (A.8/A.9) + Recovery instrumentation (A.10 sensors) + Risk Profile (A.16 with RR-6 lineage) + Roadmap (A.15) + Longitudinal triggers wired (Section F) | **95%** | Top-0.01% individualized development: speed-force individualization, asymmetry-aware programming, season-phased peaking, RR-6 RTP integration, decay-aware adaptation. |

**Today's measured ceiling:** ~20% (per Intelligence Audit). Closing the spine to Recommended unlocks roughly **3.5×** the developmental intelligence available today.

---

## Section I — Constitutional Ratification

**Q1. What is the canonical athlete-context spine?**
The 17 profile groups in Section A, governed by Sections B–F, propagated under Section G, with completeness measured against Section H. It is the **sole authoritative substrate** for all downstream developmental intelligence (Coach Hammer, workout generation, speed programming, six-week plans, roadmaps, recommendations, adaptation engine, longitudinal intelligence).

**Q2. What variables are mandatory?**
The Minimum Context Set (Section H): DOB, sex, sport_primary, weekly_availability, venue_persistent, goal_summary, plus the safeguarding flag derived from DOB. Without these, the system MUST refuse to author individualized prescription and MUST degrade visibly to lifecycle-generic guidance.

**Q3. What variables are optional?**
Everything beyond Minimum that is below Elite — i.e., the Recommended additions in Section H. Missingness is acceptable but MUST be visible per Section G rule 5.

**Q4. What variables are elite-level?**
The Elite additions in Section H: validated speed/strength profiles with sample-size thresholds, sensor-derived movement and asymmetry data, RR-6-integrated risk profile, decay-aware longitudinal triggers, full sport-specific (A.8/A.9) instrumentation.

**Q5. What context currently exists?**
Core Identity (A.1) is largely present in `profiles`. Sport, position, throwing/batting handedness, graduation year, professional status all exist. Rich domain tables (`sprint_analyses`, `athlete_load_tracking`, `physio_health_profiles`, `performance_sessions`, `mpi_scores`, `vault_performance_tests`, `hammer_state_snapshots`) capture significant downstream data.

**Q6. What context is missing?**
The persistence spine and the projection layer. Specifically:
- **Onboarding-derived persistence gap (RFL-023):** 9 referenced columns do not exist (`goal_summary`, `equipment_access`, `weekly_availability`, `lifting_age_years`, `training_focus`, `development_priorities`, `school_grade`, `weight_lbs`, `sport`).
- **Equipment/environment model (Section D):** no canonical enum, no scope precedence, no TTL semantics.
- **Speed projection (Section E):** `sprint_analyses` populated but no `speed_profile` projection consumable by any surface.
- **Longitudinal model (Section F):** no decay engine, no re-evaluation triggers, no event-sourced lifting-age/training-age lineage.
- **Propagation envelope (Section G rule 2):** consumers read raw values without confidence/missingness/decay metadata.

**Q7. What intelligence ceiling is possible today?**
**~20%**, matching the audit. Bounded by the Minimum-tier variables that exist in `profiles` plus dark domain tables that no consumer reads.

**Q8. What intelligence ceiling becomes possible after spine completion?**
- Minimum spine implemented: **35%**.
- Recommended spine implemented: **70%**.
- Elite spine implemented: **95%**.

The remaining 5% is reserved for layers the spine cannot constitutionally guarantee: athlete honesty in self-report, sensor calibration in the wild, clinician availability for RR-6 RTP, and the irreducible uncertainty of human development.

---

## Ratification

The Athlete Context Spine as defined in Sections A–H is hereby ratified as the canonical, constitutionally authoritative developmental context substrate for the Hammers Modality platform. All future Coach Hammer decisions, workout generation, speed programming, six-week plans, roadmaps, recommendations, adaptation systems, and longitudinal intelligence are subordinate to and MUST consume from this spine.

Disproof attempt (Section IX, gap analysis): see `docs/asb/athlete-context-spine-gap-analysis.md`.

Next sprint (implementation, P0-1): construct the Minimum Context Set persistence + projection layer.
