
# Phase 2A Amendment — FINAL (Ratification-Ready)

Integrates the 6 constitutional clarifications into the longitudinal layer. No code, no migrations, no UI — discovery and canonical ownership only. On approval, the amendment + clarifications save to memory and become enforceable on every future plan.

Laws check: 1, 2, 3, 4, 5, 7, 8, 9, 10.
Canonical owner: Architecture / Phase 2A Canonical Organism Map.
Longitudinal impact: defines the time-scale, quality, economy, and survivability layer for every future engine.

---

## Section A — The 6 Clarifications (constitutional, not feature creep)

### C1. Output Quality ≠ Output Magnitude
The Longitudinal Capacity Engine (LCE) must split every output event into **magnitude** AND **quality**. Preserved magnitude with decaying quality is a **silent degradation**, not retention.

Required conceptual signals (owned by LCE, published on the State Bus):
- `output_quality_index`
- `sequencing_quality`
- `timing_quality`
- `coordination_efficiency`
- `elastic_expression_quality`
- `deceleration_quality`

Consumers (mandatory): degradation slope, silent-degradation detector, adaptation-saturation detector, cost-per-output interpretation, Selector bias, Pre-Injury Layer.

Rule: **No retention claim may be made on magnitude alone.** Quality decay with preserved magnitude triggers a Pre-Injury "compensation pattern" warning, not a green check.

### C2. Recovery Capacity Is Trainable
Recovery is modeled as a **capacity that adapts**, not just depletion.

New canonical concept: `recovery_capacity_curve` (per-system, per-athlete, slope + freshness + confidence).

The engine must distinguish three states and never collapse them:
- **Overloaded** — debt > capacity, withdrawal required.
- **Under-adapted** — capacity stagnant despite stimulus, progressive challenge required.
- **Becoming more resilient** — capacity slope rising, ceiling may be raised by TPE.

Without this, the system drifts overly conservative long-term and violates Law 10 by withholding the very stimulus that builds durability.

### C3. Competitive Stress Is Not Only Physical
Competitive Density Modeling expands beyond games/travel/density buckets to include psychological load.

New conceptual topic: `competitive_psychological_density`, composed of (lightweight, confidence-scored — Law 3):
- Pressure (playoff, showcase, recruiting, spotlight).
- Emotional volatility, expectation load, failure accumulation.
- Travel isolation, social exhaustion, adrenaline-dump cycles.

Affects: coordination sharpness, timing precision, NS variability, recovery speed, movement efficiency. Mandatory inputs for: pitchers, catchers, two-way athletes, top prospects, youth in showcase ecosystems.

Must remain low-burden to collect (probe budget honored, Law 5) and confidence-scored when absent.

### C4. Elastic Economics As First-Class Infrastructure
Elastic retention is currently mentioned. It is now **promoted to canonical organism infrastructure**.

New conceptual signal: `elastic_economy_index`, composed of:
- Spring efficiency, stiffness modulation efficiency.
- Elastic-leak detection, tendon contribution retention.
- Fascial recoil efficiency, ground-contact economy, force-transfer economy.

Hidden-pathway rule the engine MUST detect: athlete preserves output by becoming **more muscular and less elastic**. This is a primary baseball/softball degradation pathway and must trigger a Pre-Injury Layer warning even when raw output is intact.

Owned by: LCE. Consumed by: Selector (bias toward elastic preservation), Scheduler (insert decompression), Pre-Injury Layer.

### C5. Developmental Protection Against Early Specialization
The Developmental Age Layer + Tolerance Progression Engine (TPE) gain an explicit guardrail.

New conceptual signal: `developmental_diversity_score`. The engine must actively protect, especially in youth:
- Movement diversity, exploratory athleticism.
- Coordination richness, elastic variability.

And actively prevent:
- Premature rotational over-specialization.
- Premature throwing density, showcase density, velocity chasing.
- Bilateral asymmetry fixation, year-round competition load.

Hard rule: **The engine MUST NOT optimize youth athletes solely for near-term sport output.** TPE ceilings for youth are gated on diversity preservation, not just output progression.

### C6. Organism Success = Career Survivability
Law 10 is **expanded** in scope (not rewritten):

> Success = elite output preserved across the season **and across the career** at the lowest biological cost, without silently borrowing from future seasons.

New conceptual metric: `career_resilience_projection` — a rolling, confidence-scored sustainability estimate (NOT predictive destiny). Optimizes for:
- Reduced chronic degradation, preserved movement variability.
- Preserved elasticity into later years.
- Reduced accumulated asymmetry burden.
- Sustained explosiveness + rotational efficiency longevity.

Hard rule: **Any prescription that improves short-term output while degrading career_resilience_projection beyond a confidence-bounded threshold must be flagged and require Owner Authority override.**

---

## Section B — Final Constraint: Interpretability Mandate

The LCE and every signal in Section A must remain:
- Interpretable, explainable, confidence-scored, auditable, overrideable via Owner Authority.

Forbidden: black-box "fatigue oracle" outputs. Every warning, withdrawal, and ceiling change must expose:
1. Inputs consumed, 2. Confidence per input, 3. Reason chain, 4. Uncertainty, 5. Override path.

Enforces Laws 3, 7, 8, 10. Any LCE feature that cannot expose these is an unshippable bug.

---

## Section C — Contracts (additions to Section 13 of the prior amendment)

- `OutputQualityContract` — magnitude + quality vector + confidence per output event.
- `RecoveryCapacityContract` — per-system capacity slope, state classification (overloaded / under-adapted / adapting), confidence.
- `PsychologicalDensityContract` — pressure/volatility/isolation buckets + freshness + confidence.
- `ElasticEconomyContract` — spring/stiffness/leak/recoil/ground-contact/transfer indices + slope + confidence.
- `DevelopmentalDiversityContract` — diversity score + protected-band flags + age-layer binding.
- `CareerResilienceContract` — rolling projection + contributing slopes + confidence + override log.

All extend the `data_contract` requirement (Law 2). All carry freshness + coverage + confidence + explanation candidate (Law 3 reinforcement).

---

## Section D — Amended Expansion Order

```text
Step 1    State Bus contract
Step 2    Prediction-record + engine-version path
Step 3    AIInputContract envelope
Step 4    Per-system Load/Debt service
Step 4a   Biological Cost Engine
Step 4b   Competitive Density (physical)
Step 4c   Competitive Psychological Density            ← C3
Step 5    Readiness v2
Step 5a   Longitudinal Capacity Engine + retention curves
Step 5b   Output Quality vector (magnitude vs quality) ← C1
Step 5c   Recovery Capacity Curve (trainable model)    ← C2
Step 5d   Elastic Economy Index                        ← C4
Step 6    Speed signal on bus + consumers
Step 6a   Bilateral Dominance + asymmetry-creep loop
Step 7    Exercise ontology
Step 7a   Position-Specific Tolerance Profiles
Step 7b   Developmental Age Layer + TPE
Step 7c   Developmental Diversity guardrail            ← C5
Step 8    Single Exercise Selector (respects TPE + diversity + elastic bias)
Step 9    Subjective Probe + Notification Bus + friction budget
Step 9a   Dual-Load Athlete conflict resolver
Step 10   Drift Sentinel + audits
Step 10a  Long-Horizon Warning Systems (pre-injury)
Step 11   Organism Success Metrics view + UI reframing
Step 11a  Career Resilience Projection surface         ← C6

Only AFTER Step 11a: premium fascia content, sprint expansions,
morphology-aware selection, force-strategy moving signature.
```

---

## Section E — Plan Gate Updates (enforcement)

Every future plan must include three lines (was two):
1. **Laws check** — which of the 10 laws apply.
2. **Canonical owner** — which Section-1 owner is touched (no orphan writes).
3. **Longitudinal impact** — effect on LCE / quality / recovery capacity / elastic economy / diversity / career resilience, or `none (justified)`.

Plans missing any of the three are rejected at review.

---

## Section F — What This Amendment Does NOT Do

- No code, no migrations, no tables, no edge functions, no UI.
- No exercise content, no engine changes (HIE, MPI, Hammer, physio continue under Phase 9).
- Does not relitigate Phase 2A or the prior amendment — only locks the 6 clarifications into the same canonical layer.

---

## On Approval

1. Save canonical map (Phase 2A + prior amendment + this final amendment) to `mem://architecture/canonical-organism-map`.
2. Save longitudinal layer (with C1–C6) to `mem://architecture/longitudinal-capacity-engine`.
3. Save the interpretability mandate (Section B) to `mem://architecture/lce-interpretability-mandate`.
4. Update `mem://index.md` Core with: *"Every plan must include Laws check + Canonical owner + Longitudinal impact lines."*
5. Phase 2B (State Bus contract, Step 1) becomes the next implementation-ready phase, sized from day one to carry: load/debt, biological cost, physical + psychological density, retention curves, output quality, recovery capacity, elastic economy, bilateral, diversity, career resilience.

**Decision requested:** ratify the final amendment (Section A clarifications + Section B mandate + Section C contracts + Section D order + Section E gate) as the locked Phase 2A canonical organism map.
