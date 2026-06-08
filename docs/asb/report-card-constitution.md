# Hammers Report Card Constitution

> **STATUS: DRAFT — UNRATIFIED**
> Version: v0.4
> Opened: 2026-06-08 · Revised: 2026-06-08 (Phase 0.2 — Constitutional Synthesis & Ambiguity Collapse)
> Lineage: ASB RFL-080, RFL-081, RFL-082, RFL-083 · supersedes scope captured in `docs/asb/analysis-formula-ratification.md` (audit-only)
> Subordinate to: Eternal Laws, all RR-1…RR-10, RW-1…RW-10, EI/IR/EK/SG/FC/EE/RO/AR/DG/RE/AE/SF/ES/CV/ER/SL/FI-C invariant families, and every prior immutable invariant sealed across ASB Phases 1–160.
> **§0 Precedence:** Section 0 supersedes §1–§17. Any conflict is resolved in favor of §0. §16 Groups A–K are constitutionally gated behind §0 ratification under the **extended ratification gate** defined in §0.12, now bounded by the §0.17 Constitutional Decision Register (CDR) per Phase 0.2 synthesis. Phase 0.2 reduced 48 open Q-Series Z/AA–AI questions to **17 true ambiguities** routed through the CDR; the remaining 31 are constitutionally closed by inherited doctrine per §0.16.

---

## Preamble — what this document is, and what it is not

This document is the **constitutional definition of the Hammers Report Card**. It is the answer to a single question: *what is the artifact that an athlete sees after a session, and what must be true of it before it can ship?*

It is **not** an engineering audit. The engineering audit lives in `docs/asb/analysis-formula-ratification.md` and proves *where formulas live in code*. This document does the opposite job: it defines *what the athlete is supposed to experience*, then leaves implementation to a later phase that may only begin after every question in §16 is answered.

Until §16 is closed, the following are constitutionally forbidden, no matter how small or how "obvious":

- UI work on report card surfaces
- Removal of UHRC
- Migration of hitting phase tags (`formulaPhases.ts` → `hittingPhases.ts`)
- A throwing signal registry
- A correction-cache table or `generate-correction-motivation` edge function
- New routes, tabs, components, or design tokens
- Category names, weights, formats, drill picks, video picks, roadmap picks, or coaching-voice choices made by the AI on behalf of the owner

Every proposal below is conditional. The document flips to `STATUS: RATIFIED` only when every §16 question is answered by the owner.

---

## §0 — Report Card Psychology & Purpose

> **Doctrinal supremacy.** §0 supersedes §1–§17. Any later section that conflicts with §0 is invalid. No §16 A–K question may be answered, and no implementation phase may open, until every Q-Series Z item in §0.10 is resolved and the owner declares §0 ratified.

### §0.1 — Report Card Purpose

The Hammers Report Card exists to create **athlete understanding**.

It is **NOT** primarily a grading system.
It is **NOT** primarily a scorecard.
It is **NOT** primarily an evaluation tool.

It is a **coaching and development system first**.

The report card exists to:

1. Help athletes understand **where they currently are**.
2. Help athletes understand **why they are there**.
3. Help athletes understand **what is holding them back**.
4. Help athletes understand **exactly how to improve**.
5. Help athletes understand **what progress looks like**.

> **Axiom.** *Scores exist to support coaching. Coaching does not exist to support scores.*

### §0.2 — Priority Hierarchy

The report card follows this strict order:

1. **Understanding**
2. **Correction**
3. **Progress**
4. **Grading**

**Veto clause.** Any design decision — UI, scoring, copy, layout, AI tone, ranking, ordering, surfacing — that improves grading at the expense of understanding, correction, or progress is **constitutionally invalid** and must be rejected without negotiation. The same veto applies to any decision that improves correction at the expense of understanding, or improves progress at the expense of understanding or correction.

### §0.3 — Athlete Emotional Outcome

The intended emotional outcome of **every** report card experience is:

> **ENCOURAGED**

The athlete should leave feeling:

- Clear
- Motivated
- Empowered
- Directed
- Hopeful

The athlete should **NOT** leave feeling:

- Judged
- Punished
- Embarrassed
- Confused
- Overwhelmed

> **Doctrine.** *This is a developmental tool, not a school report card.*

### §0.4 — Report Card Entry Point

The report card is the primary artifact. The athlete first understands *"What is limiting me most right now?"* before seeing *"What is my overall score?"*

Fixed display priority for the entry surface:

1. Highest-priority improvement opportunity
2. Category breakdown
3. Corrections
4. Drills
5. Videos
6. Roadmap
7. Coach Hammer guidance
8. Overall grade

> **Axiom.** *The overall grade is never the hero. The development pathway is the hero.*

### §0.5 — Pillar-First Doctrine

Progress inside individual pillars is **more important** than movement in a composite score.

Worked example (ratified as doctrine):

| Pillar | Before | After |
|---|---|---|
| P1 Hip Load | 6 | 8 |
| P2 Hand Load | 5 | 8 |
| P3 Stride | 4 | 7 |
| P4 Hitter's Move | 7 | 8 |

Even if the composite score barely changes, this is a **major success**. Celebration logic, headline copy, progress chips, and Coach Hammer voice must reflect this. A composite that is flat or down while pillars are climbing is **not** a regression and must never be presented as one.

### §0.6 — Universal Category Explanation Law

Every report card category, in every discipline, exposes the **same** educational structure. This is constitutional law. §17's per-category schema is bound to and subordinate to this law.

Every category must answer all nine of the following:

1. **What is it?**
2. **Why does it matter?**
3. **What do elite athletes do?**
4. **What happens when it is poor?**
5. **How do I improve it?**
6. **Which drill improves it?**
7. **Which video teaches it?**
8. **Which roadmap step improves it?**
9. **What does Coach Hammer want me to understand?**

No category may omit any of these blocks. Missing information must be surfaced as **visible missingness** — never silently hidden, never quietly defaulted, never AI-fabricated.

### §0.7 — Hitting Non-Negotiables (Philosophical Truths)

The following hitting truths are ratified as constitutional doctrine. They are **immutable** — no UI, scoring, weighting, ranking, AI, or product decision may alter them.

**P1 — Hip Load**
- The **stability** of the hip load is non-negotiable.
- The **amount** of hip load is variable and athlete-specific.
- An athlete must be able to complete a **full hand load without being pushed forward**.

**P2 — Hand Load**
- Non-negotiable.
- The hand load creates the conditions for **timing, separation, and efficient movement**.

**P3 — Stride & Landing**
- Non-negotiable.
- The **back hip** moves toward **pitcher release** to get the foot down without shoulder rotation.
- **Landing sideways** and **maintaining direction** is essential.

**P4 — Hitter's Move**
- Non-negotiable.
- **Knob stability**, **elbow direction**, **barrel delivery**, and **closing the gap to contact** are the core of the swing.

### §0.8 — Owner Interview Requirement

Before any implementation phase begins, Lovable will **actively interview** the owner.

- Do not guess.
- Do not infer.
- Do not simplify.
- Do not silently decide.
- If uncertainty exists: **ask**.

Questioning continues — in waves of ≤4 questions per turn — until the philosophy, scoring, display, corrections, drills, roadmap integration, and Coach Hammer behavior are fully understood. The owner has explicitly stated: *"I would rather answer 100 questions than ship a mediocre system."*

### §0.9 — Precedence Clause

§0 supersedes §1–§17. Where §1–§17 (including the §16 question set, §17 per-category schema, and any later-added section) contradicts §0, §0 wins and the conflicting clause is automatically invalid pending revision. §16 Groups A–K are gated: no A–K question may be raised, answered, or used to justify implementation until Q-Series Z is fully resolved and §0 is declared ratified by the owner.

### §0.10 — Q-Series Z (Owner Interview Loop)

Asked in waves of ≤4 questions per turn. No assumptions filled in for unanswered items. Implementation remains constitutionally blocked until every Z-item is resolved.

**Wave Z1 — Purpose & hierarchy edges**
- **Z1.** When grading and understanding conflict in a *specific* UI element (e.g., a low score on a category the athlete is actively improving), should the score be (a) hidden, (b) de-emphasized visually, (c) shown with a "progressing" overlay, or (d) shown unchanged with context text only?
- **Z2.** Is "Understanding > Correction > Progress > Grading" a strict lexicographic order (Grading may never win a tie) or a weighted preference?
- **Z3.** Does the Priority Hierarchy apply equally to Parent and Recruiter views, or only the Athlete view?

**Wave Z2 — Emotional outcome enforcement**
- **Z4.** Should "ENCOURAGED" be enforced by (a) tone rules in Coach Hammer copy only, (b) tone rules + color/iconography constraints, or (c) tone + visual + structural rules (e.g., never lead with a failing category)?
- **Z5.** For a session where every category is poor, what is the constitutional behavior? Lead with the single highest-leverage improvement? Lead with the closest-to-passing category? Lead with the most-improved-from-last-session category?
- **Z6.** Are red/failure colors permitted at all, or must the palette be restricted to neutral/positive/progress tones?

**Wave Z3 — Entry point & hero**
- **Z7.** "Highest-priority improvement opportunity" — is priority determined by (a) lowest score, (b) highest leverage on composite, (c) coach-defined non-negotiable rank, (d) furthest from athlete's roadmap milestone, or (e) a defined composite of these?
- **Z8.** Is the overall grade ever displayed on the entry screen, or only reachable after scrolling/clicking past the development pathway?
- **Z9.** Coach Hammer guidance sits at position 7 in the entry order — is Coach Hammer a *summary* of positions 1–6, a *separate* voice layer, or *both*?

**Wave Z4 — Pillar-first celebration**
- **Z10.** What constitutes a "celebrated" pillar improvement? Any positive delta? A threshold delta (e.g., ≥2 points)? Crossing a band boundary (e.g., Developmental → Proficient)?
- **Z11.** If composite drops while pillars improve, is composite (a) hidden, (b) shown with a "pillar progress" overlay, or (c) shown unchanged?
- **Z12.** Per-session deltas vs rolling deltas — which is the canonical "improvement" signal for §0.5?

**Wave Z5 — Universal Explanation Law**
- **Z13.** For categories where "elite athletes do X" is not yet authored, should the block render as (a) "Coming soon", (b) visible missingness with a placeholder, or (c) block the category from being scored at all?
- **Z14.** "Coach Hammer wants me to understand…" — is this a fixed authored string per category, AI-generated within constitutional guardrails, or hybrid (authored core + AI tone wrapper)?
- **Z15.** Are the 9 blocks rendered always-expanded, always-collapsed, or progressively disclosed?

**Wave Z6 — Hitting non-negotiables binding**
- **Z16.** The "pushed forward during full hand load" test for P1 — is this measured by an existing engine signal, a coach-tagged observation, an athlete self-report, or not yet measurable (and therefore surfaced as missingness)?
- **Z17.** P3 requires "back hip moves toward pitcher release" and "foot down without shoulder rotation" — are these two independently scored sub-criteria or one combined pass/fail?
- **Z18.** P4 lists four elements (knob stability, elbow direction, barrel delivery, closing the gap) — scored independently and aggregated, or scored as one holistic pillar?
- **Z19.** Are these four hitting truths identical for Baseball Hitting and Softball Hitting, or does Softball Hitting (including slap) carry a variant?

**Wave Z7 — Interview discipline & RFL**
- **Z20.** When you answer a wave, may Lovable proceed to the next wave automatically, or must each wave be explicitly approved before the next is asked?
- **Z21.** Should each answered wave be recorded as its own RFL entry (RFL-082, RFL-083, …) or batched into a single RFL entry at §0 ratification?

Additional waves will be generated only if answers expose new ambiguity. Q-Series Z closure is **necessary but no longer sufficient** for §0 ratification — see §0.12.

### §0.11 — Constitutional Completeness Audit (Phase 0.1)

Before §0 may be marked RATIFIED, the constitution is audited against the Report Card's role inside the Hammers Modality organism. Each organism responsibility below is evaluated as **Defined / Partially / Absent**. Every Partially/Absent row is routed to a gated Q-Series (AA–AI). No gap is silently filled, inferred, or deferred.

| # | Organism responsibility | Audit result | Where (if Defined / Partial) | Gap | Routed Q-Series |
|---|---|---|---|---|---|
| 1 | Athlete understanding | Partially | §0.1, §0.2, §0.6 | Defines that understanding is supreme; does not define what "understood" looks like at session N, how the athlete *journeys* across sessions, or first-session vs Nth-session differences | **AI** (Athlete Journey) |
| 2 | Coaching translation (organism → human language) | Partially | §0.6 block 9, §1, §7 (intended) | Universal Explanation Law names the slot; constitutional rules for translation tone, compression-without-fabrication boundary, and silence conditions are absent | **AC** (Coach Hammer Communication) |
| 3 | Correction prioritization | Partially | §0.4 (priority 3), §0.7 hitting non-negotiables | Per-discipline correction ranking, tie-breaking, and "what is *never* surfaced as a correction" are undefined | **AC**, **AG** (Missingness) |
| 4 | Drill assignment determinism | Absent | §0.6 block 6 names the slot only | No constitutional rule for how a drill is *picked* (deterministic registry vs AI vs hybrid), what happens when no drill exists, or how drill scarcity is shown | **AG**, partial **AC** |
| 5 | Video assignment determinism | Absent | §0.6 block 7 names the slot only | Same shape as drill: registry vs AI vs hybrid, missingness rendering, minor-safe content gating | **AG**, partial **AE** |
| 6 | Roadmap guidance | Absent | §0.6 block 8 names the slot only | Constitutional rule for how a category maps to a roadmap step, what a "milestone" is, and how roadmap movement is celebrated | **AB** (Progress), **AF** (Celebration) |
| 7 | Coach Hammer communication | Partially | §0.6 block 9, §1 doctrine | Voice, persona boundaries, what Coach Hammer is forbidden from saying, when to stay silent, minor-athlete language gates — all unspecified | **AC** |
| 8 | Parent interpretation | Absent | (none in §0) | Parent view contents, framing rules, comparison prohibitions, minor-athlete parental supremacy (RR-relational doctrine) — undefined | **AD** (Parent View) |
| 9 | Recruiter interpretation | Absent | (none in §0) | Recruiter visibility surface, opt-in pathway, RR-9/RR-10 minors-first enforcement, anti-pay-to-win, anti-ranking — undefined | **AE** (Recruiter View) |
| 10 | Progress recognition | Partially | §0.5 pillar-first doctrine | "Progress" definition, regression handling, time horizons, win thresholds, celebration triggers — undefined beyond the worked example | **AB**, **AF** |
| 11 | Missingness handling | Partially | §0.6 (visible missingness mandate) | Rendering grammar, "we don't know yet" copy contract, partial-category behavior, sensor-dropout vs not-yet-measured distinction — undefined | **AG** |
| 12 | Scoring meaning | Absent | (referenced in §0.4 priority 8 and §0.5 example only) | What a numeric score *means* to an athlete, units, bands, score-visibility rules under §0.4 hero-suppression, absolute vs athlete-relative — undefined | **AA** (Score Meaning) |
| 13 | Development meaning | Partially | §0.1, §0.5 | "Development" vs "progress" vs "improvement" — constitutional definitions and how they appear on the surface — undefined | **AB**, **AI** |

**Audit rule.** Any row above is the constitutional source of truth for its routed Q-Series. A Q-Series cannot close while its source row is still Partially/Absent. The audit itself is re-run after each wave closes, and rows flip to **Defined** only when the owner has answered every question routed to them.

### §0.12 — Extended Ratification Gate (revised by Phase 0.2)

§0.10's standalone gate is superseded by this compound gate. §0 cannot flip to `STATUS: RATIFIED` until **all** of the following are true:

1. Every Q-Series Z question (Z1–Z21, plus any follow-up waves) is **either Class-A/B-closed by inherited doctrine per the §0.16 Ambiguity Ledger, or Class-C-resolved through the §0.17 Constitutional Decision Register (CDR)**.
2. Every Q-Series AA–AI question (Wave 1 plus any follow-up waves) is **either Class-A/B-closed by inherited doctrine per the §0.16 Ambiguity Ledger, or Class-C-resolved through the §0.17 CDR**.
3. §0.11 audit shows zero rows in Partially or Absent state.
4. The owner explicitly declares §0 ratified.

Until all four conditions hold, **§16 Groups A–K remain sealed** and every implementation prohibition listed in the Preamble remains in force. No partial ratification, no provisional ratification, no "ratified except for X" mode is permitted. Phase 0.2 does not weaken the gate; it only bounds conditions (1)+(2) by the finite CDR rather than by open-ended interview fanout.

### §0.13 — Q-Series AA–AI (Constitutional Discovery Interview)

Asked in waves of ≤4 questions per series-turn. No assumptions filled in for unanswered items. Each series is opened at Wave 1 below; subsequent waves are generated only after the prior wave's answers expose remaining ambiguity. Series may be answered in any order, but no series may be skipped.

#### Q-Series AA — Score Meaning Constitution (Wave AA-1)
- **AA1.** What does a single category score *mean* to the athlete? Choose the constitutional frame: (a) percent of elite reference, (b) percent of athlete's own ceiling, (c) movement-quality band (Developmental / Proficient / Elite), (d) raw measurement passed through a labelled scale, or (e) a defined hybrid.
- **AA2.** Are scores **absolute** (same score = same movement quality across all athletes) or **athlete-relative** (calibrated to age/level/history)? If hybrid, where is the constitutional line?
- **AA3.** Under §0.4's "overall grade is never the hero" rule, in what surfaces is the overall composite score *permitted* to be rendered at all (e.g., never on entry, never on parent view, never on recruiter view, only inside a click-through audit panel)?

#### Q-Series AB — Progress Constitution (Wave AB-1)
- **AB1.** What is the constitutional definition of "progress"? Pillar movement, composite movement, roadmap-milestone movement, or a defined ordered combination?
- **AB2.** How is a *regression* (negative delta) constitutionally handled — hidden, contextualized as variance, surfaced as a learning moment, or surfaced unchanged?
- **AB3.** What is the canonical time horizon for "improvement" — per session, rolling N sessions, since-roadmap-start, or athlete-selectable?

#### Q-Series AC — Coach Hammer Communication Constitution (Wave AC-1)
- **AC1.** What is Coach Hammer constitutionally *forbidden* from saying? (e.g., comparisons to other athletes, projections about career outcomes, anything resembling diagnosis, anything resembling punishment.)
- **AC2.** When must Coach Hammer stay silent? (e.g., insufficient signal, contradiction state, athlete in opted-out narrative mode per RR-5.)
- **AC3.** Is Coach Hammer's voice (a) a fixed authored persona, (b) AI-generated within a guardrail spec, or (c) hybrid (authored intent + AI tone wrapper)? This question must be answered before any Coach Hammer copy may exist.

#### Q-Series AD — Parent View Constitution (Wave AD-1)
- **AD1.** Does the Parent view exist as a constitutional surface inside the Report Card, or is it a separate artifact derived from the Report Card? (Determines whether Parent view inherits §0 directly or via translation.)
- **AD2.** For minor athletes, what does the parent see that the athlete does *not*, and what does the athlete see that the parent does *not*? (Both directions must be explicit per RR-relational minor-athlete supremacy.)
- **AD3.** Is comparison to other athletes ever permitted in the Parent view? If yes, under what bounded form (anonymized cohort band only / never)?

#### Q-Series AE — Recruiter View Constitution (Wave AE-1)
- **AE1.** Does the Recruiter view exist at all in V1, or is it constitutionally deferred until RR-9/RR-10 implementation prerequisites are met?
- **AE2.** For minor athletes, what recruiter visibility is permitted, and what is the gating authority (parent, athlete, both)? Per RR-10, parents retain supremacy — how is that surfaced in the Report Card constitution itself?
- **AE3.** What evidence surfaces (raw video, scores, narrative summaries, ranking) are recruiter-visible, and what is forbidden? Confirm "no pay-to-win visibility" and "no exploitative ranking" are inherited verbatim from RR-9/RR-10.

#### Q-Series AF — Celebration Constitution (Wave AF-1)
- **AF1.** What triggers a celebration moment on the Report Card? (Per §0.5: pillar climb ≥X, band crossing, roadmap milestone hit, first-time completion of a category — owner picks the constitutional set.)
- **AF2.** What is the system constitutionally *forbidden* to celebrate? (e.g., another athlete's worse score, a streak that masks regression, a score increase that came from a category being skipped.)
- **AF3.** Is celebration tone fixed authored copy, AI-generated, or hybrid — and does this answer have to match the answer to AC3 (Coach Hammer voice)?

#### Q-Series AG — Missingness Constitution (Wave AG-1)
- **AG1.** What is the canonical missingness vocabulary? Define the difference between (a) not yet measured, (b) measured but low confidence, (c) measured but contradicted, (d) measured but signal dropped (sensor failure), (e) intentionally withheld by athlete/parent.
- **AG2.** How is a missing drill or missing video rendered? Must be visible (per §0.6) — what is the exact constitutional copy contract ("Drill coming soon" vs "No drill assigned yet" vs "Drill exists but not yet authored for this category")?
- **AG3.** May a category be *scored* if any of its 9 explanation blocks are missing, or does any missing block invalidate the score for that category until authored?

#### Q-Series AH — Cross-Discipline Expansion Constitution (Wave AH-1)
- **AH1.** Which disciplines are in V1 scope for the Report Card constitutional surface? (Baseball Pitching, Baseball Hitting, Softball Pitching, Softball Hitting, Throwing, Catching, Defense, Baserunning — explicit yes/no per discipline.)
- **AH2.** What rules are **shared across all disciplines** (e.g., §0.6 Universal Explanation Law, §0.4 entry order, §0.5 pillar-first) vs **discipline-specific** (e.g., §0.7 hitting non-negotiables)? Confirm: shared rules are constitutional; discipline-specific rules are constitutional only within their discipline.
- **AH3.** May a future discipline be added only additively (cannot weaken existing constitutional rules), and must it pass its own §0.11-style audit before its Report Card surface opens?

#### Q-Series AI — Athlete Journey Constitution (Wave AI-1)
- **AI1.** What is the constitutional difference between the **first session** Report Card and the **Nth session** Report Card? (e.g., first session may have wider missingness and softer Coach Hammer copy; Nth session shows longitudinal progress per AB constitution.)
- **AI2.** Is there a longitudinal narrative thread across sessions (bound by RR-5 narrative continuity), and if so, what is the athlete's redirect/revocation right inside the Report Card surface itself?
- **AI3.** What is the journey constitutionally *not*? Confirm verbatim: not destiny, not ranking, not identity-locking, not a projection of career outcome (per RR-5, RR-7).

### §0.14 — Remaining Constitutional Work Estimate

Estimate, recorded for owner visibility. Re-derived after each wave closes. This is not a commitment.

| Source | Open items | Notes |
|---|---|---|
| Q-Series Z | ~18 of 21 outstanding | Wave Z1 (Z1–Z3) is the only wave currently in front of the owner; Z4–Z21 are queued behind Z3 answers |
| Q-Series AA–AI Wave 1 | 27 questions | 3 per series × 9 series |
| Q-Series AA–AI later waves | est. 50–80 questions | Owner-answer-dependent fanout; each series expected to run 2–4 waves |
| §0.11 audit re-runs | 1 per wave-batch closure | Audit flips Partially/Absent rows to Defined as answers land |
| §16 Groups A–K | sealed | Cannot open until §0.12 gate is satisfied |
| **Estimated total waves to ratification** | **25–35** | Owner-bound pace, not AI-bound |

---

## §1 — Report Card Philosophy


**The Report Card is the primary athlete artifact of the Hammers system.**

It is not a derived view of the engine. It is not a "results page" appended to PIE V2. It is not a UHRC variant. It is not a marketing surface. It is not a coach dashboard. It is the single, durable place an athlete goes to understand *how they are actually moving*, *what to do about it*, and *what changes next time they walk into the cage, the mound, or the field*.

The Report Card refuses to be:

- A scoreboard whose only job is to produce a number.
- A school report card whose only job is to grade.
- A dashboard whose only job is to display engine internals.
- A marketing surface whose only job is to make the athlete feel good.
- A wall of charts that an athlete cannot read without a coach next to them.
- A black box whose recommendations cannot be traced to a measurement, a drill, a video, and a roadmap step.

The Report Card exists at the **athlete-understanding layer**, which is strictly above the engineering layer and strictly below the constitutional layer. Engine signals feed it; constitutional law constrains it; the athlete reads it.

Primacy claim (requires ratification — see §16 A1): on every analysis-result surface in the app, the Report Card is what the athlete sees first. The technical analysis (PIE V2 page, hitting causal page, throwing technical page if/when one exists) becomes a secondary click-through for athletes, coaches, and operators who want to see the engine talking.

---

## §2 — Athlete Experience Flow

The Report Card surface follows a **fixed sequence**. The sequence is not a UI suggestion. It is the doctrine of how the athlete is meant to receive information.

```text
1.  Report Card            (what is true about this session)
2.  Explanation            (why each category is what it is)
3.  Corrections            (what is wrong, in plain language, with cause)
4.  Drills                 (the exact drill prescription per deficiency)
5.  Videos                 (good-looks-like, bad-looks-like, teaching, corrective)
6.  Roadmap                (what step this advances the athlete toward)
7.  Coach Hammer           (motivational synthesis — delivery only, never authorship)
```

Forbidden entry points:

- Entering the surface on Coach Hammer's paragraph (turns the system into a chatbot).
- Entering on Drills (decouples prescription from diagnosis).
- Entering on the Technical view (collapses the athlete-understanding layer back into the engineering layer).
- Entering on a hero composite score with no decomposition reachable in one click.

Forbidden compressions:

- Skipping Explanation when a category fails (the athlete must always be told *why*).
- Skipping Corrections when drills are shown (a drill without a named deficiency is noise).
- Skipping Videos when corrections are shown (corrections without a visual reference are unreliable).
- Skipping Roadmap when a drill is prescribed (every drill belongs to a stage of development).

---

## §3 — Universal Report Card Laws

These laws apply identically to every report card (Pitching, Baseball Hitting, Softball Hitting, Baseball Throwing, Softball Throwing). They are non-negotiable across discipline.

1. **Lineage-visible.** Every score, gate, chip, and recommendation is reachable in one click to its underlying signal, target band, sample count, and engine version.
2. **Confidence-bound.** No score is shown without a confidence state. Estimates render as estimates. Single-rep sessions never present as multi-rep certainty.
3. **Missingness-visible.** Categories that could not be scored render as visible missingness ("Not measured this session — here's why"), never as silent omission, never as a zero, never as a default.
4. **Replay-safe.** Two re-renders of the same session produce identical report cards, byte-for-byte at the pinned engine version + reasoning version. Replay equivalence is enforceable.
5. **Never-fabricated.** No category, score, drill, video, or roadmap step is invented by an AI layer. AI may rewrite *motivational delivery*; AI may never author facts.
6. **Deterministic mappings.** Deficiency → drill, deficiency → video, deficiency → roadmap step are deterministic table lookups. No probabilistic recommenders at v1.
7. **No silent omission.** If a category exists in the discipline's card, it appears in every session's card. Its state may be "scored", "estimate", or "not measured" — never absent.
8. **Athlete language first.** Engine identifiers (`energy_angle`, `visual_stability`, etc.) may appear only inside the Technical view or the click-expansion lineage block, never as a category headline.
9. **Survivability supersedes legibility.** When clarity and constitutional legality conflict, legality wins. The card may not lie or compress to make itself easier to read.
10. **Additive-only evolution.** Future report card extensions may add categories, formats, or expansion blocks. They may not remove a category, mutate a weight invisibly, or collapse a previously-decomposable score into a composite.

---

## §4 — Pitching Report Card Architecture (Proposal — requires ratification)

**Discipline:** Baseball Pitching.
**Engine binding source of truth:** `src/data/baseball/pieV2Signals.ts`, `src/lib/pieV2/scoring.ts`. Engine ownership unchanged.

Proposed categories (athlete-facing names pending §16 B1; engine bindings are read-only references, not authorship):

| # | Athlete-facing name (proposal) | Engine binding (read-only ref) | Format proposal | Hierarchy proposal |
|---|---|---|---|---|
| 1 | Eyes On Target | `visual_stability` | Pass/Fail chip | Non-Negotiable (pending §16 C2) |
| 2 | Hip/Shoulder Separation | `separation` | Pass/Fail chip + raw degrees | Rank 1 |
| 3 | Energy Angle | `energy_angle` | 0–100 + raw degrees | Rank 1 |
| 4 | Tempo | `tempo` | 0–100 + raw seconds | Rank 2 |
| 5 | Stride Length | `stride` (length component) | 0–100 + raw % body height | Rank 2 |
| 6 | Stride Consistency | `stride` (variance component) | Trend chip + variance band | Rank 2 |
| 7 | Posture (composite — see §16 B2) | `head_stability` + `hip_alignment` | Pending §16 B2 | Rank 2 |
| 8 | Front Side Control | `front_side` | 0–100 | Rank 2 |
| 9 | Head Direction | `head_alignment` | 0–100 | Developmental |
| 10 | Shoulder Plane | `shoulder_level` | 0–100 | Developmental |
| 11 | Rear Foot Drag | `rear_foot_drag` | 0–100 | Developmental |

Each category in §4 fills out the per-category schema in §17. Weights, hierarchy ranks, and Non-Negotiable gates are all proposals pending §16 C1–C4.

---

## §5 — Hitting Report Card Architecture (Proposal — requires ratification)

**Discipline:** Baseball Hitting + Softball Hitting (shared structure; Softball Slap is a variant per §16 B5).
**Engine binding source of truth (canonical):** `src/lib/hittingPhases.ts`. The conflicting `src/lib/formulaPhases.ts` taxonomy (`p2_heel_plant` / `p3_launch`) is constitutionally invalid; migration is its own later phase governed by RFL-074, not this document.

Canonical phase structure (athlete-facing names pending §16 B3):

| Phase | Canonical name | Proposed athlete-facing name | Hierarchy proposal |
|---|---|---|---|
| P1 | Hip Load (Pelvic Coil) | Hip Load | Non-Negotiable (candidate, per §16 C2) |
| P2 | Hand Load | Hand Load | Rank 1 |
| P3 | Stride / Landing (foot plant) | Stride & Landing | Rank 1 |
| P4 | Hitter's Move (rotation through contact) | Hitter's Move | Non-Negotiable (candidate, per §16 C2) |

Slap variant (Softball, §16 B5): either a full Slap-card variant or a P4-modifier on the standard card. **Not decided here.**

Each phase in §5 fills out the per-category schema in §17.

---

## §6 — Throwing Report Card Architecture (Proposal — requires ratification)

**Discipline:** Baseball Throwing + Softball Throwing (shared standards at v1; position-branching per §16 B4).
**Engine binding source of truth:** *does not exist yet.* The 7 owner-provided standards (RFL audit, 2026-06-08) become the authoring spec for a future `src/data/baseball/throwingV1Signals.ts` registry, built in a later phase. This document does not build that registry.

Owner-provided throwing standards (verbatim, as the spec for the eventual registry):

1. Eyes on target at peak leg lift before moving forward toward the target.
2. Hips fire and shoulders stay closed (no shoulder rotation open before landing).
3. Stride length close to 100%+ of height, and consistent regardless of pitch; premium when measured back-ankle-at-foot-raise to front-ankle-at-landing.
4. Head on a stable line throughout delivery (≤2% vertical movement).
5. Hips fire completely in line with the target before shoulder rotation begins.
6. (Owner-provided #6 — to be inserted verbatim from audit transcript before §16 closes.)
7. (Owner-provided #7 — to be inserted verbatim from audit transcript before §16 closes.)

> **Drafting flag:** Standards 6 and 7 were truncated in the audit transcript captured by Phase A. Before this document may close, the owner must paste the full verbatim text of all 7 standards. This is an open §16 question (K7, added below).

Each standard in §6 fills out the per-category schema in §17.

---

## §7 — Drill Integration Architecture

The Report Card prescribes drills **deterministically** per deficiency. There is no probabilistic recommender at v1.

Contract:

- A **deficiency** is a named, observable failure mode of a category (e.g. *"Stride < 90% body height"*, *"Shoulders open before foot plant"*, *"Head drops > 2% vertical"*).
- A **deficiency catalog** exists per discipline. Seeding source pending §16 F2 (proposal: seed from existing `common_deficiencies` in `pieV2Signals.ts` + hitting `failureSymptoms` as a starting list, then owner adds/cuts).
- Each deficiency points to an **ordered drill list** (1..N). Order is meaningful: drill[0] is the first prescription, drill[1] is the fallback if drill[0] does not resolve.
- A drill may serve multiple deficiencies (many-to-one upward); a deficiency points to a fixed ordered list (one-to-many downward). Confirmed under §16 F3.
- AI may not assign drills. AI may not reorder drills. AI may not invent drills.
- A deficiency with zero drills mapped is a **visible missingness state** ("Drill prescription pending"), never a silent omission.

---

## §8 — Video Integration Architecture

The Report Card pairs every category with video evidence.

Proposed tag taxonomy (pending §16 G1):

- `reference_good` — what good looks like for this category.
- `reference_bad` — what bad looks like for this category (paired teaching contrast).
- `corrective` — drill-bound video that teaches the fix.
- `teaching` — concept-bound video that explains the *why*.
- `roadmap_step` — video that demonstrates the next step in the athlete's development arc.

Rules:

- Every category must reach at least one `reference_good` and at least one `corrective` video, eventually. Until tagged, the block renders as visible missingness, never hidden.
- Reference videos are tagged by humans, not by AI.
- The athlete's own session video is paired with `reference_good` for the same category whenever both exist.
- No video block silently disappears because nothing matches; the contract is "≥1 good + ≥1 corrective or visible missingness."

---

## §9 — Roadmap Integration Architecture

The Report Card connects each deficiency to a **roadmap step** so the athlete leaves the surface knowing what they are working toward.

Open structural question (§16 H1): is a roadmap step a property of the **deficiency** (same step for every athlete with this deficiency) or a property of the **athlete's current developmental level** (same deficiency → different step depending on history)? This is the single largest unresolved doctrine question in this document.

Proposal pending ratification:

- A roadmap step has a stable identifier, a name, a phase (foundation / refinement / advanced / elite), and an exit criterion expressed as a measurable signal change.
- Each deficiency maps to exactly one *next* roadmap step. The Report Card surfaces only the next step at v1 (per §16 H2 — could expand to next-N in a later phase).
- Roadmap step assignment is deterministic. AI may not pick.
- A deficiency without a mapped step renders as visible missingness, never as a silent absence.

---

## §10 — Coach Hammer Integration Architecture

Coach Hammer is the **motivational delivery layer**, nothing more.

What Coach Hammer is allowed to do:

- Rewrite a hand-authored motivational paragraph into the athlete's, parent's, or coach's voice.
- Choose tone within the **per-discipline ratified envelope** (§16 I1 decides whether one voice or many).
- Compress without erasing.
- Surface the next step in athlete-readable language.

What Coach Hammer is forbidden from doing:

- Authoring a deficiency.
- Authoring a score.
- Picking a drill.
- Picking a video.
- Picking a roadmap step.
- Inventing a measurement.
- Re-ordering the Athlete Experience Flow (§2).
- Adopting forbidden tones (proposal pending §16 I3): scolding, marketing, school-grade, ALL-CAPS shouting, sarcasm, emoji-heavy, military metaphors, destiny framing.

Coach Hammer is bound by all RR-1…RR-10 ethics already sealed in memory, especially RR-5 (no invented feelings, no destiny framing) and RR-6 (no diagnosis, no prescription).

---

## §11 — Progress Tracking Architecture

The Report Card is meaningful only if the athlete can see change.

Proposal pending §16 J1:

- Each category exposes a **trend chip** showing change since the last comparable session (delta in score, delta in raw measurement, "no change", "regressed", "improved", "first measurement").
- Each discipline exposes a **composite trend** at the card header (separate from the composite hero number, which is pending §16 D4).
- Regressions are surfaced, not hidden. The card never silently smooths a drop into "stable."
- "Improvement" requires a confidence-bound delta. A single-rep session may not declare improvement against a multi-rep baseline without an estimate chip.
- Open question (§16 K4): does this constitution govern only per-session report cards, or also the longitudinal report card?

---

## §12 — Parent View Architecture

Parents are not athletes and not coaches. They need a different surface even when reading the same data.

Proposal pending §16 J2 / J3:

- The Parent View uses **bands and bullets** by default ("Strong", "Developing", "Needs Work"), not numeric scores.
- Optional numeric reveal on tap, gated by §16 J3.
- Parent View is identical in content to the Athlete View — no information is added or invented in translation. Layout, density, and reading level differ.
- Parent View never surfaces athlete-reported pain (§16 K3) without explicit athlete authorization, per RR-6.
- Parent View is bound by RR-8 (life context informs, never identifies) and minor-athlete supremacy per RR-9 / RR-10.

---

## §13 — Recruiting View Architecture

Recruiters see the smallest, hardest-earned slice of the Report Card. This view is subordinate to RR-9 (Exposure & Visibility) and RR-10 (Recruiter Contact & Commercial Ethics), already sealed in memory.

Proposal pending §16 J4 / J5:

- Recruiting View is a **separate, narrower surface**, not a copy of the Athlete View.
- It surfaces only categories the athlete (or, for minors, the athlete-and-parent) has explicitly authorized for recruiting visibility.
- It never surfaces injury history, pain reports, life-context events, or narrative slumps. RR-6 and RR-8 are absolute here.
- Shareability (link with expiration vs. in-account-only) is pending §16 J5.
- Minor-athlete pathways require parental authority per RR-10. No exception, regardless of recruiter status or commercial pressure.

---

## §14 — Report Card Scoring Architecture

Format catalog (pending §16 D1–D6):

| Format | When used (proposal) |
|---|---|
| **Pass/Fail chip** | Boolean-derived gates (Eyes On Target, Separation present, Hip Alignment square at foot plant, Front Side closed at foot plant). |
| **0–100** | Continuous signals with engine-defined target bands (Energy Angle, Tempo, Stride Length, Head Stability, etc.). |
| **1–10** | Optional athlete-friendlier alternative to 0–100, pending §16 D1. |
| **Letter grade (A–F)** | Reserved; only if owner approves the school-grade metaphor, which §16 I3 currently flags as forbidden. |
| **Band** (Elite / Strong / Developing / Needs Work) | Default athlete-facing presentation; numeric remains available on click. |
| **Raw measurement** | Always available in click-expansion; presence in the headline pending §16 D5. |
| **Trend chip** | Delta since last comparable session; required on every category per §11. |

Composite hero number doctrine (pending §16 D4): one number summarizing the card. Format pending. If shown, it must be reachable in one click to its decomposition (§3 Law 1).

Failure-band wording (pending §16 D6): keep engine vocabulary (Clean / Minor / Major / Critical) or move to athlete-facing vocabulary (Elite / Strong / Developing / Needs Work).

---

## §15 — Category Explanation Architecture

Every category, in every discipline, exposes the **same 9 blocks in the same order** when clicked. This is the click-expansion contract.

1. **What is it?** — one paragraph, athlete language, no engine identifiers.
2. **Why does it matter?** — one paragraph, performance-and-development framing.
3. **What happens if it is poor?** — four sub-paragraphs (performance / durability / efficiency / consistency).
4. **How do I improve it?** — philosophy paragraph; not a recipe.
5. **Which drills improve it?** — ordered list from the deterministic deficiency→drill table (§7).
6. **Which videos teach it?** — ordered list from the video taxonomy (§8), grouped good/bad/corrective/teaching.
7. **Which roadmap milestones improve it?** — next step from §9; later phases may expand to next-N.
8. **What good looks like / What bad looks like** — paired reference clips, per §8.
9. **How Coach Hammer should explain it** — three tone variants (athlete · parent · coach), per §10.

All 9 blocks are **required** for every category. Empty blocks render as visible missingness ("Pending tagging"), never silently omitted (§3 Law 7).

---

## §16 — Questions Requiring Owner Ratification

The constitution flips `STATUS: DRAFT → STATUS: RATIFIED` only when every question below is answered. Until then, Phase 1 (implementation planning) is constitutionally blocked.

### A — Philosophy & primacy
- **A1.** Confirm the Report Card is the *primary* artifact on every analysis-result surface, and the existing PIE V2 / hitting causal pages become secondary click-throughs.
- **A2.** Is the Report Card a *per-session* artifact, a *rolling* artifact (auto-updated as new sessions land), or *both* with explicit toggling?
- **A3.** Is the Report Card shareable outside the app at v1 (parent link, coach link, recruiter link), or in-app only?

### B — Categories & naming
- **B1.** For each of the 5 cards, do categories use **engine names verbatim** ("Energy Angle", "Hip/Shoulder Separation") or **athlete-friendly renames** ("Coil", "Stay Closed")?
- **B2.** Pitching: does "Posture" map to `head_stability`, `hip_alignment`, or a composite of both? Stride Length + Stride Consistency: one card or two?
- **B3.** Hitting: P1/P2/P3/P4 ship under canonical names (Hip Load · Hand Load · Stride/Landing · Hitter's Move) or athlete renames?
- **B4.** Throwing: one universal card v1, or branch per position (Pitcher · Catcher · Infielder · Outfielder)?
- **B5.** Softball Hitting Slap: full Slap card variant, or modifier on the standard card?
- **B6.** Are there report-card categories **not currently measurable by the engine** that you nonetheless want graded (Effort, Composure, Routine, Mound Presence, At-bat Quality)? If yes, name them — they need measurement work before they can ship.

### C — Hierarchy & weighting
- **C1.** Pitching: ratify or override engine weights (Separation 14 · Energy Angle 12 · Tempo 10 · Stride 10 · Hip Alignment 9 · Front Side 9 · Head Stability 8 · Head Alignment 7 · Shoulder Level 7 · Rear Foot Drag 7 · Visual Stability 7).
- **C2.** Which categories are **Non-Negotiable** (failing caps the entire card)? Hitting has P1 + P4 as candidates. Pitching has none today.
- **C3.** Which categories are **Developmental** (under-weighted for U10/U12/U14) and which are **Advanced** (only visible once foundation is clean)? Give age cut-offs.
- **C4.** Rank 1 and Rank 2 most important per discipline.

### D — Scoring formats
- **D1.** Default continuous category format: 0–100, 1–10, letter, or band ("Elite / Strong / Developing / Needs Work")?
- **D2.** Boolean-derived (Eyes On Target, Separation, Hip Alignment, Front Side): Pass/Fail chip or numeric score?
- **D3.** Tracked-only signals (Extension Consistency, Arm Slot Consistency): always shown, only when variance elevated, or hidden from athlete view?
- **D4.** Composite hero number: 0–100, 1–10, letter, or band-only? Or no hero number?
- **D5.** Raw measurements (1.02 s, 104% body height, 8°): always visible to athlete, or only inside click-expansion?
- **D6.** Failure-band wording: keep Clean / Minor / Major / Critical, or athlete-facing alternatives (Elite / Strong / Developing / Needs Work)?

### E — Category expansion content (§15)
- **E1.** Confirm the 9-block contract; add/remove blocks now.
- **E2.** "What good looks like" / "What bad looks like" — always video, or sometimes text + still frame? Who tags reference clips and how?
- **E3.** "How to improve" — paragraph, numbered list, or mini-progression (L1→L2→L3→L4)?
- **E4.** "Roadmap next step" — single named drill, phase progression, or calendar commitment ("3 sessions in 10 days")?

### F — Drill integration
- **F1.** One deficiency → ordered drill list (deterministic) vs weighted/probabilistic — confirm deterministic.
- **F2.** Canonical deficiency catalog source: may I seed from existing `common_deficiencies` in `pieV2Signals.ts` + hitting `failureSymptoms` as a starting list, with you to add/cut?
- **F3.** Can one drill serve multiple deficiencies, or is the mapping strictly one-to-many in the other direction?

### G — Video integration
- **G1.** Confirm video tag set: `reference_good`, `reference_bad`, `corrective`, `teaching`, `roadmap_step`. Add/cut.
- **G2.** Per-category minimum (e.g. every category must have ≥1 `reference_good` + ≥1 `corrective`)? When nothing exists yet — visible missingness chip, or hide block?

### H — Roadmap integration
- **H1.** Is a "roadmap step" a property of the **deficiency** (same step for every athlete with this deficiency) or a property of the **athlete's current level** (same deficiency → different step depending on history)?
- **H2.** Does the Report Card surface only the **next** step, or the **next N** in sequence?

### I — Coach Hammer
- **I1.** One voice across all five cards, or per-discipline voices?
- **I2.** Does Coach Hammer's copy change per audience (athlete / parent / coach), or only the layout?
- **I3.** Forbidden tones — confirm: scolding, marketing, school-grade, ALL-CAPS shouting, sarcasm, emoji-heavy, military metaphors, destiny framing.
- **I4.** Coach Hammer is **delivery only** (rewrites a hand-authored motivational paragraph) — never authors deficiencies, drills, videos, scores, or roadmap steps. Confirm.

### J — Progress, parent, recruiting
- **J1.** Progress view: show change since last session **by default** with arrows, or only on explicit "compare" click?
- **J2.** Parent view: identical copy with different layout, or simplified copy?
- **J3.** Parent view: does it ever show a numeric score, or only bands + bullets?
- **J4.** Recruiting view: subset of Report Card, separate summary card, or per-discipline highlight reel? What is the minor-athlete gate (RR-9 / RR-10) for what a recruiter may even see?
- **J5.** Recruiting view: shareable by link with expiration, or only viewable inside a recruiter account?

### K — Confidence, missingness, scope
- **K1.** When a session cannot be scored for a category, render as "Not measured — confidence pending" card, or hide the category for that session?
- **K2.** When confidence is low (single rep, manual entry), show the score with an "Estimate" chip, or suppress the score and show "Needs more data"?
- **K3.** Athlete-reported pain in a session — does it appear on the Report Card itself, or on a side channel only? With what visibility to coach / parent / recruiter?
- **K4.** Does this constitution govern **only the per-session Report Card**, or **also the longitudinal Report Card** (multi-session trend)?
- **K5.** Coach view of an athlete's Report Card — same document, or a separate later constitution?
- **K6.** Removal of UHRC — happens as a side-effect of ratifying this constitution, or as a separately planned later phase?
- **K7.** Throwing standards #6 and #7 — paste the full verbatim text. The audit transcript truncated them, and §6 cannot close without all 7.

---

## §17 — Per-category schema (used inside §4, §5, §6)

For every category in every report card, the document fills out the following identical block. Identity across disciplines is the universality the system promises.

```text
Category: <athlete-facing name>
  Engine binding:        <signal id(s) — read-only reference, not authored here>
  Display format:        <Pass/Fail | 0–100 | 1–10 | band | raw measurement | trend chip>
  Hierarchy rank:        <Non-Negotiable | Rank 1 | Rank 2 | Developmental | Advanced>
  Weight (athlete view): <number or "n/a — gate">
  What is it:            <one paragraph, athlete language>
  Why it matters:        <one paragraph>
  If poor → performance: <one paragraph>
  If poor → durability:  <one paragraph>
  If poor → efficiency:  <one paragraph>
  If poor → consistency: <one paragraph>
  How to improve:        <philosophy paragraph, not a recipe>
  Drill IDs:             <ordered list — pending §16 F ratification>
  Video IDs:             <ordered list — pending §16 G ratification>
  Roadmap step:          <named step — pending §16 H ratification>
  Good-looks-like clip:  <slot — pending tagging>
  Bad-looks-like clip:   <slot — pending tagging>
  Coach Hammer voice:    <athlete tone · parent tone · coach tone — pending §16 I>
  Confidence rule:       <when to render full score vs "estimate" vs "not measured">
  Missingness rule:      <what shows when this session can't be scored>
```

The schemas themselves are not filled in this draft. They are filled in v0.2, after §16 closes, in a single dedicated pass per discipline. Filling them before §16 closes would bake in assumptions and reproduce the failure mode that prompted this constitutional reset.

---

## §18 — Exit criteria

This document may flip to `STATUS: RATIFIED` only when:

1. Every question in §16 (A1–A3, B1–B6, C1–C4, D1–D6, E1–E4, F1–F3, G1–G2, H1–H2, I1–I4, J1–J5, K1–K7) is answered by the owner.
2. The owner pastes verbatim text for Throwing standards #6 and #7 (K7).
3. The schema block in §17 is filled for every category in §4 / §5 / §6 using the ratified answers.
4. An RFL entry (RFL-080) records the ratification with date and version pin.

Until those four conditions are met:

- No code edits anywhere in the repo.
- No removal of UHRC.
- No migration of hitting phase tags.
- No throwing signal registry.
- No correction-cache table.
- No edge functions.
- No new routes, tabs, components, or design tokens.
- No "small" task framed as documentation-adjacent implementation.

---

*End of Hammers Report Card Constitution v0.1 — STATUS: DRAFT — UNRATIFIED.*
