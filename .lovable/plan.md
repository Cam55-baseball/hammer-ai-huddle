# V1 Launch Operations & Reality Feedback System — Plan

Documentation-only sprint. No code, no schema, no features. The organism is ratified (RELEASE AUTHORIZED); this sprint establishes the post-launch observability and feedback loop so reality can govern V1.x.

## Deliverables

1. **Create `docs/asb/v1-launch-operations-plan.md`** — the operating runbook.
2. **Update `docs/asb/reality-feedback-ledger.md`** — append a "Launch Operations Layer" section recording the operational doctrine and the V1.x prioritization snapshot.
3. **Update `.lovable/plan.md`** — add a "Post-launch operations" block pointing to the runbook, the daily-check ritual, and the V1.x ordered backlog.

No other files are touched.

## Document structure — `v1-launch-operations-plan.md`

### Section A — Canonical Athlete Funnel
Eleven-stage funnel (Account Created → D30 Return). For each stage: ledger/event source (table + event_type or auth signal), current instrumentation status (instrumented / partial / gap), and the remediation owner (V1.x vs V2). Sourced from existing tables (`profiles`, `asb_events`, `athlete_events`, `auth.users`) and existing instrumentation docs (`funnel-instrumentation.md`, `dropoff-detection.md`).

### Section B — Reality Feedback Dashboard (Launch Command Center) spec
Read-only operational spec (no build). Lists the seven metric families (signups, onboarding completion, first-value, retention D1/D7/D30, recommendation engagement, workout completion, roadmap engagement, command usage), the source query shape for each (against existing tables — no new schema), the cadence (hourly / daily), and the intended consumer (leadership daily check / weekly review).

### Section C — Drop-off Detection
For each of the 11 funnel stages: success event, failure event, abandonment signal (time-since-last-event threshold). Concludes with **Top 5 athlete-loss locations** ranked by likelihood × impact, grounded in current code:
1. Profile setup → first event (onboarding chat abandon)
2. First `/command` visit → first daily-plan engagement
3. First recommendation surfaced → first drill/workout consumed
4. D1 return (24–48h gap)
5. D7 return (weekly digest absence — RFL-052)

### Section D — Release Health Scoreboard
Six launch-health metrics with explicit Healthy / Warning / Critical thresholds:
- Activation rate (signup → first event)
- Onboarding completion (profile → `/command` first visit)
- D1 retention
- D7 retention
- Workout completion rate (per active athlete)
- Recommendation engagement rate

Thresholds are stated as ranges anchored to the existing organism (e.g. activation Healthy ≥60% / Warning 40–60% / Critical <40%) with explicit "first-cohort calibration" caveat.

### Section E — Reality Feedback Ledger intake path
Defines the canonical pipeline for converting athlete complaints, confusion reports, support tickets, coach feedback, parent feedback, and recruiting feedback into RFL entries. Specifies: capture channel → triage owner → RFL severity rubric (athlete impact / retention impact / trust impact) → entry format → review cadence. Reaffirms reality-as-governing-authority doctrine.

### Section F — V1.x Prioritization Board
Re-ranks every currently OPEN RFL (035–052, 054–058) on the three axes (athlete impact, retention impact, trust impact) — explicitly **not** by implementation effort. Produces three ordered lists: **Immediate V1.x**, **Near-term**, **V2**. Differs from the current `.lovable/plan.md` debt list, which is grouped not ordered. Expected immediate-V1.x ordering (subject to the rubric in the doc): RFL-053-class regressions (none open) → RFL-055/056 (trust lineage) → RFL-052 (D7 hook) → RFL-048 (`/today` ambiguity) → RFL-044 (daily plan hierarchy) → RFL-041 (nav pollution) → rest.

### Section G — Post-Ratification Verdict (the four answers)
Direct answers to the four leadership questions:
- **What metrics determine success?** — Activation, D7 retention, workout completion.
- **What metrics indicate danger?** — Activation <40%, D1 <25%, recommendation engagement <15%, any onboarding-stage drop >50%.
- **First thing leadership checks daily?** — Activation rate + D1 retention for the prior cohort, plus the failure-event count from Section C.
- **First fix if adoption stalls?** — Walk Section C top-5 in order; the first stage with a >50% drop is the fix target. The most likely first fix is the onboarding → first-event gap (RFL-044 daily-plan hierarchy + RFL-057 first-plan celebration).

## Out of scope

- No new instrumentation code, no new tables, no edge-function changes.
- No new RFLs opened (this sprint reads and re-ranks existing ones).
- No dashboard implementation — Section B is a spec only.
- No changes to ratified verdicts (RELEASE AUTHORIZED stands).

## Exit criteria

- `v1-launch-operations-plan.md` exists with Sections A–G complete.
- `reality-feedback-ledger.md` records the operations-layer doctrine and the V1.x ordered list.
- `.lovable/plan.md` points operators to the runbook and the daily check.
