# Hammer Critical Capability Map — Activation Phase 2

**Status:** Architecture-only. No code, schema, projections, emitters, prompts, or UI.
**Subordination:** Eternal Laws → RR-5 (Narrative Continuity, ratified) → RR-6 (Injury Continuity, ratified) → RR-8 (Life Context, sealed). RR-7 / RR-9 / RR-10 remain sealed-but-deferred and are not activated by this document.
**Builds on:** `docs/asb/hammer-guidance-orchestration-audit.md`, `docs/asb/hammer-activation-architecture.md`.
**Scope:** Convert the Activation Architecture's Critical tier into an implementation-ready capability inventory. Capabilities only — no implementation guidance.

---

## §0 Objective

Define the minimum Hammer capability set required for:

- **Athlete clarity** — a first-time athlete understands what they are looking at and what to do next without prior platform exposure.
- **Parent trust** — a parent understands what Hammer can see, what it cannot, and where authority sits, on first contact.
- **Onboarding simplicity** — the path from invite → first useful signal is navigable by voice alone.
- **Navigation independence** — the user is never required to know a route name, a tab name, or an internal concept (e.g. "Bounce Back Bay") to reach the next correct surface.

### Gate question

> *"If a first-time athlete and parent enter the platform today, can Hammer successfully guide them without requiring platform knowledge?"*

If the answer is no for either persona, the platform is not adoption-ready.

---

## §1 Critical Capability Inventory (C1–C7)

### C1 — Name Disambiguation

- **Objective:** Resolve the three-way naming collision so every surface refers to exactly one of: *Organism State* (biomarker), *Hammer* (voice), or the marketing label.
- **Athlete value:** A single mental model — "the chip tells me my state, the voice helps me act on it." No cognitive overload from one word doing three jobs.
- **Parent value:** Vocabulary they can trust — when Hammer "says" something, parents know it is the guide, not a biomarker score animating itself.
- **Existing dependencies:** Activation Architecture §1; RR-5 (single narrator identity); relational namespace doctrine (one voice, replay-derived).
- **Current coverage:** Conversational voice exists (`HammerConversationPanel`); biomarker exists (`useHammerState.overall_state`); marketing label exists. No disambiguation layer.
- **Missing coverage:** Doctrinal rename of the biomarker to *Organism State* across user-facing copy; reservation of *Hammer* exclusively for the voice; brand label scoped to marketing surfaces only.
- **Readiness score:** **1 / 10**

### C2 — Hammer Presence on Today

- **Objective:** Place a Hammer voice surface on `/today` with Entry / Context / Next-action / Exit slots, citing Organism State and readiness.
- **Athlete value:** First daily touchpoint is explained, not displayed. The user is told *why* they are here, *what* the surface means, *one* thing to do, and *where* to go next.
- **Parent value:** Indirect — confirms the athlete is being guided rather than scored at.
- **Existing dependencies:** C1 (cannot speak as "Hammer" before the name is freed); RR-5 (cited recall only); RR-6 silence rules for safeguarding states.
- **Current coverage:** `/today` exists with biomarker chip, readiness signals, and `useNextAction` heuristic. No Hammer voice surface present.
- **Missing coverage:** Voice-layer capability on Today; capability to render the four slots from replay-derived state; capability to defer to silence under RR-6 conditions.
- **Readiness score:** **2 / 10**

### C3 — Hammer Presence During Onboarding

- **Objective:** Hammer narrates the athlete's first session and the parent's invite landing, end-to-end, with cited rationale.
- **Athlete value:** First five minutes feel like orientation, not configuration. The user never hits an unexplained field.
- **Parent value:** Invite landing carries a voice that frames what the parent is about to see, in plain language, before any data is shown.
- **Existing dependencies:** C1; C4 (parent voice variant); RR-8 disclosure controls; relational onboarding flow doc.
- **Current coverage:** Onboarding screens exist; no Hammer narration; `AcceptParentInvite.tsx` has no voice layer.
- **Missing coverage:** Onboarding-scope Hammer modality; parent-invite-scope Hammer modality; capability to advance / pause based on user comprehension signals (not just clicks).
- **Readiness score:** **1 / 10**

### C4 — Parent-Facing Hammer Voice

- **Objective:** A parent-scope Hammer voice on invite landing, ParentTrustCard, and parent digest — bounded by RR-8 disclosure and minor-supremacy doctrine.
- **Athlete value:** Indirect — the athlete benefits from a parent who understands the system without needing the athlete to translate.
- **Parent value:** Direct trust surface. Parent hears what Hammer can see, what it cannot, where parental authority sits, and what the silence zones are.
- **Existing dependencies:** C1; RR-8 disclosure; RR-6 safeguarding precedence; minor-athlete supremacy (Phase 151).
- **Current coverage:** `ParentTrustCard` renders status; no narrator voice; no invite-landing narration; no digest narrator.
- **Missing coverage:** Parent-scope voice surface; capability to enforce silence zones (active arbitration, minor-private threads); capability to cite without revealing minor-private content.
- **Readiness score:** **1 / 10**

### C5 — First Setback Guidance

- **Objective:** When readiness first drops, or check-in first flags pain, Hammer responds with a cited RR-5/RR-6-bound explanation and exactly one next action.
- **Athlete value:** The most emotionally loaded moment of early use is met with continuity, not a red badge. The user learns that the system notices and explains.
- **Parent value:** Mediated through the parent digest — parent sees that a setback was acknowledged and handled, not buried.
- **Existing dependencies:** C1; C2 (Today presence is the entry point); C6 (must hand off to /safety or /bounce-back-bay); RR-6 (pain self-report supremacy, no RTP authorization, no diagnosis); RR-5 (no destiny framing, no invented feelings).
- **Current coverage:** Readiness state computed; safety classifier exists; no first-setback narrator; no replay-cited explainer.
- **Missing coverage:** Capability to detect "first" setback (vs. nth); capability to render explanation with citations; capability to enforce one-action discipline; capability to escalate to silence under safeguarding arbitration.
- **Readiness score:** **2 / 10**

### C6 — Navigation Handoff Capability

- **Objective:** Hammer can route the user to `/safety`, `/practice`, `/rtp`, `/bounce-back-bay`, and equivalent surfaces — *as a handoff*, never as an authored action.
- **Athlete value:** Removes the requirement to know route names. The user follows voice, not URLs.
- **Parent value:** Indirect — confirms the athlete is moved between surfaces by a guide, not lost in tabs.
- **Existing dependencies:** C1; C7 (must respect silence zones at handoff time); RR-6 (no RTP authorization through handoff); minor-supremacy (no parent-bypass handoffs for minors).
- **Current coverage:** Routes exist; navigation is user-initiated via tabs. No voice-mediated handoff.
- **Missing coverage:** Capability for Hammer to *recommend* a route with cited rationale; capability to refuse handoff in silence zones; capability to log handoff as replay-visible interaction (interpretive only — never authority).
- **Readiness score:** **2 / 10**

### C7 — RTP / Safeguarding Silence Enforcement

- **Objective:** Hammer is structurally silent during safeguarding arbitration, active RTP authorization, minor-private narrative threads the athlete has not shared, and recruiter-contact surfaces (RR-10 deferred, but boundary is reserved now).
- **Athlete value:** The voice is trustworthy precisely because it stops talking when it must. Safety is felt, not announced.
- **Parent value:** Parent learns the silence boundary by observing it — Hammer never speaks over an arbitration or a parent-authorized RTP gate.
- **Existing dependencies:** Activation Architecture §4 silence zones; RR-6 (RTP requires explicit human authorization); RR-5 (athlete may revoke any narrative thread); Phase 151 minor-athlete supremacy; safeguarding orchestration sub-route.
- **Current coverage:** Safeguarding classifier exists (`useSafetyState`); no enforcement that Hammer voice surfaces fall silent in those states.
- **Missing coverage:** Capability for every Hammer surface to consult silence-zone state before rendering; capability to render a *visible non-speech* mode (so silence is legible, not absence); capability to escalate without speaking.
- **Readiness score:** **3 / 10**

---

## §2 Surface Dependency Matrix

| Surface | Hammer present? | Hammer absent? | Knows enough? | Can explain enough? | Can guide enough? | Status |
|---|---|---|---|---|---|---|
| Today | No | Yes | Yes (Organism State, readiness, next-action heuristic) | No | No | **RED** |
| Dashboard | No | Yes | Partial | No | No | **RED** |
| Onboarding | No | Yes | No | No | No | **RED** |
| Relational | Yes (conversational) | No | Yes (RR-5/6/8 substrate) | Yes | Partial (no cross-surface handoff) | **YELLOW** |
| Safety | No (silent by policy) | Correct — silence zone | Yes (classifier) | Must not | Must not | **GREEN** (silence intentional) |
| Parent (invite, trust card, digest) | No | Yes | Partial | No | No | **RED** |
| Practice | No | Yes | Partial | No | No | **RED** |
| Training Block | No | Yes | Partial | No | No | **RED** |
| RTP | No (silent by policy) | Correct — silence zone | Yes (state present) | Must not | Must not | **GREEN** (silence intentional) |
| Bounce Back Bay | No | Yes | Partial | No | No | **RED** |

Legend: **GREEN** = correct as-is (presence or silence). **YELLOW** = present but incomplete. **RED** = required and absent.

---

## §3 Adoption Impact Analysis

| Capability | Trial conversion | Parent trust | Athlete retention | Onboarding completion | Navigation independence |
|---|---|---|---|---|---|
| C1 Name Disambiguation | **High** — removes first-30-second confusion | **High** — trustable vocabulary | Medium — compounding clarity | **High** — removes the largest comprehension tax | **High** — every other capability depends on it |
| C2 Today Presence | **High** — first daily surface explained | Medium — observed via athlete | **High** — daily re-engagement loop | Medium | **High** — Today is the navigation root |
| C3 Onboarding Presence | **High** — closes the cold-start gap | **High** — parent's first impression | High | **High** — direct cause | High |
| C4 Parent Voice | Medium | **High** — primary trust surface | Medium (parent gates renewal for minors) | High | Low (parent rarely navigates) |
| C5 First Setback Guidance | Medium | **High** — visible safeguarding behavior | **High** — emotional inflection point | Low | Medium |
| C6 Navigation Handoff | **High** — eliminates route literacy | Medium | **High** — reduces dead-ends | High | **High** — definitional |
| C7 Silence Enforcement | Low | **High** — trust is built by what is *not* said | Medium | Low | Medium (handoff legality depends on it) |

---

## §4 Capability Dependency Order

Strict precedence — a capability is not useful until its predecessors are in place.

```text
                   C1  Name Disambiguation
                   │
       ┌───────────┼───────────┬────────────────┐
       ▼           ▼           ▼                ▼
       C2          C3          C7               (parent
       Today       Onboarding  Silence            scope
       Presence    Presence    Enforcement        of C3)
       │           │           │                  │
       │           │           ▼                  ▼
       │           │           C6 Navigation     C4 Parent
       │           │           Handoff           Voice
       │           │           │
       └─────┬─────┘           │
             ▼                 │
             C5 First Setback ◄┘
             Guidance
```

**Edge rationale:**

- **C1 → everything:** Without disambiguation, any voice surface inherits the three-way collision and immediately fails the gate question.
- **C1 → C2, C3:** Today and Onboarding cannot host a "Hammer" voice until "Hammer" means one thing.
- **C1 → C7:** Silence is only meaningful when it is clear *who* is silent.
- **C7 → C6:** Handoff legality requires silence-zone awareness; a handoff into a silence zone is itself a breach.
- **C2 + C3 → C5:** First-setback guidance fires on a daily surface during early use — both contexts must exist.
- **C6 → C5:** Setback guidance must hand off; without handoff capability the explainer becomes a dead end.
- **C1 → C4:** Parent voice requires the same name boundary as the athlete voice.
- **C3 (parent scope) → C4:** Parent voice on invite landing is the entry point; the trust card and digest extend it.

---

## §5 Readiness Gate

Three launch gates, each with exact capability requirements. A gate is met only if every listed capability reaches its activation threshold (defined by the Activation Architecture §7 Critical tier, not by this document).

### Launch Gate A — Internal rehearsal only
- **Required:** C1 + C7
- **Rationale:** Internal users can tolerate missing voice surfaces, but doctrinal naming and silence boundaries must hold or rehearsal data is poisoned for later phases.

### Launch Gate B — Athlete-facing closed beta
- **Required:** C1 + C2 + C3 + C6 + C7
- **Rationale:** Athlete can enter, be oriented, see a daily surface explained, and be routed — without parent-facing surfaces being load-bearing.

### Launch Gate C — Public launch (athlete + parent)
- **Required:** C1 + C2 + C3 + C4 + C5 + C6 + C7 (full Critical tier)
- **Rationale:** This is the minimum subset before public launch becomes rational. Anything less fails the gate question for at least one persona.

**Minimum public-launch subset: Gate C.** No capability may be deferred below Gate C without re-opening the gate question and accepting a documented adoption deficit.

---

## §6 Final Recommendation

**Build C1 — Name Disambiguation first.** No ties.

Justification:

- It is the only universal prerequisite — C2, C3, C4, C6, and C7 all structurally depend on it.
- Highest leverage for conversion and confusion reduction at the lowest scope: it is doctrinal + copy + boundary, not new runtime intelligence.
- Every other capability inherits its clarity. Shipping any of C2–C7 before C1 wastes the work, because each will need to be rewired once the name boundary moves.
- It directly addresses the largest finding from the Phase 1 audit (the three-way collision) and the most-cited risk from the Activation Architecture (vocabulary trust).

---

## §7 Verdict

- **Readiness score:** **3 / 10**
- **Current launch readiness:** **Not Ready**

The platform currently fails the gate question for both personas. The biomarker, the voice, and the brand label all share one word, which prevents any cross-surface voice from speaking coherently. Of the seven Critical capabilities, only C7 (silence enforcement) is partially honored — and only because the relevant surfaces are silent by accident, not by enforced doctrine. Today, Onboarding, and every parent-facing surface lack a Hammer voice entirely, so a first-time athlete or parent must rely on prior platform knowledge to navigate. The minimum rational public-launch subset is the full Critical tier (Gate C); the fastest path to closing the gap is to build C1 first and let every other capability inherit a stable name boundary.

---

## §8 Stop Gate Confirmation

- No production code changes.
- No schema changes.
- No projection changes.
- No emitter changes.
- No replay-engine changes.
- No UI changes.
- No prompts.
- No new primitives.
- No RR-7 / RR-9 / RR-10 activation.
- Single output file: this document.
