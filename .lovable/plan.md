
# Phase 0.0 — Report Card Psychology & Purpose (Constitutional Pre-Ratification)

Documentation-only. No code, UI, schema, routes, migrations, removals, or registries are touched. Implementation remains constitutionally blocked.

## Scope of this phase

1. Insert a new **Section 0 — Report Card Psychology & Purpose** at the very top of `docs/asb/report-card-constitution.md`, ahead of the existing §1 Philosophy. Section 0 is doctrine; nothing in §1–§17 may contradict it, and any conflict is resolved in favor of §0.
2. Renumber existing sections only if needed for clarity; otherwise leave §1–§17 in place and add a precedence clause stating §0 supersedes all later sections.
3. Add a **Section 0 Ratification Gate**: §1–§17 questions in §16 remain frozen and unanswerable until §0 is fully ratified.
4. Begin the **Owner Interview Loop** (Q-Series Z, below) immediately after the document edit. No other §16 questions are asked until Q-Series Z is fully answered.
5. Update `.lovable/plan.md` and `docs/asb/reality-feedback-ledger.md` (RFL-081) to record the §0 insertion and the new gate ordering.

## Section 0 contents (verbatim doctrine to be written)

- **0.1 Report Card Purpose** — Coaching/development system first; not a grading system, scorecard, or evaluation tool. Five "exists to" clauses (current state, why, what's holding back, how to improve, what progress looks like). Closing axiom: *Scores exist to support coaching. Coaching does not exist to support scores.*
- **0.2 Priority Hierarchy** — Understanding → Correction → Progress → Grading. Explicit veto clause: any design decision that improves grading at the expense of any higher tier is constitutionally invalid.
- **0.3 Athlete Emotional Outcome** — Intended outcome: **ENCOURAGED**. Five "should feel" states (Clear, Motivated, Empowered, Directed, Hopeful). Five "must never feel" states (Judged, Punished, Embarrassed, Confused, Overwhelmed). Doctrine line: *developmental tool, not a school report card*.
- **0.4 Report Card Entry Point** — Fixed display priority: (1) Highest-priority improvement opportunity, (2) Category breakdown, (3) Corrections, (4) Drills, (5) Videos, (6) Roadmap, (7) Coach Hammer guidance, (8) Overall grade. Axiom: *the overall grade is never the hero; the development pathway is the hero*.
- **0.5 Pillar-First Doctrine** — Per-pillar movement outranks composite movement. Worked example (P1 6→8, P2 5→8, P3 4→7, P4 7→8) ratified as a "major success" even if composite is flat. Celebration logic must reflect this.
- **0.6 Universal Category Explanation Law** — Every category in every discipline must answer the 9 questions (What / Why / Elite / If poor / How to improve / Drill / Video / Roadmap / Coach Hammer). No omissions. Missing blocks render as visible missingness, never silently hidden. §17 is bound to this law.
- **0.7 Hitting Non-Negotiables (Philosophical Truths)** — Ratify P1 Hip Load (stability non-negotiable, load amount variable, must complete full hand load without being pushed forward), P2 Hand Load (creates timing/separation/efficiency conditions), P3 Stride & Landing (back hip toward release, foot down without shoulder rotation, sideways landing, direction maintained), P4 Hitter's Move (knob stability, elbow direction, barrel delivery, closing gap to contact). Marked immutable — no UI or scoring decision may alter them.
- **0.8 Owner Interview Requirement** — Lovable must actively interview the owner. No guessing, inferring, simplifying, or silent deciding. Questioning continues until philosophy, scoring, display, corrections, drills, roadmap integration, and Coach Hammer behavior are fully understood.
- **0.9 Precedence Clause** — §0 supersedes §1–§17. Any conflict is resolved in favor of §0. §16 question groups A–K are gated behind §0 ratification.

## Q-Series Z — Owner Interview (to be asked immediately after §0 is written)

Asked in waves of ≤4 questions, one wave per turn, until all are resolved. No assumptions filled in for unanswered items.

**Wave Z1 — Purpose & hierarchy edges**
- Z1: When grading and understanding conflict in a *specific* UI element (e.g., a low score on a category the athlete is actively improving), should the score be (a) hidden, (b) de-emphasized visually, (c) shown with a "progressing" overlay, or (d) shown unchanged with context text only?
- Z2: Is "Understanding > Correction > Progress > Grading" a strict lexicographic order (Grading may never win a tie) or a weighted preference?
- Z3: Does the Priority Hierarchy apply equally to Parent and Recruiter views, or only the Athlete view?

**Wave Z2 — Emotional outcome enforcement**
- Z4: Should "ENCOURAGED" be enforced by (a) tone rules in Coach Hammer copy only, (b) tone rules + color/iconography constraints, or (c) tone + visual + structural rules (e.g., never lead with a failing category)?
- Z5: For a session where every category is poor, what is the constitutional behavior? Lead with the single highest-leverage improvement? Lead with the closest-to-passing category? Lead with the most-improved-from-last-session category?
- Z6: Are red/failure colors permitted at all, or must the palette be restricted to neutral/positive/progress tones?

**Wave Z3 — Entry point & hero**
- Z7: "Highest-priority improvement opportunity" — is priority determined by (a) lowest score, (b) highest leverage on composite, (c) coach-defined non-negotiable rank, (d) furthest from athlete's roadmap milestone, or (e) a defined composite of these?
- Z8: Is the overall grade ever displayed on the entry screen, or only reachable after scrolling/clicking past the development pathway?
- Z9: Coach Hammer guidance sits at position 7 in the entry order — is Coach Hammer a *summary* of positions 1–6, a *separate* voice layer, or *both*?

**Wave Z4 — Pillar-first celebration**
- Z10: What constitutes a "celebrated" pillar improvement? Any positive delta? A threshold delta (e.g., ≥2 points)? Crossing a band boundary (e.g., Developmental → Proficient)?
- Z11: If composite drops while pillars improve, is composite (a) hidden, (b) shown with a "pillar progress" overlay, or (c) shown unchanged?
- Z12: Per-session deltas vs rolling deltas — which is the canonical "improvement" signal for §0.5?

**Wave Z5 — Universal Explanation Law**
- Z13: For categories where "elite athletes do X" is not yet authored, should the block render as (a) "Coming soon", (b) visible missingness with a placeholder, or (c) block the category from being scored at all?
- Z14: "Coach Hammer wants me to understand…" — is this a fixed authored string per category, AI-generated within constitutional guardrails, or hybrid (authored core + AI tone wrapper)?
- Z15: Are the 9 blocks rendered always-expanded, always-collapsed, or progressively disclosed?

**Wave Z6 — Hitting non-negotiables binding**
- Z16: The "pushed forward during full hand load" test for P1 — is this measured by an existing engine signal, a coach-tagged observation, an athlete self-report, or not yet measurable (and therefore surfaced as missingness)?
- Z17: P3 requires "back hip moves toward pitcher release" and "foot down without shoulder rotation" — are these two independently scored sub-criteria or one combined pass/fail?
- Z18: P4 lists four elements (knob stability, elbow direction, barrel delivery, closing the gap) — scored independently and aggregated, or scored as one holistic pillar?
- Z19: Are these four hitting truths identical for Baseball Hitting and Softball Hitting, or does Softball Hitting (including slap) carry a variant?

**Wave Z7 — Interview discipline & RFL**
- Z20: When you answer a wave, may Lovable proceed to the next wave automatically, or must each wave be explicitly approved before the next is asked?
- Z21: Should each answered wave be recorded as its own RFL entry (RFL-082, RFL-083, …) or batched into a single RFL entry at §0 ratification?

Additional waves will be generated only if your answers expose new ambiguity. The interview ends when you declare §0 ratified.

## Files touched (documentation only)

- `docs/asb/report-card-constitution.md` — insert §0 (subsections 0.1–0.9), add precedence clause, bump version to v0.2, keep `STATUS: DRAFT — UNRATIFIED`.
- `.lovable/plan.md` — log Phase 0.0 and the §0 gate.
- `docs/asb/reality-feedback-ledger.md` — add **RFL-081**: Section 0 inserted; §16 Groups A–K gated behind §0 ratification; Q-Series Z interview opened.

## Exit criteria

- §0 written verbatim per the contents above.
- Q-Series Z opened with Wave Z1 asked in the same turn as the edit lands.
- No §16 A–K question may be asked until every Q-Series Z item is answered and you mark §0 ratified.
- Implementation (UI, UHRC removal, hitting taxonomy, throwing registry, correction engine, AI, routes, schema) remains constitutionally blocked.
