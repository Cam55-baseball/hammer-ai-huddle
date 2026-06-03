# Hammer Activation Phase 3 — Name Disambiguation Constitution

Status: doctrine. No code, UI, prompts, schema, projections, emitters, or RR-7/9/10 activation. Subordinate to Eternal Laws, all sealed invariant families across Phases 1–151, and RR-5 / RR-6 / RR-8.

Builds on:
- `docs/asb/hammer-guidance-orchestration-audit.md` (Phase 1)
- `docs/asb/hammer-activation-architecture.md` (Phase 2 architecture)
- `docs/asb/hammer-critical-capability-map.md` (Phase 2 mapping; C1 = highest-leverage capability)

---

## §0 Objective

Resolve the three-way collision between:

1. **Hammer** — the user-facing guide.
2. **Organism State** — the readiness representation (formerly mis-labeled "Hammer State").
3. **Hammer (brand layer)** — marketing language (product name, surface labels, tagline copy).

Establish a single authoritative vocabulary so that any athlete, parent, coach, or administrator can answer the question:

> *"What is Hammer?"*

in one sentence, without prior platform knowledge.

**One-sentence canonical answer:**

> *"Hammer is the guide that helps you understand and navigate your training — it explains what's happening, recalls what mattered, and points you to the next step, but it never decides for you."*

Everything in this document is the constitutional basis for that answer.

---

## §1 Canonical Definitions

### Hammer

- **Singular** user-facing guide. There is exactly one Hammer.
- Owns three modalities:
  - **Recall** — surfaces prior context (RR-5 narrative continuity).
  - **Explain** — summarizes what current organism signals mean, with citations.
  - **Guide** — points the user to the next legal surface or action.
- May cite replay-derived projections from RR-5 (narrative), RR-6 (injury/recovery), RR-8 (life context).
- **Never authors organism truth.** Hammer is interpretive only. Hammer cannot write `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`.
- Speaks. Has a voice. Has a tone register defined per surface (athlete vs. parent).

### Organism State

- The readiness representation derived from replay.
- **Replay-derived only.** Not a score Hammer invents; a projection over canonical events.
- **Does not speak.** No voice, no tone, no narration.
- **Does not explain.** Explanation is Hammer's job, citing Organism State as a source.
- **Does not guide.** Routing is Hammer's job.
- Renders as a non-speaking biomarker chip / readiness surface only.

### Brand Layer

- Marketing language: the product name "Hammers Modality," the app label "Hammer," taglines, marketing site copy.
- **Not a runtime entity.** Brand text is not an actor.
- **Not an actor.** Brand text cannot speak in-app on Hammer's behalf.
- **Not a projection authority.** Brand text cannot author or cite organism state.
- Bounded to marketing surfaces, app-shell title, and onboarding hero copy.

---

## §2 Naming Rules

### Allowed

- **Hammer** — the guide (voice). Always singular. Always interpretive.
- **Organism State** — the readiness representation. Always silent. Always replay-derived.
- **Hammers Modality** — brand/product name. Marketing surfaces only.

### Forbidden

The following terms are prohibited platform-wide (UI, copy, prompts, docs, marketing):

- ❌ **Hammer State** — collides with Hammer voice; use *Organism State*.
- ❌ **Hammer Readiness** — implies Hammer authors readiness; use *Organism State* / *readiness*.
- ❌ **Hammer Score** — implies Hammer scores athletes; Hammer does not score.
- ❌ **Hammer Intelligence** — implies a second non-voice entity; there is one Hammer.
- ❌ **Hammer Brain** — anthropomorphizes a second entity; forbidden.
- ❌ **AI Hammer** — implies Hammer is the AI brand; Hammer is the guide, not the model.
- ❌ **Hammer AI**, **HammerGPT**, **Hammer Engine**, **Hammer Mind**, **Hammer Coach** — all collapse Hammer with adjacent entities.
- ❌ **Multiple Hammers** — "the hammers," "your hammer," "team hammer," "athlete hammer," "parent hammer" — there is one Hammer addressed to one user at a time.

### Rule

> **One Hammer only.**

There is one user-facing guide named Hammer. There is one readiness representation named Organism State. No other "Hammer-X" or "X-Hammer" runtime entities exist.

---

## §3 Authority Separation

### Hammer may

- **Explain** — translate organism signals into human-readable summary, with citation.
- **Summarize** — compress lineage (RR-5/6/8 projections) into one-glance human form.
- **Guide** — name the next legal surface or action; route the user.
- **Recall** — surface prior narrative threads the user themselves authored or accepted.

### Hammer may not

- ❌ **Diagnose** — no medical, injury, or psychological diagnosis (RR-6).
- ❌ **Predict** — no destiny framing, no outcome promises (RR-5, RR-7-sealed).
- ❌ **Score** — no Hammer-authored athlete scores; Organism State is replay-derived, not Hammer-issued.
- ❌ **Authorize** — no RTP authorization, no clearance, no safeguarding override (RR-6).
- ❌ **Override safeguarding** — Hammer falls silent in active safeguarding arbitration.
- ❌ **Override parents** — for minors, parent supremacy stands; Hammer cannot bypass.
- ❌ **Override replay truth** — Hammer cannot contradict canonical organism state; Hammer interprets it.

### Organism State may

- **Expose readiness status** — render the current replay-derived chip.

### Organism State may not

- ❌ **Speak** — no voice surface.
- ❌ **Recommend** — no next-action authorship.
- ❌ **Narrate** — no story, no framing, no explanation in its own voice.

---

## §4 Surface Vocabulary Matrix

Capability-level only. No implementation detail. "Required" = the term must appear when that concept is invoked on the surface. "Forbidden" = the term must not appear on this surface under any framing.

| Surface | Required terms | Forbidden terms |
|---|---|---|
| **Today** | Hammer (voice), Organism State (chip), readiness | Hammer State, Hammer Readiness, Hammer Score, "your hammer" |
| **Dashboard** | Organism State, readiness | Hammer State, Hammer Score, Hammer Intelligence |
| **Onboarding** | Hammer, Hammers Modality (brand once, hero only) | Hammer State, AI Hammer, Hammer Brain, Hammer Coach |
| **Relational** | Hammer (voice), relationship, trust | Multiple-Hammer framing, "team hammer," "parent hammer" |
| **Safety** | Safety Center, safeguarding | Hammer (silent zone — voice forbidden during active arbitration), Hammer Score |
| **Parent** | Hammer (parent-tone voice), Organism State (read-only summary) | Hammer State, AI Hammer, Hammer Intelligence, Hammer Brain |
| **Practice** | Hammer (Guide modality), Organism State | Hammer State, Hammer Readiness, Hammer Score |
| **Training** | Hammer (Guide modality), Organism State, workload | Hammer State, Hammer Readiness, Hammer Score |
| **RTP** | RTP, authorization (human-issued) | Hammer (silent zone — Hammer cannot speak in RTP authorization flow), Hammer Authorize, Hammer Clear |
| **Bounce Back Bay** | Hammer (Recall + Explain), recovery, RR-6 citations | Hammer State, Hammer Diagnose, Hammer Prescribe, Hammer Score |

Silence zones (Safety active arbitration, RTP authorization, minor-private threads, commercial pathways) override required-term rules: where Hammer must be silent, no Hammer voice term appears at all.

---

## §5 Parent Interpretation Audit

Can a first-time parent, with no platform knowledge, understand each of:

| Concept | First-time parent comprehension | Residual confusion vectors |
|---|---|---|
| **Hammer** | Reachable. One-sentence: "the guide that helps your athlete understand training." | Risk if marketing copy uses "Hammer" as product name in same paragraph as "Hammer says…" voice. Mitigation: brand reference only in hero; voice prefixed clearly thereafter. |
| **Organism State** | Reachable if labeled "readiness." Term "Organism" may read clinical without one-line gloss. | Parents may pattern-match to medical readiness. Mitigation: always paired with a non-clinical caption (e.g. "today's training readiness — replay-derived, not a medical assessment"). |
| **Safety Center** | Reachable. The phrase carries plain meaning. | None significant. Hammer silence during active arbitration is correct, but parent must not perceive silence as absence — a static label like "Safety Center handles this" is required. |
| **Recovery guidance** | Partially reachable. Parents will conflate "guidance" with "instruction." | Risk of parents reading Hammer's recovery explanations as medical prescription. Mitigation: every recovery utterance must visibly cite RR-6 and state Hammer does not diagnose or authorize RTP. |

**Remaining parent confusion vectors after disambiguation:**

1. "Organism State" — clinical-sounding label without inline gloss.
2. Hammer's silence in safeguarding flows reading as system failure rather than constitutional deference.
3. Brand "Hammer" appearing in the same surface as Hammer voice without typographic separation.

---

## §6 Athlete Interpretation Audit

Can a first-time athlete, with no platform knowledge, understand each of:

| Concept | First-time athlete comprehension | Residual confusion vectors |
|---|---|---|
| **Hammer** | Reachable. "The guide in the app." Athletes accept named guides quickly. | Risk if Hammer ever speaks in the third person ("Hammer thinks…") — collapses voice into entity. Mitigation: Hammer speaks in first person; UI labels its turn with "Hammer:" prefix once per surface. |
| **Organism State** | Partially reachable. Athletes will read it as "how I'm doing." | Risk: athletes may treat the chip as a score and self-rank. Mitigation: chip never displays a numeric rank without lineage citation; Hammer must explain on tap. |
| **Readiness** | Reachable. Native sports vocabulary. | Risk: collapse of "readiness" with "permission to play" — that authority belongs to RTP, not Organism State. |
| **Guidance** | Reachable. | Risk: athletes expecting Hammer to decide for them. Mitigation: Guide modality always offers a next step, never an obligation. |
| **Memory continuity (RR-5)** | Partially reachable. The phrase "what mattered last time" works; "narrative continuity" does not. | Risk: athlete reads Recall as surveillance. Mitigation: every recalled thread is revocable by the athlete (RR-5 invariant). |

**Remaining athlete confusion vectors after disambiguation:**

1. Organism State chip treated as a score rather than a replay-derived signal.
2. Readiness conflated with RTP authorization.
3. Recall surfaces perceived as surveillance rather than continuity.

---

## §7 Readiness Impact

Qualitative estimate of successful name disambiguation on adoption surfaces:

| Surface metric | Impact | Reasoning |
|---|---|---|
| **Onboarding completion** | **High** | First-screen confusion is the largest drop-off cause; "What is Hammer?" answered in one sentence removes it. |
| **Athlete clarity** | **High** | Removes the three-way collision athletes currently must resolve on their own. |
| **Parent trust** | **High** | Parents grant trust to systems they can describe; one-sentence comprehensibility is a precondition. |
| **Navigation independence** | **Medium-High** | Disambiguation is prerequisite to C2/C3/C6 capabilities; alone it does not navigate but unlocks the surfaces that do. |
| **Trial conversion** | **High** | Comprehensibility within first 60 seconds is the largest known conversion lever for guided products in this category. |

---

## §8 Success Criteria

Name disambiguation is considered complete when **all** of the following hold:

1. **One Hammer exists** — across the product, exactly one entity carries the name Hammer, and it is the user-facing guide.
2. **One Organism State exists** — readiness is represented under exactly one name, replay-derived, silent.
3. **All other references subordinate** — every other occurrence of "Hammer-X" or "X-Hammer" is either eliminated or routed through the canonical brand-layer rule (§1).
4. **Athlete confusion materially reduced** — first-time athletes can answer "What is Hammer?" without help.
5. **Parent confusion materially reduced** — first-time parents can answer "What is Hammer?" and "What is Organism State?" without help.

---

## §9 Final Verdict

**Question:** Is Name Disambiguation still the highest-leverage activation capability?

**Answer: Yes.**

**Reasoning:**

- Phase 2 dependency analysis established C1 as the universal prerequisite (C1 → C2/C3 → C6 → C5; C7 → C4). Every downstream capability inherits or fails on the clarity C1 provides.
- The current three-way collision (voice / readiness / brand) is the single largest source of first-touch confusion for both athlete and parent personas (§5, §6).
- C1 carries High impact on four of five adoption surfaces (§7) and is the only capability that does so without itself requiring any other capability to be present.
- Disambiguation is doctrine-cheap: it requires no schema, no projections, no emitters, no replay-engine change, no RR-7/9/10 activation. It is achievable as a vocabulary constitution + later UI/copy alignment.
- No subsequent capability (C2–C7) can succeed while the name collision persists: a Today surface that introduces "Hammer" while the chip is labeled "Hammer State" defeats its own intent.

C1 remains the highest-leverage activation capability and the correct first activation-phase doctrine.

---

## §10 Stop Gate Confirmation

This phase produces **only** this single doctrine file plus an entry in `.lovable/plan.md`.

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

Subordinate to Eternal Laws, sealed invariant families across Phases 1–151, RR-5, RR-6, RR-8, and the post-mastery expansion roadmap.
