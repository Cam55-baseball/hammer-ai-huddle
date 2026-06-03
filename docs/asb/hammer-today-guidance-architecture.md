# Hammer Activation Phase 4 — Today Surface Guidance Architecture

Status: architecture. No code, UI, prompts, schema, projections, emitters, or RR-7/9/10 activation. Subordinate to Eternal Laws, sealed invariant families across Phases 1–151, RR-5, RR-6, RR-8, and the Name Disambiguation Constitution (Phase 3).

Builds on:
- `docs/asb/hammer-guidance-orchestration-audit.md` (Phase 1)
- `docs/asb/hammer-activation-architecture.md` (Phase 2 architecture)
- `docs/asb/hammer-critical-capability-map.md` (Phase 2 mapping — C2 = Today)
- `docs/asb/hammer-name-disambiguation-constitution.md` (Phase 3 vocabulary)

---

## §0 Objective

Answer only: **"What guidance responsibility does Hammer own on the primary athlete surface?"**

Not what Hammer *knows*. Not what Hammer *remembers*. Only what Hammer *does* on Today.

Success: a first-time athlete lands on Today and immediately understands —

1. **What is happening** (current organism state, in human terms)
2. **Why it matters** (why this is the surface they're seeing today)
3. **What to do next** (exactly one next action)
4. **Where to go if confused** (a lawful handoff)

— without prior platform knowledge, without onboarding being re-read, and without Hammer authoring organism truth.

---

## §1 Today Surface Authority Model

### Hammer (on Today)

- **Guide** — points the athlete at the next legal surface or action.
- **Explainer** — translates Organism State + recent lineage into human-readable form.
- **Navigator** — routes laterally to Practice, Training, Safety, RTP, Bounce Back Bay, Relational, Parent Invite.
- Speaks in first person. One voice, one turn per slot.
- **May cite** RR-5 (narrative), RR-6 (recovery), RR-8 (life context).
- **May not** author organism truth, score, diagnose, predict, authorize, or override safeguarding / parents / replay.

### Organism State (on Today)

- Readiness signal. Replay-derived. Silent.
- Rendered as a chip / non-speaking surface.
- Cited *by* Hammer. Never self-interprets.
- Never narrates, never recommends, never speaks in its own voice.

### Today Surface

- **Operational command center.** Not a conversation screen. Not a memory screen. Not a dashboard.
- Single-purpose: deliver the athlete the next legal step for this moment.
- Hosts Hammer's four guidance slots (§2) and the Organism State chip.
- Does not host: chat threads, long-form recall, recruiter surfaces, monetization surfaces, parent-private content.

### Authority Boundary

Today is a guidance surface, not an authority surface. Hammer interprets and routes; Organism State exposes; humans authorize. No Today component may write `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`.

---

## §2 Four Guidance Slots

Today exposes exactly four Hammer guidance slots. Order is fixed. Exactly one Next-Action slot per render.

### Slot 1 — Entry Guidance

- **Purpose:** answer "what is happening" in one human sentence the moment Today loads.
- **Inputs:** Organism State chip; most recent lineage event affecting readiness; RR-5/6/8 projections if active.
- **Outputs:** one interpretive sentence in Hammer's voice with a visible citation marker (lineage one tap away).
- **Authority limits:** may summarize current organism status; may not diagnose, predict, or score.
- **Silence conditions:** Hammer is silent during active safeguarding arbitration, active RTP authorization flow, minor-private thread, or commercial pathway (Phase 1 §4 silence zones). When silent, slot renders a static, non-Hammer label (e.g. "Safety Center handles this") so silence is never read as absence.

### Slot 2 — Context Guidance

- **Purpose:** answer "why it matters" in one sentence — why this state is being surfaced now.
- **Inputs:** lineage delta vs. prior session; RR-5/6/8 thread relevance; missingness markers.
- **Outputs:** one interpretive sentence anchored to a replay-derived antecedent, with confidence visibility (e.g. "based on the last two sessions" — never "you are X").
- **Authority limits:** may explain; may not assign cause beyond cited lineage; may not introduce destiny framing (RR-5) or diagnose (RR-6).
- **Silence conditions:** if confidence is below threshold or missingness exceeds bound, slot states the missingness rather than fabricating context. Silence is preferred over false certainty.

### Slot 3 — Next-Action Guidance (strictly one)

- **Purpose:** answer "what to do next." Exactly one action per Today render.
- **Inputs:** Organism State + Context Guidance + lawful handoff legality (§4).
- **Outputs:** one named next action with destination surface (Practice / Training / Recovery / Safety / Relational / Parent Invite) and a one-line rationale.
- **Authority limits:** Hammer offers, the athlete decides. Action is never an obligation, never an authorization, never a clearance. RTP authorization and safeguarding decisions are explicitly excluded — Hammer routes the athlete *to* those surfaces but never issues the decision itself.
- **Silence conditions:** if no lawful single action can be proposed (silence zone active, contradiction unresolved, survivability lockdown), this slot collapses into an explicit "no action proposed right now — here is where to go" handoff rather than fabricating a recommendation.

### Slot 4 — Exit Guidance

- **Purpose:** answer "where to go if confused." Always present, always lawful.
- **Inputs:** the full handoff table (§4).
- **Outputs:** a small, fixed set of lawful destinations (Safety Center always; Bounce Back Bay if recovery active; Parent Invite if onboarding incomplete; Relational always reachable).
- **Authority limits:** routing only. Hammer does not pre-author what the athlete will say or do on the destination surface.
- **Silence conditions:** never silent. Even when the other three slots fall silent, Exit Guidance remains so the athlete is never stranded.

---

## §3 Athlete Arrival States

For each state: what Hammer *knows* (replay-derived inputs), *explains* (interpretive output), *recommends* (Next-Action), and *must not say*.

### A1 — First Login

- **Knows:** identity, onboarding stage, no training lineage.
- **Explains:** "this is your starting view — Organism State has nothing yet to read."
- **Recommends:** complete onboarding step OR send Parent Invite (if minor and parent not linked).
- **Must not say:** any reading of readiness, any narrative, any prediction. Missingness is the signal.

### A2 — First Week

- **Knows:** sparse lineage, low-confidence Organism State.
- **Explains:** "early signal — Hammer is still learning what your normal looks like."
- **Recommends:** a low-load Practice or a check-in.
- **Must not say:** confident readiness claims, comparisons to other athletes, performance predictions.

### A3 — Consistent Training

- **Knows:** stable lineage, normal-confidence Organism State, RR-5 narrative threads may exist.
- **Explains:** current readiness in plain language, cites lineage one tap away.
- **Recommends:** the next training surface aligned with current state.
- **Must not say:** scores, rankings, "you are an X athlete," destiny framing.

### A4 — Missed Activity

- **Knows:** gap in lineage, confidence decay, missingness expanded.
- **Explains:** "Hammer hasn't seen activity since [cited frame] — this changes how confidently it can read today."
- **Recommends:** a re-entry surface (low-load Practice or check-in) OR Exit Guidance to Bounce Back Bay if injury context exists.
- **Must not say:** guilt framing, "you fell off," motivational manipulation, fabricated continuity.

### A5 — Recovery Phase

- **Knows:** RR-6 injury_event lineage active, rehabilitation_state set by human authority, RTP not yet authorized.
- **Explains:** current recovery context, citing RR-6 thread.
- **Recommends:** Bounce Back Bay as the destination; Recovery-aligned action if athlete has authority to act.
- **Must not say:** diagnoses, prognoses, "you can return to play," RTP authorization, pain dismissal. Athlete-reported pain outranks inferred readiness (RR-6).

### A6 — Life-Context Pressure Active

- **Knows:** RR-8 life_context_event lineage indicates external stress disclosed *by the athlete*.
- **Explains:** acknowledges adaptation is in effect, cites the user-disclosed thread.
- **Recommends:** a lighter next action or rest, with explicit "you can choose differently" framing.
- **Must not say:** surveillance-toned language, profiling, anything implying Hammer inferred life context the athlete did not disclose (RR-8 invariant).

### A7 — Narrative Setback Active

- **Knows:** RR-5 narrative_event thread flagged (e.g. slump observation), athlete has not revoked it.
- **Explains:** observational framing only — "the last few sessions show a pattern Hammer noted" — never destiny.
- **Recommends:** a low-stakes Practice or a check-in; offers Relational/Safety as Exit destinations.
- **Must not say:** "you're slumping," identity claims, fabricated feelings, manipulation toward engagement. Athlete may revoke the thread at any time.

---

## §4 Navigation Architecture

Lawful handoffs from Today. Hammer **may route**; Hammer **may not author truth** on the destination surface.

| Destination | Why the handoff exists | Required explanation | Prohibited explanation |
|---|---|---|---|
| **Relational** | The athlete's threads, coach/parent connections, conversation continuity. | "This is where your threads with people live." | Speaking on behalf of another person; reading another person's intent. |
| **Practice** | Low-stakes execution surface aligned with current Organism State. | "A practice block that fits today's readiness." | Performance prediction; promised outcomes; scoring. |
| **Training** | Structured workload surface. | "Your training plan for today." | Authoring the plan as truth; framing missed sessions as moral failure. |
| **Safety** | Safeguarding pathway. Silence zone for Hammer during active arbitration. | "Safety Center handles this — Hammer steps aside here." | Hammer interpretation of the safeguarding event; any speech during active arbitration. |
| **RTP** | Return-to-play authorization flow. Human-issued only. | "Return-to-play is decided by [authorized human role], not Hammer." | "You're cleared"; "you can return"; any authorization framing; any clearance language. |
| **Bounce Back Bay** | Recovery-context surface (RR-6). | "Recovery context lives here — Hammer can recall and explain, not prescribe." | Diagnoses; prescriptions; promised recovery timelines. |
| **Parent Invite** | Onboarding completion path for minors and chosen-parent linkage. | "Send your parent the invite so they can see what they're allowed to see." | Anything implying the parent will see more than the parent-scope permits; pressure framing toward minors. |

Rule: every handoff is replay-traceable. Hammer's routing is an interpretive act, not a state mutation.

---

## §5 Parent Interpretation Test

A first-time parent who lands on Today (e.g. shoulder-surfing during athlete onboarding, or in a future parent-tone surface) should encounter:

### Should be immediately understandable

- That this is the athlete's surface (parent is observing, not the primary user).
- That Hammer is a guide that explains and points — not a coach, not a diagnostician.
- That Organism State is a readiness chip, not a medical or psychological score.

### Should not require explanation

- The presence of an Exit/Safety route. Safety Center is plain language.
- That the next action is a suggestion, not an obligation.
- That RTP and safeguarding are not Hammer's decisions.

### What Hammer must clarify

- The one-line meaning of Organism State on first parent view ("today's training readiness, replay-derived, not a medical assessment").
- That Hammer's silence in safeguarding/RTP is intentional deference, not absence.
- The boundary between recovery guidance (RR-6 citation, interpretive) and medical advice (not Hammer's role).

### Remaining parent confusion risks

1. "Organism State" reading as clinical without inline gloss.
2. Hammer's Next-Action being mistaken for parental authorization the parent did not give.
3. Recovery framing being read as medical prescription rather than RR-6 citation.
4. Confusion about whose voice is whose if brand "Hammer" appears in same view as voice "Hammer:" turn — typographic separation required.

---

## §6 Failure-State Analysis

Five athlete confusion scenarios. Each split across Hammer / Organism State / Human.

### "I don't know what to do."

- **Hammer:** owns this — Next-Action Guidance must produce exactly one named action, or explicitly state none is proposed and route via Exit Guidance.
- **Organism State:** provides the readiness chip Hammer cites; not responsible for action.
- **Human:** the athlete chooses whether to act on Hammer's offer. Coach/parent provides authorization where required.

### "Why is today different?"

- **Hammer:** owns Context Guidance — explain the lineage delta in one sentence, cite the antecedent.
- **Organism State:** exposes the changed reading silently; cited, not narrated.
- **Human:** no human responsibility unless the change is RR-6 / safeguarding — then routes to RTP / Safety humans.

### "What happened to my plan?"

- **Hammer:** explains the adaptation in interpretive form, cites the lineage event (missed session, recovery, life-context).
- **Organism State:** exposes new readiness state.
- **Human:** plan authorship belongs to the coach surface, not Hammer. Hammer routes to Training.

### "Why can't I train normally?"

- **Hammer:** explains the active constraint (recovery, missingness, life-context disclosure) by citation only.
- **Organism State:** exposes the constrained readiness.
- **Human:** if RR-6, the human-issued rehabilitation_state is the authority — Hammer surfaces and routes, never overrides.

### "Why is recovery showing up?"

- **Hammer:** cites RR-6 thread, names that recovery context was created by [event lineage], routes to Bounce Back Bay.
- **Organism State:** reflects the readiness under recovery constraints.
- **Human:** the source of the rehabilitation_state (clinician / coach / athlete report). RTP authorization remains explicitly human.

---

## §7 Readiness Scoring

Score 0–10. Justified individually.

| Dimension | Score | Justification |
|---|---|---|
| **Athlete clarity** | **2/10** | Today currently has no canonical Hammer slots; first-time athletes face the three-way name collision (mitigated by Phase 3 doctrine but not yet implemented) plus an Organism State chip without an interpretive sentence. Slot architecture exists only on paper. |
| **Navigation independence** | **2/10** | Lawful handoffs are documented as architecture but Today does not yet surface them as Hammer Exit Guidance. Athletes navigate by tab discovery, not by guided handoff. |
| **Trust** | **3/10** | Constitutional invariants (RR-5/6/8, safeguarding silence, no scoring) are sealed and will protect trust *once Hammer speaks*. Until Hammer speaks on Today, trust is neutral by absence rather than earned by visible discipline. |
| **Retention support** | **2/10** | Without Entry/Context/Next-Action, A4 (missed activity) and A7 (narrative setback) — the two retention-critical states — receive no guided re-entry. |
| **Parent understanding** | **2/10** | Today does not yet carry the inline glosses identified in §5; "Organism State" remains clinical-sounding to first-time parents. |

These scores represent **current state**, not the readiness this architecture would unlock if implemented.

---

## §8 Activation Prerequisites

### Already Complete

- Phase 1 audit (Hammer surface inventory).
- Phase 2 activation architecture (capability slots, voice roles).
- Phase 2 critical capability mapping (C1–C7 inventory and dependency order).
- Phase 3 Name Disambiguation Constitution (canonical vocabulary).
- Sealed invariants: RR-5 narrative, RR-6 injury/recovery, RR-8 life context, safeguarding orchestration, minor-athlete supremacy.

### Must Complete First (before C2 implementation)

- **C1 implementation** — Name Disambiguation must reach surfaces before Hammer speaks on Today. Hammer speaking under "Hammer State" labeling defeats the slot.
- **Organism State chip rename** on Today and Dashboard.
- **Silence-zone enforcement primitive** — a shared mechanism that lets all four slots fall silent uniformly under safeguarding / RTP / minor-private / commercial conditions (still architecture, not yet implementation).
- **Lineage-one-tap-away surface** — the citation affordance Entry/Context Guidance depend on must exist as a reachable surface.
- **Handoff legality table (§4) ratified** as the canonical Today→destination map.

### Future Enhancements (post-C2)

- Weekly recap voice on Today (I3 from Phase 2).
- Injury check-in companion surface (I4).
- Parent digest narrator (I5).
- Adaptive Context Guidance length based on dwell behavior — bounded, replay-safe, no engagement optimization.

---

## §9 Launch Impact

Qualitative impact of successful Today guidance:

| Metric | Impact | Reasoning |
|---|---|---|
| **Conversion** | **High** | Today is the first post-onboarding surface most athletes see; comprehensibility within 60 seconds is the strongest known conversion lever in this category. |
| **Onboarding completion** | **High** | A1 first-login behavior with Hammer's Next-Action routing back into uncompleted onboarding steps (including Parent Invite for minors) closes the most common drop-off loop. |
| **Retention** | **High** | A4 (missed activity) and A7 (narrative setback) are the two highest-risk retention states; guided re-entry via Hammer's Context + Next-Action slots directly addresses them. |
| **Parent trust** | **Medium-High** | Parent-facing surfaces are not the primary Today audience, but parent shoulder-surfing during onboarding is the first parent impression; visible safeguarding silence and non-clinical Organism State framing both materially help. |

---

## §10 Final Verdict

**Question:** If C2 were implemented exactly as specified, would launch readiness materially improve?

**Answer: Yes.**

**Reasoning:**

- Phase 2 dependency analysis identified C2 as the surface that consumes C1's clarity and unlocks C6 (Navigation Handoff) and C5 (First Setback Guidance). Implementing Today guidance without C2 leaves C1 stranded and C5/C6 unreachable.
- The current Today surface scores 2/10 on athlete clarity and navigation independence (§7). A correctly implemented C2 raises both into the high range simultaneously because the four-slot architecture answers the four questions the athlete arrives with.
- Three of the four launch-impact metrics (§9) are High and all hinge on Today behaving as a guided surface rather than a tab-discovery surface.
- The constitutional cost is zero: the architecture authors no organism truth, opens no new event family, mutates no schema, requires no RR-7/9/10 activation, and is replay-safe by construction (Hammer interprets, Organism State exposes, humans authorize).
- The four arrival states with the highest adoption-risk profile (A1 first-login, A4 missed activity, A5 recovery, A7 narrative setback) all receive explicit Hammer behavior under C2 and explicit must-not-say boundaries that protect RR-5/6/8 invariants.

C2 implementation materially improves launch readiness and is the correct next activation phase after C1 is realized.

---

## §11 Stop Gate Confirmation

This phase produces **only** this single architecture file plus an entry in `.lovable/plan.md`.

- ❌ No production code.
- ❌ No UI implementation.
- ❌ No prompts.
- ❌ No schema changes.
- ❌ No projection changes.
- ❌ No emitter changes.
- ❌ No replay-engine changes.
- ❌ No RR-7 activation.
- ❌ No RR-9 activation.
- ❌ No RR-10 activation.
- ❌ No new primitives.
- ❌ No new event families.

Subordinate to Eternal Laws, sealed invariant families across Phases 1–151, RR-5, RR-6, RR-8, the Name Disambiguation Constitution (Phase 3), and the post-mastery expansion roadmap.
