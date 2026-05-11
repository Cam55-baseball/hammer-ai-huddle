
# Phase 2A Amendment — Long-Horizon Competitive Tolerance Architecture

**Laws check:** 1 (One Organism), 2 (No Unused Data), 3 (Missingness), 4 (Speed = NS Infra), 7 (Engine Becomes More Elite), 9 (Closed Loop), 10 (Long-Season Durability — *primary*).
**Canonical owner check:** every system below is added to the Phase 2A organism map, not bolted on. No code, no migrations, no tables created in this phase.

This amendment fixes the structural bias of the Phase 2A map: it was organized around **short-horizon state** (today's readiness, today's prescription). Baseball/softball are **long-horizon degradation-management sports**. The canonical map must include a **Longitudinal Capacity layer** that owns multi-week, multi-month, multi-year retention of elite output at lowest biological cost.

---

## 1. Longitudinal Capacity Engine (LCE) — new canonical owner

Sits **above** Hammer State and Load/Debt. Hammer = today. LCE = the season, the career.

**Owns:**
- Per-system **retention curves** (rolling 7d / 28d / 90d / season): explosive output, rotational output, sprint quality, reactive-strength index, throwing velocity quality, deceleration quality, coordination index, rhythm/timing index, asymmetry index, cognitive sharpness, emotional regulation.
- **Cost-per-output ratio** per system (output ÷ debited load) trended over time.
- **Degradation slope** (in-season output decay rate per week).
- **Adaptation saturation flag** (when training input no longer moves output).
- **Silent-degradation alerts** (output preserved but cost rising → pre-injury signal).

**Does NOT own:** prescription, scheduling, exercise selection. It **publishes signals** to the bus; the existing Selector/Scheduler consume.

**Storage requirement (concept only — no migration here):**
- `longitudinal_capacity_snapshots` (daily roll-up, immutable, versioned via `engine_snapshot_versions`).
- `output_retention_metrics` (per-system curve points).
- `cost_per_output_log` (paired output + debited load events).
- `silent_degradation_events` (write when slope thresholds cross, with confidence + inputs — Law 7 + 8).

**Bus topics added:**
`retention_curve`, `cost_per_output`, `degradation_slope`, `saturation_state`, `silent_degradation_alert` — each with confidence + freshness envelope (Law 3).

**Closed loop (Law 9):** every LCE alert must influence Scheduler or Selector or be a bug.

---

## 2. Tolerance Progression Engine (TPE) — new canonical owner

Owns **what the athlete is *allowed* to be exposed to right now**, given developmental + competitive history.

Distinct from Load/Debt (which is *current debt*) and from Progression (which is *next rung in a program*). TPE is the **ceiling function**.

**Owns:**
- Adaptive loading ceiling per system (rotational, elastic, throwing, sprint, decel).
- Movement-competency gates (cannot unlock rung N until competency K verified).
- Staged exposure ladders (tissue → neural → rotational → elastic → throwing → competitive).
- Growth-spurt detection + ceiling collapse (height delta, coordination drop, asymmetry spike).

**Inputs:** developmental age layer, biological-vs-chronological age, recent retention curves, asymmetry creep, growth signals.

**Output to bus:** `exposure_ceiling` per system. **Selector + Scheduler must respect ceilings** before any prescription — even when the athlete asks for more. *Engine withdraws as confidently as it prescribes* (organism doctrine).

---

## 3. Seasonal Degradation Layer

A view of LCE projected through season-phase context.

**Owns:** in-season degradation slope, taper detection, post-tournament debt, post-doubleheader debt, multi-game-week density score, postseason push window, off-season restoration trajectory.

**Inputs:** `useSeasonStatus` + game logs + rep logs + LCE retention curves.
**Consumers:** Scheduler (must compress recovery in dense weeks), Selector (must shift toward elastic-preserving / low-decel work), Notification Bus (durability nudges).

---

## 4. Competitive Density Modeling

A first-class **input** topic, not a UI.

**Owns:** rolling counts and intensities of: games, doubleheaders, extra innings, travel days, time-zone shifts, tournament compression windows, showcase exposure, bullpen sessions, BP rounds, cage volume, warm-up volume, cleat-ground stiffness exposure, deceleration events, sleep disruption, adrenaline cycling.

Today: scattered across `custom_activity_logs`, game scoring, calendar — never aggregated as a single "competitive density" signal.

**New bus topic:** `competitive_density_24h / 7d / 28d` with per-bucket breakdown and travel/sleep modifiers.

**Consumers:** LCE (drives degradation slope), Scheduler (compresses recovery), Hammer (modulates state), Notification Bus (friction budget shrinks during high density).

---

## 5. Biological Cost Engine (BCE)

Pairs every **output event** (sprint time, exit velo, throw velo, rep quality) with the **debited load** (CNS, tissue, neural, emotional) at that moment.

**Output:** `cost_per_output` per system, trended.

This is the operational instrument for Law 10. Without BCE, "elite output preserved at lowest biological cost" is a slogan.

**Storage concept:** `output_cost_pairs` (event id, output metric, debited load snapshot id, season phase, density score, confidence).

---

## 6. Position-Specific Tolerance Modeling

Tolerance ceilings and degradation profiles are **position-specific**, not generic.

Profiles required (each is a **set of weights on existing topics**, not a new engine):
- **Pitcher** — arm-specific throwing accumulation, bullpen accumulation, recovery compression between starts, leg-drive elastic load, decel of follow-through.
- **Catcher** — squat-volume tissue load, decel/throw-down load, blocking impact load, rotational asymmetry from one-knee setups.
- **Middle infield** — reactive-density load, lateral COD load, throwing-arm asymmetry, cleat-ground stiffness exposure.
- **Corner infield** — power-throw load, lateral decel, hot-corner reaction.
- **Outfield** — sprint-quality retention is *primary*, decel events, throw-distance load.
- **Two-way / Unicorn** — dual-load conflict resolution: pitcher recovery vs hitter rotational expression on the same day.
- **Switch hitter** — bilateral rotational symmetry retention.
- **Switch thrower** — bilateral throwing-arm parity.

**Bus topic:** `position_tolerance_profile` (read-only view derived from identity + LCE + TPE).

---

## 7. Developmental Age Layer

Owns the difference between **chronological age**, **biological age**, and **training age**. The existing `ageCurves.ts` / `softball/ageCurves.ts` are *performance-grading* curves, not developmental tolerance curves — distinct concern.

**Owns:**
- Developmental window (PHV proxy — height delta, weight delta, coordination delta).
- Tissue age estimate (years of structured rotational/throwing exposure).
- Neural age estimate (years of structured reactive/elastic exposure).
- Recovery-capacity evolution curve (how fast the athlete clears load by age band).

**Output:** modifiers TPE applies to ceilings. *Children are not max-loaded; future elite durability is built progressively.*

---

## 8. Bilateral Dominance Tracking

Side-dominance is a longitudinal signal, not a one-time setting.

**Owns:** rolling rotational asymmetry, throwing-arm vs glove-arm output, stance-specific output (LH vs RH for switch hitters), arm-specific workload accumulation, asymmetry creep slope.

**Closed-loop (Law 9):** asymmetry creep > threshold → Selector biases toward corrective work, Scheduler inserts decompression, Notification Bus warns the coach.

---

## 9. Dual-Load Athlete Modeling

Two-way athletes (Unicorn engine), pitcher-hitters, switch hitters, switch throwers.

**Owns:** dual-load conflict resolution rules — when pitching debt and hitting expression collide on the same day, which wins, and what is deferred.

Today: `Unicorn` exists as a 24-week program loop, but no runtime conflict-resolver lives on the bus. This must be a canonical organism component, not a program file.

---

## 10. Long-Horizon Warning Systems (Pre-Injury Layer)

A subscriber to LCE + Bilateral + BCE + TPE that fires **before** injury thresholds:

- Silent degradation (output flat, cost rising).
- Chronic elastic loss (reactive-strength index slope down ≥ N over 28d).
- Rotational sequencing decay (sequencing score down while output preserved → compensation).
- Hidden asymmetry buildup (creep above tolerance band).
- Nervous system stagnation (sprint quality + reactive index plateaued AND HRV dampened).
- Adaptation saturation (input ↑, output flat ≥ 21d).
- Emotional burnout (subjective load ↑, engagement ↓, friction ↑).
- Coordination decay (rhythm/timing index slope down).
- Overprotective compensation (asymmetric load avoidance pattern).

Every warning carries inputs + confidence + recommended withdrawal action. **Read-only warnings are bugs.**

---

## 11. Organism Success Metrics (Law 10 instrumentation)

Add a canonical `organism_success_metrics` view (concept) that surfaces, per athlete, per season:

- Cost-per-output trend (per system).
- Output retention slope (per system).
- In-season degradation slope.
- Freshness retention.
- Explosive / rotational / sprint / coordination retention.
- Tissue resilience trend.
- Asymmetry stabilization index.
- Recovery efficiency (debt clearance rate).
- Adaptation efficiency (Δoutput per unit input).

**UI mandate:** these metrics must be celebrated in athlete- and coach-facing surfaces alongside (or above) streaks/compliance — Law 10 enforcement.

---

## 12. Canonical Map Updates

The Phase 2A ownership table (Section 1 of the prior map) gains these rows; the State Bus map (Section 2) gains the listed topics; the Expansion Order (Section 6) is amended:

```text
Step 1   State Bus contract (already)
Step 2   Prediction-record + engine-version path (already)
Step 3   AIInputContract envelope (already)
Step 4   Per-system Load/Debt service (already)
Step 4a  Biological Cost Engine — pair outputs with debited load   ← NEW
Step 4b  Competitive Density signal aggregation                     ← NEW
Step 5   Readiness v2 (already)
Step 5a  Longitudinal Capacity Engine snapshots + retention curves  ← NEW
Step 6   Speed signal on bus + consumers (already)
Step 6a  Bilateral Dominance + asymmetry-creep loop                 ← NEW
Step 7   Exercise ontology (already)
Step 7a  Position-Specific Tolerance Profiles                       ← NEW
Step 7b  Developmental Age Layer + Tolerance Progression Engine     ← NEW
Step 8   Single Exercise Selector — must respect TPE ceilings       ← AMENDED
Step 9   Subjective Probe + Notification Bus + friction budget (already)
Step 9a  Dual-Load Athlete conflict resolver                        ← NEW
Step 10  Drift Sentinel + audits (already)
Step 10a Long-Horizon Warning Systems (pre-injury layer)            ← NEW
Step 11  Organism Success Metrics view + UI reframing (already; expanded scope)

Only AFTER Step 11: premium fascia content, sprint expansions, morphology-aware selection, force-strategy moving signature.
```

---

## 13. Required Contracts (additions)

- `RetentionCurveContract` — per-system slope, freshness, confidence.
- `CostPerOutputContract` — output event ↔ debit snapshot pairing.
- `ExposureCeilingContract` — per-system ceiling + reason + override path (Owner Authority).
- `CompetitiveDensityContract` — bucket counts + travel/sleep modifiers.
- `BilateralAsymmetryContract` — per-side output + workload + creep slope.
- `PositionToleranceContract` — read-only view binding identity → TPE/LCE weights.
- `DualLoadConflictContract` — pitcher/hitter day resolver inputs + decision log.

All extend the Phase 2A `data_contract` requirement (Law 2).

---

## 14. Confidence + Missingness (Law 3 reinforcement)

Long-horizon signals are especially vulnerable to silent missingness (an athlete travels for 5 days, the curve looks "flat"). Every LCE/BCE/TPE read **must** carry:

- freshness (last input timestamp per contributing topic),
- coverage (% of expected inputs received in the window),
- confidence (0..1, decayed by both),
- explanation candidate (rest / travel / injury / disengagement / forgetting).

Low-confidence longitudinal reads must **withdraw load or defer prescription** rather than fabricate a slope.

---

## 15. What this amendment does NOT do

- No code, no migrations, no tables, no edge functions.
- No exercise content.
- No new UI surfaces.
- No changes to existing engines (HIE, MPI, Hammer, physio) — they continue under Phase 9 doctrine until State Bus + LCE land.
- Does not relitigate Phase 2A; only **adds the longitudinal layer** the prior map under-specified.

---

## Decision requested

Ratify this amendment as part of the canonical Phase 2A organism map. On approval:

1. Save canonical map (Phase 2A + this amendment) to `mem://architecture/canonical-organism-map`.
2. Save longitudinal layer specifically to `mem://architecture/longitudinal-capacity-engine`.
3. Add a Core line: *"Every plan must include a Canonical owner line and a Longitudinal impact line alongside the existing Laws check."*
4. Phase 2B (Step 1, State Bus contract) becomes the next implementation-ready phase, now sized to carry the longitudinal topics from day one — preventing the rewrite this amendment exists to avoid.
