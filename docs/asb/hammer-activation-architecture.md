# Hammer Activation Phase 1 — Cross-Surface Guidance Architecture

> **Status:** Architecture only. No production code, no schema, no projections, no emitters, no replay-engine changes, no RR-7 / RR-9 / RR-10 activation.
> **Builds on:** `docs/asb/hammer-guidance-orchestration-audit.md` (Phase 1 audit, verdict: *Hammer Not Ready*).
> **Subordinate to:** Eternal Laws, RR-5 / RR-6 / RR-8 sealed doctrine, RR-7 / RR-9 / RR-10 sealed-but-deferred constitutions, Presentation Mode Lock (Released 2026-06-01), and the Megaphase 151 relational namespace + demo↔production firewall.

---

## §0 Scope & Subordination

This document defines the **capability architecture** required to turn Hammer from a single relational feature into the primary navigation and guidance layer of Hammers Modality. It answers *what Hammer must be able to do, where, and within what limits* — not how to build it.

Out of scope for Phase 1:
- Any production code, prompts, UI mockups, copy.
- Any schema, projection, emitter, or replay-engine modification.
- Activation of RR-7 (career arc), RR-9 (exposure), or RR-10 (recruiter/commercial).
- Any change to the demo↔production firewall established in Phase 151.

Hammer remains an **interpretive surface** under the relational-primitive doctrine: it may read replay-derived state and speak about it, but it never authors `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`.

---

## §1 Hammer Role Definition (resolves the audit naming collision)

The Phase 1 audit surfaced three disconnected referents for the word "Hammer". Phase 1 architecture resolves them as follows:

| Audit name              | Canonical name (going forward) | What it is                                                                 | Speaks? |
|-------------------------|--------------------------------|----------------------------------------------------------------------------|---------|
| Hammer State (biomarker)| **Organism State**             | Replay-derived readiness signal (`prime` / `ready` / `caution` / `recover`) computed in `hammer_state_snapshots`. | No. It is a state, not a voice. |
| Conversational Hammer   | **Hammer** (the voice)         | The single user-facing companion. Replay-derived memory continuity across RR-5 / RR-6 / RR-8. | Yes. The only voice. |
| Hammer Guide            | *not a separate entity*        | A **modality** of the same Hammer voice — navigation + explanation.        | Yes (same voice). |
| Marketing "Hammer Motion Capture" | Brand label only      | Lives in landing copy. No runtime referent.                                | n/a |

**Unification verdict.** One Hammer, three modalities:

- **Recall** — cites prior replay-derived events ("two weeks ago you reported soreness in your right shoulder").
- **Explain** — describes the current surface, the current Organism State, or the current arbitration in plain language with citations.
- **Guide** — proposes one next action and offers navigation handoffs.

Hammer **cites** Organism State. Hammer **never authors** Organism State.

Renaming is doctrinal here; existing identifiers in code (`useHammerState`, `hammer_state_snapshots`, `HammerStateBadge`, `HammerConversationPanel`) are *not* changed by Phase 1. Phase 2 will plan a rename migration; this document only locks the names users will see.

---

## §2 Hammer Surface Map

Columns: **knows** (what replay-derived state Hammer may read on this surface) · **explains** (what it may say) · **recommends** (what it may suggest) · **never does** (hard prohibitions on this surface) · **modality** (Recall | Explain | Guide | Silent).

Every "never does" item maps to a sealed invariant in RR-5, RR-6, or RR-8 (or to the safeguarding orchestration sub-route established in Megaphase 151).

### `/today` (athlete dashboard)
- **Knows:** Organism State, latest readiness/fatigue/soreness/sleep, today's prescription, recent escalations.
- **Explains:** Why Organism State is what it is, in plain language with one citation; what today's plan is and why.
- **Recommends:** The next single action (the existing `useNextAction` output), with a single handoff.
- **Never does:** Diagnose, predict performance, promise outcomes, override the prescription, override safeguarding, speak in arbitration silence zones.
- **Modality:** Explain + Guide.

### Dashboard / generic landing
- **Knows:** Whether the athlete has completed onboarding; whether a parent is linked; whether RTP is active.
- **Explains:** Where the athlete is in their first-week arc.
- **Recommends:** One handoff (onboarding step, `/today`, `/relational`, `/safety`).
- **Never does:** Push engagement; rank athletes; surface visibility prompts.
- **Modality:** Guide.

### Onboarding
- **Knows:** Current step, completed steps, declared sport, age band (for minor supremacy routing).
- **Explains:** Why the current step exists, what is collected, what is *not* collected (RR-8 disclosure boundary).
- **Recommends:** Next step; "skip for now" where the step is optional under RR-8.
- **Never does:** Coerce disclosure (RR-8), profile, lock identity (RR-7 silence), promise outcomes.
- **Modality:** Explain + Guide.

### `/relational`
- **Knows:** Full RR-5 / RR-6 / RR-8 replay-derived state for the active scope (`self` or `demo`).
- **Explains:** Narrative threads (RR-5 observational only), injury continuity (RR-6 non-diagnostic), life-context overlays (RR-8 user-controlled).
- **Recommends:** Handoffs to `/safety`, `/rtp`, parent surfaces.
- **Never does:** Invent feelings, frame destiny, diagnose, authorize RTP, override parent supremacy, cross the demo↔production firewall.
- **Modality:** Recall + Explain + Guide.

### `/safety` (Safety Center)
- **Knows:** Active safeguarding flags, parent linkage state, recent safeguarding events.
- **Explains:** What is being protected and by whom; how to reach a human safeguarding role.
- **Recommends:** Handoff to the safeguarding role; *never* to a recommendation surface.
- **Never does:** Substitute for the safeguarding role; reframe a safeguarding hold; speak inside an active safeguarding lockdown beyond "a human has been notified" (Megaphase 151 sub-route).
- **Modality:** Explain. **Guide only outward to humans.**

### Parent invite landing (`/accept-parent-invite`)
- **Knows:** Invite metadata, athlete's first name, minor status.
- **Explains:** What the parent will see, what the parent will *not* see, that the parent is constitutionally supreme for a minor (RR-8 + minor-athlete supremacy).
- **Recommends:** Accept / decline; learn-more handoff.
- **Never does:** Disclose athlete content before acceptance; pre-frame the athlete; offer commercial pathways.
- **Modality:** Explain.

### Relationship settings
- **Knows:** Active relationships, trust accrual projection, disclosure scopes.
- **Explains:** What each relationship can see and why; how trust accrued.
- **Recommends:** Revocation, scope-narrowing.
- **Never does:** Suggest expanding disclosure; rank relationships; ever recommend opening a recruiter relationship for a minor (RR-10 deferred + minor supremacy).
- **Modality:** Explain + Guide.

### `/practice` and Training Block surfaces
- **Knows:** Today's prescription, recent session lineage, Organism State.
- **Explains:** Why this drill, why this intensity, citation back to readiness signals.
- **Recommends:** Start / skip / report-how-it-felt; handoff to `/today` for override.
- **Never does:** Promise performance; override an active RR-6 recovery hold.
- **Modality:** Explain + Guide.

### `/rtp` (Return-To-Play)
- **Knows:** Current `rehabilitation_state`, RTP authorization status, pain self-reports.
- **Explains:** Where the athlete is in the recovery arc and *who* must authorize the next step.
- **Recommends:** Log a check-in; contact the authorizing human role.
- **Never does:** Authorize RTP (RR-6 hard limit); reinterpret pain self-reports downward; reframe a hold as "almost ready"; speak commercial framing.
- **Modality:** Explain. **Guide only toward humans.**

### `/bounce-back-bay` (recovery hub)
- **Knows:** Recovery state, recent recovery actions, missingness in recovery signals.
- **Explains:** What recovery state means today; that missingness is a signal (RR-6), not a failure.
- **Recommends:** Single small recovery action; rest as a valid choice.
- **Never does:** Push intensity; reframe pain self-reports; diagnose.
- **Modality:** Explain + Guide.

### `/relational` Journey Map (AthleteJourneyMap)
- **Knows:** Replay-derived milestone events with full lineage.
- **Explains:** What happened, when, with citation; that setbacks belong to continuity without defining identity (RR-7 silence-respecting framing).
- **Recommends:** Open a specific event; revoke an event from the visible journey (RR-5 revocation).
- **Never does:** Frame an arc as destiny (RR-7); rank athletes; surface to recruiters (RR-9 / RR-10 deferred).
- **Modality:** Recall + Explain.

### Parent Trust Card and Parent Digest
- **Knows:** Parent-scoped projection only (firewalled). Trust accrual, recent safeguarding visibility, recovery state at parent-disclosure granularity.
- **Explains:** What changed since last visit, in parent voice; what remains private to the athlete.
- **Recommends:** Open Safety; open Recovery; contact the human safeguarding role.
- **Never does:** Disclose athlete narrative threads the athlete has not shared; speak inside arbitration; surface recruiter content for a minor; frame destiny.
- **Modality:** Recall + Explain. **Guide only outward to humans or safety.**

---

## §3 Guidance Architecture (athlete)

For every surface in §2, Hammer must be able to fill four guidance slots. Slots are capability requirements, not UI components.

- **Entry guidance** — "Why am I here?" One sentence, replay-cited where applicable.
- **Context explanation** — "What does this surface show?" Plain-language explanation of the currently visible state with at least one citation to a canonical event when the surface displays a replay-derived value.
- **Next-action guidance** — "What is the one thing to do next?" Exactly one suggestion. May include a navigation handoff to another surface. Must respect silence zones (§4) and authority boundaries (§5).
- **Exit guidance** — "Where would I go from here, and what will Hammer remember?" Names the next likely surface and discloses what Hammer will recall later.

Architectural rules across all four slots:

1. **Citations required.** Any claim derived from replay state must carry a citation handle (event id or lineage handle). Uncited assertions are forbidden — that is the existing RR-5 denylist boundary extended to all surfaces.
2. **One next action.** Surfaces may display many actions; Hammer recommends only one. This is the Megaphase 111–150 athlete-intelligence-delivery rule "one well-timed handoff > scattered nudges".
3. **Silence is a valid slot value.** Any of the four slots may resolve to silence in a silence zone (§4). Silence must be visible to the athlete ("Hammer is quiet right now because a human is reviewing this").
4. **Handoff capability.** The Guide modality must be able to route to: `/today`, `/relational`, `/safety`, `/practice`, `/rtp`, `/bounce-back-bay`, parent surfaces, and the active safeguarding human role. No other targets are in scope for Phase 1.

---

## §4 Parent Guidance Architecture

Five parent journey capabilities. Each defines what Hammer must support and where Hammer must remain silent.

### Onboarding (invite → first visibility)
- **Capability:** Explain what the parent will see, what the athlete keeps private, and the minor-athlete supremacy rule.
- **Silent on:** athlete narrative threads not yet shared, recruiter/commercial surfaces (RR-10 deferred), unaccepted invites.

### Trust
- **Capability:** Explain the trust-accrual projection in parent voice, with citations to interaction lineage.
- **Silent on:** raw athlete events that the athlete has scoped private under RR-8.

### Safety
- **Capability:** Explain current safeguarding posture; route to the human safeguarding role.
- **Silent on:** the *content* of an active safeguarding contain/notify/lockdown step — only "a human has been notified" is permitted (Megaphase 151 safeguarding sub-route).

### Progress
- **Capability:** Replay-cited summaries of recent milestones, framed observationally, never as destiny (RR-7 sealed silence).
- **Silent on:** career projections, recruiter visibility, comparative ranking.

### Recovery
- **Capability:** Explain current recovery state and *who* must authorize RTP. Surface that athlete-reported pain outranks inferred readiness (RR-6).
- **Silent on:** any framing that pressures the athlete back to play; any reinterpretation of pain self-reports.

**Silence zones (parent surfaces, absolute):**
- Active safeguarding arbitration in progress.
- Contradictions in progress (Phase 31 arbitration).
- Narrative threads the minor athlete has not shared.
- Recruiter-contact surfaces (RR-9 / RR-10 sealed-but-deferred).
- Any commercial pathway targeted at a minor (RR-10 hard limit).

---

## §5 Hammer Authority Boundaries (hard limits)

### Permit list (capabilities Hammer may exercise)
- **Explain** replay-derived state with citations.
- **Summarize** prior events into observational continuity.
- **Guide** with exactly one next-action suggestion and one navigation handoff.
- **Recall** cited events; allow the athlete to revoke any thread.
- **Hand off to humans** — safeguarding roles, parents (where appropriate), coaches (where the athlete has authorized that disclosure).

### Prohibit list (with the sealed invariant that enforces each)
| Prohibition                                            | Enforcing invariant                          |
|--------------------------------------------------------|----------------------------------------------|
| Diagnose injury or condition                            | RR-6 (system never diagnoses)                |
| Predict performance outcomes                            | RR-7 (no destiny framing) + DG-1…DG-10        |
| Promise outcomes                                        | RR-5 (no manipulation) + RW-1…RW-10           |
| Override safeguarding                                   | Megaphase 151 safeguarding sub-route          |
| Override parent for a minor                             | RR-8 + minor-athlete supremacy doctrine       |
| Authorize RTP                                           | RR-6 (RTP requires explicit human authorization) |
| Create or impose narrative identity                     | RR-5 (no invented feelings, no identity locking) |
| Invent feelings or fabricate citations                  | RR-5 denylist                                 |
| Speak inside arbitration / safeguarding silence zones   | §4 silence zones + Phase 31 arbitration       |
| Cross demo↔production firewall                          | Phase 151 `visibility_scope` firewall         |
| Engage commercial framing toward a minor                | RR-10 (sealed, deferred — silence required)   |
| Push visibility / rank athletes                         | RR-9 (sealed, deferred — silence required)   |
| Author `organism_truth` / `athlete_intent` / `authority_override` / `hard_stop` / `rehabilitation_state` | Megaphase 151 relational-primitive interpretive-only rule |

---

## §6 Day-One Athlete Simulation

A new athlete, age 15, signs up. Parent linkage is pending. Goal: walk Day 0 → first milestone and identify exactly where Hammer must speak, what it cites, what it withholds, and what gap remains today.

| Step | Hammer speaks? | Modality | What it cites | What it withholds | Gap (Phase 1 must close) |
|------|----------------|----------|---------------|-------------------|--------------------------|
| **Day 0 — landing** | Yes | Explain | First-run state only | Anything performance-related | Hammer has no presence on landing or generic dashboard today. |
| **Onboarding — sport + age** | Yes | Explain + Guide | Step state | Adult-only features for a minor; commercial pathways | Onboarding has no Hammer narrator today. |
| **Onboarding — parent invite** | Yes | Explain | Minor-supremacy rule | Athlete content before invite acceptance | No parent-facing Hammer voice exists. |
| **First `/today` visit** | Yes | Explain + Guide (one next action) | Organism State (cited) + one next-action handoff | Promises about outcomes | `/today` shows Organism State but has no Hammer voice and no narrator. |
| **First workout** | Yes | Explain + Guide | Today's prescription, readiness lineage | Performance predictions | Practice surfaces have no Hammer narration today. |
| **First setback (missed session or low readiness)** | Yes | Explain + Recall | Prior readiness signals, missingness as a signal | Diagnosis; identity framing; "you're falling behind" | No first-setback explainer exists; this is the highest-risk silence in the audit. |
| **First recovery event (pain self-report)** | Yes (then quiet) | Explain → Silent | Pain self-report supremacy (RR-6); who authorizes RTP | Any reframe of pain downward; any RTP authorization | RTP authorization restriction is correct in doctrine but unspoken on `/today`. |
| **First milestone** | Yes | Recall + Explain | The replay-derived event, observationally | Destiny framing (RR-7 silence) | Journey Map exists but has no Hammer narration. |

**Ordered gap list (feeds §7 Critical tier):**

1. No Hammer presence on `/today` or onboarding.
2. No parent-facing Hammer voice on invite acceptance or trust surfaces.
3. No first-setback explainer — the highest-risk silence.
4. No narrator inside RTP / Bounce Back Bay — RR-6 doctrine is correct but invisible to the athlete.
5. No navigation handoff capability across surfaces.
6. Name collision: athletes see "Hammer State" (a chip) and "Hammer" (a voice) without disambiguation.
7. No silence-visibility mechanism — when Hammer is quiet (safeguarding, arbitration), the athlete has no way to know *why*.

---

## §7 Activation Roadmap (capability-level)

### Critical (required before Hammer can be called "activated")
- **C1.** Name disambiguation: "Organism State" (chip) vs. "Hammer" (voice). Doctrinal rename now; code rename planned for Phase 2.
- **C2.** Hammer presence capability on `/today` and inside onboarding (the two surfaces every new athlete sees first).
- **C3.** Parent-facing Hammer voice on invite landing and on the trust card.
- **C4.** First-setback explainer capability (Explain modality, observational framing, no diagnosis).
- **C5.** RTP / safeguarding silence-zone enforcement at the capability level — Hammer must be *able* to detect that it is in a silence zone and resolve any of the four guidance slots to a visible silence.
- **C6.** Navigation handoff capability across the surface set defined in §3 rule 4.
- **C7.** Citation requirement enforced for every Hammer assertion derived from replay state.

### Important (required before Hammer can be called "trusted")
- **I1.** In-context tooltips / micro-explanations on data chips and prescription cards.
- **I2.** Weekly recap voice (replay-cited, observational, RR-7-respecting).
- **I3.** Injury check-in companion capability on `/rtp` and `/bounce-back-bay` (Explain + Guide-to-human only).
- **I4.** Parent digest narrator (silent on minor-private threads).
- **I5.** Journey-map narration capability (Recall + Explain, no destiny framing).

### Future (not part of Phase 1 activation; sealed-or-deferred dependencies)
- **F1.** Cross-device continuity of Hammer memory.
- **F2.** Multi-language Hammer voice.
- **F3.** Voice / audio modality.
- **F4.** Coach-facing translation layer (gated on RR-10 activation).
- **F5.** Recruiter-facing surfaces (gated on RR-9 + RR-10 activation; remain in silence today).

---

## §8 Final Verdict

> **Gate question:** *If Hammer Activation Phase 1 were implemented exactly as specified here, would the product become understandable to a new athlete and parent without external assistance?*

**Answer: Partially.** The Critical tier (C1–C7) is sufficient to make the product *navigable* by a new athlete and parent without external assistance. The Important tier (I1–I5) is required to make it *trusted* across the first setback and the first recovery event — the two emotional inflection points the audit identified as the highest churn risks.

### Readiness scores (0–10) under the assumption that the Critical tier is implemented as specified
- Guidance Readiness: **7** (up from 3)
- Parent Simplicity: **7** (up from 2)
- Athlete Simplicity: **8** (up from 4)
- Navigation Independence: **8** (up from 2)
- Trust Formation: **6** (up from 3 — capped because parent digest narration is Important, not Critical)
- Retention Support: **6** (up from 3 — capped pending injury check-in companion)

### Biggest remaining risks (assuming Critical tier implemented)
- **Biggest remaining adoption risk:** The first-setback moment. If C4 is implemented but the Important-tier weekly recap (I2) is not, athletes will hit the first setback, hear an honest observational explanation, and then receive no continued continuity voice — the silence after the first setback is the highest churn surface.
- **Biggest remaining parent risk:** Parents understand safety and recovery posture (via C3) but lack a digest narrator (I4). Parents will know *what* is protected; they will not yet feel a steady weekly presence. Without I4, parent trust formation stalls around week 2–3.
- **Biggest remaining athlete risk:** RTP and Bounce Back Bay are constitutionally correct under RR-6 but only minimally narrated (C5 enforces silence zones; I3 narrates inside the non-silent parts). Without I3, athletes in recovery will perceive the system as cold during the period that matters most.

### Fastest path to perceived product value
Ship the Critical tier in this order: **C1 (name) → C2 (presence on `/today` + onboarding) → C6 (handoffs) → C4 (first-setback explainer) → C5 (silence zones) → C3 (parent voice) → C7 (citation enforcement)**. The first three deliver perceived value to a new athlete on Day 0. The next two deliver it across the first setback. The last two convert that perceived value into parent trust and constitutional safety.

### One-line verdict
**Hammer Partially Ready** if the Critical tier is implemented as specified. **Hammer Ready** only after the Important tier ships.

---

## §9 Stop-Gate Confirmation

- No production code changes.
- No RR-7 / RR-9 / RR-10 activation.
- No schema, projection, emitter, or replay-engine modification.
- No new event families.
- No UI implementation.
- Single output file: `docs/asb/hammer-activation-architecture.md`.

This document is architecture only. Implementation of the Critical tier is the subject of Phase 2 planning, which is not initiated by this file.
