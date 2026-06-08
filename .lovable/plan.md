## Phase 0.3 — Constitutional Decision Packet (§0.18)

**Scope:** Documentation-only. No code, schema, or UI changes. Implementation remains constitutionally blocked. No new audits, no new discovery series, no new gap analyses. Converts the 17 open CDR items from §0.17 into a single owner-facing decision document with bounded options.

### Files to edit

1. **`docs/asb/report-card-constitution.md`** — bump to `v0.5 (DRAFT — UNRATIFIED)`; append §0.18, §0.19, §0.20, §0.21. Revise §0.14 work estimate to reflect closure-recommendation bundling. No edits to §0.1–§0.17 content (sealed by Phase 0.2).
2. **`docs/asb/reality-feedback-ledger.md`** — append **RFL-084** documenting the Decision Packet emission, the §0.15 derivation rule re-application (no new questions opened), and the closure-bundling recommendation.
3. **`.lovable/plan.md`** — replace Phase 0.2 status with Phase 0.3 status; implementation still blocked.

### §0.18 — Constitutional Decision Packet (structure)

Single owner-facing document. Per-item schema, applied uniformly to all 17 CDR items:

```text
CDR-N  [domain: D1|D4|D5]   inherits: Z?/AA?/AB?/AF?/AH?
─────────────────────────────────────────────────────────
Constitutional impact:   one paragraph — what this decision binds
Downstream systems:      Report Card | Analysis Engine | Correction Engine |
                         Roadmap | Coach Hammer | Parent Surface | Recruiter Surface
Doctrine constraints
that cannot be violated: list of clauses (§0.x, RR-n, RW-n, Eternal Law n, §3 Law n, §16 Bn)
Options:
  A) <option>  — consequence chain across affected systems
  B) <option>  — consequence chain
  C) <option>  — consequence chain
  D) <option>  — (only when a 4th constitutionally distinct path exists)
Recommended Default:     A|B|C|D — derived from inherited doctrine where one
                         option is materially more aligned. NOT auto-ratified.
                         Marked "no default — pure owner choice" if doctrine is
                         neutral across all options.
```

Grouped under the three live domains:

- **D1 — Scoring Meaning** (CDR-1, CDR-2, CDR-3, CDR-4)
- **D4 — Celebration & Progress** (CDR-5, CDR-6, CDR-7, CDR-8)
- **D5 — Athlete Journey Experience** (CDR-9, CDR-10, CDR-11, CDR-12, CDR-13, CDR-14, CDR-15, CDR-16, CDR-17)

D2 (Coach Hammer) and D3 (Parent/Recruiter) explicitly carried forward as **"Closed-by-Derivation per §0.16 — not reopened in Phase 0.3."**

For each item, options will be drawn directly from the existing §0.16 ledger language so no new ambiguity is introduced. Doctrine-constraint rows will cite the actual clause IDs (e.g., CDR-2 constrained by §0.4 development-first, §3 Law 5 confidence-bounded, RW-7, AR-1; CDR-11 constrained by §0.3 "ENCOURAGED, never judged", §0.6 missingness visibility; CDR-15 constrained by Eternal Law of additive-only scope, RW-1, §0.5).

### §0.19 — Constitutional Dependency Map

Single table, one row per CDR item, one column per downstream system. Each cell records `BINDS` / `INFLUENCES` / `NONE`. Used to identify which decisions cascade into multiple engines vs. which are presentation-local.

```text
CDR | ReportCard | AnalysisEng | CorrectionEng | Roadmap | CoachHammer | ParentSurf | RecruiterSurf
```

Example expected pattern (to be filled in per item):
- CDR-1, CDR-2 → BINDS all seven columns (scoring frame propagates everywhere).
- CDR-9, CDR-11, CDR-13 → BINDS Report Card + Parent Surface only.
- CDR-16, CDR-17 → BINDS none (process-only, no implementation surface).

### §0.20 — Ratification Forecast

Three buckets:

- **MUST-ANSWER-BEFORE-IMPLEMENTATION** — decisions that bind schema, scoring math, or rendering contracts (expected: CDR-1, CDR-2, CDR-3, CDR-4, CDR-6, CDR-7, CDR-11, CDR-12, CDR-15).
- **MAY-DEFER-TO-POST-V1** — decisions that affect later surfaces or can ship behind a feature flag with a constitutional default (expected: CDR-5, CDR-8, CDR-9, CDR-10, CDR-13, CDR-14).
- **NO-IMPLEMENTATION-IMPACT** — process/governance decisions (expected: CDR-16 cadence, CDR-17 RFL granularity).

Each bucket annotated with the precise reason an item lands there, citing doctrine.

### §0.21 — Closure Recommendation

Bundling proposal that collapses 17 independent decisions into a small set of **constitutional choice bundles** the owner can ratify atomically:

- **Bundle 1 — "Scoring Spine"** (CDR-1 + CDR-2 + CDR-3 + CDR-4): one coherent scoring philosophy; the four are not independently coherent.
- **Bundle 2 — "Progress Signal"** (CDR-5 + CDR-6 + CDR-7 + CDR-8): celebration/progress mechanics derive from one signal definition.
- **Bundle 3 — "Athlete Surface Grammar"** (CDR-9 + CDR-10 + CDR-11 + CDR-13): rendering grammar for §0.3 ENCOURAGED enforcement; tightly coupled.
- **Bundle 4 — "Priority & Scope"** (CDR-12 + CDR-15): what gets surfaced as priority, across which V1 disciplines.
- **Bundle 5 — "Variance"** (CDR-14): single Softball-Hitting decision.
- **Bundle 6 — "Process"** (CDR-16 + CDR-17): governance cadence; can ratify with stated default.

Target: **two owner responses** close all 17 — Response 1 covers Bundles 1–3 (the spine that unblocks implementation); Response 2 covers Bundles 4–6.

### §0.14 update

Revise the work estimate row from "3 owner waves (D1/D4/D5)" to **"2 owner responses across 6 bundles per §0.21 closure recommendation."** No other §0.14 row changes.

### RFL-084 (Reality Feedback Ledger)

Record: Phase 0.3 emitted, §0.18–§0.21 added, no new questions opened (Phase 0.2 synthesis honored), 17 CDR items packaged with options + defaults + dependency map + forecast + bundled closure path, implementation gate unchanged.

### What this plan explicitly does NOT do

- Does not auto-ratify any Recommended Default.
- Does not reopen Q-Series Z, AA, AB, AC, AD, AE, AF, AG, AH, AI.
- Does not reopen D2 or D3 (closed-by-derivation).
- Does not produce any new owner-facing questions beyond the 17 already-registered CDR items.
- Does not touch source code, migrations, RLS, edge functions, UI, or `src/`.
- Does not lift the implementation gate.
