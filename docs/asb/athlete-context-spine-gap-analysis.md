# Athlete Context Spine — Gap Analysis

**Companion to:** `docs/asb/athlete-context-spine-constitution.md`
**Date:** 2026-06-06
**Method:** per-variable status against live schema + projection layer + consumer surfaces. Hostile disproof of the existing architecture.

Status legend:
- **present** — variable is canonically owned, persisted, and read by at least one consumer with lineage envelope.
- **partial** — variable is persisted but read raw (no envelope), or read by some consumers only.
- **missing** — variable is referenced in code but has no persistence target.
- **dark** — variable is captured into a canonical table but **no consumer reads it**.

---

## 1. Per-variable status

### A.1 Core Identity
| variable | status | notes |
|---|---|---|
| user_id | present | |
| full_name / first_name / last_name | present | `profiles` |
| date_of_birth | partial | column exists; **not consumed by lifecycle gating** — band derivation absent |
| sex | partial | column exists; consumers do not use it |
| preferred_language | present | |
| safeguarding_status | missing | no derived projection from DOB; minor-flag relies on ad-hoc checks |

### A.2 Development History
| variable | status | notes |
|---|---|---|
| sport_primary | **missing** | `knowledgeGaps.ts` asks; `profiles.sport` does not exist (RFL-023) |
| sport_secondary[] | missing | |
| years_in_sport | missing | |
| lifting_age_years | **missing** | RFL-023 |
| training_age_years | missing | no projection exists |
| detraining_periods[] | missing | session ledger present; no detection job |
| sport_transitions[] | missing | |
| coaching_changes[] | missing | RR-5 primitive reserved, not yet projected |
| growth_spurts[] | missing | |
| developmental_milestones[] | partial | `roadmap_milestones` table exists, sparse use |

### A.3 Training History
| variable | status | notes |
|---|---|---|
| weekly_availability | **missing** | RFL-023 |
| typical_session_length | missing | |
| training_focus[] | **missing** | RFL-023 |
| training_history_volume_4wk | **dark** | `athlete_load_tracking` populated; not read by Hammer/prescription |
| training_consistency_score | **dark** | `user_consistency_snapshots` populated; not read |
| modality_exposure_map | missing | |

### A.4 Movement History
| variable | status |
|---|---|
| mobility_baseline | missing |
| asymmetry_flags[] | **dark** (`sprint_analyses` captures, no consumer) |
| movement_pattern_competence | missing |
| fascial_chain_state | missing |

### A.5 Performance History
| variable | status |
|---|---|
| performance_sessions raw | present |
| mpi_scores | partial (read by some surfaces, no envelope) |
| recent_form_30d | missing (no decay projection) |
| personal_bests | partial |
| regression_flags[] | missing |

### A.6 Speed Profile — **0% wired** (Audit RFL-025)
| variable | status |
|---|---|
| acceleration_profile | **dark** |
| top_speed_max | **dark** |
| stride_profile | **dark** |
| force_profile | **dark** |
| asymmetry_profile | **dark** |
| start_profile | **dark** |
| adaptation_history | missing |
| readiness_for_max_effort | missing |

### A.7 Strength Profile
| variable | status |
|---|---|
| 1RM estimates | missing |
| training maxes | missing |
| bar-velocity | missing |
| work capacity | partial |
| recovery between sets | missing |

### A.8 Throwing Profile
| variable | status |
|---|---|
| velo | partial (`performance_sessions` subset) |
| command | missing |
| workload | **dark** (`athlete_load_tracking`) |
| arm-care state | **dark** |

### A.9 Hitting Profile
| variable | status |
|---|---|
| bat speed | partial |
| contact quality | missing |
| plate discipline | missing |

### A.10 Recovery Profile
| variable | status |
|---|---|
| sleep | partial (`physio_daily_reports`) |
| HRV | **dark** (`wearable_metrics`) |
| soreness | partial |
| readiness | **dark** (`foundation_fatigue_decisions`) |
| fatigue | **dark** |

### A.11 Equipment Profile — **0%** (Audit)
All four scopes (persistent / session / temporary / conversation-derived) missing. No canonical enum. No precedence resolver.

### A.12 Environment Profile — missing
No venue enum, no weather overlay, no travel overlay, no seasonal availability.

### A.13 Season Profile — missing
Calendar phase, competition density, championship windows: none modeled.

### A.14 Goal Profile — **missing** (RFL-023)

### A.15 Roadmap Profile — partial
`athlete_roadmap_progress`, `roadmap_milestones` exist; projection sparse; not consumed by Hammer.

### A.16 Risk Profile — partial
Injury history table exists; RR-6 doctrine sealed but not wired; no workload_risk projection.

### A.17 Lifecycle Profile — partial
`developmental_stage` primitive constitutionalized (Phase 154); band-from-DOB projection not implemented; gating logic in `developmentalGates.ts` exists but partial.

---

## 2. Tables affected vs. tables required

**Affected (where spine variables already live):**
`profiles`, `asb_events`, `asb_event_lineage`, `athlete_load_tracking`, `sprint_analyses`, `speed_sessions`, `physio_health_profiles`, `physio_daily_reports`, `performance_sessions`, `mpi_scores`, `weakness_scores`, `vault_performance_tests`, `hammer_state_snapshots`, `wearable_metrics`, `foundation_fatigue_decisions`, `user_consistency_snapshots`, `athlete_foundation_state`, `athlete_professional_status`, `roadmap_milestones`, `athlete_roadmap_progress`, `user_injury_progress`, `wellness_milestones`.

**Required additions (constitutional, not yet implemented):**
- `profiles` columns: 9 missing per RFL-023 (or extract to dedicated `hammer_athlete_context` table).
- `equipment_persistent`, `equipment_session`, `equipment_temporary` representation (table or JSONB-on-profile with TTL columns).
- `speed_profile_projection` (derived view or materialization at engine_version pin).
- `training_age_projection`, `lifting_age_projection`.
- `season_phase_projection`.
- `recent_form_30d_projection`.
- `athlete_context_envelope` accessor function (single read returns `{value, confidence, missingness, decay_state, last_authored_at, owner}` per variable).

---

## 3. Hostile disproof attempt

> **Premise:** "We don't need a context spine — the existing `profiles` table plus Hammer's conversational onboarding can drive elite individualization."

Attempt to construct an elite six-week individualized program for an arbitrary user using only `profiles` + the live Hammer context-builder (`src/lib/hammer/context/athleteContext.ts`):

1. **Pull `profiles` row.** Get name, DOB (sometimes), position, throwing/batting hand, grad year, professional status, height, weight. **Cannot recover:** sport (column absent), goal, weekly availability, equipment, lifting/training age, recent training volume, recent form, speed profile, recovery state.
2. **Ask Hammer to ask the gaps.** Athlete answers `goal_summary = "throw harder"`. Hammer attempts to persist. **`profiles.goal_summary` does not exist** — write silently no-ops or errors. Next session: Hammer asks again. (RFL-020 + RFL-023.)
3. **Attempt speed individualization.** `sprint_analyses` has 14 rows for this user. No projection layer exists. The dailyPlan speed module has no read path into this table. **Speed prescription falls back to generic.** (RFL-025.)
4. **Attempt workload-aware throwing.** `athlete_load_tracking` shows ACWR spike. No consumer reads this table. **Throwing prescription is workload-blind.** (RFL-025.)
5. **Attempt equipment fit.** No canonical equipment field exists. Hammer asks every session. Athlete answers "hotel today" — answer dies at end of turn (no temporary-scope persistence).
6. **Attempt six-week plan.** Audit measured six-week capability at 50% structural — sequencing logic exists but consumes no longitudinal state, no decay, no re-evaluation triggers.
7. **Attempt roadmap personalization.** `roadmap_milestones` exists but Hammer's projection layer does not bind to it.

**Result:** Without the spine, the system can produce *plausible* output but cannot produce *individualized* output. Plausibility without individualization is, per the audit, exactly what the 20% measurement reflects. **Hostile premise disproved.**

---

## 4. Cross-references

- RFL-023 — context persistence gap (P0)
- RFL-024 — overall intelligence at 20% (P0)
- RFL-025 — capture/projection gap, dark domain tables (P0)
- RFL-026 — context spine constitutionally undefined prior to this sprint (new)
- RFL-027 — equipment/environment has no canonical enum or scope model (new)
- RFL-028 — longitudinal adaptation rules (decay, re-evaluation triggers) undefined (new)

---

## 5. Next-sprint implementation order (informational; not part of this constitutional sprint)

1. **P0-1** Minimum Context Set persistence (9 columns + GRANTs + RLS + onboarding write path).
2. **P0-2** Equipment scope model (persistent + session + temporary + inferred with precedence).
3. **P0-3** Lifecycle band projection from DOB; wire into `developmentalGates`.
4. **P0-4** Speed Profile projection — first dark table to be lit.
5. **P0-5** Workload + ACWR projection from `athlete_load_tracking`.
6. **P0-6** Context envelope accessor (`{value, confidence, missingness, decay_state, last_authored_at, owner}`).
7. **P1** Recovery/HRV projection, recent_form_30d decay projection, training_age/lifting_age event-sourced projection.
8. **P2** Sport-specific (throwing/hitting) deep projections, asymmetry consumption with RR-6 routing, full Elite tier.
