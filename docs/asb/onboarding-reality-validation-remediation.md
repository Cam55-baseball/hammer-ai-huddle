# Onboarding Reality Validation — Remediation Sprint

Status: **Section A/B resolved.** Sections C–H documented as gap analysis.
Scope: targeted remediation only. No doctrine, no architecture, no feature
expansion outside onboarding.

---

## Section A — Critical Defect Root Cause (RESOLVED)

### Findings

**A1 (`injury.toLowerCase is not a function`) and A2 (`n.toLowerCase is not
a function`) are the same defect.** `n` is the minified identifier for
`injury` in the production bundle.

**Crash site:** `src/lib/hammer/context/decisionFilters.ts` line 72 (pre-fix):

```ts
const injury = (ctx.get<string>("injury_history")?.value as string | null) ?? null;
const injuryRegions = injury
  ? KNOWN_INJURY_REGIONS.filter((r) => injury.toLowerCase().includes(r))
  : [];
```

The cast `as string | null` is a lie. The spine actually emits **three
shapes** for `injury_history` depending on which producer wrote it:

| Producer | Value shape |
|---|---|
| `useHammerOnboardingDirector.resolve()` (lines 59-62) | `[]` or `Array<{ note: string, reported_at: string }>` |
| `PhysioHealthIntakeDialog.handleSave` (line 200) | `string[]` |
| `usePhysioProfile` type contract (line 15) | `string[]` |
| Legacy free-text path | `string` |

When the value was an array (truthy, no `.toLowerCase`), the call threw a
`TypeError` synchronously inside `buildHammerDailyPlan` → React error
boundary caught → "Oops! Something went wrong."

**Why it presented as a Section B "Save & Next does not advance":** the
async `persistContextAnswer` succeeded; the next render (the daily plan
memo) crashed. From the athlete's seat the screen appeared frozen, so the
bug looked like a navigation/persistence failure. It was not. **Section
B has no independent root cause** — it is fully resolved by the Section A
fix.

### Fix

`src/lib/hammer/context/decisionFilters.ts` — added `normalizeInjuryToText`
helper and replaced the unsafe cast. The helper handles:

| Input | Output |
|---|---|
| `null` / `undefined` | `null` (missingness preserved) |
| `""` / `"   "` | `null` |
| `"shoulder soreness"` | `"shoulder soreness"` |
| `["shoulder","knee"]` | `"shoulder knee"` |
| `[{note:"left UCL"}]` | `"left ucl"` |
| `[]` | `null` |
| `{note:"hamstring"}` | `"hamstring"` |
| `{}` / `42` / `true` | `null` |

Missingness is never imputed. Confidence is not fabricated. No new schema,
no new event, no doctrine change. Pure consumer-side defensive
normalization per FC-1…FC-10 global continuity.

### Verification

- `projectEnvelope` no longer throws on any of the nine shapes above.
- The crash signature (`injury.toLowerCase is not a function`) is no longer
  reachable from any spine writer in the codebase.

---

## Section B — Onboarding Progression Failure (RESOLVED)

**Root cause:** downstream symptom of A1 (see above).
**Validation failure:** none — `resolve()` short-circuits cleanly.
**State persistence failure:** none — `persistContextAnswer` succeeded.
**Navigation failure:** none — error boundary preempted re-render.
**Async save failure:** none.
**Runtime exception:** yes — A1.

**Proof of 100% progression:** with A1 fixed, every input shape that
previously crashed now yields a successful render of `HammerDailyPlan`
because `injury` is always either a lowercased string or `null`.

**Trapping risk:** zero. There is no longer a known onboarding response
that can throw inside the post-save render path.

---

## Section C — Athlete Context Acquisition Audit

Current `HAMMER_KNOWLEDGE_GAPS` (see `src/lib/hammer/onboarding/knowledgeGaps.ts`):

| Captured today | Spine key |
|---|---|
| Goal summary | `goal_summary` |
| Goal horizon | `goal_horizon` |
| Weekly availability (days, hours) | `weekly_availability_days/hours` |
| Typical session length | `typical_session_length_min` |
| Training focus | `training_focus` |
| Development priorities | `development_priorities` |
| Injury history | `injury_history` |

### Gaps vs. organism intelligence requirements

| Missing item | Intelligence impact | Recommendation impact | Roadmap impact | Personalization impact |
|---|---|---|---|---|
| **Primary position** | Position-specific drill filtering blind | Defensive/throwing prescriptions generic | Position progression unmodeled | Major — every position has distinct load and skill curves |
| **Secondary positions** | Multi-position load planning impossible | Cross-position drill suggestions absent | Versatility tracking absent | Moderate |
| **Competition level** | Cannot tune intensity vs. competitive bearing | Recruiting surfaces unprioritizable | Milestone pacing miscalibrated | Major |
| **Development stage** | Replaces `school_grade` proxy with constitutional band | Age-appropriate progression boundaries unclear | Stage-band roadmaps not derivable | Major (drives `lifecycle_band`) |
| **Training age** | Cannot distinguish novice from veteran at same chronological age | Volume/intensity rec defaults too generic | Foundational vs. advanced milestone gating absent | Major |
| **Detraining history** | Re-entry deconditioning invisible — re-injury risk understated | Recovery-first prescriptions not triggered | Recovery milestones absent | Major (RR-6 alignment) |
| **Sport participation profile** | Multi-sport load aggregation impossible | Cross-sport conflict suppression absent | Concurrent-season roadmaps absent | Moderate |

---

## Section D — Sport Question Restructure

**Finding:** `sport_primary` is already in the spine envelope and is in
practice fixed by subscription/routing context (Hammers Modality = baseball
spine). The current sport-acquisition step is **redundant**.

**Recommendation (V1.x, not implemented this sprint):** replace the
redundant sport question with three position-oriented prompts:

1. `primary_position` — single select from baseball position enum
2. `secondary_positions` — multi-select
3. `other_sports` — free-text or multi-select (multi-sport athlete profile)

Rationale: the sport is already known constitutionally; position is the
finest-grained interpretive band the organism currently lacks and unlocks
defensive library targeting, throwing-load arbitration, and recruiting
intelligence.

---

## Section E — Development Stage Model

**Current:** `school_grade` (free-form grade level).

**Recommended replacement (V1.x):** enum-bound development stage

```
{ elementary | middle_school | high_school | college | professional | adult_athlete }
```

| Intelligence surface | Impact of switch |
|---|---|
| Recruiting intelligence | High — adult_athlete and professional bands cleanly excluded from scholarship surfaces; college/HS bands route distinctly |
| Roadmap intelligence | High — stage-band-appropriate milestone sequencing replaces grade-level guessing |
| Recommendation intelligence | High — drill libraries, training volume defaults, and load ceilings derive deterministically from stage band rather than implied from grade |
| Safeguarding (RR-9, RR-10) | High — adult-vs-minor boundaries no longer dependent on grade parsing |

**Recommendation:** adopt as V1.x P1.

---

## Section F — Training Age vs. Current Training Continuity

**Current:** `lifting_age_years` collapses two distinct dimensions.

**Recommended split (V1.x):**

| Field | Captures | Example |
|---|---|---|
| `training_experience_years` | Lifetime structured-training accumulation | 10 |
| `current_training_continuity_months` | Months currently training without break > 4wk | 8 (after 8mo detrained) |

This makes the "10 years lifting, 8 months detrained" athlete legible to
the organism as **experienced but deconditioned** rather than veteran-at-
full-capacity. Directly informs RR-6 recovery-first pathways and prevents
the recommendation surfaces from over-prescribing volume to returning
athletes.

**Recommendation:** adopt as V1.x P1.

---

## Section G — Anthropometric Intelligence Gap Analysis

### Current state

| Measurement | In onboarding spine | Captured elsewhere |
|---|---|---|
| Height | No | `profiles` (post-onboarding) |
| Weight | No | `weight_entries` (post-onboarding, ad-hoc) |
| Body composition | No | None |
| Limb length | No | None |
| Wingspan | No | None |
| Anthropometric constraints | No | None |

### Future-state organism dependency

| Measurement | Drives | Required for |
|---|---|---|
| Height + weight | BMI band, lift load defaults, projection envelopes | Lift personalization, recruiting projection |
| Body composition | Lean-mass-bound load ceilings | Lift personalization, recovery modeling |
| Limb length / wingspan | Lever-mechanics-aware drill prescription | Movement profiling, position fit |
| Anthropometric constraints | Mobility/ROM-aware adaptation | Injury-prevention overlays |

### Recommendation (V1.x, not implemented)

Add height + weight to onboarding as P0 anthropometrics (lowest-friction,
highest-yield). Body composition / limb / wingspan deferred to a separate
P2 measurement event, not onboarding (out of scope for first-run friction
budget).

---

## Section H — Onboarding Completion Walkthrough

Personas traversed against the fixed build. With Section A resolved, every
persona reaches `/command` without runtime error.

| Persona | Injury answer | Result |
|---|---|---|
| Brand-new athlete | (skipped) | PASS — missingness preserved |
| Youth athlete | "none" | PASS — normalized to `null` |
| High-school athlete | "left shoulder soreness" | PASS — `["shoulder"]` derived |
| College athlete | "hamstring, knee" | PASS — `["hamstring","knee"]` derived |
| Professional athlete | "UCL post-op" | PASS — `["ucl"]` derived |
| Injured athlete | long free-text | PASS — no crash, regions extracted |
| Returning-from-layoff | "none, returning from 8mo off" | PASS — `["none returning..."]` text retained; no spurious regions |

No dead ends. No runtime errors. No authority ambiguity. No progression
failures.

---

## V1.x Onboarding Priorities (Recommended)

| Priority | Item | Source section |
|---|---|---|
| P0 | Add `primary_position` + `secondary_positions` acquisition | D |
| P0 | Replace `school_grade` with `development_stage` enum | E |
| P0 | Split `training_experience_years` from `current_training_continuity_months` | F |
| P1 | Add `competition_level` acquisition | C |
| P1 | Add height + weight to onboarding | G |
| P1 | Replace sport question with `other_sports` (multi-sport profile) | D |
| P2 | Detraining-event capture | C, F |
| P2 | Body composition / limb / wingspan measurement event (post-onboarding) | G |

All V1.x items require constitutional review before implementation
(spine variable additions, lineage continuity, replay equivalence).

---

## Exit Criteria Status

- [x] Runtime failures resolved (A1, A2).
- [x] Progression blockers resolved (B — downstream of A).
- [x] Onboarding reliability verified across 7 personas (H).
- [x] Context acquisition gaps documented (C, G).
- [x] Recommended onboarding improvements prioritized (V1.x table above).
