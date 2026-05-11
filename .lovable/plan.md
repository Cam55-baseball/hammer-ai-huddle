# Phase 2A Final Constitutional Pass — DGL + MAAL + SIL

Constitutional ratification only. No code, migrations, UI, prompts, or tables. Memory-layer changes only.

## Laws check
1 (One Organism), 3 (Missingness Is a Signal), 5 (Intent ≠ Completion), 7 (Engine Becomes More Elite), 8 (No Fake AI), 9 (Closed Loop), 10 (Long-Season Durability).

## Canonical owners (new)
- **DGL** — Decision Governance Layer
- **MAAL** — Multi-Actor Authority Layer
- **SIL** — Scenario Intelligence Layer

Peers to LCE, AINL, ASB, OEAL, IRCL.

## Longitudinal impact
Prevents organism drift, conflicting authority, unsafe override escalation, and short-horizon optimization across multi-season development. Every recommendation, override, rehab decision, competitive push, and developmental pathway remains explainable, survivable, role-aware, and context-aware.

## Behavioral impact
Clarifies who can influence what, how disagreements resolve, how pressure environments are handled, and how scenario simulations shape adherence, trust, patience, motivation, and organism protection.

---

## Files to create

### 1. `mem://architecture/decision-governance-layer.md`
Full DGL doctrine covering:
- Recommendation authority sequencing
- Eight decision states (recommendation / negotiation / warning / restriction / withdrawal / hard-stop / owner-override / informational-uncertainty) — no green/yellow/red collapse permitted
- Confidence-bound decision enforcement
- Distinction rules: "not enough confidence" vs "unsafe" vs "suboptimal" vs "temporarily withdrawn" vs "athlete preference conflict" vs "coach pressure conflict" vs "competitive necessity"
- Override propagation and escalation rules
- Organism protection hierarchy
- Uncertainty handling: defer when confidence insufficient, surface missingness, distinguish "unknown" from "safe", no hallucinated precision
- Hard rule: when uncertainty rises, organism protection increases

### 2. `mem://architecture/multi-actor-authority-layer.md`
Full MAAL doctrine covering:
- Actor taxonomy (athlete, parent, coach, strength coach, pitching coach, PT, physician, organization, recruiting/scholarship/professional pressure)
- Authority boundaries, visibility permissions, recommendation visibility
- Override authority and escalation chains
- Disagreement logging
- Hard constitutional rules: athlete autonomy protected; medical restrictions supersede training goals; AI never supersedes physicians; coaches cannot silently overwrite organism warnings; parents cannot force unsafe progression; organization pressure tracked as organism signal; every override auditable
- Youth safeguarding: minors, early/late developers, undersized, burnout-prone, over-specialized, externally-pressured athletes
- Coach influence weighting; medical authority precedence

### 3. `mem://architecture/scenario-intelligence-layer.md`
Full SIL doctrine covering:
- Bounded scenario reasoning (NOT deterministic prediction)
- Simulated adaptation pathways, risk-band projections, density projections, developmental branch modeling, survivability comparisons
- RTP pathway simulations, seasonal compression, travel-density modeling, tournament stress forecasting, workload tradeoffs, two-way conflict forecasting
- Required outputs: confidence, uncertainty, tradeoffs, survivability/biological cost/retention/elasticity/developmental opportunity cost
- Simulation ethics: forbidden — deterministic destiny language, guaranteed projections, manipulative fear framing, probabilistic deception, hidden weighting; required — explainability, confidence bands, multiple viable pathways, athlete agency preservation

---

## Files to update

### 4. `mem://architecture/canonical-organism-map.md`
- Add DGL, MAAL, SIL as canonical owners
- Add **8 new bus topics**: `decision_state`, `authority_conflict_state`, `scenario_projection_state`, `competitive_pressure_environment`, `uncertainty_state`, `override_escalation_state`, `medical_authority_state`, `developmental_risk_state`
- Add **7 new contracts**: `DecisionGovernanceContract`, `AuthorityBoundaryContract`, `ScenarioProjectionContract`, `CompetitivePressureContract`, `UncertaintyContract`, `OverrideEscalationContract`, `MedicalAuthorityContract`
- Ratify canonical decision hierarchy:
  Medical restrictions → organism safety truth → longitudinal survivability → athlete authority → coach/parent/org preferences → AI recommendations → population priors. No downstream layer may silently bypass an upstream layer.
- Amend expansion order — insert BEFORE Phase 2B (ASB):
  - Step 0c — Decision Governance Layer
  - Step 0d — Multi-Actor Authority Layer
  - Step 0e — Scenario Intelligence Layer
- Amend Integration Audit requirements to add: authority conflict impact, uncertainty behavior, pressure-environment behavior, youth-protection behavior, scenario-pathway implications (or "none (justified)")
- Add end-state clarification: Hammer is organism intelligence / developmental infrastructure / survivability architecture / contextual performance system / adaptive companion / rehab continuity / decision-support ecosystem — NOT a chatbot, workout app, generic AI coach, black-box readiness score, or streak gamification platform

### 5. `mem://architecture/athlete-intent-negotiation-layer.md`
Cross-link AINL ↔ DGL/MAAL: AINL negotiation surfaces feed DGL decision state; MAAL governs which actor's intent is visible/binding in any negotiation.

### 6. `mem://index.md`
Add Core lines:
- Canonical decision hierarchy (Medical → Organism Safety → Longitudinal Survivability → Athlete → Coach/Parent/Org → AI → Priors); no silent bypass
- DGL must distinguish 8 decision states; no green/yellow/red collapse
- MAAL: AI never supersedes physicians; coaches/parents cannot silently override organism warnings; every override auditable; youth protection mandatory
- SIL outputs are bounded scenario reasoning with confidence bands; deterministic destiny language and manipulative framing forbidden
- Uncertainty raises organism protection; "unknown" ≠ "safe"
- Competitive pressure is a tracked organism signal
- Every plan's 4-line gate now also requires Authority/Uncertainty/Pressure/Youth/Scenario impact under Behavioral impact (or "none (justified)")

Add Memories entries for the three new doctrine files.

---

## Out of scope
No code, migrations, edge functions, UI, prompts, or database tables. This is constitutional ratification only. Phase 2B (ASB realization) implementation planning begins only after this ratification.

## Decision requested
Ratify DGL + MAAL + SIL as the final Phase 2A constitutional pass. On approval, the six file operations above are executed exactly as listed.
