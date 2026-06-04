# Hammer Wave 4 — Execution Package (Governance Only)

**Status:** Governance deliverable. No production code, no schemas, no migrations, no projections, no emitters, no authority changes, no safeguarding changes, no RTP changes, no capability additions.

**Subordinate to:** Eternal Laws · Megaphase 151–160 · RR-5 Narrative Continuity · RR-6 Injury Recovery · RR-8 Life Context · Hammer Activation Phases 1–8 · Hammer Execution Constitution · Wave 1 Ratified · Wave 2 Ratified · Wave 3 Ratified.

---

## §0 Scope Verification

**In-scope:** C4 — Parent Voice (interpretation layer only).

**Excluded (hard stops):**
- Capabilities: C1, C2, C3, C5
- Relational ratifications: RR-7, RR-9, RR-10
- Surfaces: recruiter, commercial
- Infrastructure: schema changes, migrations, projections, emitters, authority changes, safeguarding changes, RTP authorization changes
- Any new Hammer capability beyond Parent Voice
- Edits to Wave 1 / Wave 2 / Wave 3 sealed files

Parent Voice is an **interpretation layer only**: it explains athlete-derived state to parents using existing Wave 1–3 primitives. It never authors organism state, never overrides authority, never bypasses safeguarding, never invents certainty.

---

## §1 Capability Review — C4 Parent Voice

**Objective.** Allow parents to understand (a) what the athlete is doing, (b) what the platform knows, (c) what the platform does not know, (d) what action is available — without requiring platform expertise.

**Dependencies.** Wave 1 (`getHammerIdentity`, `classifySilenceZone`) · Wave 2 (`resolveGuidanceSlots`, `resolveHandoff`) · Wave 3 (`resolveOnboardingPresence`, `resolveSetbackGuidance`) · RR-5 (narrative legality) · RR-6 (injury legality) · RR-8 (life-context legality).

**Success criteria.**
- Parents can interpret athlete state through lawful, replay-derived summaries.
- Parents see missingness explicitly (knowns vs unknowns enumerated).
- Parents understand platform limitations (no diagnosis, no prediction, no authorization).
- Parents understand the next lawful action available (handoff target or lawful silence).

**Failure criteria (build-blockers).**
- Hammer invents athlete intent.
- Hammer invents athlete emotions.
- Hammer predicts outcomes.
- Hammer authorizes RTP or any medical/training threshold.
- Hammer bypasses parent supremacy for minors.
- Hammer bypasses safeguarding precedence.
- Hammer authors organism state through any Parent Voice surface.

---

## §2 Parent-State Inventory

Seven parent-facing states. Each resolves through Wave 1 `classifySilenceZone` + Wave 2 `resolveGuidanceSlots`/`resolveHandoff` + Wave 3 onboarding/setback resolvers. **Zero new primitives.**

| # | State | Known inputs | Unknown inputs | Lawful authority | Required silence | Required missingness visibility |
|---|---|---|---|---|---|---|
| 1 | `invited-not-accepted` | invite issued, invite timestamp | acceptance, athlete identity confirmation | invite surface only | no athlete data surfaced | "athlete has not yet accepted; nothing known" |
| 2 | `accepted-no-athlete-activity` | linkage confirmed | any athlete signal | identity + lawful silence | no inferred state | "linkage active; no athlete activity yet" |
| 3 | `accepted-active-athlete` | recent athlete activity counts, lawful Wave 2 handoff | internal organism state, intent, emotion | summary + handoff | none (surface allowed) | "what we see / what we don't see" panel |
| 4 | `accepted-missingness-state` | partial signals, gap intervals | reason for gap, athlete state during gap | summary + lawful handoff | no speculation on cause | gap interval + "reason unknown" |
| 5 | `accepted-recovery-state` | recovery flag (athlete/coach-reported), lawful handoff | RTP readiness, medical clearance, pain trajectory | summary + lawful handoff | no diagnosis, no RTP guidance | "recovery in progress; clearance not a platform decision" |
| 6 | `accepted-onboarding-state` | Wave 3 onboarding descriptor | athlete intent, completion timeline | Wave 3 presence summary | none beyond Wave 3 silence | "onboarding step X of N; no inference about pace" |
| 7 | `accepted-setback-state` | Wave 3 setback descriptor, known/unknown signal arrays | cause, emotional state, prediction | Wave 3 setback summary | none beyond Wave 3 silence | Wave 3 `knownSignals` / `unknownSignals` surfaced verbatim |

**Resolution flow (all states):**
1. Compute athlete-side descriptor via existing Wave 1–3 resolvers.
2. Project descriptor into parent-visible summary fields (factual only).
3. Reuse Wave 2 `resolveHandoff` for any parent-visible next action.
4. If safeguarding active → lawful silence (Wave 1 verdict honored).

---

## §3 Surface Inventory

**Participating surfaces (read-only consumers of existing primitives):**
- Parent Dashboard
- Parent Invite
- Parent Progress
- Parent Recovery Visibility
- Existing guidance infrastructure (Wave 2)
- Existing silence infrastructure (Wave 1)
- Existing identity infrastructure (`getHammerIdentity`)

**Forbidden surfaces / paths:**
- Recruiter surfaces (RR-10 sealed, not implemented)
- Commercial surfaces (RR-10 sealed, not implemented)
- RR-7 (career arc) paths
- RR-9 (exposure/visibility) paths
- RR-10 (recruiter/commercial) paths
- Safeguarding internals
- Authority internals (no reads of `authority_override` / `hard_stop`)
- Emitter infrastructure (no new `emitAsbEvent` calls beyond existing)
- Schema infrastructure (no new tables, columns, projections, migrations)

---

## §4 Parent Voice Behavior Plan

**Allowed verbs:** explain · summarize · guide · route.
**Forbidden verbs:** diagnose · predict · authorize · override · speculate · invent.

### Per-state behavior contract

**1. `invited-not-accepted`**
- Inputs: invite record only.
- Outputs: invite status string, resend handoff candidate.
- Authority limits: no athlete data surfaced even if linkage exists in another tab.
- Required missingness: "athlete has not yet accepted."
- Required uncertainty: none beyond invite status.
- Silence behavior: render nothing about athlete.

**2. `accepted-no-athlete-activity`**
- Inputs: linkage record, zero activity rows.
- Outputs: lawful silence summary + Wave 2 onboarding handoff candidate (if available).
- Authority limits: no inferred state ("athlete is busy", "athlete is resting" both forbidden).
- Required missingness: "linkage active; no activity recorded yet."
- Required uncertainty: total.
- Silence behavior: Wave 1 `lawful` verdict honored.

**3. `accepted-active-athlete`**
- Inputs: recent activity counts, Wave 2 slot output.
- Outputs: factual summary ("X completed actions in last 7 days"), lawful handoff.
- Authority limits: no intent inference, no emotion inference, no performance judgment.
- Required missingness: enumerated "what we don't see" (intent, emotion, off-platform activity).
- Required uncertainty: visible per slot confidence (Wave 2).
- Silence behavior: when Wave 2 returns lawful → render lawful silence panel.

**4. `accepted-missingness-state`**
- Inputs: partial signals, gap interval.
- Outputs: factual gap report + lawful handoff to athlete log surface.
- Authority limits: **no cause speculation** (no "athlete may be injured", no "athlete may have lost interest").
- Required missingness: gap interval + "reason unknown" verbatim.
- Required uncertainty: high; surfaced explicitly.
- Silence behavior: lawful silence when no actionable handoff exists.

**5. `accepted-recovery-state`** *(RR-6 critical surface)*
- Inputs: recovery flag (athlete/coach-reported), lawful Wave 2 handoff.
- Outputs: "recovery in progress" summary + non-RTP handoff (e.g., "log pain", "contact coach").
- Authority limits: **no diagnosis, no RTP authorization, no clearance language, no pain prediction, no recovery timeline.** RR-6 enforced.
- Required missingness: "clearance decisions are not made by the platform."
- Required uncertainty: total on medical state.
- Silence behavior: if safeguarding active → lawful silence; never override.

**6. `accepted-onboarding-state`** *(Wave 3 dependency)*
- Inputs: Wave 3 `OnboardingDescriptor`.
- Outputs: parent-facing projection of Wave 3 descriptor (state label + lawful handoff).
- Authority limits: no pacing judgment, no completion prediction.
- Required missingness: "onboarding step status only; no inference about pace or commitment."
- Silence behavior: Wave 3 lawful verdicts honored verbatim.

**7. `accepted-setback-state`** *(Wave 3 dependency, RR-5/RR-6 critical)*
- Inputs: Wave 3 `SetbackDescriptor` (`knownSignals[]`, `unknownSignals[]`).
- Outputs: factual missingness display + lawful handoff candidate.
- Authority limits: **no invented reason, no emotional framing, no prediction, no narrative authorship (RR-5), no diagnosis (RR-6), no life-context inference (RR-8).**
- Required missingness: `knownSignals` and `unknownSignals` surfaced verbatim from Wave 3 resolver.
- Silence behavior: Wave 3 lawful verdicts honored; safeguarding precedence honored.

### RR enforcement matrix

| Ratification | Enforced via |
|---|---|
| RR-5 (narrative) | No narrative authorship in any parent state; no "story", "journey", "destiny" framing; no invented feelings. |
| RR-6 (injury/recovery) | State 5 + State 7 forbid diagnosis, RTP authorization, clearance language, pain prediction. Athlete-/coach-reported state is surface input only. |
| RR-8 (life context) | No inference about school, family, sleep, mood, social context. Unknown stays unknown. |

---

## §5 Parent Guidance Routing Plan

**Routing primitive:** Wave 2 `resolveHandoff` only. No new routing primitives.

**Parent-visible handoffs (lawful destinations):**
- Resend invite (state 1)
- View athlete onboarding progress (state 2, 6)
- View athlete recent activity (state 3)
- View athlete log gaps (state 4)
- Log support contact / contact coach (state 5, 7) — non-medical, non-RTP
- Lawful silence (any state when Wave 1/Wave 2/Wave 3 returns lawful)

**Lawful routing conditions:** handoff candidate must be returned by `resolveHandoff` under the parent-state inputs; otherwise lawful silence.

**Silence conditions:** safeguarding active · Wave 1 `lawful` verdict · Wave 2 lawful slot · Wave 3 lawful resolver verdict · no qualifying handoff candidate.

**Lineage requirements:** every parent-visible routing decision must be traceable through `getHammerIdentity` + `resolveHandoff` + (when applicable) Wave 3 resolver — replay byte-identical under fixed inputs.

---

## §6 Constitutional Verification Plan

| Concern | Violation vector | Required verification | Build-blocker criteria |
|---|---|---|---|
| **RR-5 narrative** | Parent surface authors story/destiny/feeling | grep parent components for narrative tokens (`feels`, `wants`, `journey`, `destiny`, `story`); unit test asserts factual-only outputs | any narrative token present → block |
| **RR-6 injury** | Parent surface diagnoses / authorizes RTP / predicts recovery | grep for `diagnose`, `cleared`, `RTP`, `ready to return`, `recover by`; unit test on state 5 + 7 | any token present → block |
| **RR-8 life context** | Parent surface infers school/family/sleep/social context | grep for `school`, `family`, `sleep`, `mood`, `social`, `tired`, `stressed` in parent-voice outputs | any inferential token → block |
| **Replay determinism** | Parent-voice outputs vary under fixed inputs | snapshot test: same inputs → byte-identical output | any divergence → block |
| **Parent supremacy** | Coach/recruiter authority overrides parent for minor | code review: no recruiter/coach inputs in parent-state resolution | any non-parent authority read → block |
| **Safeguarding precedence** | Parent surface renders when safeguarding active | unit test: safeguardingActive=true ⇒ lawful silence for all 7 states | any non-silent output → block |
| **Single Hammer authority** | Parent surface uses raw "Hammer" literal or competing identity | grep for raw `Hammer` / `Hammer State` literals outside `getHammerIdentity` import | any raw literal → block |
| **Organism State silence** | Parent surface authors `organism_truth` / `athlete_intent` / `authority_override` / `hard_stop` / `rehabilitation_state` | grep for writes to those keys | any write → block |
| **Demo↔prod firewall** | Parent surface bypasses `prepareRows` visibility scope | code review: all parent rows pass through `prepareRows` with `visibility_scope: "parent"` | any direct bypass → block |

---

## §7 Acceptance Criteria

Measurable only:

1. Deterministic parent-state resolution under fixed inputs (snapshot byte-identical).
2. Missingness visible in states 2–7 (explicit "what we don't see" surfaced).
3. Zero invented athlete intent (grep clean).
4. Zero invented athlete emotion (grep clean).
5. Replay byte-identical across two consecutive resolver invocations.
6. Safeguarding precedence preserved: `safeguardingActive=true` ⇒ lawful silence for all 7 states.
7. Parent supremacy preserved: no recruiter/coach authority input in parent-state resolution.
8. Identity reuse 100% (`getHammerIdentity` exclusive source for Hammer labels).
9. Forbidden-token grep clean: `diagnose|predict|authorize|cleared|guarantee|will recover|feels|wants|RTP|ready to return`.
10. RR-5/RR-6/RR-8 audits green per §6.
11. Wave 1 + Wave 2 + Wave 3 suites remain green and unmodified.
12. Zero new schemas, migrations, projections, emitters, or authority surfaces.

---

## §8 Test Plan

**Coverage matrix:** 7 parent states × {unit, integration, replay, safeguarding, authority, visibility, regression}.

| Class | Coverage |
|---|---|
| Unit | Per-state resolver returns expected descriptor; forbidden fields absent. |
| Integration | Parent surface mounts; renders nothing on lawful verdicts; renders factual summary + lawful handoff otherwise. |
| Replay | Two consecutive invocations under identical inputs → byte-identical output. |
| Safeguarding | `safeguardingActive=true` ⇒ lawful silence for all 7 states. |
| Authority | No reads of `authority_override`/`hard_stop`/`rehabilitation_state`; no writes anywhere. |
| Visibility | All rows routed through `prepareRows` with `visibility_scope: "parent"`; demo↔prod firewall preserved. |
| Regression | Wave 1 (silence) + Wave 2 (handoff + slots) + Wave 3 (onboarding + setback) Vitest suites unchanged and green. |

**Wave 1–3 suites must remain green.** Any red → build-block.

---

## §9 Failure Analysis

| Failure | Detection | Correction | Escalation | Build-blocker |
|---|---|---|---|---|
| Parent trust failure (invented certainty surfaced) | Snapshot diff vs lawful baseline | Remove inference; revert to factual missingness | Phase 31 arbitration | Yes |
| Authority failure (non-parent authority input read) | Code review + grep | Remove input; restrict to parent-scoped projections | Phase 31 arbitration | Yes |
| Missingness failure (unknown collapsed to known) | Unit test on `unknownSignals` preservation | Restore verbatim Wave 3 output | Phase 31 arbitration | Yes |
| Narrative failure (RR-5 violation) | Token grep + unit test | Strip narrative token; revert to factual label | RR-5 escalation | Yes |
| Prediction leakage (forecast surfaced) | Token grep | Strip prediction; surface uncertainty | Phase 31 arbitration | Yes |
| RTP authorization leakage (RR-6 violation) | Token grep on state 5 + 7 | Strip clearance/RTP language | RR-6 escalation | Yes |
| Safeguarding bypass | Unit test under `safeguardingActive=true` | Restore lawful-silence short-circuit | Safeguarding escalation | Yes |
| Parent-supremacy bypass | Code review | Remove non-parent authority dependency | Minor-athlete supremacy escalation | Yes |

---

## §10 Ratification Requirements

**Complete:** all 7 parent-state behaviors specified · all RR enforcement matrix entries defined · all §6 audits planned · all §7 acceptance criteria measurable · all §8 test classes enumerated · all §9 failure modes mapped.

**Verified:** §6 audits green · §7 criteria met · §8 suites green (Wave 1–3 unchanged) · §9 failures all reproducibly detected and corrected.

**Ratified:** sealed entry appended to `.lovable/plan.md` · Wave 4 build authorization issued separately · stop gate confirmed.

---

## §11 Exit Gate

Wave 4 complete only if:

- All 7 parent states verified per §7.
- All §6 constitutional audits pass.
- Zero open escalations.
- **Hammer Critical Stack complete** (C1 + C2 + C3 + C4 + C5 + C6 ratified).
- Ready for **Hammer Critical Stack Validation Audit**.

---

## §12 Stop Gate Confirmation

Wave 4 only. Parent Voice only. No RR-7. No RR-9. No RR-10. No capability additions. No scope expansion. No schema changes. No migrations. No projections. No emitters. No authority changes. No safeguarding changes. No RTP changes. Interpretation layer only.
