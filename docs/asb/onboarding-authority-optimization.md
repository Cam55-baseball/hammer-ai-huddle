# Onboarding Authority & Context Acquisition Optimization

**Sprint:** Hammers Modality — Onboarding Authority & Context Acquisition Optimization
**Date:** 2026-06-07
**Scope:** Documentation only. No code, schema, doctrine, event-fabric, spine, or UI mutation.
**Builds on:** `onboarding-reality-validation-remediation.md` (RFL-051…RFL-060).
**Status:** Ratified — canonical reference for all future onboarding-expansion proposals.

---

## Purpose

This sprint does **not** add or remove onboarding questions. It produces a
canonical **authority-classification model** that governs which context
Hammer must acquire before activation, which can be deferred, which can be
inferred, and which must never block activation.

The model exists to protect two competing pressures:

1. **Activation** — every additional onboarding question is a completion-risk tax.
2. **Personalization authority** — Hammer cannot deliver organism-level prescription without minimum constitutional context.

Section H establishes the governance rule: no onboarding expansion may
occur without demonstrated authority value for a named consumer.

---

## Section A — Context Inventory

### A.1 Currently collected (live)

Sources: `src/lib/hammer/onboarding/knowledgeGaps.ts` (`HAMMER_KNOWLEDGE_GAPS`),
`src/lib/relational/copy.ts` (`ONBOARDING_VOICE.steps`),
`src/pages/OnboardingFlow.tsx` (DOB → `relational.developmental.age_observed`,
life-context check-in, sharing scope).

| Field | Acquisition point | Authority class | Consumer dependency | Classification |
|---|---|---|---|---|
| `date_of_birth` | OnboardingFlow (`profiles.date_of_birth`) | Organism truth (drives `is_minor`, safeguarding routing) | Safeguarding gate, RR-6 routing, parent-link authorization | **Required Before First Daily Plan** |
| `sport_primary` | Hammer chat (priority 5) | Organism truth (spine) | Discipline routing, drill library, recommendation surface | **Required Before First Daily Plan** |
| `goal_summary` | Hammer chat (priority 10) | Interpretive seasoning | Roadmap framing, recommendation tone | **Required Before First Roadmap** |
| `season_phase` | Hammer chat (priority 20) | Interpretive | Workload phasing, daily plan tone | **Required Before First Daily Plan** (defaultable) |
| `school_grade` | Hammer chat (priority 35) | Interpretive proxy for development stage | Roadmap projection, age-band defaults | **Post-Onboarding** (deprecate per RFL-054) |
| `lifting_age_years` | Hammer chat (priority 60) | Interpretive | Workload calibration, progression rate | **Required Before First Recommendation** (split per RFL-055) |
| `weekly_availability_days` | Hammer chat (priority 70) | Organism truth (capacity) | Daily plan slot count, weekly load | **Required Before First Daily Plan** |
| `weekly_availability_hours` | Hammer chat (priority 71) | Organism truth (capacity) | Per-session duration | **Required Before First Daily Plan** |
| `training_focus` | Hammer chat (priority 80) | Interpretive | Recommendation prioritization | **Required Before First Recommendation** |
| `development_priorities` | Hammer chat (priority 90) | Interpretive | Roadmap branching | **Required Before First Roadmap** |
| `injury_history` | Hammer chat (priority 100) | Organism truth (RR-6) | Workload safety floor, RR-6 routing | **Required Before First Daily Plan** |
| Life-context check-in | OnboardingFlow (optional) | Interpretive (RR-8) | Adaptation tone | **Can Be Collected Post-Onboarding** |
| Sharing scope | OnboardingFlow | Authority (visibility) | Visibility scope routing | **Required Before First Daily Plan** |

### A.2 Candidate fields from RFL-053…RFL-060

| RFL | Field | Authority class | Consumer | Recommended classification |
|---|---|---|---|---|
| RFL-053 | `primary_position` | Organism truth | Position-specific drill library, recommendation surface, workload (catcher vs OF) | **Required Before First Daily Plan** (Tier 1) |
| RFL-053 | `secondary_positions` | Interpretive | Roadmap secondary path | **Required Before First Roadmap** (Tier 2) |
| RFL-054 | `development_stage` enum | Organism truth (constitutional) | Age-band recommendation legality, workload ceilings, RR-6 youth protections | **Required Before First Daily Plan** (Tier 1; replaces `school_grade`) |
| RFL-055 | `training_experience_years` (split from lifting_age) | Interpretive | Progression rate calibration | **Required Before First Recommendation** (Tier 2) |
| RFL-055 | `current_training_continuity_months` | Organism truth (detraining signal) | Workload start-point, deload necessity | **Required Before First Daily Plan** (Tier 1, lightweight) |
| RFL-056 | `competition_level` enum | Interpretive | Recommendation intensity ceiling, ranking surface | **Required Before First Recommendation** (Tier 2; defaultable from development_stage) |
| RFL-057 | `height_cm`, `weight_kg` | Organism truth (anthropometric) | Load calibration, body-comp baseline | **Can Be Collected Post-Onboarding** (Tier 2) |
| RFL-058 | `other_sports[]` profile | Interpretive | Cross-training load attribution | **Can Be Inferred** (Tier 3, longitudinal) |
| RFL-059 | Detraining event capture | Organism truth (longitudinal) | Continuity adaptation | **Can Be Inferred** (Tier 3, longitudinal observation supersedes self-report) |
| RFL-060 | Wingspan, limb lengths, body composition | Organism truth (advanced anthropometric) | Advanced biomechanics, scout grade | **Can Be Collected Post-Onboarding** (Tier 4, trust-gated) |

### A.3 Classification buckets (summary)

- **Required Before First Daily Plan:** DOB, sport_primary, primary_position (proposed), development_stage (proposed, replaces school_grade), current_training_continuity (proposed, lightweight signal), season_phase (defaultable), weekly_availability_days, weekly_availability_hours, injury_history, sharing scope.
- **Required Before First Recommendation:** goal_summary, training_focus, training_experience_years, competition_level (defaultable).
- **Required Before First Roadmap:** development_priorities, secondary_positions.
- **Can Be Collected Post-Onboarding:** height_cm, weight_kg, life-context disclosure, wingspan, limb lengths, body composition.
- **Can Be Inferred:** detraining events (from observed gaps), other_sports load (from session pattern), competition_level (from development_stage + age).

---

## Section B — Position Authority

### Evaluation

| Dimension | `primary_position` | `secondary_positions` |
|---|---|---|
| Recommendation dependency | **High** — drill library, throwing volume, defensive scenario routing all branch on position | Low — secondary path used for roadmap variation only |
| Workload dependency | **High** — catcher / pitcher / position-player workload ceilings diverge by 30–60% | Low — secondary appearance is sparse |
| Roadmap dependency | **High** — position-specific progression arcs (pitcher arm care, catcher squat tolerance, OF speed) | Medium — informs alternate roadmap branches |

### Classification

| Field | Class | Justification |
|---|---|---|
| `primary_position` | **Required** (Tier 1) | First daily plan and first recommendation degrade meaningfully without it; cannot be safely inferred from sport alone |
| `secondary_positions` | **Deferred** (Tier 2) | First-week acquisition acceptable; not required for safe first prescription |
| Position confidence over time | **Inferable** | Longitudinal session pattern refines primary/secondary attribution; spine remains authoritative |

### Acquisition recommendation

Add `primary_position` as a Tier 1 select question (single tap) during onboarding chat at priority < `weekly_availability_days`. Defer `secondary_positions` to first-week chat prompt.

---

## Section C — Competition Level Authority

### Evaluation

Levels: `recreational | travel | high_school | varsity | college | professional`.

| Question | Answer |
|---|---|
| Does first daily plan require it? | No — workload ceiling can be safely derived from `development_stage + injury_history` |
| Does first recommendation require it? | Useful but not required — recommendation intensity can default to the more conservative envelope |
| Does first roadmap require it? | Useful — roadmap horizon and intensity ceiling benefit from it |
| Can it be inferred? | Partially — `development_stage + age + training_experience_years` gives a reasonable prior; explicit answer always supersedes |
| Activation cost | Medium — one select question, but adds branching complexity |

### Classification

**Deferred** (Tier 2). Inferable from `development_stage + age` with conservative default; explicit acquisition during first-week chat. Never blocks activation. Constitutional precedence: athlete self-report always supersedes inferred level.

---

## Section D — Training History Authority

### Evaluation

| Field | First-prescription value | Cost | Inferability |
|---|---|---|---|
| **Current training continuity** (months currently training without break ≥ 4 weeks) | **Highest** — directly drives whether to start with deload or full prescription | Low — single number / select | Cannot be inferred at activation (no prior signal) |
| Training age (total years of structured training) | Medium — progression rate calibration | Low — single number | Partially inferable from age + development_stage |
| Detraining history (prior layoffs) | Low at activation — high longitudinally | High self-report cost | **Strongly inferable** — observed session gaps are more accurate than self-report |

### Minimum viable acquisition model

**Tier 1 (activation):** `current_training_continuity_months` — one number, highest authority-per-question ratio. Drives the safety-critical "do we deload first?" decision.

**Tier 2 (first week):** `training_experience_years` — calibrates progression rate.

**Tier 3 (longitudinal):** detraining history — observed, not self-reported. The system's session ledger is a more reliable source than athlete recall.

This model resolves RFL-055 (`lifting_age_years` conflation) by splitting the field into the two authoritative signals.

---

## Section E — Anthropometric Authority

### Review

| Measurement | First-prescription required? | Useful? | Trust-gating? |
|---|---|---|---|
| Height | No | Yes — load scaling, body-mass index estimation | Tier 2 — first-week ask, low friction |
| Weight | No | Yes — load calibration, hydration baseline | Tier 2 — first-week ask, low friction |
| Wingspan | No | Yes — biomechanics, position fit | **Tier 4** — trust-gated; requires measurement tape, perceived intrusion |
| Limb lengths (femur, tibia, humerus) | No | Yes — squat/deadlift positioning, throwing mechanics | **Tier 4** — trust-gated; measurement burden |
| Body composition | No | Yes — long-horizon development | **Tier 4** — trust-gated; requires device or estimation tool |

### Classification

- **Required for first prescription:** **None.** No anthropometric field blocks activation under any condition.
- **Useful (Tier 2):** Height, weight — first-week acquisition via opt-in prompt.
- **Trust-gated (Tier 4):** Wingspan, limb lengths, body composition — surfaced only after sustained engagement (≥ 14 days active, ≥ 5 sessions logged). Opt-in only. Missingness preserved indefinitely.

**Doctrinal rule:** Anthropometrics never block activation. Missingness is acceptable across all tiers.

---

## Section F — Onboarding Length Audit

### Current state

| Surface | Items | Estimated time-on-task |
|---|---|---|
| `OnboardingFlow.STEPS` | 5 steps (welcome, checkin, life_context, scope, ready) | ~60–90s |
| `HAMMER_KNOWLEDGE_GAPS` (sequential chat) | 10 questions | ~150–240s if fully completed in one sitting |
| DOB capture (profile) | 1 field | ~10s |
| **Total worst-case** | ~16 interactions | **~4–6 minutes** |

Each Hammer chat gap is skippable, so practical completion is lower — but every additional Tier 1 gap raises the floor for safe activation.

### Marginal cost of RFL candidate additions

| Candidate | Format | Estimated added time | Activation-risk delta |
|---|---|---|---|
| `primary_position` | Select (1 tap) | +5–10s | Negligible — single tap, sport-anchored |
| `development_stage` enum (replaces `school_grade`) | Select (1 tap) | +0s (replacement) | Negative (clearer prompt, faster) |
| `current_training_continuity_months` | Number | +10–15s | Low |
| `training_experience_years` (split, Tier 2) | — | +0s at activation | None |
| `competition_level` (Tier 2) | — | +0s at activation | None |
| `height_cm`, `weight_kg` (Tier 2) | — | +0s at activation | None |
| `secondary_positions` (Tier 2) | — | +0s at activation | None |

### Activation risk ceiling

Empirical onboarding literature places completion fall-off acceleration at roughly 7–9 minutes of total interaction. Current worst-case (~6 min) is already near the upper band.

**Ceiling rule:** Tier 1 acquisition surface must add **no more than +30 seconds** of estimated time-on-task. The Tier 1 proposals in this document fit within that envelope (+15–25s total). Any future Tier 1 addition that exceeds the envelope must demote an existing Tier 1 field to Tier 2 first.

---

## Section G — Recommended Acquisition Strategy

### Tier 1 — Required before activation

Minimum constitutional context for safe first prescription.

| Field | Already collected? | Consumer unlocked | Authority justification |
|---|---|---|---|
| `date_of_birth` | Yes (profile) | Safeguarding, RR-6, parent-link | Drives `is_minor` — protection-first |
| `sport_primary` | Yes | Discipline routing | Spine root |
| `primary_position` (RFL-053) | **No — add** | Position-specific drills, workload ceiling | High recommendation + workload dependency |
| `development_stage` enum (RFL-054) | **No — replace `school_grade`** | Age-band workload ceiling, RR-6 youth gate | Constitutional spine alignment |
| `current_training_continuity_months` (RFL-055 split) | **No — add as lightweight signal** | Deload-vs-full-prescription decision | Highest authority-per-question ratio |
| `season_phase` | Yes (defaultable) | Daily plan phasing | Workload phasing |
| `weekly_availability_days` | Yes | Daily plan slot count | Capacity |
| `weekly_availability_hours` | Yes | Per-session duration | Capacity |
| `injury_history` | Yes | Workload safety floor, RR-6 | Organism truth, RR-6 supremacy |
| Sharing scope | Yes | Visibility routing | Authority |

### Tier 2 — First-week acquisition

Acquired via in-app prompts during the first 7 days of active use. Never blocks activation. Refines personalization.

| Field | Consumer unlocked | Acquisition surface |
|---|---|---|
| `secondary_positions` (RFL-053) | Roadmap secondary path | Chat prompt day 2–3 |
| `competition_level` (RFL-056) | Recommendation intensity ceiling | Chat prompt day 1–3 |
| `training_experience_years` (RFL-055 split) | Progression rate calibration | Chat prompt day 1 |
| `height_cm`, `weight_kg` (RFL-057) | Load scaling | Profile prompt day 3–7 |
| `goal_summary` refinement | Roadmap framing | Chat prompt day 5–7 |

### Tier 3 — Longitudinal acquisition

Acquired by observation over time. Self-report supplementary, never primary.

| Field | Consumer unlocked | Acquisition surface |
|---|---|---|
| Detraining events (RFL-059) | Continuity adaptation | Observed session-gap ledger |
| `other_sports[]` load attribution (RFL-058) | Cross-training load attribution | Observed session pattern + opt-in disclosure |
| Training continuity refinement | Long-horizon workload | Rolling 90-day session ledger |
| Confidence calibration on initial answers | All Tier 1 consumers | Replay-derived reconciliation |

### Tier 4 — Advanced organism profiling

Trust-gated, opt-in, surfaced only after sustained engagement. Permanent missingness is acceptable.

| Field | Consumer unlocked | Acquisition surface |
|---|---|---|
| Wingspan (RFL-060) | Advanced biomechanics, scout grade | Opt-in profile section after ≥14 days active |
| Limb lengths (RFL-060) | Squat/throwing mechanics | Opt-in profile section + measurement guide |
| Body composition (RFL-060) | Long-horizon development | Opt-in profile section + device integration |

---

## Section H — Governance Rule

**Canonical rule:** No onboarding expansion may occur without all four of the following, documented in the proposing RFL:

1. **Demonstrated authority value** — a named downstream consumer (daily plan, recommendation, roadmap, safeguarding, visibility) that materially degrades without the field. "Nice to know" is not authority value.
2. **Tier classification** — explicit assignment to Tier 1 / 2 / 3 / 4 with justification per the criteria in Sections A–G.
3. **Activation-cost estimate** — estimated time-on-task added (Tier 1 only) measured against the Section F ceiling rule (+30s total cap for Tier 1 additions; demote existing Tier 1 first if exceeded).
4. **RFL link** — every proposed field traces back to a documented reality-validation signal in `reality-feedback-ledger.md`.

Proposals failing any of the four are rejected at the planning stage. This rule is referenced by future onboarding-expansion sprints and is the canonical authority for accepting or deferring any new field.

### Subordination

This document is interpretive governance. It does not author organism
truth, does not mutate the Athlete Context Spine, does not introduce new
ASB topics, and does not modify any runtime code. All classifications
remain subject to constitutional precedence — safeguarding (RR-6),
visibility (RR-9), parent authorization for minors (RR-10), and replay
legality always supersede acquisition-strategy preferences.

---

## Cross-references

- `docs/asb/onboarding-reality-validation-remediation.md` — RFL-051…RFL-060 source.
- `docs/asb/reality-feedback-ledger.md` — RFL ledger and prioritization.
- `docs/asb/athlete-context-spine-constitution.md` — canonical spine.
- `docs/asb/onboarding-production-audit.md` — current onboarding shape.
- `src/lib/hammer/onboarding/knowledgeGaps.ts` — current acquisition registry (read-only reference; not modified in this sprint).

## Exit criteria

- [x] Canonical onboarding context model exists (Sections A + G).
- [x] Governance rule against unjustified expansion established (Section H).
- [x] Activation protected — Tier 1 ceiling rule defined (Section F).
- [x] Personalization capability roadmap defined (Tiers 2–4).
- [x] No runtime artifacts modified.
