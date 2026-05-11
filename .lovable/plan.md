
# Hammers Modality — Eternal System Laws (Phase 1C Doctrine)

This document is **not an implementation plan**. It is the permanent operating constitution of the platform. Every future feature, edge function, table, AI prompt, dashboard, generator, and UX flow must be checked against these ten laws **before merge**. If a proposed change violates a law, the change is wrong — fix the change.

A companion doctrine memory will be saved (`mem://architecture/eternal-system-laws`) and added to Core so it loads on every future session.

---

## LAW 1 — The Platform Is One Organism

The app is an **athlete operating system**, not a collection of features. Every subsystem must read from and write to the shared organism state.

Guardrails:
- No subsystem may ship without declaring its **upstream inputs** and **downstream consumers**. A feature with zero downstream consumers is dead-on-arrival.
- A central **Athlete State Bus** (logical, not necessarily a single table) is the only sanctioned channel between Hammer State, scheduling, recovery, sport load, AI, exercise selection, asymmetry, emotional load, speed, and nutrition.
- Direct table-to-table coupling between feature modules is forbidden; cross-domain reads go through typed contracts (extend `EngineInputContractV2` pattern).
- A quarterly **Integration Audit** lists every subsystem and its live edges. Orphan nodes are deleted or reconnected — never left "for later."

## LAW 2 — No Unused Data

Every collected signal must have a named downstream consumer at the moment it is introduced.

Guardrails:
- New tables/columns require a `data_contract` entry: *what writes it, what reads it, what decision it changes*. No contract → migration rejected.
- A monthly **Dead Data Sweep** flags any signal not read by an engine, recommendation, dashboard, or coach view in 30 days. Flagged signals are either wired in or removed.
- No "we might use it later" columns. Future use = future migration.

## LAW 3 — Missingness Is a First-Class Signal

Absence of data is data. The engine must never silently treat missing input as "fine."

Guardrails:
- Every athlete-state read carries a **confidence score** (0–1) alongside the value. Confidence decays with staleness, sparsity, and contradiction.
- The engine must distinguish **rest, avoidance, friction, travel, injury, disengagement, and forgetting** as candidate explanations for silence — and prefer the most conservative interpretation when uncertain.
- Recommendations carry their input-confidence forward; low-confidence states force the engine to **withdraw load, ask one targeted question, or defer** rather than prescribe blindly.
- Streak/compliance UI must never punish missingness without first probing it.

## LAW 4 — Speed Is Core Nervous-System Infrastructure

Speed is not a module. It is a **diagnostic of the entire organism** — acceleration, elasticity, stiffness modulation, deceleration, reactive strength, and force transfer.

Guardrails:
- Speed Lab outputs are first-class inputs to readiness, scheduling, asymmetry, exercise selection, and Hammer State — not a sidebar metric.
- Any meaningful drop in sprint quality, reactive output, or stiffness must trigger an organism-wide reassessment, not just a "speed score" update.
- Throwing/hitting load, season phase, and emotional load must be allowed to **veto or modulate** speed prescriptions.

## LAW 5 — Intent ≠ Completion

A checked box is the shallowest possible signal. The engine must model **intent, expression, cost, and aftermath** of every session.

Guardrails:
- Every loggable activity supports: *intent (planned), expression (what happened), cost (CNS/tissue/emotional), aftermath (how the athlete changed)*. Missing dimensions reduce confidence (Law 3) — they do not get faked.
- **Adaptive follow-up** is mandatory but bounded: max one micro-question per session, deferred if recent friction is high. UX cost is a first-class budget.
- Inferred sessions (e.g. "I hit today" with no detail) are stored with explicit `inferred=true` and lower confidence — never promoted to verified data without athlete confirmation.

## LAW 6 — The System Must Self-Correct

Architecture entropy is the default; counteracting it must be automated.

Guardrails:
- A continuous **Drift Sentinel** monitors: signal-to-decision correlations, abandoned workflows, ignored recommendations, noisy warnings, AI underperformance, and athlete-model error. Findings flow to the owner dashboard, not silently into logs.
- Conflicting logic (two systems prescribing opposite actions on the same input) raises a hard alert and blocks ambiguous prescriptions until reconciled.
- Stale architecture (unused edge functions, dead cron jobs, orphan tables) is surfaced weekly and pruned monthly.

## LAW 7 — The Engine Must Become More Elite Over Time

The engine is a learning organism, not a frozen ruleset. Every season must leave it measurably smarter.

Guardrails:
- Every prescription writes a **prediction record** (expected outcome + horizon). Outcomes are evaluated; persistent error patterns adjust weights through a versioned, auditable path — not silent overwrites.
- All engine logic is **versioned end-to-end** (already standardized via `engine_snapshot_versions.engine_version`). No silent algorithm changes.
- Learning sources are explicit and ranked: athlete outcomes > compliance > coach input > population priors. Population priors never override individual evidence once it exists.

## LAW 8 — No Fake AI

AI must be **grounded, contextual, and auditable** — never a wrapper around random or static logic.

Guardrails:
- Every AI call must declare the **athlete-state inputs** it consumed and the **decision dimensions** it influenced. Calls without grounded inputs are rejected at the edge-function layer.
- "Generated" content (workouts, drills, plans) must be reproducible from logged inputs + engine version. If the same inputs cannot reproduce the same output class, the generator is unsound.
- Owner Authority (`src/lib/ownerAuthority.tsx`) extends to athlete-facing AI: AI suggests, the athlete (and engine state) decides. No silent auto-application of high-impact prescriptions.

## LAW 9 — Closed Loop or Don't Ship It

No read-only intelligence. Every important signal must eventually influence prescription, scheduling, recovery, or planning.

Guardrails:
- A signal is "important" if it appears in any athlete- or coach-facing surface. Important signals without a closed loop are filed as **bugs**, not backlog.
- Dashboards are presentations of closed loops, never substitutes for them. A pretty chart with no downstream effect violates this law.
- The Integration Audit (Law 1) doubles as the loop-closure audit.

## LAW 10 — Optimize for Long-Season Durability

Success = elite output preserved across the season at the lowest biological cost. Not weekly volume, not soreness, not streak length.

Guardrails:
- Reward systems, badges, copy, and notifications must celebrate **output preservation, withdrawal discipline, and recovery quality** alongside (or above) compliance streaks.
- The engine must be allowed — and visibly trusted — to **prescribe less**. UI must make "do less today" feel like a win, not a failure.
- Long-horizon metrics (rolling output retention, cost-per-output, in-season degradation slope) are first-class athlete and coach views.

---

## Enforcement Mechanism

These laws are useless without teeth. The doctrine attaches to the codebase three ways:

1. **Memory Core**: saved as `mem://architecture/eternal-system-laws` and referenced in `mem://index.md` Core so every future Lovable session loads it automatically.
2. **PR/Plan Gate**: every future plan must include a one-line "Laws check" stating which laws apply and how the change honors them.
3. **Quarterly Audit**: a recurring review (Integration Audit + Dead Data Sweep + Loop-Closure Audit + Drift Sentinel report) — the four together are the immune system.

---

## What Happens Next (only after you approve this doctrine)

Once these laws are ratified, future phases will:
- **Phase 2 — Contracts**: codify the Athlete State Bus, the `data_contract` requirement, and the confidence-score envelope.
- **Phase 3 — Tier A implementation**: land the first organism-aware change set (exercise library + closed-loop Hammer integration + per-system recovery) **under** these laws, not in parallel to them.

No code, no migrations, no schema work happens until you ratify the doctrine.

---

**Decision requested**: ratify this as the permanent operating constitution (with any edits you want), or push back on specific laws. Once ratified, I will write the memory file and update Core in the next loop.
