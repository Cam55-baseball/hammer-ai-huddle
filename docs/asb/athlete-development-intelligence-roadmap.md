# Athlete Development Intelligence Roadmap

**Companion to:** `docs/asb/athlete-development-intelligence-audit.md`
**Date:** 2026-06-06
**Status:** Gap classification only. No solutions designed. No implementation.

> Every item below is a *gap*, not a solution. Solution architecture must
> flow through a separate constitutional sprint. All future implementation
> remains subordinate to Eternal Laws, RR-1…RR-10, RW-1…RW-10, EI-1…EI-10,
> and the relational organism architecture (Megaphase 151–160).

---

## P0 — Required for elite individualized coaching

Without these, no surface (workouts, speed, six-week plans, roadmap,
chat, recommendations) can individualize beyond template branching.

| ID | Gap | Why P0 | Evidence |
|---|---|---|---|
| P0-1 | **Athlete context persistence spine.** Nine columns referenced by `athleteContext.ts:96` and `knowledgeGaps.ts` do not exist in `profiles` — `goal_summary`, `equipment_access`, `weekly_availability`, `lifting_age_years`, `training_focus`, `development_priorities`, `school_grade`, `weight_lbs`, `sport`. | Hammer cannot remember any answer. Every other intelligence depends on this spine. | `information_schema.columns` query 2026-06-06 |
| P0-2 | **Training-age signal model.** Distinct `lifting_age_years`, `sport_age_years`, `time_away_days`, `novice / intermediate / advanced / detrained / returning` classification. | Required to distinguish 14yo novice from 14yo advanced, 23yo elite from 23yo returning. Section C = 20%. | audit §C |
| P0-3 | **Equipment / environment enum + active disclosure path.** Canonical enum across `commercial_gym | home_gym | bands_only | bodyweight_only | field_only | travel | hotel | in_season_facility`. | Equipment adaptation = 0%. Hammer's hitting/defense/strength blocks fall to `awaiting-input` permanently. | audit §D |
| P0-4 | **Speed profile projection.** Per-athlete projection over `sprint_analyses` exposing acceleration curve, top speed, stride profile, asymmetry index, and longitudinal slope to `athleteContext`. | Raw data exists; nothing in prescription reads it. Speed wired = 0%. | audit §E |
| P0-5 | **Workload projection consumed by Hammer.** Project `athlete_load_tracking` (cns_load, fascial_load, volume_load, recovery_debt) into `athleteContext`. | Foundation cron populates the table; no Hammer surface reads it. | `athleteContext.ts` lacks any `athlete_load_tracking` read |
| P0-6 | **Unified injury surface.** Single canonical projection over `physio_health_profiles.injury_history`, `user_injury_progress`, `profiles.injury_history`. | Three competing surfaces; recommendations cannot trust any of them. RR-6 requires athlete-reported pain to outrank inferred readiness — currently impossible to enforce. | audit §A injury rows |
| P0-7 | **Position enum + position-specific prescription dispatch.** Replace free-text `profiles.position` with a sport-scoped enum (P/C/1B/…/UTIL for baseball; P/C/IF/OF/UTIL for softball) and route prescription through a position dispatcher. | `dailyPlan.ts` has one position branch (DH skip). Section G prescription wiring = 10%. | audit §G |
| P0-8 | **Six-week temporal projection.** A canonical replay-safe `program.window.6w` projection carrying season-phase, deload cadence, accumulation/intensification arcs, and event pinning. | `useDayState` is day-level only. Six-week generation impossible. | audit §H |
| P0-9 | **Hammer adaptation event lineage.** Every Hammer recommendation emits a canonical `adaptation_event` with engine_version + reasoning_version + context lineage so it is replay-certifiable per AR-1…AR-10 / RE-1…RE-10. | No Hammer reasoning is currently replay-certifiable as adaptation. | audit §I |

---

## P1 — Major enhancement

These dramatically raise individualization fidelity once P0 is in place.

| ID | Gap | Rationale |
|---|---|---|
| P1-1 | Lifecycle development model (CNS / fascial / strength / skill priorities per stage 0–7, 7–14, 15–22, 23–30, 31–40, 40+). | `developmentalGates.ts` covers gating; no training-priority doctrine exists. |
| P1-2 | Longitudinal progression / regression / plateau detection across per-domain signals (speed, strength, PIE V2, hitting, defense). | Section I = 17%. |
| P1-3 | Softball mechanical model parity with PIE V2 (sport asymmetry). | Currently baseball-only mechanical interpretation. |
| P1-4 | Mobility & movement-restriction capture surface (athlete self-report + screen results). | No column or projection. |
| P1-5 | Season-phase model distinct from `useDayState` — offseason / preseason / inseason / postseason with explicit start/end dates and competition pinning. | `dayType` is day-level day-state, not season-phase. |
| P1-6 | Schedule / availability calendar projection (days available × hours/day × constraints) into `athleteContext`. | `profiles.weekly_availability` is one scalar — insufficient for real scheduling. |
| P1-7 | Cross-session Hammer chat memory (replay-safe load of prior `hammer.chat.message` lineage). | `useHammerChat.ts` loads no history. |
| P1-8 | Defensive-profile projection (drill outcomes × position × difficulty) feeding the `defense` block in `dailyPlan.ts`. | Defense block is a fixed template today. |
| P1-9 | Biological-age proxy signals (growth trajectory, PHV inference for adolescents) — capture only, no diagnosis. | Required for adolescent load ceilings beyond chronological age. Subordinate to RR-6 / RR-8 — never diagnostic. |

---

## P2 — Optimization

Quality-of-life refinements once P0 + P1 are operational.

| ID | Gap | Rationale |
|---|---|---|
| P2-1 | Anthropometry capture (limb proportions, reach, levers) for mechanical interpretation. | Refines PIE V2 / hitting / sprint mechanics. |
| P2-2 | Force-velocity profile capture (jump testing inputs) and `force_profile` projection. | Improves speed and strength individualization. |
| P2-3 | Fascial adaptation doctrine + elastic / SSC quality model. | Fascial completeness = 13%. |
| P2-4 | Barefoot / multi-sport / rotational / locomotion development context flags. | Currently absent; modest individualization gain. |
| P2-5 | Year-over-year arc projection (12-month and multi-year). | Beyond six-week horizon. |
| P2-6 | Recommendation A/B replay-comparison surface for Hammer recommendation evolution audits. | Optimization of recommendation quality over time. |

---

## Out of scope for this audit

- Any solution design, schema draft, migration, or UI change.
- Any modification to `engine_version`, `reasoning_version`, or pinned engine contracts.
- Any change to safeguarding / RR-1…RR-10 / RW-1…RW-10 / EI-1…EI-10 / sealed phases.
- Recruiting, monetization, or commercial considerations — these may never distort athlete development per RW-1.

---

## Subordination

All P0 / P1 / P2 items, when implemented in future sprints, must be:
**additive-only · replay-safe · lineage-complete · survivability-preserving ·
confidence-bound · missingness-preserving · safeguarding-supreme · minor-
supremacy-respecting · interpretive (never authoring `organism_truth`,
`athlete_intent`, `authority_override`, `hard_stop`, `rehabilitation_state`)**.
