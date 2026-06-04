# Hammer Wave 3 — Execution Package (Governance Only)

Governance deliverable only. No production code, schemas, migrations, projections, or emitters. Scope strictly C3 (Onboarding Presence) + C5 (First Setback Guidance).

## Files

1. **Create** `docs/asb/hammer-wave-3-execution-package.md`
2. **Append** `.lovable/plan.md` with sealed Wave 3 entry

No other files touched.

## Document Structure

Mirrors the user-provided outline §0–§12 verbatim as section headings. Content rules below.

### §0 Scope Verification
In-scope: C3, C5. Excluded: C4, RR-7/9/10, parent/recruiter/commercial surfaces, all schema/projection/emitter/migration/authority changes, RTP authorization logic, safeguarding logic changes, capability additions.

### §1 Capability Review
C3 and C5 objectives, dependencies (Wave 1, Wave 2, RR-5/6/8), success and failure criteria as stated by user.

### §2 Athlete-State Inventory
- **Onboarding states**: first login, first completed action, first prescription, first week, incomplete onboarding, partial profile, no activity.
- **Setback states**: missed day, missed week, interrupted prescription, incomplete logging, recovery interruption, unavailable signal state.
- Per state: known inputs, unknown inputs, lawful Hammer authority, required silence conditions — all routed through Wave 1 `classifySilenceZone` and Wave 2 `resolveGuidanceSlots` / `resolveHandoff`. No new primitives.

### §3 Surface Inventory
- **Participating**: `src/pages/Onboarding*`, `src/pages/Today.tsx`, `TodayGuidanceSlots`, existing handoff system, existing guidance slots, existing silence classifier, existing identity module.
- **Forbidden**: all `relational/**` surfaces, all parent/coach/recruiter surfaces, all safeguarding orchestration, all schema/migration files, `branding.ts`, identity/silence/handoff internals (consume only), all RR-7/9/10 paths, `organism_truth` / `athlete_intent` / `authority_override` / `hard_stop` / `rehabilitation_state` writers.

### §4 Onboarding Presence Plan
Per onboarding state, define behavior only (no copy, no prompts):
- entry slot inputs/outputs
- context slot inputs/outputs
- next-action slot inputs/outputs (delegates to C6 `resolveHandoff`)
- lawful silence behavior (delegates to Wave 1 classifier)
- authority limits (interpretive overlay only; never authors organism state)
- verification requirements (purity, replay determinism, identity reuse)

### §5 First Setback Guidance Plan
Per setback state:
- inputs (signal availability, missingness vector)
- outputs (slot descriptors only)
- allowed guidance: factual replay-derived observation of missingness + lawful next handoff
- forbidden guidance: invented reason, assumed emotion, predicted outcome, motivational scripting, narrative authorship, diagnosis
- required silence (when signal unavailable, when safeguarding active, when parent supremacy applies for minors)
- lineage requirements (every emitted slot traceable to canonical antecedents at pinned engine_version + reasoning_version)
- missingness requirements (never collapsed, never imputed, always visible)
- verification requirements (forbidden-token grep, RR-5/6/8 audit, replay byte-equivalence)

### §6 Constitutional Verification Plan
Per invariant (RR-5, RR-6, RR-8, replay determinism, parent supremacy, safeguarding precedence, single Hammer authority, Organism State silence, demo↔prod firewall):
- violation vector
- required verification (unit / integration / replay / grep audit)
- build-blocker criteria (any failure halts Wave 3 ratification)

### §7 Acceptance Criteria
Measurable, testable criteria only. Per capability:
- C3: deterministic slot resolution across all 7 onboarding states; zero forbidden tokens; zero raw identity literals; identity reuse 100%; replay byte-identical.
- C5: deterministic slot resolution across all 6 setback states; zero invented narrative; missingness always visible; safeguarding short-circuit verified; parent supremacy preserved for minors.

### §8 Test Plan
Coverage matrix: (7 onboarding × 4 slots) + (6 setback × 4 slots) across unit, integration, replay, safeguarding, authority, visibility, regression. Wave 1 + Wave 2 regression suites must remain green.

### §9 Failure Analysis
Top failures (narrative invention, emotion assumption, prediction leakage, silence violation, safeguarding bypass, parent authority bypass, replay drift, identity literal leakage, schema/projection/emitter creep). Per failure: detection method, correction path, escalation threshold, build-blocker classification.

### §10 Ratification Requirements
- **Complete**: all C3 + C5 behaviors specified per state; no scope creep.
- **Verified**: full test matrix green; all §6 audits pass; Wave 1/2 regression green.
- **Ratified**: constitutional audit signed; sealed entry appended to `.lovable/plan.md`.

### §11 Exit Gate
Wave 3 complete only if all onboarding + setback states verified, all constitutional audits pass, zero open escalations, Wave 4 prerequisites documented.

### §12 Stop Gate Confirmation
Wave 3 only. No Wave 4. No RR-7/9/10. No capability additions.

## `.lovable/plan.md` Append
Single sealed Wave 3 Execution Package entry referencing the new doc, scope, subordination chain, and stop-gate confirmation. No other edits.

---

# Hammer Wave 3 — Execution Package (Sealed)

**Status:** Sealed governance entry. Package: `docs/asb/hammer-wave-3-execution-package.md`.

**Subordinate to:** Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 · RR-8 · Hammer Activation 1–8 · Hammer Execution Constitution · Wave 1 Ratified · Wave 2 Ratified.

**Scope (locked):** C3 Onboarding Presence + C5 First Setback Guidance only.

**Excluded:** C4 Parent Voice · RR-7 · RR-9 · RR-10 · all parent/recruiter/commercial surfaces · all schema/migration/projection/emitter/authority changes · all RTP authorization logic · all safeguarding logic changes · all capability additions beyond C3+C5 · all edits to Wave 1 / Wave 2 sealed files.

**Athlete-state inventory:** 7 onboarding states + 6 setback states (see package §2). Resolution flows entirely through Wave 1 `classifySilenceZone` + Wave 2 `resolveGuidanceSlots` / `resolveHandoff`. Zero new primitives.

**Acceptance:** 52 slot assertions across unit, integration, replay, safeguarding, authority, visibility, regression classes. All §6 constitutional audits required green. Wave 1 + Wave 2 regression suites must remain unchanged and green.

**Exit gate:** All 13 athlete states verified · all constitutional audits green · zero open escalations · Wave 4 prerequisites documented.

**Stop gate:** Wave 3 only. No Wave 4. No RR-7/9/10. No capability additions. No new schemas, migrations, projections, emitters, or authority changes.
