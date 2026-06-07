# V1 Reality Validation Protocol — Plan

Documentation-only sprint. No code, schema, features, or RFL severity changes. Reality becomes the governing authority; this plan defines how the first three athlete cohorts are observed, measured, and converted into RFLs or positive reality evidence.

## Deliverables

1. **`docs/asb/v1-reality-validation-protocol.md`** (new) — the full protocol.
2. **`docs/asb/reality-validation-cohort-template.md`** (new) — blank report template reused for each cohort review.
3. **`docs/asb/reality-feedback-ledger.md`** (append) — short "Reality Validation Protocol active" note + intake binding to RFL pipeline already defined in v1-launch-operations-plan.md.
4. **`.lovable/plan.md`** (append) — Reality Validation Protocol active, cohort gates, exit criteria.

No new tables. No new edge functions. No new instrumentation. All measurements sourced from existing surfaces already enumerated in `docs/asb/v1-launch-operations-plan.md` (asb_events, profiles, performance_sessions, hammer_state_snapshots, foundation_recommendation_traces, athlete_events, auth.users).

## Structure of `v1-reality-validation-protocol.md`

### Section 0 — Doctrine
- Reality is now the governing authority over the V1 organism.
- Constitutional expectations are hypotheses until cohort behavior confirms or disproves them.
- No constitutional rewrites mid-cohort; observations route to RFLs, RFLs route to V1.x prioritization board.

### Section A — Cohorts
| Cohort | Size | Gate to next | Review artifact |
|---|---|---|---|
| C1 | 10 athletes | C1 report issued | Reality Validation Report C1 |
| C2 | 25 athletes (cumulative or incremental — declared at C1 close) | C2 report issued | Reality Validation Report C2 |
| C3 | 50 athletes | C3 report issued | Reality Validation Report C3 / V1.x re-baseline |

Cohort identity = `profiles.id` tagged by signup window. No new tag column required; cohort assignment maintained in the report doc.

### Section B — Activation metrics (per cohort)
For each athlete:
- signup (auth.users.created_at)
- profile completion (profiles.onboarding_completed / profile_complete fields already present)
- first event (earliest asb_events / athlete_events / performance_sessions row)
- first `/command` visit (earliest hammer_state_snapshots or asb_event with command surface)
- first daily-plan engagement (udl_daily_plans / foundation_recommendation_traces interaction)

Reported as: count, %, median time-to-event, drop-off between adjacent stages. Bands inherited from v1-launch-operations-plan.md Release Health Scoreboard.

### Section C — Retention
- D1 / D7 / D30 return defined as ≥1 `asb_event` or `athlete_event` in the window.
- Drop-off reasons captured qualitatively (Section D inputs + Section F triage), not inferred.
- Cross-reference Top-5 athlete-loss locations from v1-launch-operations-plan.md §C; confirm or refute per cohort.

### Section D — Trust signals
Four buckets, captured from support / direct contact / coach / parent channels:
- confusion (what surface, what moment)
- recommendation skepticism (which recommendation, which trace_id if available)
- navigation complaints (which route, what was expected)
- Hammer feedback (state surprise, opacity, override desire)

Each entry: athlete_id (or pseudonym), date, surface, verbatim quote, observer.

### Section E — Delight signals
- favorite feature (open-ended)
- most-used feature (cross-checked against event counts)
- first moment of value (verbatim moment + surface)

### Section F — RFL creation rules
- **Repeated complaint** (≥2 athletes, same surface, same cohort, or ≥3 cross-cohort) → new RFL via the intake pipeline already canonical in `v1-launch-operations-plan.md` §E. No severity inflation. Severity follows the existing rubric.
- **Repeated success** (≥2 athletes, same surface) → appended to a new `Positive Reality Evidence` subsection inside `docs/asb/reality-feedback-ledger.md` (additive, not RFL). Used to confirm constitutional expectations.
- One-off signals: logged in the cohort report but not promoted unless they reappear.

### Section G — Cohort review cadence & report
At each gate (10 / 25 / 50), produce a Reality Validation Report containing:
1. Cohort summary (size, window, activation funnel)
2. Retention table (D1/D7/D30)
3. Trust signal log
4. Delight signal log
5. New RFLs created this cohort
6. New positive reality evidence
7. Constitutional expectation matches vs misses
8. Recommended V1.x priority changes (re-ranks the existing V1.x board from v1-launch-operations-plan.md §F; does not invent new severities)
9. Verdict for next cohort: PROCEED / PROCEED WITH ADJUSTMENTS / HALT

### Section H — Out of scope
No instrumentation changes, no new tables, no new dashboards built, no constitutional doctrine edits, no feature work, no architecture work. Pure observation + documentation.

## Exit criteria
- Protocol document written.
- Cohort report template written.
- RFL ledger + plan.md reference the protocol.
- Ready to observe Cohort 1.
