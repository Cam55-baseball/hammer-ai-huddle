
# Doctrine Alignment Recommendation — Axes A–D

No new audits, CDRs, options, or phases. This is a doctrine-alignment read against existing Hammers Modality constitution, used to confirm or revise the §0.23 Recommended Defaults before owner ratification.

---

## Axis A — Scoring Spine (CDR-1, CDR-2)

### CDR-1 — Score Frame → **Recommended: D (hybrid band headline + numeric sub-value)** — CONFIRMED

**Doctrine sources**
- §0.1 Report Card Purpose: "coaching and development system first," not a grading system.
- §0.2 Priority Hierarchy: Understanding > Correction > Progress > Grading. Veto clause invalidates any frame that improves grading at the expense of understanding.
- §0.3 ENCOURAGED outcome.
- §3 Law 1 (lineage one click away) + §3 Law 5 (never fabricated) + §3 Law 8 (athlete language first).
- §14 format catalog explicitly lists "Band (Elite/Strong/Developing/Needs Work) — Default athlete-facing presentation; numeric remains available on click."

**Why D is the doctrine-aligned choice.** §14 already pre-stages a band-headline + numeric-on-click default. D is the only option that satisfies §0.2 (band protects Understanding-first) while preserving §3 Law 1 (numeric reachable in one click) and §3 Law 5 (the underlying measurement is never erased).

**Tensions in non-recommended options**
- **A (% of elite).** Forces an evaluative headline; collides with §0.2 veto and §0.3 ENCOURAGED. RR-7 (no identity locking) and RR-9 (anti-ranking) strained at parent/recruiter surfaces.
- **B (% of own ceiling).** "Ceiling" implies a fixed personal cap → RR-7 violation (identity locking) and §0.5 pillar-first contradicted (ceilings hide pillar movement).
- **C (band only).** Satisfies §0.2 maximally but deletes the numeric lineage §3 Law 1 requires reachable in one click; also collapses CDR-6 per-session deltas into band transitions only.

**Downstream consequences (D)**
- *Athlete experience:* default surface is qualitative ("Strong / Developing"); numeric available on tap. ENCOURAGED-compatible.
- *Coach Hammer:* speaks in band language at the headline, numeric in lineage copy. Stays inside §10 delivery-only envelope.
- *Analysis Engine:* unchanged — still emits 0–100 internally; binding is read-only per §4/§5/§6.
- *Roadmap:* milestone exits expressed as band transitions, with numeric thresholds in lineage.
- *Report Card:* §17 schema "Display format" field resolves to `band (default) | numeric (expansion)`.

---

### CDR-2 — Absolute vs Athlete-Relative → **Recommended: C (hybrid with declared line — absolute at measurement, relative at score)** — CONFIRMED

**Doctrine sources**
- §3 Law 5 (never fabricated — the measurement must remain absolute).
- §0.4 (development-first), §0.5 pillar-first.
- RR-7 (no identity locking on past or comparative performance).
- RR-9 (no popularity/ranking loops).
- §3 Law 2 (confidence-bound).
- Lineage at §0.18 line 484 explicitly recommends C as the only option compatible with CDR-1D.

**Why C is the doctrine-aligned choice.** §3 Law 5 forbids fabricating the absolute, so the *measurement* must remain absolute. RR-7 + RR-9 forbid the headline *score* from being absolute (creates cross-athlete ranking). C is the only option that holds both: measurement stays absolute, the displayed band/score is age/level-relative. Required to coexist with CDR-1D.

**Tensions in non-recommended options**
- **A (fully absolute).** Enables direct cross-athlete comparison → RR-9 violation; U10s read as "F" against elite reference → §0.3 ENCOURAGED violation; couples to CDR-1A which is itself blocked.
- **B (fully athlete-relative).** Erases the absolute reference at the measurement layer → §3 Law 5 violation; coach/recruiter surfaces lose ground truth; replay equivalence (§3 Law 4) weakened because the "score" depends on a moving relativization.

**Downstream consequences (C)**
- *Athlete experience:* score reads as "Strong for U12 hitter," not "62/100 vs elite." Encouraged + honest.
- *Coach Hammer:* delivery copy never compares athletes; relative framing built-in.
- *Analysis Engine:* emits absolute measurement; a relativization layer maps absolute → age/level band. Lineage preserved.
- *Roadmap:* developmental gating (§ developmental-gating-matrix) becomes the relativization boundary — no new infrastructure.
- *Report Card:* §17 schema gains an explicit "relativization basis" line; click-expansion always exposes the absolute number.

---

## Axis B — Progress Signal (CDR-5, CDR-6, CDR-7, CDR-8)

### CDR-5 — Celebrated-Pillar Trigger Threshold → **Recommended: D (combination)** — CONFIRMED
### CDR-8 — Celebration Trigger Set → **Recommended: D (pillar + band + roadmap + first-time)** — CONFIRMED

**Doctrine sources**
- §0.3 ENCOURAGED.
- §0.5 pillar-first celebration supremacy.
- §3 Law 5 (no fabricated celebrations).
- AF2 (every celebration lineage-traceable to canonical pillar movement).
- RR-5 (no manipulation), RR-9 (no popularity loops).

**Why D/D is doctrine-aligned.** §0.5 declares pillar-first; AF2 declares every celebration must trace to canonical pillar movement. Both D options enumerate *only* lineage-traceable events (pillar climb, band crossing, roadmap milestone, first-time category). Anything less (A/B/C) suppresses real pillar movement — a partial reading of §0.5 the doctrine forbids ("pillar-first doctrine cannot be partial").

**Tensions in non-recommended options.** A celebrates noise → §3 Law 5 violation. B/C silence legitimate pillar movement within bands → §0.5 violation.

**Downstream consequences (D + D)**
- *Athlete experience:* celebration density is high but always earned; never feels false.
- *Coach Hammer:* full vocabulary of celebration types; copy library wider but tightly bounded.
- *Analysis Engine:* publishes four canonical celebration event types; no new computation, just routing.
- *Roadmap:* milestone completion gains constitutional celebration status — couples surfaces cleanly.
- *Report Card:* trend chip (§11) becomes a celebration source when band-crossing fires.

---

### CDR-6 — Canonical Improvement Signal → **Recommended: C (rolling headline + per-session in expansion)** — CONFIRMED

**Doctrine sources**
- §0.5 (composite drop ≠ regression when pillars climb — requires noise-resistant headline).
- §3 Law 1 (lineage one click away — per-session truth reachable).
- §3 Law 2 (confidence-bound — per-session deltas often below noise floor).
- AR-1 (no statistical override of organism truth — both views coexist).
- Phase 56 RE-1…RE-10 (replay equivalence — both signals deterministic).

**Why C is doctrine-aligned.** A's per-session-only reading lets a single bad session present as regression → §0.5 violation. B's rolling-only reading hides the per-session truth → §3 Law 1 violation. C is the only option that satisfies both laws.

**Downstream consequences (C)**
- *Athlete experience:* trend chip is calm; one bad session does not erase a month of climb.
- *Coach Hammer:* headline copy keys off rolling, sidebar copy keys off per-session.
- *Analysis Engine:* maintains both views (already does for PIE V2).
- *Roadmap:* milestone "is athlete improving?" reads from rolling.
- *Report Card:* §11 trend chip resolves to rolling at headline; click reveals per-session sparkline.

---

### CDR-7 — Improvement Time Horizon → **Recommended: D (athlete-selectable, rolling-N default)** — CONFIRMED with one caution

**Doctrine sources**
- RR-5 (athlete may revoke any narrative thread — implies agency over narrative frame).
- RR-7 (no identity locking on past performance — implies athlete controls their own horizon).
- §0.5 (pillar-first; multiple lineage-valid horizons may coexist).
- Phase 56 replay equivalence (every selection deterministic).

**Why D is doctrine-aligned.** RR-5/RR-7 favor athlete agency over their own narrative frame. The rolling-N default preserves CDR-6C's noise-resistant headline. No other option grants the athlete the RR-5/RR-7 agency that the constitution explicitly seals.

**Caution.** D introduces a UI affordance (horizon selector). This does not violate constitutional doctrine (the affordance is a delivery choice, not an authority claim), but it adds one piece of surface that did not exist in A/B/C. Owner may wish to note this in §17 as a deferred surface decision rather than an open CDR.

**Tensions in non-recommended options.** A noisy; B fixes a horizon the athlete cannot revoke (RR-5 tension); C couples narrative entirely to roadmap arc, removing athlete agency (RR-7 tension).

**Downstream consequences (D)**
- *Athlete experience:* horizon toggle in trend chip; rolling-N by default; athlete may switch to per-session or since-roadmap-start.
- *Coach Hammer:* copy speaks to the selected horizon.
- *Analysis Engine:* exposes three precomputed projections per category.
- *Roadmap:* "since roadmap start" becomes a first-class horizon.
- *Report Card:* §17 schema adds "Horizon options" line.

---

## Axis C — Athlete Surface Grammar (CDR-9, CDR-10, CDR-11, CDR-13)

### CDR-9 — Conflict-Mode Rendering → **Recommended: C ("Progressing" overlay)** — CONFIRMED

**Doctrine sources**
- §0.2 lexicographic supremacy of Understanding over Grading.
- §0.3 ENCOURAGED.
- §0.5 pillar-first.
- §3 Law 5 (never hide truth — disqualifies A).

**Why C is doctrine-aligned.** §0.2 mandates Understanding outranks Grading at the surface level. C makes the development context the dominant signal while preserving the underlying score — the only option that satisfies §0.2 + §3 Law 5 simultaneously. B (de-emphasize) relies on palette to do the work, which §0.2 says is not strong enough; D (context text only) is the same problem.

**Tensions.** A forbidden (truth-hiding). B/D both leave grading visually dominant — §0.2 violation.

**Downstream consequences (C)**
- *Athlete experience:* low scores on active-improvement categories read as "Progressing" first.
- *Coach Hammer:* overlay drives the copy framing.
- *Analysis Engine:* must emit "active-improvement" flag per category (sourced from Roadmap binding — no new authority).
- *Roadmap:* becomes the source of "active-improvement" state — strengthens §9 coupling.
- *Report Card:* §17 schema gains "active-improvement render mode" line.

---

### CDR-10 — ENCOURAGED Enforcement → **Recommended: C (tone + visual + structural)** — CONFIRMED

**Doctrine sources**
- §0.3 (ENCOURAGED is the *intended emotional outcome of every* report card experience — total).
- §0.2 (Understanding includes structural sequence).
- §2 (Athlete Experience Flow is *fixed* — structural enforcement is already doctrine).
- RR-5 (no manipulation — tone-only enforcement risks slipping into manipulation if visual/structural don't carry it).

**Why C is doctrine-aligned.** §2's fixed sequence *is* structural enforcement, so anything less than C is already inconsistent with sealed doctrine. A (tone-only) makes ENCOURAGED rest entirely on Coach Hammer copy, which §10 limits to delivery-only — overloads the delivery layer. B (tone+visual) ignores §2.

**Tensions.** A/B each remove one of three enforcement layers already constitutionally present.

**Downstream consequences (C)**
- *Athlete experience:* ENCOURAGED is structural, not just decorative.
- *Coach Hammer:* tone layer; not the only carrier.
- *Analysis Engine:* unchanged.
- *Roadmap:* "next step" appearing in §2 step 6 is part of the structural enforcement.
- *Report Card:* §2 sequence + §14 palette + §10 voice envelope all jointly enforce.

---

### CDR-11 — Palette Permissions → **Recommended: C (red reserved for safeguarding only)** — CONFIRMED

**Doctrine sources**
- §0.3 (ENCOURAGED — never "judged/punished").
- RR-6 injury & safeguarding precedence (red = safeguarding signal).
- RR-9 / RR-10 (safeguarding supersedes exposure / commercial).
- §3 Law 9 (survivability supersedes legibility).

**Why C is doctrine-aligned.** RR-6 already establishes that safeguarding signals carry maximum-salience grammar. If red is used for poor grades, the safeguarding channel loses its constitutional distinctiveness. C is the only option that protects the safeguarding grammar.

**Tensions.** A (red permitted for low scores) collides with RR-6 safeguarding salience and §0.3 ENCOURAGED. B (no red anywhere) over-restricts and defeats RR-6's need for a maximum-salience channel.

**Downstream consequences (C)**
- *Athlete experience:* color grammar is reserved; failure renders in neutral-to-amber, not red.
- *Coach Hammer:* no "red" copy framing; safeguarding voice is distinct.
- *Analysis Engine:* unchanged.
- *Roadmap:* color tokens never code for "behind."
- *Report Card:* design tokens explicitly partition `--safeguarding` from `--needs-work`.

---

### CDR-13 — Disclosure Pattern → **Recommended: C (progressive disclosure)** — CONFIRMED

**Doctrine sources**
- §0.2 Understanding > Grading.
- §3 Law 1 (lineage one click away — *not* "always expanded," not "always collapsed beyond reach").
- §0.6 (9 mandatory explanation blocks).
- §2 fixed sequence (sequence implies progressive reveal).

**Why C is doctrine-aligned.** §3 Law 1 says "one click away" — that is literally progressive disclosure. A (always expanded) makes the surface unreadable and buries §2's sequence. B (always collapsed) violates §3 Law 1 (more than one click to lineage).

**Downstream consequences (C)**
- *Athlete experience:* clean headline, expand on demand; matches §2 flow.
- *Coach Hammer:* copy authored per block, surfaced when expanded.
- *Analysis Engine:* unchanged.
- *Roadmap:* "next step" surfaces in collapsed state per §2.
- *Report Card:* §17 schema "Display format" pairs with "Disclosure level."

---

## Axis D — Process (CDR-16, CDR-17)

### CDR-16 — Interview Cadence → **Recommended: B (explicit per-wave approval)** — CONFIRMED

**Doctrine sources**
- §0.12 extended ratification gate.
- §0.18 (every CDR requires explicit owner ratification — auto-advance is structurally incompatible).
- Eternal Laws supremacy + RR-5 (no manipulation via process pressure).

**Why B is doctrine-aligned.** Auto-advance (A) would mean a later wave gets ratified without explicit owner sign-off on the prior — directly contradicts §0.12. B is the only option compatible.

**Downstream consequences.** Pure governance; no athlete/coach/engine/roadmap/report-card effect.

---

### CDR-17 — RFL Granularity → **Recommended: A (per-wave entry)** — CONFIRMED

**Doctrine sources**
- Phase 47 RP-1…RP-10 (replay lineage completeness).
- Phase 56 RE-1…RE-10 (deterministic state reconstruction).
- §3 Law 1 (lineage one click away).
- Megaphase 68–75 (additive-only, lineage-preserving).

**Why A is doctrine-aligned.** Single-entry-at-ratification (B) collapses the per-wave lineage into one event — directly contradicts Phase 47 RP-3 and §3 Law 10 (additive-only, no compression). A is the only replay-safe option.

**Downstream consequences.** Pure governance / ledger; no athlete/coach/engine/roadmap/report-card surface effect.

---

## Summary

| Axis | Default | Doctrine alignment | Change recommended? |
|---|---|---|---|
| A — Scoring Spine (CDR-1, 2) | D, C | Confirmed by §14 + §3 Laws 1/5 + RR-7/9 | **No** |
| B — Progress Signal (CDR-5, 6, 7, 8) | D, C, D, D | Confirmed by §0.5 + AF2 + §3 Laws 1/2 + RR-5/7 + AR-1 | **No** (CDR-7 D introduces a UI affordance — note only) |
| C — Surface Grammar (CDR-9, 10, 11, 13) | C, C, C, C | Confirmed by §0.2 + §0.3 + §2 + §3 Laws 1/5/9 + RR-6 | **No** |
| D — Process (CDR-16, 17) | B, A | Confirmed by §0.12 + Phase 47/56 + §3 Law 10 | **No** |

**Recommendation: ratify all §0.23 defaults verbatim.** No doctrine source contradicts any default; every non-recommended option creates at least one §0 / §3 Law / RR / Phase invariant tension.

---

## Final Owner Response Template — Axis A–D only

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

## Plan if approved

This recommendation is the deliverable; no file edits are requested in plan mode. If owner accepts and switches to build mode, the next action is solely to record this Doctrine Alignment Recommendation as a new sub-section §0.24 in `docs/asb/report-card-constitution.md` (citations + final template only) and append RFL-087 to `docs/asb/reality-feedback-ledger.md`. No code, no schema, no constitutional phase, no new CDR. Implementation remains constitutionally blocked until the owner submits the Axis A–D selections (or `DEFAULTS`).
