# Hammer Wave 3 — Execution Package (Governance Only)

**Status:** Sealed. Governance deliverable. No production code, no schemas, no migrations, no projections, no emitters.

**Subordinate to:** Eternal Laws · Megaphase 151–160 · RR-5 Narrative Continuity · RR-6 Injury Recovery · RR-8 Life Context · Hammer Activation Phases 1–8 · Hammer Execution Constitution · Wave 1 Ratified · Wave 2 Ratified.

---

## §0 Scope Verification

**In-scope (Wave 3 only):**
- C3 — Onboarding Presence
- C5 — First Setback Guidance

**Explicitly excluded:**
- C4 (Parent Voice), RR-7, RR-9, RR-10
- All parent / recruiter / commercial surfaces
- All schema, projection, emitter, migration, authority changes
- All RTP authorization logic
- All safeguarding logic changes
- All Hammer capability additions beyond C3 + C5
- All Wave 1 and Wave 2 sealed files (consumed read-only)

Wave 3 is an **interpretive overlay** on Wave 1 (identity + silence) and Wave 2 (guidance slots + handoff). It introduces zero new primitives, zero new authority, zero new ledger writes.

---

## §1 Capability Review

### C3 — Onboarding Presence

**Objective.** A first-time athlete can understand: what Hammer is, what Hammer is not, what Organism State is, what to do next — without prior platform knowledge.

**Dependencies.** Wave 1 (`getHammerIdentity`, `classifySilenceZone`), Wave 2 (`resolveGuidanceSlots`, `resolveHandoff`).

**Success criteria.**
- Onboarding-state athlete confusion decreases (measured via per-state slot resolution determinism and forbidden-token absence).
- Identity reuse: 100% of identity strings sourced from `getHammerIdentity()`.
- Replay byte-identical across repeated invocations at pinned `engine_version + reasoning_version`.

**Failure criteria.**
- Hammer explains unavailable information.
- Hammer predicts, diagnoses, or invents continuity.
- Hammer speaks where silence is required.
- Hammer authors `organism_truth | athlete_intent | authority_override | hard_stop | rehabilitation_state`.

### C5 — First Setback Guidance

**Objective.** Provide lawful guidance during missed days, inactivity, lost streaks, poor compliance, interrupted training, or recovery interruption — without shame, diagnosis, prediction, or fictional narrative.

**Dependencies.** Wave 1, Wave 2, RR-5, RR-6, RR-8.

**Success criteria.** Athlete understands: what happened (replay-derived observation), what is known, what is unknown (missingness preserved), what next action exists (delegated to C6).

**Failure criteria.** Hammer invents reasons · assumes emotions · predicts outcomes · overrides safeguarding · overrides parent authority.

---

## §2 Athlete-State Inventory

### Onboarding states (7)

| State | Known inputs | Unknown inputs | Lawful Hammer authority | Required silence |
|---|---|---|---|---|
| `first_login` | account exists | all behavioral history | identity disclosure, next-action surface | continuity narration |
| `first_completed_action` | one action lineage | trend, intent, pattern | observation of single event | trend inference |
| `first_prescription` | prescription presence | adherence history | descriptor of prescription source | outcome prediction |
| `first_week` | ≤7 days lineage | weekly pattern | observation of available days only | weekly-pattern claims |
| `incomplete_onboarding` | partial profile fields | full profile | next-required-step handoff | identity assumption |
| `partial_profile` | declared fields only | undeclared fields | acknowledgment of declared scope | imputation of undeclared |
| `no_activity` | account exists, zero lineage | everything else | identity disclosure only | all behavioral claims |

### Setback states (6)

| State | Known inputs | Unknown inputs | Lawful Hammer authority | Required silence |
|---|---|---|---|---|
| `missed_day` | one missed day lineage | reason | observation that day is missing | cause attribution, emotion |
| `missed_week` | week-bounded missingness | reason, intent | observation of week-bounded gap | trend claim, identity claim |
| `interrupted_prescription` | prescription + gap lineage | cause | observation of gap | diagnosis, RTP authorization |
| `incomplete_logging` | partial entries | completion intent | observation of declared subset | imputation of undeclared |
| `recovery_interruption` | RR-6 injury_event present | recovery trajectory | RR-6-bounded acknowledgment | RTP authorization, prognosis |
| `unavailable_signal_state` | missingness lineage only | all signal | lawful silence (C7 zone) | any guidance |

All routing flows through Wave 1 `classifySilenceZone` and Wave 2 `resolveGuidanceSlots` / `resolveHandoff`. **No new primitives.**

---

## §3 Surface Inventory

**Participating surfaces:**
- `src/pages/Today.tsx` (already wired in Wave 2)
- `src/components/today/TodayGuidanceSlots.tsx` (Wave 2 component, extended consumer)
- Existing Onboarding pages (`src/pages/Onboarding*`) — presentation wiring only
- Wave 1 `src/lib/hammer/identity.ts` (consume only)
- Wave 1 `src/lib/runtime/silence/**` (consume only)
- Wave 2 `src/lib/runtime/guidance/**` (consume / extend resolver inputs)
- Wave 2 `src/lib/runtime/handoff/**` (consume only)

**Forbidden from participation:**
- All `src/lib/runtime/relational/**`
- All parent / coach / recruiter / commercial surfaces
- All safeguarding orchestration internals
- All schema, migration, projection, emitter files
- `src/branding.ts`
- Identity / silence / handoff internals (consume only — no edits)
- All RR-7 / RR-9 / RR-10 paths
- All writers of `organism_truth | athlete_intent | authority_override | hard_stop | rehabilitation_state`

---

## §4 Onboarding Presence Implementation Plan (behavior only — no copy, no prompts)

For each of the seven onboarding states, define per-slot behavior:

**Entry slot.** Inputs: athlete identity + onboarding-state classification. Outputs: identity descriptor sourced exclusively from `getHammerIdentity()`. Authority: identity disclosure only. Verification: zero raw identity literals.

**Context slot.** Inputs: known-input vector for state. Outputs: factual replay-derived observation of declared scope. Authority: acknowledge declared inputs; never impute undeclared. Verification: missingness preserved per RR-8; no inference beyond declared inputs.

**Next-action slot.** Inputs: state classification + lawful-destination registry. Outputs: `resolveHandoff()` result. Authority: delegated entirely to C6. Verification: destination ∈ Wave 2 lawful set of 7; safeguarding short-circuit honored.

**Exit slot.** Inputs: state classification. Outputs: lawful silence when continuation undefined; otherwise `resolveHandoff()`. Authority: silence preferred over fabrication.

**Lawful silence behavior.** When `classifySilenceZone()` returns silence (e.g., `no_activity`, `unavailable_signal_state`), all four slots collapse to silence descriptors. Never substitute filler copy.

**Authority limits.** Interpretive overlay only. Never authors organism state. Never mutates ledger. Never expands authority hierarchy.

**Verification requirements.** Purity (no `Date.now | Math.random | fetch | emit`), replay determinism (byte-identical across invocations), identity-reuse (100%), forbidden-token absence (`diagnose | prescribe | authorize | cleared | predict`).

---

## §5 First Setback Guidance Implementation Plan

Per setback state:

**Inputs.** Signal availability vector + missingness lineage + RR-6 injury_event presence (read-only, when applicable).

**Outputs.** Slot descriptors only. Never narrative text. Never emotional framing.

**Allowed guidance.**
- Factual replay-derived observation of missingness (what is missing, what is known)
- Lawful next handoff via C6 (`resolveHandoff()`)
- RR-6-bounded acknowledgment of recovery interruption (read-only; no RTP)

**Forbidden guidance.**
- Invented reason for setback
- Assumed emotion / motivational scripting
- Predicted outcome or trajectory
- Authored narrative arc (RR-5 violation)
- Diagnosis or clinical inference (RR-6 violation)
- Undisclosed life-context inference (RR-8 violation)
- RTP authorization (Wave 3 forbidden; reserved for human authority)

**Required silence.**
- When signal unavailable (`unavailable_signal_state`) → all slots silent
- When safeguarding active → immediate Wave 2 handoff short-circuit
- When parent supremacy applies to minor → setback guidance routes through parent-respecting silence (no athlete-direct narrative)

**Lineage requirements.** Every emitted slot traceable to canonical antecedents at pinned `engine_version + reasoning_version`. No derived-view substitution.

**Missingness requirements.** Never collapsed. Never imputed. Always visible in slot output shape.

**Verification requirements.** Per-state forbidden-token grep · RR-5/6/8 audit per slot · replay byte-equivalence · safeguarding precedence test · parent-supremacy test for minors.

---

## §6 Constitutional Verification Plan

| Invariant | Violation vector | Required verification | Build-blocker criteria |
|---|---|---|---|
| RR-5 Narrative | Authored arc, invented continuity, destiny framing | Forbidden-token grep; per-state slot snapshot review | Any narrative authorship → block |
| RR-6 Injury | Diagnosis, prognosis, RTP authorization | Source grep on `recovery_interruption`; RTP-token absence | Any clinical claim → block |
| RR-8 Life Context | Imputation of undeclared context, profiling | Per-state declared-vs-emitted diff | Any undeclared inference → block |
| Replay determinism | Non-pure resolver, wall-clock leak | Source grep `Date.now | Math.random | fetch | emit`; repeat-invocation byte-equivalence test | Any divergence → block |
| Parent supremacy | Athlete-direct guidance bypassing parent for minor | Minor-context test matrix | Any bypass → block |
| Safeguarding precedence | Slot resolution before safeguarding short-circuit | `safeguardingActive` test across all states | Any non-short-circuit → block |
| Single Hammer authority | Parallel identity literals | Raw `"Hammer State"` grep across Wave 3 surfaces | Any literal → block |
| Organism State silence | Authoring of organism state from C3/C5 | Source grep for `organism_truth | athlete_intent | authority_override | hard_stop | rehabilitation_state` writes | Any write → block |
| Demo↔prod firewall | Demo-scope leakage into prod, prod into demo | `prepareRows` invariant unchanged; Wave 3 emits no scoped rows | Any leakage → block |

---

## §7 Acceptance Criteria (measurable, testable)

**C3.**
- Deterministic slot resolution across all 7 onboarding states (28 slot resolutions total).
- Zero forbidden tokens in C3 resolver source.
- Zero raw `"Hammer State"` literals in C3 surfaces.
- Identity reuse = 100% (every identity string flows from `getHammerIdentity()`).
- Byte-identical replay across repeated invocations.

**C5.**
- Deterministic slot resolution across all 6 setback states (24 slot resolutions total).
- Zero invented narrative tokens.
- Missingness preserved and visible in 100% of slot outputs.
- Safeguarding short-circuit verified for all setback states with `safeguardingActive=true`.
- Parent supremacy preserved for all minor-context permutations.
- RR-6 injury_event read-only; zero RTP-authorization paths reachable.

---

## §8 Test Plan

**Coverage matrix:** (7 onboarding states × 4 slots) + (6 setback states × 4 slots) = **52 slot assertions** across the following test classes:

| Class | Scope |
|---|---|
| Unit | Per-state resolver output shape, purity, determinism |
| Integration | C3/C5 + Wave 2 guidance slots composition + Wave 1 identity/silence consumption |
| Replay | Byte-identical repeat invocation; engine_version + reasoning_version pin |
| Safeguarding | `safeguardingActive` short-circuit across all 13 states |
| Authority | No writes to forbidden organism-state fields; no RTP paths |
| Visibility | Missingness preserved; lineage handle present on every non-silence descriptor |
| Regression | Wave 1 (identity + silence) and Wave 2 (guidance + handoff) test suites remain green |

---

## §9 Failure Analysis

| Failure | Detection | Correction | Escalation | Build-blocker |
|---|---|---|---|---|
| Narrative invention (RR-5) | Forbidden-token grep + slot snapshot | Strip authored text; revert to descriptor | Constitutional arbitration | Yes |
| Emotion assumption | Source grep for emotion lexicon | Remove emotional framing | Arbitration | Yes |
| Prediction leakage | Token grep (`predict | forecast | will`) | Replace with observation-only | Arbitration | Yes |
| Silence violation | Per-zone slot test | Restore `classifySilenceZone` gating | Arbitration | Yes |
| Safeguarding bypass | `safeguardingActive` matrix test | Restore short-circuit | Immediate halt | Yes |
| Parent authority bypass (minor) | Minor-context matrix | Route through parent-respecting silence | Immediate halt | Yes |
| Replay drift | Repeat-invocation byte diff | Remove impure call | Halt | Yes |
| Identity literal leakage | Raw-string grep | Route through `getHammerIdentity()` | Halt | Yes |
| Schema / projection / emitter creep | File diff against Wave 1/2 sealed set | Revert | Halt | Yes |

---

## §10 Ratification Requirements

**Complete.** All 13 athlete states (7 onboarding + 6 setback) specified with inputs / outputs / authority / silence / verification. No scope creep beyond C3 + C5.

**Verified.** Full 52-assertion test matrix green. All §6 constitutional audits pass. Wave 1 + Wave 2 regression suites unchanged and green. Zero forbidden-token / identity-literal / impurity findings.

**Ratified.** Constitutional audit signed in plan log. Sealed Wave 3 entry appended to `.lovable/plan.md`. Zero open escalations.

---

## §11 Exit Gate

Wave 3 may be considered complete only if:
1. All 7 onboarding states verified per §8 matrix.
2. All 6 setback states verified per §8 matrix.
3. All §6 constitutional audits pass.
4. Zero open escalations.
5. Wave 4 prerequisites documented (Wave 3 ratification entry + scope demarcation for C4 Parent Voice).

---

## §12 Stop Gate Confirmation

- No Wave 4.
- No RR-7.
- No RR-9.
- No RR-10.
- Wave 3 only.
- No capability additions beyond C3 + C5.
- No new schemas, migrations, projections, emitters, or authority changes.
- No edits to Wave 1 or Wave 2 sealed files.
