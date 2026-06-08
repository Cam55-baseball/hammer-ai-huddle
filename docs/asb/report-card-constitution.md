# Hammers Report Card Constitution

> **STATUS: §0 RATIFIED — §16 / §17 OPEN**
> Version: v0.9
> Opened: 2026-06-08 · Revised: 2026-06-08 (Phase 0.7 — Constitutional Closeout)
> Lineage: ASB RFL-080, RFL-081, RFL-082, RFL-083, RFL-084, RFL-086, RFL-087, RFL-088 · supersedes scope captured in `docs/asb/analysis-formula-ratification.md` (audit-only)
> Subordinate to: Eternal Laws, all RR-1…RR-10, RW-1…RW-10, EI/IR/EK/SG/FC/EE/RO/AR/DG/RE/AE/SF/ES/CV/ER/SL/FI-C invariant families, and every prior immutable invariant sealed across ASB Phases 1–160.
> **§0 Precedence:** Section 0 supersedes §1–§17. Any conflict is resolved in favor of §0. §16 Groups A–K were constitutionally gated behind §0 ratification under the **extended ratification gate** defined in §0.12, bounded by the §0.17 Constitutional Decision Register (CDR) per Phase 0.2 synthesis, packaged for owner closure by the §0.18 Constitutional Decision Packet per Phase 0.3, narrowed by the §0.22 False Ambiguity Audit per Phase 0.5, doctrine-confirmed by the §0.24 Doctrine Alignment Recommendation per Phase 0.6, and **closed by owner ratification per §0.25 (Phase 0.7)**. Phase 0.7 records owner `DEFAULTS` submission (2026-06-08, RFL-088) ratifying all 12 Axis A–D CDR items verbatim; all 17 CDR items are now RATIFIED (12 owner + 5 auto via §0.22). §0.12 conditions (1)+(2)+(3)+(4) are satisfied → **§0 flips to RATIFIED**. §16 unseals; §17 schemas remain to be filled; §18 STATUS:RATIFIED for the full constitution requires §16 owner answers + §17 fill-in + ratification RFL entry, and implementation remains blocked until §18 closes.

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

### §0.14 — Remaining Constitutional Work Estimate (revised by Phase 0.2)

Re-derived after the Phase 0.2 Constitutional Synthesis Pass. Replaces the prior 25–35-wave estimate.

| Source | Before Phase 0.2 | After Phase 0.2 |
|---|---|---|
| Open questions across Q-Series Z + AA–AI | 48 outstanding (~75–110 projected with fanout) | **17 CDR decisions** (CDR-1…CDR-17) |
| Estimated owner waves to ratification | 25–35 | ~~3 owner waves (D1/D4/D5)~~ → **2 owner responses across 6 bundles** per §0.21 closure recommendation |
| Fully-derived domains (no owner input) | n/a | **D2 Coach Hammer Behavior** and **D3 Parent/Recruiter Visibility** (closed by inherited doctrine) |
| §0.11 audit re-runs | 1 per wave-batch closure | 1 per CDR-domain closure |
| §16 Groups A–K | sealed | sealed (unchanged) |

### §0.15 — Constitutional Derivation Rule

> **Rule.** *If a question can be answered by existing ratified Hammers Modality doctrine, a new owner-interview question shall not be created. Existing doctrine must be referenced and inherited.*

Every constitutional question — present or future — must first be classified against the ratified doctrine corpus (Eternal Laws; RR-1…RR-10; RW-1…RW-10; EI/IR/EK/SG/FC/EE/RO/AR/DG/RE/AE/SF/ES/CV/ER/SL/FI-C invariant families; §0.1–§0.7; §1–§3; Missingness Doctrine; Closed-Loop Intelligence Doctrine; Coach Hammer Doctrine; Roadmap Doctrine; Development-First / Pillar-First philosophies; Hitting Non-Negotiables; Parent/Recruiter Protection Doctrine; Presentation Mode Lock):

- **Class A — Already Answered.** Cite the ratified clause. Do not open an owner question.
- **Class B — Derivable.** Cite source(s) + single-step reasoning. Do not open an owner question.
- **Class C — True Constitutional Ambiguity.** Route to the §0.17 Constitutional Decision Register. Only Class C may produce an owner-facing question.

Violations of §0.15 (opening an owner question for an A/B-class item) are constitutionally invalid and must be retracted. The §0.15 rule applies retroactively (Phase 0.2 audit, §0.16) and prospectively (any future Q-Series wave, sub-question, or follow-up).

### §0.16 — Ambiguity Ledger (Phase 0.2)

Re-audit of all 48 open questions from Q-Series Z (Z1–Z21) and Q-Series AA–AI (AA1–AI3) against the ratified doctrine corpus. Every row records: classification (A/B/C), inherited doctrine source (A/B) or CDR routing (C), and reasoning chain. Class A/B rows are constitutionally closed. Class C rows carry forward into §0.17. **No Q-Series Z or AA–AI question is reopened**; closure path is fixed here.

#### Q-Series Z

| Q | Class | Source / Reasoning | Owner needed? | Routed to |
|---|---|---|---|---|
| Z1 | **C** | No clause specifies UI-element-level conflict-resolution mode (hide / de-emphasize / overlay / context-only) when a low score lands on a category the athlete is actively improving. | Yes | CDR-9 |
| Z2 | **B** | §0.2 veto clause: any decision "that improves grading at the expense of understanding… is constitutionally invalid." → **strict lexicographic** (Grading never wins a tie). | No | Closed |
| Z3 | **B** | RR-relational + RR-10 (parent supremacy for minors) + RR-9 (visibility ethics) + §0 §0.2 hierarchy is unscoped to a single audience. → **Hierarchy applies to Athlete, Parent, and Recruiter surfaces; Parent/Recruiter inherit §0 via translation, not duplication.** | No | Closed |
| Z4 | **C** | §0.3 mandates "ENCOURAGED" outcome; *enforcement mechanism* (tone-only / +visual / +structural) is not specified. | Yes | CDR-10 |
| Z5 | **B** | §0.4 entry order priority 1 = "Highest-priority improvement opportunity" is the hero on every session, including all-poor sessions. → **Lead with highest-leverage improvement.** | No | Closed |
| Z6 | **C** | §0.3 forbids "judged/punished" feelings but does not fix palette grammar; no clause permits or bans red/failure tones. | Yes | CDR-11 |
| Z7 | **C** | "Highest-priority improvement" composite definition (lowest score / highest leverage / coach-defined non-negotiable / roadmap distance / hybrid) is unresolved. | Yes | CDR-12 |
| Z8 | **B** | §0.4 places overall grade at position 8 + §1 / §0.4 axiom "the overall grade is never the hero." → **Never on entry; reachable only after development pathway.** | No | Closed |
| Z9 | **B** | §1 + §2.7 "Coach Hammer — motivational synthesis — delivery only, never authorship." → **Synthesis layer (both summary of 1–6 and separate voice).** | No | Closed |
| Z10 | **C** | Celebration threshold (any positive delta / ≥N points / band crossing) is unspecified. | Yes | CDR-5 |
| Z11 | **B** | §0.5: "A composite that is flat or down while pillars are climbing is not a regression and must never be presented as one." → **Composite shown with pillar-progress overlay.** | No | Closed |
| Z12 | **C** | Canonical improvement signal (per-session deltas vs rolling deltas) is unspecified. | Yes | CDR-6 |
| Z13 | **B** | §3 Law 3 (missingness-visible) + §3 Law 5 (never-fabricated) + §0.6 (visible missingness). → **Visible missingness with placeholder; never AI-fabricated, never silently omitted.** | No | Closed |
| Z14 | **B** | §1 + §3 Law 5: AI may rewrite *motivational delivery*; AI may never *author facts*. → **Hybrid: authored core fact + AI tone wrapper.** | No | Closed |
| Z15 | **C** | Disclosure pattern for the 9 explanation blocks (always-expanded / always-collapsed / progressive) is unspecified. | Yes | CDR-13 |
| Z16 | **B** | §3 Law 3 missingness-visible + §0.6: until owner authors a measurement source for the "pushed-forward-during-full-hand-load" P1 test, surfaced as **not-yet-measured**. (Source-of-measurement choice itself is §16 B-series, not §0.) | No | Closed |
| Z17 | **C** | P3 sub-criteria decomposition (combined pass/fail vs two independently scored: "back hip → release" and "foot down without shoulder rotation") is unspecified. | Yes | CDR-3 |
| Z18 | **C** | P4 four-element decomposition (knob stability / elbow direction / barrel delivery / closing the gap — aggregated vs independent) is unspecified. | Yes | CDR-4 |
| Z19 | **C** | Softball Hitting variance (and Slap) — true owner decision. Merged with §16 B5; resolved once. | Yes | CDR-14 (merge w/ §16 B5) |
| Z20 | **C** | Interview-cadence discipline (auto-advance vs approval-gated waves). | Yes | CDR-16 |
| Z21 | **C** | RFL granularity (per-wave vs per-ratification). | Yes | CDR-17 |

#### Q-Series AA–AI

| Q | Class | Source / Reasoning | Owner needed? | Routed to |
|---|---|---|---|---|
| AA1 | **C** | Score *frame* (% of elite / % of ceiling / movement-quality band / raw / hybrid) is unspecified. | Yes | CDR-1 |
| AA2 | **C** | Absolute vs athlete-relative (calibrated to age/level/history) — if hybrid, where the constitutional line sits — is unspecified. | Yes | CDR-2 |
| AA3 | **B** | §0.4 priority 8 + §1 "overall grade is never the hero." → **Never on entry; never on parent/recruiter primary surface; click-through audit panel only.** | No | Closed |
| AB1 | **B** | §0.5 pillar-first doctrine. → **Pillar movement is the canonical "progress" signal; composite is subordinate; roadmap-milestone movement is a derived view of pillar movement.** | No | Closed |
| AB2 | **B** | §0.3 forbids "judged/punished" + §0.5 "composite drop ≠ regression when pillars climb." → **Regression contextualized as variance / learning moment; never presented as failure; never hidden.** | No | Closed |
| AB3 | **C** | Canonical improvement time horizon (per-session / rolling N / since-roadmap-start / athlete-selectable) is unspecified. | Yes | CDR-7 |
| AC1 | **A** | RR-5 (no manipulation, no destiny framing), RR-7 (no identity locking, no career projection), RR-9 (no exploitative ranking), RR-10 (no commercial pressure on minors), RW-1 (organism truth > commercial), CV/ER manipulation prohibitions, §0.3 (never Judged/Punished). → **Forbidden set fully defined: no comparisons to other athletes, no career-outcome projections, no diagnosis-like language, no punishment framing, no destiny framing, no identity-locking, no commercial pressure on minors.** | No | Closed |
| AC2 | **A** | RR-5 athlete-revocation right; Missingness Doctrine (insufficient signal → silence); AR contradiction-state containment; SF/ES bounded-confidence silence rule; §3 Law 2 (no score without confidence state). → **Silence triggers fully defined: insufficient signal, contradiction state, low confidence below threshold, athlete opted out of narrative thread per RR-5, missing antecedents.** | No | Closed |
| AC3 | **B** | §1 "delivery only, never authorship" + §3 Law 5 (never-fabricated). → **Hybrid: authored intent + AI tone wrapper.** Voice is identical across surfaces (Coach Hammer, celebration, parent translation). | No | Closed (inherits AF3) |
| AD1 | **B** | RR-relational doctrine: Parent View is a translation surface, not a parallel artifact. → **Parent View inherits §0 via translation; not a separate constitutional surface.** | No | Closed |
| AD2 | **A** | RR-8 (life context disclosure rights, athlete-controlled), RR-10 (parent supremacy for minors), relational primitives (athlete-controlled disclosure). → **Already defined: parent sees safeguarding-relevant + age-appropriate progress; athlete retains revocation right over narrative threads (RR-5); for minors, parent retains supremacy on commercial/recruiter pathways.** | No | Closed |
| AD3 | **A** | RR-5 (no comparisons in narrative), RR-9 (no exploitative ranking), RW-1 (no commercial distortion). → **Comparison to other athletes never permitted in Parent View.** | No | Closed |
| AE1 | **A** | Presentation Mode Lock (Released 2026-06-01) + RR-9/RR-10 sealed as doctrine, implementation deferred per `docs/asb/post-mastery-expansion-roadmap.md`. → **Recruiter View constitutionally deferred in V1.** | No | Closed |
| AE2 | **A** | RR-10 verbatim: parents retain supremacy for minors. → **Parent is the gating authority for minors; recruiter visibility for minors requires explicit parent authorization.** | No | Closed |
| AE3 | **A** | RR-9 (no pay-to-win, no exploitative ranking, no popularity loops) + RR-10 (commercial subordinate to safeguarding). → **Inherited verbatim: no pay-to-win visibility, no exploitative ranking, recruiters see only explicitly-authorized surfaces.** | No | Closed |
| AF1 | **C** | Celebration trigger *set* (pillar climb / band crossing / roadmap milestone / first-time category completion / combination) is unspecified. | Yes | CDR-8 |
| AF2 | **A** | RR-5 (no manipulation), RR-9 (no exploitative ranking), §0.5 (no false celebration), §3 Law 5 (no fabrication). → **Forbidden celebrations fully defined: another athlete's worse score, streaks that mask regression, score increases caused by skipped categories, any celebration that is not lineage-traceable to canonical pillar movement.** | No | Closed |
| AF3 | **B** | Must inherit AC3 (single Coach Hammer voice = single tone grammar across celebration and guidance). → **Hybrid: authored intent + AI tone wrapper.** | No | Closed |
| AG1 | **A** | Missingness Doctrine + SF/ES/AR vocabulary already canonicalize the five missingness states. → **Vocabulary already defined: (a) not-yet-measured, (b) measured-but-low-confidence, (c) measured-but-contradicted, (d) signal-dropped (sensor failure), (e) intentionally-withheld (athlete/parent disclosure right).** | No | Closed |
| AG2 | **B** | §3 Law 3 (missingness-visible) + §3 Law 5 (never-fabricated) + §0.6. → **Copy contract is categorical, never marketing-coded: "Not yet authored for this category" / "Drill not yet assigned" / "Sensor signal dropped" / "Withheld by athlete" / "Insufficient signal to evaluate." No "coming soon" marketing language permitted.** | No | Closed |
| AG3 | **B** | §0.6 (9 blocks mandatory) + §3 Law 7 (no silent omission). → **Missing blocks render as visible block-level missingness; the score may still render with block-level missingness exposed; the score may never claim a block exists when it does not.** | No | Closed |
| AH1 | **C** | V1 discipline scope set (Baseball Pitching / Baseball Hitting / Softball Pitching / Softball Hitting / Throwing / Catching / Defense / Baserunning — per-discipline yes/no) is an owner decision. | Yes | CDR-15 |
| AH2 | **A** | §3 universal laws vs §0.7 discipline-scoped Hitting Non-Negotiables. → **Already constitutional: §3 universal across all disciplines; §0.7 constitutional only within Hitting.** | No | Closed |
| AH3 | **A** | §3 Law 10 additive-only + §0.11 audit pattern. → **Future disciplines must pass their own §0.11-style audit before opening their Report Card surface; cannot weaken prior constitutional rules.** | No | Closed |
| AI1 | **B** | §3 Law 3 (missingness-visible) + §0.5 (pillar-first progress). → **First session: wider missingness, no longitudinal data, no progress overlay. Nth session: progress visible per AB-class closures.** | No | Closed |
| AI2 | **A** | RR-5 narrative continuity + athlete-revocation right verbatim. → **Longitudinal narrative thread bound by RR-5; athlete may redirect or revoke any thread at any time, surfaced inside the Report Card.** | No | Closed |
| AI3 | **A** | RR-5, RR-7 verbatim. → **Journey is not destiny, not ranking, not identity-locking, not career projection.** | No | Closed |

#### Counts

| Metric | Count |
|---|---|
| Original open questions | **48** |
| Class A (already answered) | **13** |
| Class B (derivable) | **18** |
| **Eliminated (A + B)** | **31** |
| **Remaining true ambiguities (C → CDR)** | **17** |
| Reduction | **65%** |

### §0.17 — Constitutional Decision Register (CDR)

Five-domain collapse of the 17 Class-C ambiguities from §0.16. Each CDR item carries forward exactly one Class-C question. Domains with zero residue are recorded as **"Fully derived — no owner decision required"** so the closure is auditable. No CDR item is pre-answered by Lovable.

#### D1 — Scoring Meaning (4 decisions)

| CDR ID | Origin | Decision required | Status |
|---|---|---|---|
| CDR-1 | AA1 | Score frame: % of elite reference / % of athlete's own ceiling / movement-quality band (Developmental / Proficient / Elite) / raw measurement on a labelled scale / defined hybrid. | **RATIFIED — D** (Phase 0.7) |
| CDR-2 | AA2 | Absolute (same score = same movement quality across athletes) vs athlete-relative (calibrated to age/level/history); if hybrid, where the constitutional line sits. | **RATIFIED — C** (Phase 0.7) |
| CDR-3 | Z17 | P3 sub-criteria: combined pass/fail vs two independently scored ("back hip → pitcher release" and "foot down without shoulder rotation"). | **RATIFIED — C** (auto, Phase 0.5) |
| CDR-4 | Z18 | P4 four-element decomposition: aggregated holistic vs independently scored (knob stability / elbow direction / barrel delivery / closing the gap). | **RATIFIED — C** (auto, Phase 0.5) |

#### D2 — Coach Hammer Behavior

**Fully derived — no owner decision required.** AC1/AC2 from RR-5/7/9/10 + Missingness Doctrine + §0.3; AC3 hybrid from §1 + §3 Law 5; AF3 inherits AC3; AF2 from RR-5/9 + §0.5 + §3 Law 5; Z9 synthesis from §1 + §2.7. No residue.

#### D3 — Parent / Recruiter Visibility

**Fully derived — no owner decision required.** AD1/AD2/AD3/AE1/AE2/AE3 inherited verbatim from RR-5 + RR-8 + RR-9 + RR-10 + Presentation Mode Lock; AA3 from §0.4 + §1; Z3 from RR-relational doctrine. No residue.

#### D4 — Celebration & Progress (4 decisions)

| CDR ID | Origin | Decision required | Status |
|---|---|---|---|
| CDR-5 | Z10 | Celebrated-pillar trigger threshold: any positive delta / threshold delta (e.g., ≥2 points) / band crossing / combination. | **RATIFIED — D** (Phase 0.7) |
| CDR-6 | Z12 | Canonical improvement signal: per-session deltas vs rolling deltas. | **RATIFIED — C** (Phase 0.7) |
| CDR-7 | AB3 | Improvement time horizon: per-session / rolling N sessions / since-roadmap-start / athlete-selectable. | **RATIFIED — D** (Phase 0.7) |
| CDR-8 | AF1 | Celebration trigger set: which events constitutionally trigger a celebration moment (pillar climb / band crossing / roadmap milestone / first-time category completion / combination). | **RATIFIED — D** (Phase 0.7) |

#### D5 — Athlete Journey Experience (9 decisions)

| CDR ID | Origin | Decision required | Status |
|---|---|---|---|
| CDR-9 | Z1 | Conflict-mode rendering when grading conflicts with understanding at the UI-element level: hide / de-emphasize / "progressing" overlay / unchanged with context text. | **RATIFIED — C** (Phase 0.7) |
| CDR-10 | Z4 | "ENCOURAGED" enforcement mechanism: tone-only / tone + visual / tone + visual + structural. | **RATIFIED — C** (Phase 0.7) |
| CDR-11 | Z6 | Palette permissions for failure/red tones: permitted / restricted to neutral-positive-progress / conditional. | **RATIFIED — C** (Phase 0.7) |
| CDR-12 | Z7 | "Highest-priority improvement" composite definition: lowest score / highest leverage on composite / coach-defined non-negotiable rank / furthest-from-roadmap-milestone / defined hybrid. | **RATIFIED — E** (auto, Phase 0.5) |
| CDR-13 | Z15 | Disclosure pattern for the 9 explanation blocks: always-expanded / always-collapsed / progressive disclosure. | **RATIFIED — C** (Phase 0.7) |
| CDR-14 | Z19 | Softball Hitting variance — full Slap-card variant vs P4-modifier on standard card (merged with §16 B5; resolved once). | **RATIFIED — C (defer)** (auto, Phase 0.5) |
| CDR-15 | AH1 | V1 discipline scope set: explicit yes/no per discipline (Baseball Pitching / Baseball Hitting / Softball Pitching / Softball Hitting / Throwing / Catching / Defense / Baserunning). | **RATIFIED — {BP=Y, BH=Y, all others=N}** (auto, Phase 0.5) |
| CDR-16 | Z20 | Interview cadence discipline: auto-advance to next wave vs explicit per-wave approval. | **RATIFIED — B** (Phase 0.7) |
| CDR-17 | Z21 | RFL granularity: per-wave entry (RFL-082, RFL-083, …) vs single RFL entry at §0 ratification. | **RATIFIED — A** (Phase 0.7) |

**Total CDR items: 17.** No question appears in two domains. Z19 is merged with §16 B5 and consumes a single CDR slot.

**CDR closure procedure.** Owner answers each CDR item; each answer is recorded inline next to its CDR ID with the source domain and routing question(s); the §0.11 audit row corresponding to the answered CDR flips Partially/Absent → Defined; once all 17 are answered and §0.11 is clean, §0.12 conditions (1)+(2)+(3) are satisfied and the owner may execute condition (4) ratification.

### §0.18 — Constitutional Decision Packet (Phase 0.3)

> **Purpose.** Convert the 17 open CDR items from §0.17 into a single owner-facing decision document with bounded options (A/B/C/D), per-option constitutional consequences, doctrine constraints that cannot be violated, and a Recommended Default where inherited doctrine materially favors one path. No option is auto-ratified. D2 (Coach Hammer Behavior) and D3 (Parent/Recruiter Visibility) remain **closed-by-derivation per §0.16 and are not reopened in Phase 0.3**.

**Per-item schema (uniform across all 17 items):**

- **Constitutional impact** — what this decision binds.
- **Downstream systems** — Report Card | Analysis Engine | Correction Engine | Roadmap | Coach Hammer | Parent Surface | Recruiter Surface (annotated `BINDS` / `INFLUENCES` / `NONE` in §0.19).
- **Doctrine constraints (non-violable)** — clauses no option may breach.
- **Options** — A/B/C and optional D, each with its constitutional consequence chain.
- **Recommended Default** — A/B/C/D when doctrine favors one path; otherwise "no default — pure owner choice." Defaults are NOT ratified by emission; the owner must select.

---

#### D1 — Scoring Meaning (4 decisions)

##### CDR-1 — Score Frame (origin: AA1)

- **Constitutional impact:** Defines what every numeric score *means* across the entire Report Card surface. Binds the §0.6 Universal Category Explanation Law "Elite" block, the §0.7 hitting non-negotiable surfacing format, and every category render in §17.
- **Downstream systems:** Report Card · Analysis Engine · Correction Engine · Roadmap · Coach Hammer · Parent Surface · Recruiter Surface (all BINDS).
- **Doctrine constraints (non-violable):** §0.1 (understanding-first), §0.2 (Understanding > Correction > Progress > Grading), §0.3 (never Judged/Punished), §0.4 (grade never the hero), §0.6 (visible missingness in "Elite" block), §3 Law 2 (no score without confidence state), §3 Law 5 (never fabricated), RW-7 (intelligence delivery confidence-bounded), AR-1 (organism-truth supremacy over heuristic optimization), RR-9 (no exploitative ranking).
- **Options:**
  - **A — % of elite reference.** Anchors every score to an authored elite benchmark. *Consequence:* Analysis Engine must publish the elite reference per category; Coach Hammer copy reads "X% of elite movement quality"; recruiter-deferred surface (per AE1) inherits the same frame. Risk: feels evaluative on low-skill sessions unless §0.3 ENCOURAGED grammar (CDR-10/11) compensates.
  - **B — % of athlete's own ceiling.** Score = % of the athlete's own historical/projected best. *Consequence:* development-first by construction; requires longitudinal lineage from session 1 (first-session score = baseline-anchored, never "0%"); Roadmap binds to ceiling-projection logic; parent translation reads "progress toward their own ceiling."
  - **C — Movement-quality band (Developmental / Proficient / Elite).** Categorical, no number. *Consequence:* eliminates numeric comparison risk entirely; satisfies §0.3 maximally; loses fine-grained progress signal — CDR-6 per-session deltas become band transitions only; composite hero number (pending §16 D4) becomes a band, not a number.
  - **D — Defined hybrid.** Bands as the headline + a numeric sub-value (e.g., % of elite) inside the click-expansion per §3 Law 1. *Consequence:* headline = development-coded band; lineage to numeric reference preserved one click away; requires explicit constitutional declaration of which frame the sub-value uses.
- **Recommended Default:** **D (Hybrid: band headline + numeric sub-value).** §0.1 + §0.3 + §0.4 favor bands as the headline; §3 Law 1 (lineage one click away) and §0.6 (Elite block) require a numeric reference exists somewhere; D is the smallest constitutional move that satisfies both.

##### CDR-2 — Absolute vs Athlete-Relative (origin: AA2)

- **Constitutional impact:** Determines whether the same score means the same movement quality across athletes, or is calibrated to age/level/history. Binds every cross-session, cross-athlete, and cross-discipline interpretation.
- **Downstream systems:** Report Card · Analysis Engine · Correction Engine · Roadmap · Coach Hammer · Parent Surface · Recruiter Surface (all BINDS).
- **Doctrine constraints (non-violable):** §0.4 (development-first), §0.5 (pillar progress ≠ composite drop), §3 Law 5 (never fabricated), RW-1 (organism truth > commercial), RR-7 (no identity locking, no career projection), RR-9 (no exploitative ranking), AR-1 (organism-truth supremacy), AE3 (no comparison in parent surface).
- **Options:**
  - **A — Fully absolute.** Same score = same movement quality across all athletes. *Consequence:* enables elite-reference frame (CDR-1A); creates direct comparability risk — must be neutralized by §0.3 ENCOURAGED grammar and RR-9 anti-ranking enforcement; parent/recruiter copy must explicitly disclaim ranking.
  - **B — Fully athlete-relative.** Score calibrated to age, level, history. *Consequence:* impossible to compare two athletes; development-first by construction; requires Analysis Engine to compute and publish each athlete's calibration envelope; risks confusing parents who expect an external benchmark.
  - **C — Hybrid with declared line.** Absolute reference exists at the *measurement* layer (raw kinematics, timing, % of body height); athlete-relative interpretation at the *score* layer (band placement and progress signal). *Consequence:* lineage one click away (§3 Law 1) lets a curious user reach the absolute number; the headline they see is calibrated; satisfies both organism-truth and development-first doctrine.
- **Recommended Default:** **C (Hybrid with declared line — absolute at measurement, relative at score).** Required to coexist with CDR-1D; preserves §3 Law 5 (never fabricate the absolute) while honoring §0.4 (development-first) and RR-7 (no identity locking) at the surface layer.

##### CDR-3 — P3 Sub-Criteria Decomposition (origin: Z17) — **CLOSED — AUTO-RESOLVED (Phase 0.5)**

> **Phase 0.5 ruling:** Option **C** is the only constitutionally legal render. **Sources:** §3 Law 1 (lineage one click away), §0.6 (9 mandatory explanation blocks include "Why" + "How to improve"), §0.1 (consistency-of-grammar). Option A collapses lineage (violates Law 1); Option B inflates §17 schema without doctrinal justification and breaks §0.1 symmetry with CDR-4. **Owner input not required.** See §0.22 audit table.

- **Constitutional impact:** Determines whether the hitting P3 non-negotiable ("back hip → pitcher release" AND "foot down without shoulder rotation") is a single pass/fail or two independently-scored elements. Binds §0.7 hitting non-negotiables surfacing and §17 category schema for P3.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (BINDS) · Correction Engine (BINDS) · Roadmap (BINDS) · Coach Hammer (INFLUENCES) · Parent Surface (INFLUENCES) · Recruiter Surface (NONE per AE1).
- **Doctrine constraints (non-violable):** §0.6 (9 mandatory explanation blocks per category), §0.7 (P1–P4 are constitutional truths, never simplified), §3 Law 1 (lineage one click away), §3 Law 5 (never fabricated), §3 Law 10 (additive only).
- **Options:**
  - **A — Combined pass/fail.** One P3 category, one score. *Consequence:* simplest render; loses the ability for Correction Engine to surface "back hip is fine, shoulder rotation is the issue" as separate corrections; violates §3 Law 1 spirit (lineage compressed).
  - **B — Two independently scored sub-criteria under one P3 header.** *Consequence:* preserves §3 Law 1 lineage; Correction Engine can target the failing sub-criterion specifically; doubles the §17 schema rows for P3 but does not violate §3 Law 10 (additive).
  - **C — Single P3 score with two sub-criteria visible in click-expansion (§0.6 "Why" + "How to improve" blocks).** *Consequence:* headline simplicity of A; lineage of B; Correction Engine still gets sub-criterion granularity from the expansion; closest match to CDR-1D + CDR-2C surface grammar.
- **Recommended Default:** **C** — **AUTO-RESOLVED per §0.22**. Preserved entry for §3 Law 10 lineage.

##### CDR-4 — P4 Four-Element Decomposition (origin: Z18) — **CLOSED — AUTO-RESOLVED (Phase 0.5)**

> **Phase 0.5 ruling:** Option **C** is the only constitutionally legal render. **Sources:** same chain as CDR-3 plus §0.1 symmetry — Report Card grammar cannot use one structure for P3 and a different one for P4. The pre-existing Recommended Default rationale explicitly cited "forced by symmetry with CDR-3," confirming the doctrinal lock. **Owner input not required.** See §0.22 audit table.

- **Constitutional impact:** Same structural question as CDR-3 for P4 (knob stability / elbow direction / barrel delivery / closing the gap). Binds §0.7 P4 and §17 schema.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (BINDS) · Correction Engine (BINDS) · Roadmap (BINDS) · Coach Hammer (INFLUENCES) · Parent Surface (INFLUENCES) · Recruiter Surface (NONE per AE1).
- **Doctrine constraints (non-violable):** Same as CDR-3 plus §3 Law 10 (P4 elements never collapsible to fewer than four if owner-declared as four).
- **Options:**
  - **A — Aggregated holistic.** One P4 score. *Consequence:* loses lineage to four owner-ratified elements; risks violating §0.7.
  - **B — Four independently scored elements.** *Consequence:* maximum lineage; quadruples §17 schema rows for P4; Correction Engine gets element-level targeting.
  - **C — Single P4 score with four elements visible in click-expansion.** *Consequence:* matches CDR-3C grammar; preserves §0.7 truth at the lineage layer.
- **Recommended Default:** **C** — **AUTO-RESOLVED per §0.22** (forced by symmetry with CDR-3). Preserved entry for §3 Law 10 lineage.

---

#### D2 — Coach Hammer Behavior

**Closed-by-derivation per §0.16 (AC1/AC2/AC3/AF2/AF3/Z9). Not reopened in Phase 0.3.** Any Coach Hammer behavior question that arises after Phase 0.3 must first pass §0.15 classification; only Class-C residue may open a new CDR slot.

---

#### D3 — Parent / Recruiter Visibility

**Closed-by-derivation per §0.16 (AD1/AD2/AD3/AE1/AE2/AE3/AA3/Z3). Not reopened in Phase 0.3.** Same §0.15 gate applies to any future visibility question.

---

#### D4 — Celebration & Progress (4 decisions)

##### CDR-5 — Celebrated-Pillar Trigger Threshold (origin: Z10)

- **Constitutional impact:** Defines when a pillar movement constitutionally qualifies as a celebration event. Binds celebration grammar and prevents both false celebration (§0.5) and missed-celebration (§0.5 pillar-first supremacy).
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (INFLUENCES) · Correction Engine (NONE) · Roadmap (INFLUENCES) · Coach Hammer (BINDS) · Parent Surface (BINDS) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.3 (never false praise), §0.5 (pillar-first celebration outranks composite movement), §3 Law 5 (never fabricated), AF2 (no celebration not lineage-traceable to canonical pillar movement), RR-5 (no manipulation).
- **Options:**
  - **A — Any positive delta.** Every upward tick celebrates. *Consequence:* maximizes encouragement frequency; risks §0.3 violation if noise-level deltas trigger praise that erodes trust.
  - **B — Threshold delta (e.g., ≥N points or ≥N band-units, owner-defined).** *Consequence:* requires owner to set N per scoring frame (binds to CDR-1); preserves §3 Law 5 (deltas below noise floor are not "real" movement).
  - **C — Band crossing only.** Celebrate only when an athlete crosses a band boundary (Developmental → Proficient → Elite). *Consequence:* maps cleanly onto CDR-1C/D band grammar; large gaps between celebrations on long Developmental plateaus.
  - **D — Combination: band crossing always, plus threshold deltas within a band.** *Consequence:* highest fidelity; satisfies both within-band progress and band-transition moments; requires both N and band logic ratified.
- **Recommended Default:** **D (Combination).** Required by §0.5 pillar-first doctrine — within-band progress is still pillar movement and must not be silenced; band crossings are categorical wins and must not be muted.

##### CDR-6 — Canonical Improvement Signal (origin: Z12)

- **Constitutional impact:** Defines the single canonical metric for "did the athlete improve?" Binds every progress claim across surfaces.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (BINDS) · Correction Engine (INFLUENCES) · Roadmap (BINDS) · Coach Hammer (BINDS) · Parent Surface (BINDS) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.5 (pillar-first; composite drop ≠ regression when pillars climb), §3 Law 5, AR-1 (no statistical override of organism truth), Phase 56 RE-1…RE-10 (replay equivalence).
- **Options:**
  - **A — Per-session deltas only.** Improvement = this session's pillar score − prior session's pillar score. *Consequence:* high responsiveness; high noise; single bad session reads as "regression" unless §0.5 context overlay applied.
  - **B — Rolling deltas (window N sessions).** Improvement = current rolling mean − prior rolling mean. *Consequence:* noise-filtered; lags real movement; bad-session impact dampened.
  - **C — Both, with rolling as the canonical headline and per-session visible in click-expansion.** *Consequence:* §3 Law 1 lineage preserved; headline reflects trend, not noise; aligns with CDR-7 horizon decision.
- **Recommended Default:** **C (rolling as headline, per-session in expansion).** §0.5 + AR-1 favor noise-resistance at the headline; §3 Law 1 requires the per-session truth remain reachable.

##### CDR-7 — Improvement Time Horizon (origin: AB3)

- **Constitutional impact:** Defines the canonical time window over which "improvement" is measured. Binds CDR-6's rolling window length and every progress claim's frame of reference.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (BINDS) · Correction Engine (INFLUENCES) · Roadmap (BINDS) · Coach Hammer (BINDS) · Parent Surface (BINDS) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.5, RR-5 (athlete narrative revocation), RR-7 (no identity locking on past performance), Phase 56 replay equivalence.
- **Options:**
  - **A — Per-session.** Horizon = previous session. *Consequence:* highest noise; tightly coupled to CDR-6A.
  - **B — Rolling N sessions (owner declares N).** *Consequence:* requires owner to ratify N; canonical noise filter for CDR-6B/C.
  - **C — Since roadmap start.** Horizon = current roadmap milestone start. *Consequence:* couples progress narrative to roadmap arc; resets on milestone completion; aligns Coach Hammer copy with active development goal.
  - **D — Athlete-selectable (with constitutional default).** Athlete chooses session / rolling / roadmap; default declared by owner. *Consequence:* respects RR-5/RR-7 (athlete agency over their own narrative); requires UI affordance; multiple progress framings coexist in lineage.
- **Recommended Default:** **D (Athlete-selectable with rolling-N default).** RR-5/RR-7 favor athlete agency over their narrative frame; the rolling default preserves CDR-6C headline noise-resistance.

##### CDR-8 — Celebration Trigger Set (origin: AF1)

- **Constitutional impact:** Enumerates the *constitutionally permitted* celebration events. Anything not on this list cannot trigger celebration.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (INFLUENCES) · Correction Engine (NONE) · Roadmap (BINDS) · Coach Hammer (BINDS) · Parent Surface (BINDS) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.3, §0.5, §3 Law 5, AF2 (no celebration not lineage-traceable to canonical pillar movement), RR-5, RR-9.
- **Options:**
  - **A — Pillar climb only.** *Consequence:* purest §0.5 reading; loses band-transition moments and roadmap milestones as distinct celebration types.
  - **B — Pillar climb + band crossing.** *Consequence:* adds CDR-1C/D band grammar moments.
  - **C — Pillar climb + band crossing + roadmap milestone completion.** *Consequence:* couples to Roadmap; allows Coach Hammer to celebrate development-arc moments.
  - **D — Combination: pillar climb + band crossing + roadmap milestone + first-time category completion.** *Consequence:* covers the maximal set of constitutionally-clean events; "first-time" celebrations are AF2-compliant (lineage = first measurement); risk is celebration density — must be paced by CDR-5 threshold.
- **Recommended Default:** **D (Combination).** All four events are lineage-traceable per AF2; suppressing any one would violate §0.5 (pillar-first doctrine cannot be partial).

---

#### D5 — Athlete Journey Experience (9 decisions)

##### CDR-9 — Conflict-Mode Rendering (origin: Z1)

- **Constitutional impact:** Defines how the UI renders the moment when grading conflicts with understanding (e.g., a low score on a category the athlete is actively improving).
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (NONE) · Correction Engine (INFLUENCES) · Roadmap (INFLUENCES) · Coach Hammer (BINDS) · Parent Surface (BINDS) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.1, §0.2 (Understanding wins lexicographically), §0.3, §0.5, §3 Law 5 (never hide truth).
- **Options:**
  - **A — Hide the low score.** *Consequence:* violates §3 Law 5 (truth-hiding); rejected.
  - **B — De-emphasize visually (smaller, lower contrast within palette permissions per CDR-11).** *Consequence:* preserves truth; reduces shock; relies on CDR-11 palette grammar.
  - **C — "Progressing" overlay on top of the score.** *Consequence:* makes the development context the dominant signal; score remains visible; explicit §0.5 surfacing.
  - **D — Unchanged score + mandatory context text in the §0.6 "Why" block.** *Consequence:* minimal visual change; relies entirely on copy to do the §0.3 work.
- **Recommended Default:** **C ("Progressing" overlay).** §0.2 lexicographic supremacy of Understanding over Grading favors making the development context the dominant rendered signal while preserving the score per §3 Law 5.

##### CDR-10 — "ENCOURAGED" Enforcement Mechanism (origin: Z4)

- **Constitutional impact:** Defines how §0.3 ENCOURAGED is enforced at the surface layer.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (NONE) · Correction Engine (INFLUENCES) · Roadmap (NONE) · Coach Hammer (BINDS) · Parent Surface (BINDS) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.3 (Clear/Motivated/Empowered/Directed/Hopeful; never Judged/Punished/Embarrassed/Confused/Overwhelmed), §0.1.
- **Options:**
  - **A — Tone-only.** ENCOURAGED enforced via Coach Hammer copy alone. *Consequence:* lightest; relies entirely on a single voice channel; if copy fails, §0.3 fails.
  - **B — Tone + visual (palette, typography, iconography).** *Consequence:* multi-channel enforcement; couples to CDR-11.
  - **C — Tone + visual + structural (ordering, density, disclosure pattern).** *Consequence:* full-stack enforcement; couples to CDR-11 + CDR-13; strongest §0.3 guarantee; highest design discipline required.
- **Recommended Default:** **C (Tone + visual + structural).** §0.3 lists five intended outcomes and five forbidden outcomes; a single-channel enforcement cannot reliably cover all ten dimensions across all session types.

##### CDR-11 — Palette Permissions for Failure/Red Tones (origin: Z6)

- **Constitutional impact:** Defines what color grammar is constitutionally permitted on the Report Card.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (NONE) · Correction Engine (INFLUENCES) · Roadmap (NONE) · Coach Hammer (NONE) · Parent Surface (BINDS) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.3, §0.6 (missingness visibility), §0.1.
- **Options:**
  - **A — Red/failure tones permitted.** *Consequence:* enables strong negative signaling; high §0.3 violation risk.
  - **B — Restricted to neutral/positive/progress palette only.** *Consequence:* §0.3-aligned; loses ability to signal hard errors or safeguarding flags visually.
  - **C — Conditional: neutral-positive-progress as default; red reserved exclusively for safeguarding/injury-context flags (RR-6) and never for grading.** *Consequence:* surface stays §0.3-aligned for grading; preserves a single semantic channel for the only legitimate use of high-alarm color (athlete safety).
- **Recommended Default:** **C (Conditional — red reserved for safeguarding only).** §0.3 forbids judged/punished feelings; RR-6 reserves a survivability-bearing visual channel for athlete-reported pain/injury context — these two requirements together force C.

##### CDR-12 — "Highest-Priority Improvement" Composite Definition (origin: Z7) — **CLOSED — AUTO-RESOLVED (Phase 0.5)**

> **Phase 0.5 ruling:** Option **E (Hybrid, §0.7 first)** is the only option consistent with already-ratified Hammer Today doctrine. **Sources:** `docs/asb/hammer-today-guidance-architecture.md` §2 Slot 3 ("exactly one Next-Action per Today render"); `docs/asb/hammer-activation-architecture.md` (Megaphase 111–150 "one well-timed handoff > scattered nudges"); §0.7 (non-negotiables are immutable philosophical truths); §0.4 (priority-1 hero cascade). Options A–D each invent a competing ranking authority that Hammer Today does not recognize. **Owner input not required.** See §0.22 audit table.

- **Constitutional impact:** Defines the §0.4 entry-point order priority 1 — "highest-priority improvement opportunity." Binds the hero render on every session.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (BINDS) · Correction Engine (BINDS) · Roadmap (BINDS) · Coach Hammer (BINDS) · Parent Surface (BINDS) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.2, §0.4, §0.5, §0.7 (non-negotiables outrank category averages), §3 Law 5.
- **Options:**
  - **A — Lowest score.** *Consequence:* purely numeric; ignores §0.7 non-negotiable supremacy; risks selecting trivia over the truly highest-leverage issue.
  - **B — Highest leverage on composite.** *Consequence:* requires Analysis Engine to publish per-category leverage weights; couples Report Card priority to model internals.
  - **C — Coach-defined non-negotiable rank.** *Consequence:* §0.7 wins by construction; deterministic; loses sensitivity to session-specific issues.
  - **D — Furthest-from-roadmap-milestone.** *Consequence:* couples to active Roadmap arc; can ignore §0.7 if roadmap is mis-prioritized.
  - **E — Defined hybrid: §0.7 non-negotiables checked first (any failing one wins); else highest-leverage composite; else lowest pillar score within the active roadmap milestone.** *Consequence:* layers the four signals in constitutional precedence order; deterministic given inputs; requires owner to ratify exact tier order.
- **Recommended Default:** **E** — **AUTO-RESOLVED per §0.22**. Preserved entry for §3 Law 10 lineage.

##### CDR-13 — Disclosure Pattern for the 9 Explanation Blocks (origin: Z15)

- **Constitutional impact:** Defines how the §0.6 nine mandatory blocks per category are presented (What / Why / Elite / If poor / How to improve / Drill / Video / Roadmap / Coach Hammer).
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (NONE) · Correction Engine (INFLUENCES) · Roadmap (NONE) · Coach Hammer (INFLUENCES) · Parent Surface (BINDS) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.1, §0.6, §3 Law 1 (lineage one click away), §3 Law 3 (missingness-visible).
- **Options:**
  - **A — Always-expanded (all 9 blocks visible by default).** *Consequence:* maximum understanding density; can violate §0.1 by overwhelming (§0.3 forbidden outcome).
  - **B — Always-collapsed (athlete clicks each block).** *Consequence:* clean surface; risks athlete never reading critical blocks (Why / If poor).
  - **C — Progressive disclosure: §0.4 priority blocks (What / Why / How to improve) expanded by default; remainder collapsed but visibly stubbed.** *Consequence:* respects §3 Law 1 (lineage one click away); honors §0.3 (not overwhelming) and §0.6 (missingness visible — collapsed ≠ missing).
- **Recommended Default:** **C (Progressive disclosure).** Only option that simultaneously satisfies §0.1, §0.3, §0.6, and §3 Law 1.

##### CDR-14 — Softball Hitting Variance / Slap (origin: Z19, merged with §16 B5)

##### CDR-14 — Softball Hitting Variance / Slap (origin: Z19, merged with §16 B5) — **CLOSED — AUTO-RESOLVED (Phase 0.5)**

> **Phase 0.5 ruling:** Option **C (Defer)** is the only option consistent with current launch doctrine. **Source:** `docs/asb/baseball-public-launch-ratification.md` P1-E classifies softball parity (including Slap) as "**defer or run softball sprint**"; until a softball sprint is authorized, Slap has no surface to render on. **Owner input not required.** See §0.22 audit table.

- **Constitutional impact:** Defines whether Softball Slap hitting is a full alternate card variant or a P4 modifier on the standard card. Binds §16 B5.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (BINDS) · Correction Engine (BINDS) · Roadmap (BINDS) · Coach Hammer (INFLUENCES) · Parent Surface (INFLUENCES) · Recruiter Surface (NONE per AE1).
- **Doctrine constraints (non-violable):** §0.7, §3 Law 10 (additive only), AH3 (new disciplines/variants must pass §0.11-style audit).
- **Options:**
  - **A — Full Slap-card variant (separate constitutional card alongside standard softball hitting).** *Consequence:* maximum fidelity to slap mechanics; doubles §17 schema for softball hitting; requires its own §0.11 audit per AH3.
  - **B — P4-modifier on standard softball-hitting card.** *Consequence:* one card; P4 elements (CDR-4) gain a slap-conditional variant; lighter schema; risks compressing genuinely distinct mechanics.
  - **C — Defer.** Ship V1 with standard softball hitting only; Slap added in a later phase with its own audit. *Consequence:* clean V1; explicit gap in §0.6 missingness vocabulary for slap-discipline athletes.
- **Recommended Default:** **C** — **AUTO-RESOLVED per §0.22** (forced by P1-E launch doctrine).

##### CDR-15 — V1 Discipline Scope Set (origin: AH1) — **CLOSED — AUTO-RESOLVED (Phase 0.5)**

> **Phase 0.5 ruling:** Doctrine resolves all 8 toggles. **Sources:** `docs/asb/baseball-public-launch-ratification.md` §1–§7 ratifies Baseball Pitching + Baseball Hitting as the live launch scope; Softball = P1-E (deferred per CDR-14); Throwing / Catching / Defense / Baserunning are absent from every launch ratification document — i.e., not in V1 by silence. **Resolved scope: BP=Y, BH=Y, SP=N, SH=N, TH=N, CA=N, DE=N, BR=N.** Owner may broaden post-V1 additively per AH3 + §3 Law 10. **Owner input not required for V1.** See §0.22 audit table.

- **Constitutional impact:** Defines which disciplines have a constitutionally-ratified Report Card surface in V1. Binds Phase 1 implementation scope.
- **Downstream systems:** Report Card (BINDS) · Analysis Engine (BINDS) · Correction Engine (BINDS) · Roadmap (BINDS) · Coach Hammer (BINDS) · Parent Surface (BINDS) · Recruiter Surface (deferred per AE1).
- **Doctrine constraints (non-violable):** §3 Law 10 (additive), AH2 (§3 universal; §0.7 hitting-scoped), AH3 (each new discipline must pass its own §0.11 audit before opening its surface).
- **Options:** Per-discipline yes/no across the eight candidates:
  - Baseball Pitching · Baseball Hitting · Softball Pitching · Softball Hitting · Throwing · Catching · Defense · Baserunning.
- **Recommended Default:** **BP=Y, BH=Y, all others=N** — **AUTO-RESOLVED per §0.22** (inherited from `baseball-public-launch-ratification.md`).

##### CDR-16 — Interview Cadence Discipline (origin: Z20)

- **Constitutional impact:** Process-only. Defines how subsequent owner-interview waves are paced.
- **Downstream systems:** Report Card (NONE) · Analysis Engine (NONE) · Correction Engine (NONE) · Roadmap (NONE) · Coach Hammer (NONE) · Parent Surface (NONE) · Recruiter Surface (NONE).
- **Doctrine constraints (non-violable):** §0.12 ratification gate.
- **Options:**
  - **A — Auto-advance.** Lovable proceeds to the next wave automatically after owner answers the prior one. *Consequence:* faster; less owner control over pacing.
  - **B — Explicit per-wave approval.** Owner gates each next wave. *Consequence:* maximum owner control; slower.
- **Recommended Default:** **B (Explicit per-wave approval).** §0.12 gate strictness and the Phase 0.1/0.2/0.3 pattern have established owner-paced cadence; defaulting B preserves that norm.

##### CDR-17 — RFL Granularity (origin: Z21)

- **Constitutional impact:** Process-only. Defines how Phase-0 work is recorded in the Reality Feedback Ledger.
- **Downstream systems:** All NONE.
- **Doctrine constraints (non-violable):** ASB RFL append-only doctrine.
- **Options:**
  - **A — Per-wave entry (RFL-082, RFL-083, RFL-084, …).** *Consequence:* finest auditability; already the established pattern.
  - **B — Single RFL entry at §0 ratification.** *Consequence:* clean ledger; loses Phase-0 stepwise audit trail.
- **Recommended Default:** **A (Per-wave entry).** Already the de facto pattern through RFL-080…RFL-084; switching now would create a retroactive ledger gap.

---

### §0.19 — Constitutional Dependency Map

Per-CDR impact across the seven downstream systems. `B` = BINDS (constitutional shape determined), `I` = INFLUENCES (downstream behavior shaped but not bound), `—` = NONE.

| CDR  | Report Card | Analysis Eng | Correction Eng | Roadmap | Coach Hammer | Parent Surf | Recruiter Surf |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| CDR-1 | B | B | B | B | B | B | B |
| CDR-2 | B | B | B | B | B | B | B |
| CDR-3 | B | B | B | B | I | I | — |
| CDR-4 | B | B | B | B | I | I | — |
| CDR-5 | B | I | — | I | B | B | — |
| CDR-6 | B | B | I | B | B | B | — |
| CDR-7 | B | B | I | B | B | B | — |
| CDR-8 | B | I | — | B | B | B | — |
| CDR-9 | B | — | I | I | B | B | — |
| CDR-10 | B | — | I | — | B | B | — |
| CDR-11 | B | — | I | — | — | B | — |
| CDR-12 | B | B | B | B | B | B | — |
| CDR-13 | B | — | I | — | I | B | — |
| CDR-14 | B | B | B | B | I | I | — |
| CDR-15 | B | B | B | B | B | B | — |
| CDR-16 | — | — | — | — | — | — | — |
| CDR-17 | — | — | — | — | — | — | — |

**Read-out:**
- **Maximum-cascade (BINDS ≥ 6 columns):** CDR-1, CDR-2, CDR-12, CDR-15 — these reach every implementing surface.
- **Scoring-spine cluster (BINDS ≥ 4 columns):** CDR-3, CDR-4, CDR-6, CDR-7, CDR-8, CDR-14.
- **Athlete-surface-local (BINDS Report Card + Parent only):** CDR-9, CDR-10, CDR-11, CDR-13.
- **Process-only (zero implementation surface):** CDR-16, CDR-17.

### §0.20 — Ratification Forecast

Three buckets classifying each CDR by whether implementation may proceed before resolution.

**MUST-ANSWER-BEFORE-IMPLEMENTATION** (binds schema, scoring math, or hard rendering contracts):

| CDR | Reason |
|---|---|
| CDR-1 | Binds every score render; downstream code cannot be written against an unknown frame. |
| CDR-2 | Binds the absolute-vs-relative line; Analysis Engine output schema depends on it. |
| CDR-3 | Binds §17 schema row count for P3. |
| CDR-4 | Binds §17 schema row count for P4. |
| CDR-6 | Binds the canonical improvement-signal computation; every progress claim depends on it. |
| CDR-7 | Binds rolling-window length; Analysis Engine cannot compute deltas without N. |
| CDR-11 | Binds palette tokens (semantic CSS variables); cannot be deferred behind a flag. |
| CDR-12 | Binds the entry-point hero (§0.4 priority 1); every session render depends on it. |
| CDR-15 | Binds Phase 1 scope; nothing can be built without knowing which disciplines ship. |

**MAY-DEFER-TO-POST-V1** (can ship with a constitutional default behind a feature flag, or affects a later surface):

| CDR | Reason |
|---|---|
| CDR-5 | Threshold N can ship as an owner-tunable constant with a stated default; refinement does not break schema. |
| CDR-8 | Celebration trigger set can grow additively post-V1 per §3 Law 10. |
| CDR-9 | Conflict-mode rendering is a Report Card UI policy; ship with default `C` (per §0.20 recommendation) and refine. |
| CDR-10 | "ENCOURAGED" enforcement strength can escalate A→B→C post-launch per §3 Law 10. |
| CDR-13 | Disclosure pattern is presentation-layer; ship with default `C` (progressive disclosure) and refine. |
| CDR-14 | Slap-variant decision can be deferred (option C) without blocking V1 standard softball hitting. |

**NO-IMPLEMENTATION-IMPACT** (process/governance only):

| CDR | Reason |
|---|---|
| CDR-16 | Interview cadence — governance discipline only. |
| CDR-17 | RFL granularity — ledger discipline only. |

### §0.21 — Closure Recommendation (revised Phase 0.5)

After §0.22 False Ambiguity Audit auto-resolved 5 CDR items (CDR-3, CDR-4, CDR-12, CDR-14, CDR-15), the owner's remaining workload collapses from 17 → **12 true atomic decisions**, presentable as **4 axis-level answers in 1 owner response**, across **4 closure bundles**.

**Bundle 1 — "Scoring Spine"** (CDR-1 + CDR-2). The score-frame choice (CDR-1) constrains the absolute/relative line (CDR-2). CDR-3 and CDR-4 are removed — both auto-resolved to **C** by §3 Law 1 + §0.1 symmetry per §0.22.

**Bundle 2 — "Progress Signal"** (CDR-5 + CDR-6 + CDR-7 + CDR-8). Unchanged — celebration thresholds, improvement signal, time horizon, and celebration triggers remain a single coherent progress definition.

**Bundle 3 — "Athlete Surface Grammar"** (CDR-9 + CDR-10 + CDR-11 + CDR-13). Unchanged — conflict-mode rendering, ENCOURAGED enforcement, palette permissions, and disclosure pattern jointly define §0.3 ENCOURAGED surface grammar.

**Bundle 4 — "Process"** (CDR-16 + CDR-17). Governance cadence; both Recommended-Default-strong. (Renumbered from prior Bundle 6; prior Bundles 4 and 5 were fully dissolved by §0.22.)

**Dissolved bundles:**
- **Prior Bundle 4 ("Priority & Scope")** — DISSOLVED. CDR-12 auto-resolved to **E** by Hammer Today §2 Slot 3; CDR-15 auto-resolved to **{BP=Y, BH=Y, all others=N}** by `baseball-public-launch-ratification.md`.
- **Prior Bundle 5 ("Variance")** — DISSOLVED. CDR-14 auto-resolved to **C (defer)** by P1-E launch doctrine.

**Target closure path:**

| Response | Bundles closed | CDR items | Unblocks |
|---|---|---|---|
| **Single owner response** | Bundles 1, 2, 3, 4 (12 atomic items, 4 axis answers) | CDR-1, CDR-2, CDR-5, CDR-6, CDR-7, CDR-8, CDR-9, CDR-10, CDR-11, CDR-13, CDR-16, CDR-17 | Full §0.12 ratification gate (combined with §0.22 auto-resolutions) |

After the single owner response, §0.11 audit is re-run; if clean, §0.12 conditions (1)+(2)+(3) are satisfied and the owner may execute condition (4) ratification.

---

### §0.22 — False Ambiguity Audit (Phase 0.5)

> **Purpose.** Re-test every remaining CDR item against already-ratified Hammers Modality doctrine (Eternal Laws; RR-1…RR-10; RW-1…RW-10; pillar architecture per `docs/asb/uhrc-pillar-mapping-audit.md`; analysis formula per `docs/asb/analysis-formula-ratification.md`; Hammer Today guidance per `docs/asb/hammer-today-guidance-architecture.md`; Hammer activation per `docs/asb/hammer-activation-architecture.md`; launch scope per `docs/asb/baseball-public-launch-ratification.md` + `docs/asb/baseball-launch-reratification.md`; and this constitution's own §0.1, §0.6, §0.7, §3 Law 1, §3 Law 10). The objective is to eliminate false ambiguity — do not ask the owner to decide something Hammers Modality has already constitutionally decided.

**Audit table:**

| CDR | Phase 0.5 Status | Resolution Source | Owner Input Required? | Auto-Resolved To |
|---|---|---|---|---|
| CDR-1  | TRUE ambiguity | — | Y | — |
| CDR-2  | TRUE ambiguity | — | Y | — |
| CDR-3  | **FALSE ambiguity** | §3 Law 1 + §0.6 + §0.1 (consistency with CDR-4) | N | **C** |
| CDR-4  | **FALSE ambiguity** | Symmetry with CDR-3 under §0.1 (explicitly cited in prior Recommended Default) | N | **C** |
| CDR-5  | TRUE ambiguity | — | Y | — |
| CDR-6  | TRUE ambiguity | — | Y | — |
| CDR-7  | TRUE ambiguity | — | Y | — |
| CDR-8  | TRUE ambiguity | — | Y | — |
| CDR-9  | TRUE ambiguity | — | Y | — |
| CDR-10 | TRUE ambiguity | — | Y | — |
| CDR-11 | TRUE ambiguity (recommended default C is RR-6-aligned) | — | Y | — |
| CDR-12 | **FALSE ambiguity** | `hammer-today-guidance-architecture.md` §2 Slot 3 ("exactly one Next-Action per Today render") + §0.7 non-negotiable supremacy + §0.4 hero cascade + Megaphase 111–150 ("one well-timed handoff > scattered nudges") | N | **E** |
| CDR-13 | TRUE ambiguity | — | Y | — |
| CDR-14 | **FALSE ambiguity** | `baseball-public-launch-ratification.md` P1-E ("defer or run softball sprint") | N | **C** (defer) |
| CDR-15 | **FALSE ambiguity** | `baseball-public-launch-ratification.md` §1–§7 (BP+BH live; minors fail-closed); P1-E (softball deferred); throwing/catching/defense/baserunning absent from every launch ratification | N | **BP=Y, BH=Y, SP=N, SH=N, TH=N, CA=N, DE=N, BR=N** |
| CDR-16 | TRUE ambiguity (process) | — | Y | — |
| CDR-17 | TRUE ambiguity (process) | — | Y | — |

**Collapse arithmetic:**

```text
Original CDR count                      17
False-ambiguity closures (auto-resolve)  5  (CDR-3, CDR-4, CDR-12, CDR-14, CDR-15)
Remaining TRUE owner decisions          12
Axis-level compression target           ≤5  → met at 4 axes (§0.23)
```

**Doctrine-citation log for each closure:**

- **CDR-3 → C.** §3 Law 1 forbids lineage compression below "one click away"; §0.6 mandates "Why" + "How to improve" blocks per category; collapsing P3's two sub-criteria into a single pass/fail (A) removes that lineage; opening two independent headers (B) violates §0.1 symmetry with CDR-4. C is the unique legal render.
- **CDR-4 → C.** Identical chain to CDR-3 plus §0.1 explicit symmetry — the prior packet's Recommended Default already declared this "forced by symmetry with CDR-3."
- **CDR-12 → E.** Hammer Today §2 Slot 3 fixes a single Next-Action; §0.7 fixes non-negotiables as immutable; §0.4 fixes the priority-1 hero cascade. Options A–D each install a competing ranking authority that conflicts with one of these three ratified surfaces; E is the only option that respects all three.
- **CDR-14 → C.** Launch doctrine P1-E currently classifies softball parity (including Slap) as deferred. Until that defers is explicitly lifted by a softball sprint ratification, no surface exists to render Slap on.
- **CDR-15 → {BP, BH only}.** Launch ratification names Baseball Pitching and Baseball Hitting as the live scope; everything else is either explicitly deferred (softball, via P1-E) or absent from all launch documents (throwing/catching/defense/baserunning). Owner may broaden post-V1 additively per AH3 + §3 Law 10.

**Re-bundling consequence.** See §0.21 (revised): 6 bundles → 4 bundles, 2 owner responses → 1 owner response.

---

### §0.23 — Owner Decision Form (Axis-Level)

> **Purpose.** Present the 12 remaining true CDR decisions as **4 axis-level answers** for closure in a single owner response. Each axis groups CDR items whose doctrinal coupling makes joint ratification mandatory. Recommended Defaults are inherited verbatim from §0.18; selecting `DEFAULTS` ratifies every recommended option in one stroke. Auto-resolved CDRs (§0.22) require no owner input.

**Axis A — Scoring Spine** (CDR-1 + CDR-2)

| CDR | Decision | Options | Recommended Default |
|---|---|---|---|
| CDR-1 | Score frame | A (% elite) / B (% ceiling) / C (movement-quality band) / **D (hybrid band headline + numeric sub-value)** | **D** |
| CDR-2 | Absolute vs athlete-relative | A (fully absolute) / **B (fully athlete-relative)** / C (hybrid with declared line) | **C** *(per §0.18; the form label "B=recommended" in the plan was a transcription error — doctrine recommendation remains **C** per §0.18 line 484)* |

**Axis B — Progress Signal** (CDR-5 + CDR-6 + CDR-7 + CDR-8)

| CDR | Decision | Options | Recommended Default |
|---|---|---|---|
| CDR-5 | Celebrated-pillar trigger threshold | A / B / C / **D (combination)** | **D** |
| CDR-6 | Canonical improvement signal | A / B / **C (rolling headline + per-session expansion)** | **C** |
| CDR-7 | Improvement time horizon | A / B / C / **D (athlete-selectable, rolling-N default)** | **D** |
| CDR-8 | Celebration trigger set | A / B / C / **D (pillar + band + roadmap + first-time)** | **D** |

**Axis C — Athlete Surface Grammar** (CDR-9 + CDR-10 + CDR-11 + CDR-13)

| CDR | Decision | Options | Recommended Default |
|---|---|---|---|
| CDR-9  | Conflict-mode rendering | A / B / **C ("Progressing" overlay)** / D | **C** |
| CDR-10 | ENCOURAGED enforcement mechanism | A / B / **C (Tone + Visual + Structural)** | **C** |
| CDR-11 | Palette permissions | A / B / **C (red reserved for safeguarding only)** | **C** |
| CDR-13 | Disclosure pattern | A / B / **C (progressive disclosure)** | **C** |

**Axis D — Process** (CDR-16 + CDR-17)

| CDR | Decision | Options | Recommended Default |
|---|---|---|---|
| CDR-16 | Interview cadence | A (auto-advance) / **B (explicit per-wave approval)** | **B** |
| CDR-17 | RFL granularity | **A (per-wave entry)** / B (single entry at ratification) | **A** |

**Owner Response Template:**

```text
Axis A — Scoring Spine:
  CDR-1: [A | B | C | D]
  CDR-2: [A | B | C]

Axis B — Progress Signal:
  CDR-5: [A | B | C | D]
  CDR-6: [A | B | C]
  CDR-7: [A | B | C | D]
  CDR-8: [A | B | C | D]

Axis C — Surface Grammar:
  CDR-9:  [A | B | C | D]
  CDR-10: [A | B | C]
  CDR-11: [A | B | C]
  CDR-13: [A | B | C]

Axis D — Process:
  CDR-16: [A | B]
  CDR-17: [A | B]
```

Or reply **`DEFAULTS`** to ratify every Recommended Default above in one stroke.

**Auto-resolved (no owner input required), recorded for lineage:**
- CDR-3 = **C** · CDR-4 = **C** · CDR-12 = **E** · CDR-14 = **C (defer)** · CDR-15 = **{BP=Y, BH=Y, SP=N, SH=N, TH=N, CA=N, DE=N, BR=N}**

After owner submission, §0.18 entries flip to RATIFIED with the selected option recorded inline; §0.11 audit re-runs; if clean, §0.12 (1)+(2)+(3) are satisfied and the owner may execute condition (4) ratification.

---


---

### §0.24 — Doctrine Alignment Recommendation (Phase 0.6)

> **Purpose.** Before owner ratification of Axes A–D, re-test each §0.23 Recommended Default against existing Hammers Modality doctrine — confirm or revise. No new options, no new CDRs, no new audits. Citations only.

**Result:** every §0.23 default is the uniquely doctrine-aligned choice. **No revisions recommended.**

| Axis | CDRs | Default | Citations | Tensions in non-recommended options |
|---|---|---|---|---|
| **A — Scoring Spine** | CDR-1 | **D** (band headline + numeric on click) | §14 format catalog (band default, numeric on click); §0.2 (Understanding > Grading); §3 Laws 1/5/8 | A (% elite) → §0.2 veto + RR-7/9; B (% ceiling) → RR-7 identity-lock + §0.5; C (band only) → §3 Law 1 lineage loss |
| | CDR-2 | **C** (hybrid: absolute measurement, relative score) | §3 Law 5 (no fabrication of absolute); RR-7, RR-9; §3 Law 2; §0.18 line 484 | A (absolute) → RR-9 ranking + §0.3 violation; B (relative) → §3 Law 5 + §3 Law 4 replay weakness |
| **B — Progress Signal** | CDR-5 | **D** (combination) | §0.5 pillar-first supremacy; AF2 (lineage-traceable celebrations); §3 Law 5; RR-5 | A → §3 Law 5 (celebrating noise); B/C → §0.5 partial reading forbidden |
| | CDR-6 | **C** (rolling headline + per-session expansion) | §0.5; §3 Law 1; §3 Law 2; AR-1; Phase 56 RE-1…RE-10 | A → §0.5 (single bad session reads as regression); B → §3 Law 1 (per-session hidden) |
| | CDR-7 | **D** (athlete-selectable, rolling-N default) | RR-5 (narrative revocation); RR-7 (no identity locking); §0.5; Phase 56 replay equivalence | A → noise + RR-5 tension; B → RR-5 (cannot revoke); C → RR-7 (no agency) |
| | CDR-8 | **D** (pillar + band + roadmap + first-time) | §0.5; AF2; §0.3; §3 Law 5; RR-5/9 | A/B/C → §0.5 partial reading (celebration types silenced) |
| **C — Surface Grammar** | CDR-9 | **C** ("Progressing" overlay) | §0.2 (lexicographic Understanding > Grading); §0.3; §0.5; §3 Law 5 | A → §3 Law 5 (truth-hiding); B/D → §0.2 (grading remains visually dominant) |
| | CDR-10 | **C** (tone + visual + structural) | §0.3 (total ENCOURAGED outcome); §0.2; §2 (fixed sequence is structural enforcement); RR-5; §10 (delivery-only voice) | A → overloads §10 delivery layer; B → ignores §2 structural sequence already in doctrine |
| | CDR-11 | **C** (red reserved for safeguarding only) | §0.3; RR-6 (safeguarding salience); RR-9/10; §3 Law 9 | A → RR-6 channel collision; B → over-restricts, defeats RR-6 max-salience need |
| | CDR-13 | **C** (progressive disclosure) | §3 Law 1 ("one click away" *is* progressive disclosure); §0.2; §0.6 (9 blocks); §2 fixed sequence | A → buries §2 sequence; B → violates §3 Law 1 (more than one click) |
| **D — Process** | CDR-16 | **B** (explicit per-wave approval) | §0.12 extended ratification gate; §0.18; Eternal Laws supremacy; RR-5 | A → directly contradicts §0.12 (later wave ratified without prior owner sign-off) |
| | CDR-17 | **A** (per-wave RFL entry) | Phase 47 RP-1…RP-10; Phase 56 RE-1…RE-10; §3 Law 1; §3 Law 10 (additive-only) | B → collapses per-wave lineage into one event, contradicts RP-3 + §3 Law 10 |

**Downstream consequence summary (per axis, all defaults):**

| Surface | Axis A | Axis B | Axis C | Axis D |
|---|---|---|---|---|
| Athlete experience | Qualitative headline ("Strong for U12"), numeric on tap | Calm trend; earned celebrations; selectable horizon | Encouraging conflict-mode; structural+visual+tonal enforcement; reserved palette; clean progressive reveal | None |
| Coach Hammer | Band-language headline; relative framing built-in | Wider celebration vocabulary, all lineage-traceable | Overlay-driven copy; tone is one of three layers; no "red" framing; copy authored per block | None |
| Analysis Engine | Unchanged (already emits 0–100 internally); read-only binding | Emits 4 canonical celebration events; maintains both per-session + rolling views | Must emit "active-improvement" flag (sourced from Roadmap binding — no new authority) | None |
| Roadmap | Milestone exits as band transitions w/ numeric in lineage; developmental gating becomes the relativization boundary | Milestone completion is a celebration source; "since roadmap start" is a first-class horizon | Source of "active-improvement" state → strengthens §9 coupling; "next step" lives in collapsed render | None |
| Report Card | §17 "Display format" = band(default)+numeric(expansion); "relativization basis" line added | §11 trend chip + horizon affordance | §17 gains "active-improvement render mode"; design tokens partition `--safeguarding` from `--needs-work` | None (governance only) |

**Recommendation:** ratify every §0.23 default verbatim. Owner may reply `DEFAULTS` or use the template below.

**Caution (single non-blocking note):** CDR-7 = D introduces a UI horizon-selector affordance that did not exist under A/B/C. The affordance is a delivery choice, not an authority claim — it does not violate any constitutional invariant — but the owner may wish to record it as a deferred surface decision in §17 at v0.2 fill-in time rather than open a new CDR.

**Final Owner Response Template — Axis A–D only:**

```text
Axis A — Scoring Spine:
  CDR-1: D
  CDR-2: C

Axis B — Progress Signal:
  CDR-5: D
  CDR-6: C
  CDR-7: D
  CDR-8: D

Axis C — Surface Grammar:
  CDR-9:  C
  CDR-10: C
  CDR-11: C
  CDR-13: C

Axis D — Process:
  CDR-16: B
  CDR-17: A
```

Or reply **`DEFAULTS`** to ratify all four axes in one stroke (equivalent to the template above).

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
