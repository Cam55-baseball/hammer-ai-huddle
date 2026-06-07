# V1 Reality Validation Protocol

**Status:** Active.
**Established:** Post-ratification of Hammers Modality V1 (release authorized).
**Authority:** Reality is now the governing authority over the V1 organism.
**Scope:** Observation only. No code, schema, features, architecture, instrumentation, or doctrine changes.

This protocol defines how the first three athlete cohorts are observed,
measured, and converted into either RFL entries or positive reality evidence.
It does not replace any prior ratified document; it consumes them.

Referenced canonical documents:
- `docs/asb/v1-launch-operations-plan.md` (funnel, scoreboard, RFL intake, V1.x board)
- `docs/asb/reality-feedback-ledger.md` (RFL ledger and launch operations layer)
- `docs/asb/hammers-modality-v1-ratification.md` (V1 ratification record)
- `docs/asb/final-production-release-verification.md` (release authorization)

---

## Section 0 — Doctrine

- Reality is the governing authority over the V1 organism. Constitutional
  expectations are hypotheses until cohort behavior confirms or disproves them.
- No constitutional rewrites mid-cohort. Observations route to RFLs.
  RFLs route to the V1.x prioritization board.
- Severity follows the rubric already established in
  `v1-launch-operations-plan.md` §E. No severity inflation.
- All measurements come from existing surfaces. No new tables, columns,
  edge functions, dashboards, or events are added by this protocol.

---

## Section A — Cohorts

| Cohort | Size | Gate to next                          | Review artifact                   |
|--------|------|---------------------------------------|-----------------------------------|
| C1     | 10   | C1 Reality Validation Report issued   | Reality Validation Report C1      |
| C2     | 25   | C2 Reality Validation Report issued   | Reality Validation Report C2      |
| C3     | 50   | C3 Reality Validation Report issued   | Reality Validation Report C3 / V1.x re-baseline |

Cohort assignment rule: athletes are assigned to a cohort by signup window in
the cohort report itself. No new tag column is added to `profiles`. Whether C2
and C3 sizes are cumulative or incremental is declared at the close of the
preceding cohort.

A cohort is "closed" when its Reality Validation Report is issued. The report
is the gate, not the calendar.

---

## Section B — Activation (per cohort)

For each athlete in cohort, record:

| Stage                         | Source                                                                 |
|-------------------------------|------------------------------------------------------------------------|
| signup                        | `auth.users.created_at`                                                |
| profile completion            | `profiles` onboarding/completion fields                                |
| first event                   | earliest of `asb_events` / `athlete_events` / `performance_sessions`   |
| first `/command` visit        | earliest `hammer_state_snapshots` row or matching `asb_events` surface |
| first daily-plan engagement   | earliest `udl_daily_plans` interaction or `foundation_recommendation_traces` touch |

Reported as: count, percentage of cohort, median time-to-event, and drop-off
between adjacent stages. Bands inherited from
`v1-launch-operations-plan.md` Release Health Scoreboard.

---

## Section C — Retention

D1, D7, and D30 return are defined as **≥1 `asb_event` or `athlete_event` row
in the corresponding window** after signup.

Reported as: percentage of cohort returning at each window.

Drop-off reasons are captured **qualitatively** from Section D inputs and
Section F triage. They are not inferred from event sparsity alone.

Cross-reference the Top-5 athlete-loss locations from
`v1-launch-operations-plan.md` §C. Each cohort report confirms or refutes
each Top-5 location.

---

## Section D — Trust signals

Captured from support, direct contact, coach feedback, and parent feedback.
Four buckets:

- **confusion** — what surface, what moment
- **recommendation skepticism** — which recommendation, which `trace_id` if available
- **navigation complaints** — which route, what the athlete expected
- **Hammer feedback** — state surprise, opacity, override desire

Per entry: athlete identifier (or pseudonym), date, surface, verbatim quote,
observer name.

---

## Section E — Delight signals

- **favorite feature** — open-ended athlete answer
- **most-used feature** — cross-checked against event counts in the cohort window
- **first moment of value** — verbatim moment plus surface where it occurred

---

## Section F — RFL creation rules

- **Repeated complaint** — ≥2 athletes within a cohort on the same surface,
  or ≥3 across cohorts on the same surface → new RFL via the intake pipeline
  in `v1-launch-operations-plan.md` §E. Severity follows the existing rubric.
  No severity inflation.
- **Repeated success** — ≥2 athletes on the same surface → appended to the
  `Positive Reality Evidence` section of `docs/asb/reality-feedback-ledger.md`.
  Not an RFL. Used to confirm constitutional expectations.
- **One-off signal** — logged in the cohort report only. Not promoted unless
  it reappears.

Doctrine reminder: an RFL records reality. It does not authorize a fix on
its own. Fix authorization comes from the V1.x prioritization board.

---

## Section G — Cohort review cadence & Reality Validation Report

A Reality Validation Report is produced at each gate (10 / 25 / 50). Use
`docs/asb/reality-validation-cohort-template.md` as the template.

Each report contains:

1. Cohort summary (size, signup window, activation funnel)
2. Retention table (D1 / D7 / D30) with band classification
3. Trust signal log (Section D entries)
4. Delight signal log (Section E entries)
5. New RFLs created this cohort
6. New positive reality evidence
7. Constitutional expectations: matches vs misses
8. Recommended V1.x priority changes — re-ranks the existing V1.x board in
   `v1-launch-operations-plan.md` §F. Does not invent new severities.
9. Verdict for the next cohort: **PROCEED / PROCEED WITH ADJUSTMENTS / HALT**

A `HALT` verdict pauses cohort expansion until the cited blockers are
resolved or explicitly accepted as launch debt.

---

## Section H — Out of scope

This protocol does not introduce:

- new instrumentation, events, tables, columns, or edge functions
- new dashboards or visualizations
- changes to any ratified verdict
- constitutional doctrine edits
- feature, UX, or architecture work
- changes to existing RFL severity rubric

If a cohort report concludes that any of the above is required, that
conclusion is recorded as a recommendation and routed to the V1.x board —
never executed inside the protocol.

---

## Exit criteria for the protocol itself

- Protocol document written (this file).
- Cohort report template written (`reality-validation-cohort-template.md`).
- RFL ledger references the protocol and adds a `Positive Reality Evidence`
  section.
- Ready to observe Cohort 1.
