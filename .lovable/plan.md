# Phase 2A Execution Governance Lock — Implementation Integrity Protocol (IIP)

Constitutional + operational governance ratification only. No code, migrations, UI, prompts, or tables. Memory-layer changes only. No Phase 2B implementation planning begins until this is locked.

## Laws check
1 (One Organism), 2 (No Unused Data), 3 (Missingness Is a Signal), 6 (Self-Correct), 7 (Engine Becomes More Elite), 8 (No Fake AI), 9 (Closed Loop or Don't Ship), 10 (Long-Season Durability).

## Canonical owner
**IIP — Implementation Integrity Protocol.** Governance peer to LCE, AINL, ASB, OEAL, IRCL, DGL, MAAL, SIL — but operating one level above them: governs HOW any subsystem is allowed to be implemented, claimed, verified, and observed.

## Longitudinal impact
Prevents architectural drift, fake completion, unverifiable infrastructure, hidden rewrites, silent contract violations, orphan systems, and implementation debt accumulation across Hammer's lifetime. Ensures every subsystem remains traceable, auditable, and rewrite-resistant across multi-season operation.

## Behavioral impact
Establishes mandatory truthfulness, verification discipline, auditability, reproducibility, and explicit uncertainty handling during every implementation phase. Authority/Uncertainty/Pressure/Youth/Scenario impact: IIP enforces uncertainty surfacing across all governance layers; no authority decision, override log, or scenario projection may be claimed "wired" without verification evidence.

---

## Files to create

### 1. `mem://architecture/implementation-integrity-protocol.md`
Full IIP doctrine covering all 12 ratified sections:

1. **No Simulated Completion Rule** — hard constitutional rule. Forbidden phrases ("done", "implemented", "wired", "working", "complete", "production-ready", "fully integrated", "closed-loop", "validated") banned unless paired with verification evidence. Prohibited implications enumerated (code exists, migrations ran, tests passed, integrations complete, architecture wired, consumers/producers exist, contracts enforced, loops closed, deployment succeeded — none claimable without proof).

2. **Verification-before-claim protocol** — every implementation claim must include:
   - A. Scope touched (files, functions, contracts, migrations, routes/hooks/components/functions)
   - B. Verification evidence (build, typecheck, tests, migration confirmation, query confirmation, runtime validation, contract validation, producer/consumer proof, screenshots/logs when relevant)
   - C. Remaining uncertainty (gaps, partial integrations, unverified assumptions, confidence level, blocked dependencies)
   - D. Canonical impact declaration (owners, bus topics, contracts, longitudinal impact, behavioral impact, authority/uncertainty/youth/pressure implications)

3. **Conceptual vs implemented separation rule** — every response must explicitly distinguish: conceptual architecture / implementation-ready plans / partially implemented / verified / unverified assumptions / future aspirations. No blending permitted.

4. **Mandatory implementation states** — every subsystem always in exactly ONE of: `conceptual`, `specified`, `implementation-planned`, `partially-implemented`, `implemented-unverified`, `verified`, `production-observed`, `drifted`, `deprecated`. No ambiguous status.

5. **Drift detection protocol** — drift triggers (divergence from canonical owner, duplicate producers, orphan consumers, contract divergence, broken confidence/missingness/freshness propagation, authority hierarchy violation, skipped behavioral gates, ignored longitudinal impacts, bypassed hard rules) require explicit remediation tracking.

6. **Auditability requirements** — every implementation phase produces: implementation report, touched-system inventory, contract inventory, producer/consumer inventory, unresolved risks, known missingness, rollback considerations, migration considerations, observability considerations.

7. **Proof-of-closure rule** — a loop is closed only when producer + transport + consumer + state persistence + confidence propagation + missingness behavior + longitudinal impact + behavioral impact + observability are all verified.

8. **No Fake AI enforcement layer** — no AI/recommendation system may fabricate confidence, readiness, projections, causal reasoning, certainty, personalization, adaptation, or continuity. Every AI output must expose inputs, confidence, uncertainty, reasoning pathway, missingness, override path.

9. **Runtime observability mandate** — future implementation phases must include health, contract, drift, stale-data, missingness, orphan-topic, override, confidence, and decision-state observability. No invisible systems.

10. **Implementation phase gates** — no phase begins unless upstream canonical owners ratified, contracts defined, authority rules defined, longitudinal/behavioral impacts defined, audit criteria defined, rollback path considered, observability path considered.

11. **Required implementation reporting format** — every implementation response includes: Laws check, Canonical owner, Longitudinal impact, Behavioral impact, Scope touched, Current implementation state (from §4 enum), Verification status, Remaining uncertainty, Drift risks, Observable proof, Next dependency gates.

12. **End-state expectation** — Hammer must be fully explainable, auditable, confidence-aware, drift-resistant, longitudinally coherent, behaviorally coherent, implementation-traceable, operationally observable, rewrite-resistant. No black-box infrastructure, no invisible logic, no unverifiable completion claims.

---

## Files to update

### 2. `mem://architecture/canonical-organism-map.md`
- Add **IIP as canonical governance owner** (governance peer above feature owners; governs implementation rules, not organism state).
- Amend the plan gate: every plan's existing 4-line gate (Laws / Canonical owner / Longitudinal / Behavioral) is now additionally subject to IIP §11 reporting format during implementation responses.
- Amend Integration Audits to require: current implementation state (from §4 enum), verification evidence, drift risks.
- Note: IIP introduces no new bus topics or organism contracts (it governs implementation discipline, not organism state).

### 3. `mem://index.md` — Core additions
- **No Simulated Completion Rule:** forbidden phrases ("done", "implemented", "wired", "working", "complete", "production-ready", "fully integrated", "closed-loop", "validated") require verification evidence (`architecture/implementation-integrity-protocol`).
- **Mandatory implementation states:** every subsystem must declare exactly one state: conceptual / specified / implementation-planned / partially-implemented / implemented-unverified / verified / production-observed / drifted / deprecated.
- **Verification-before-claim:** every implementation claim must include scope touched + verification evidence + remaining uncertainty + canonical impact declaration.
- **Conceptual vs implemented separation:** responses must explicitly separate conceptual / planned / partial / verified / unverified / aspirational. No blending.
- **Proof-of-closure:** a loop is closed only with verified producer + transport + consumer + persistence + confidence + missingness + longitudinal + behavioral + observability.
- **Implementation reporting format:** every implementation response follows IIP §11 (adds Implementation state / Verification status / Drift risks / Observable proof / Next dependency gates to the existing 4-line plan gate).

### 4. `mem://index.md` — Memories addition
- `[Implementation Integrity Protocol](mem://architecture/implementation-integrity-protocol)` — Execution governance: no simulated completion, verification-before-claim, mandatory states, drift detection, proof-of-closure, observability mandate, §11 reporting format.

---

## Out of scope
No code, migrations, edge functions, UI, prompts, database tables, or feature implementation. This is constitutional + operational governance ratification only. Phase 2B (ASB realization) implementation planning begins only after IIP is locked.

## Decision requested
Ratify IIP as the mandatory execution governance layer. On approval, the four memory operations above are executed exactly as listed.
