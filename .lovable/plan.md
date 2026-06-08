
# Phase 0.1 — Report Card Constitutional Discovery Expansion

**Scope:** documentation-only. No code, UI, schema, migrations, edge functions, or token changes. All prior implementation prohibitions (UHRC, hitting phase migration, throwing registry, correction cache, routes/tabs/components) remain constitutionally blocked. Q-Series Z remains open; this phase expands the ratification gate, it does not replace it.

## Outcome

`docs/asb/report-card-constitution.md` is bumped to **v0.3** with a new **§0.11 Constitutional Completeness Audit** and **§0.12 Extended Ratification Gate**, and nine new gated interview series (**Q-Series AA–AI**) are opened. Section 0 cannot flip to RATIFIED until Q-Series Z **and** AA–AI are all closed and the audit reports zero residual ambiguity.

## Deliverables

### 1. §0.11 — Constitutional Completeness Audit (new subsection)

Before any new questions are written, perform and record a gap audit of the current constitution against the Report Card's role inside the Hammers Modality organism. For each of the 13 organism responsibilities below, the audit records: **Defined? / Partially / Absent**, the exact §-reference if defined, the specific gap if not, and the Q-Series that will close it.

Responsibilities audited:

1. Athlete understanding
2. Coaching translation (organism → human language, per RW-doctrine)
3. Correction prioritization
4. Drill assignment determinism
5. Video assignment determinism
6. Roadmap guidance
7. Coach Hammer communication (voice, tone, boundaries)
8. Parent interpretation surface
9. Recruiter interpretation surface (with minor-athlete supremacy per RR-9/RR-10)
10. Progress recognition (pillar-first, per §0.5)
11. Missingness handling (confidence, sparse data, sensor dropouts)
12. Scoring meaning (what a number *means* to an athlete)
13. Development meaning (what "improvement" constitutionally is)

The audit is written verbatim into §0.11 as a table. Every row marked Partially/Absent becomes one or more questions in the corresponding new Q-Series. No gap is silently filled.

### 2. §0.12 — Extended Ratification Gate

Replaces §0.10's standalone gate with a compound gate:

- Q-Series Z complete (Z1–Z21)
- Q-Series AA–AI complete
- §0.11 audit shows zero rows in Partially/Absent state
- Owner explicitly declares §0 ratified

Only then may §16 Groups A–K open. Until then, implementation remains blocked.

### 3. Nine new gated interview series (questions only, no answers)

Each series is opened in waves of **≤ 4 questions**. Wave 1 of each is written now; subsequent waves wait for prior answers. No assumptions, no inferred defaults, no "for now" placeholders. Series scopes:

| Series | Scope |
|---|---|
| **AA — Score Meaning** | What a numeric score *means*, units, bands, what 60 vs 80 communicates, whether scores are absolute or athlete-relative, score visibility rules under §0.4 hero-suppression |
| **AB — Progress** | Definition of progress, pillar-first vs composite, regression handling, time horizons, what counts as a "win", celebration triggers |
| **AC — Coach Hammer Communication** | Voice, persona boundaries, tone per emotional state, when Coach Hammer speaks vs stays silent, what Coach Hammer is constitutionally forbidden from saying, minor-athlete language gates |
| **AD — Parent View** | What parents see vs don't see, framing rules, comparison prohibitions, minor-athlete parental supremacy surfaces, notification policy |
| **AE — Recruiter View** | What recruiters see vs don't see, opt-in pathways, minors protection-first (RR-9/RR-10), no pay-to-win, no ranking exploitation, evidence surfaces only |
| **AF — Celebration** | When/how the system celebrates, anti-empty-praise rules, pillar wins, streak handling, what is never celebrated (e.g., another athlete's worse score) |
| **AG — Missingness** | How missing data is shown, never silently imputed, confidence bands, "we don't know yet" copy contract, partial-category rendering, video/drill availability gaps |
| **AH — Cross-Discipline Expansion** | Pitching/hitting/throwing/catching/defense/baserunning constitutional parity, what is shared vs discipline-specific, future-discipline extension rules (additive-only) |
| **AI — Athlete Journey** | First session vs Nth session, longitudinal narrative (bound by RR-5), identity-safety, redirect rights, milestone semantics, what the journey is *not* (not destiny, not ranking) |

### 4. Wave 1 questions written into §0.13

Three questions per series for AA–AI (≤ 4 per wave), totalling ~27 Wave-1 questions. Each question states the decision required and the constitutional dependency it closes. No multiple-choice defaults are filled in.

### 5. Remaining-work estimate (§0.14)

Recorded estimate, owner-visible:

- Q-Series Z: ~18 of 21 outstanding (Wave Z1 in flight)
- Q-Series AA–AI: ~9 waves × ~3 questions each ≈ 80–110 questions across all series, fanout determined by owner answers
- Expected total waves to ratification: 25–35
- Expected calendar effort: owner-bound, not AI-bound

This is an estimate, not a commitment, and is re-derived after each wave closes.

### 6. RFL entry

Append **RFL-082** to `docs/asb/reality-feedback-ledger.md` recording:

- Phase 0.1 opened
- §0.11 audit performed (with full table)
- §0.12 extended ratification gate adopted
- Q-Series AA–AI opened with Wave 1
- Implementation remains constitutionally blocked
- Subordinate to all prior RR/RW/EI/IR/EK/SG/FC/EE/RO/AR/DG/RE/AE/SF/ES/CV/ER/SL/FI-C invariants and Eternal Laws

### 7. Plan ledger

Update `.lovable/plan.md` to reflect Phase 0.1 active, Wave Z1 still owner-pending, Wave-1 of AA–AI now also owner-pending, all implementation paths blocked.

## Files touched (documentation only)

- `docs/asb/report-card-constitution.md` — v0.2 → v0.3, add §0.11, §0.12, §0.13 (Q-Series AA–AI Wave 1), §0.14 (remaining-work estimate); update precedence clause to cite extended gate
- `docs/asb/reality-feedback-ledger.md` — append RFL-082
- `.lovable/plan.md` — status update

## Out of scope (still blocked)

UHRC removal, hitting phase migration, throwing registry, correction cache / `generate-correction-motivation`, report card routes, athlete/technical/parent/recruiter views, display cards, tabs, score displays, any token or component work. Q-Series Z waves Z2+ are not pre-answered.

## Exit criteria for Phase 0.1

- §0.11 audit table written with no Absent/Partially row left without a routed Q-Series
- §0.12 extended gate in force
- AA–AI Wave 1 questions written verbatim, no assumed answers
- RFL-082 appended
- Owner returns to answer Wave Z1 and AA–AI Wave 1 in any order

§0 ratification remains forbidden until both Q-Series Z and AA–AI are fully closed and the §0.11 audit is clean.
