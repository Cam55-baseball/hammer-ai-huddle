
# Hammers Report Card Constitution — Phase 0 (Documentation Only)

**No code. No UI. No migrations. No deletions. No edge functions. No schema. No routes. No registries. No tagging changes.**

The sole deliverable is one sealed constitutional document. No file in `src/`, `supabase/`, `public/` is touched. The previous audit (`docs/asb/analysis-formula-ratification.md`) proved *where formulas live*. This phase defines *what the Report Card is*. Implementation is blocked until you ratify.

---

## 1. Deliverable

Single new file: `docs/asb/report-card-constitution.md`
- Top banner: `STATUS: DRAFT — UNRATIFIED`
- Versioned (`v0.1`) and lineage-tagged to ASB RFL.
- Single RFL append: `RFL-080 — Report Card Constitution opened; all implementation blocked until §16 closed.`

Nothing else is created or modified in this phase. If, while drafting, an ambiguity surfaces that is not already in §16, I append it to §16 and stop — I do not resolve it myself.

## 2. Document structure (15 architecture sections + 1 question section)

Each section ships as a **proposal**, not a decision. Every proposal is conditional on §16 answers.

1. **Report Card Philosophy** — why the Report Card exists; what it refuses to be; primacy over technical analysis; the athlete-understanding layer over the engineering layer.
2. **Athlete Experience Flow** — fixed sequence: Report Card → Explanation → Corrections → Drills → Videos → Roadmap → Coach Hammer. What the athlete sees first, second, third. What is forbidden as an entry point.
3. **Universal Report Card Laws** — invariants that apply to all five report cards: lineage-visible, confidence-bound, missingness-visible, replay-safe, never-fabricated, deterministic mappings, no AI-authored facts, no silent omission.
4. **Pitching Report Card Architecture** — categories, hierarchy, NN gates, weights, format per category, expansion content contract.
5. **Hitting Report Card Architecture** — Baseball and Softball variants; P1/P2/P3/P4 canonical structure; slap variant handling.
6. **Throwing Report Card Architecture** — Baseball and Softball variants; the 7 standards you've already provided; position-branching question deferred to §16.
7. **Drill Integration Architecture** — deterministic deficiency→drill mapping table contract; drill ordering rules; one drill may serve many deficiencies; no AI-assigned drills.
8. **Video Integration Architecture** — tag taxonomy; "what good looks like" vs "what bad looks like" slot contract; reference video vs corrective video distinction.
9. **Roadmap Integration Architecture** — what a roadmap step is; how a deficiency points to a step; relationship to athlete's current phase; what "next step" means at the per-category level.
10. **Coach Hammer Integration Architecture** — voice, scope, what Coach Hammer is allowed to author (motivational delivery) vs forbidden (facts, scores, drill picks, video picks, roadmap steps); per-discipline tone.
11. **Progress Tracking Architecture** — per-category trend, per-discipline composite trend, session-over-session deltas, regression visibility, what counts as "improvement."
12. **Parent View Architecture** — what a parent sees vs an athlete; reading level; what is hidden, what is summarized, what is identical.
13. **Recruiting View Architecture** — what a recruiter sees, what they never see, minor-athlete supremacy gates, shareability rules. (Subordinate to RR-9 / RR-10 already sealed in memory.)
14. **Report Card Scoring Architecture** — format catalog (Pass/Fail, 0–100, 1–10, letter, raw measurement, trend chip); rules for when each is used; composite hero number doctrine; failure-band language.
15. **Category Explanation Architecture** — the click-expansion content contract. Every category, regardless of discipline, exposes the same 9 blocks in the same order:
    1. What is it?
    2. Why does it matter?
    3. What happens if it is poor? (performance / durability / efficiency / consistency)
    4. How do I improve it?
    5. Which drills improve it?
    6. Which videos teach it?
    7. Which roadmap milestones improve it?
    8. What good looks like / what bad looks like (paired reference clips)
    9. How Coach Hammer should explain it (athlete · parent · coach tone variants)

    Every block is required for every category. Empty blocks render as visible missingness, never silently omitted.

16. **Questions Requiring Owner Ratification** — gate to Phase 1. Inventory below.

---

## 3. Per-category schema (used inside §4, §5, §6)

For every category in every report card, the document fills out:

```text
Category: <athlete-facing name>
  Engine binding:        <signal id(s) — read-only reference, not authored here>
  Display format:        <Pass/Fail | 0–100 | 1–10 | raw measurement | trend chip>
  Hierarchy rank:        <Non-Negotiable | Rank 1 | Rank 2 | Developmental | Advanced>
  Weight (athlete view): <number or "n/a — gate">
  What is it:            <one paragraph, athlete language>
  Why it matters:        <one paragraph>
  If poor → performance: <one paragraph>
  If poor → durability:  <one paragraph>
  If poor → efficiency:  <one paragraph>
  If poor → consistency: <one paragraph>
  How to improve:        <philosophy paragraph, not a recipe>
  Drill IDs:             <ordered list — pending §16 ratification>
  Video IDs:             <ordered list — pending §16 ratification>
  Roadmap step:          <named step — pending §16 ratification>
  Good-looks-like clip:  <slot — pending tagging>
  Bad-looks-like clip:   <slot — pending tagging>
  Coach Hammer voice:    <athlete tone · parent tone · coach tone — pending §16>
  Confidence rule:       <when to render full score vs "estimate" vs "not measured">
  Missingness rule:      <what shows when this session can't be scored>
```

The schema is identical across pitching, hitting, throwing — that is the universality §3 promises.

---

## 4. What this phase will NOT do

- No code edits anywhere in the repo.
- No removal of UHRC. (Removal is a later phase, gated on this constitution.)
- No migration of hitting phase tags.
- No throwing signal registry.
- No correction-cache table.
- No edge functions.
- No new routes, tabs, components, or design tokens.
- No "small" task framed as documentation-adjacent implementation.
- No category names, weights, formats, drill picks, video picks, roadmap picks, or voice choices made by me. Every such choice flows from a §16 answer.

---

## 5. §16 — Questions Requiring Owner Ratification (initial inventory)

Grouped. None leading. Every one must be answered before Phase 1 may begin. Group K is new since the prior pass.

### A — Philosophy & primacy
- **A1.** Confirm the Report Card is the **primary artifact** on every analysis-result surface, and the existing PIE V2 / hitting causal pages become secondary click-throughs.
- **A2.** Is the Report Card a **per-session artifact**, a **rolling artifact** (auto-updated as new sessions land), or **both** with explicit toggling?
- **A3.** Is the Report Card **shareable outside the app** (parent link, coach link, recruiter link), or in-app only at v1?

### B — Categories & naming
- **B1.** For each of the 5 cards, do categories use **engine names verbatim** (e.g. "Energy Angle", "Hip/Shoulder Separation") or **athlete-friendly renames** ("Coil", "Stay Closed")?
- **B2.** Pitching: "Posture" maps to `head_stability`, `hip_alignment`, or a composite of both? Stride Length + Stride Consistency: one card or two?
- **B3.** Hitting: P1/P2/P3/P4 ship under canonical names (Hip Load · Hand Load · Stride/Landing · Hitter's Move) or athlete renames?
- **B4.** Throwing: one universal card v1, or branch per position (P · C · IF · OF)?
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
- **D4.** Composite hero number: 0–100, 1–10, letter, or band-only?
- **D5.** Raw measurements (1.02 s, 104% body height, 8°): always visible to athlete, or only inside click-expansion?
- **D6.** Failure-band wording: keep Clean / Minor / Major / Critical, or athlete-facing alternatives (Elite / Strong / Developing / Needs Work)?

### E — Category expansion content (§15)
- **E1.** Confirm the 9-block contract above; add/remove now.
- **E2.** "What good looks like" / "What bad looks like" — always video, or sometimes text + still frame? Who tags reference clips and how?
- **E3.** "How to improve" — paragraph, numbered list, or mini-progression (L1→L2→L3→L4)?
- **E4.** "Roadmap next step" — single named drill, phase progression, or calendar commitment ("3 sessions in 10 days")?

### F — Drill integration
- **F1.** One deficiency → ordered drill list (deterministic) vs weighted/probabilistic — confirm deterministic.
- **F2.** Where does the canonical deficiency catalog live? May I seed from existing `common_deficiencies` in `pieV2Signals.ts` + hitting `failureSymptoms` as **starting list**, with you to add/cut?
- **F3.** Can one drill serve multiple deficiencies, or is the mapping one-to-many strictly the other direction?

### G — Video integration
- **G1.** Video taxonomy needed: `reference_good`, `reference_bad`, `corrective`, `teaching`, `roadmap_step` — confirm the tag set.
- **G2.** Per-category required minimum (e.g. every category must have ≥1 good + ≥1 corrective)? What is the policy when none exist yet — show missingness chip, or hide block?

### H — Roadmap integration
- **H1.** Is a "roadmap step" a property of the **deficiency** (same step for every athlete with this deficiency) or a property of the **athlete's current level** (same deficiency → different step depending on history)?
- **H2.** Does the Report Card surface only the **next** step, or the **next N** in sequence?

### I — Coach Hammer
- **I1.** One voice across all five cards, or per-discipline voices?
- **I2.** Does Coach Hammer's copy change per audience (athlete / parent / coach), or only the layout?
- **I3.** Forbidden tones: confirm "scolding", "marketing", "school-grade", ALL-CAPS, sarcasm, emoji-heavy, military metaphors.
- **I4.** Coach Hammer is **delivery only** (rewrites a hand-authored motivational paragraph) — never authors deficiencies, drills, videos, scores, or roadmap steps. Confirm.

### J — Progress, parent, recruiting
- **J1.** Progress view: show change since last session **by default** with arrows, or only on explicit "compare" click?
- **J2.** Parent view: identical copy with different layout, or simplified copy?
- **J3.** Parent view: does it ever show a numeric score, or only bands + bullets?
- **J4.** Recruiting view: subset of Report Card, separate summary card, or a per-discipline highlight reel? What is the minor-athlete gate (RR-9 / RR-10) for what a recruiter may even see?
- **J5.** Recruiting view: shareable by link with expiration, or only viewable inside a recruiter account?

### K — Confidence, missingness, scope
- **K1.** When a session cannot be scored for a category, render as "Not measured — confidence pending" card, or hide the category for that session?
- **K2.** When confidence is low (single rep, manual entry), show the score with an "Estimate" chip, or suppress the score and show "Needs more data"?
- **K3.** Athlete-reported pain in a session — does it appear on the Report Card itself, or on a side channel only? With what visibility to coach / parent / recruiter?
- **K4.** Does this constitution govern **only the per-session Report Card**, or **also the longitudinal Report Card** (multi-session trend)?
- **K5.** Coach view of an athlete's Report Card — same document, or a separate later constitution?
- **K6.** Removal of UHRC — does it happen as a side-effect of ratifying this constitution, or as a separately planned later phase?

---

## 6. Exit criteria

The constitution flips `STATUS: DRAFT → STATUS: RATIFIED` only when **every** question in §16 is answered. Until then, Phase 1 (implementation planning) is constitutionally blocked.
