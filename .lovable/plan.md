
# Post-Launch Observability & Reality Validation Sprint — Plan

**Constitutional posture:** Observation only. No new doctrine, no scoring, no recommendation redesign, no schema authority changes, no new organism truth surfaces. Every artifact is a **replay-derived projection** over the canonical `asb_events` ledger — zero new authoritative storage. Aligns with Phases 46 (EL), 47 (RP), 53 (RO), 54 (AR), 55 (DG), 57 (AE), Megaphase 91–110 (PR-8 intelligence delivery explainability), Megaphase 111–150 (athlete intelligence delivery / observability supremacy), and RR-9/RR-10 visibility governance.

## Scope

9 documentation artifacts under `docs/asb/` plus a small set of **read-only projection helpers** under `src/lib/observability/` that derive funnel/utilization/safeguarding metrics from existing ASB rows. No migrations. No new tables. No new edge functions. No UI redesign.

## Deliverables

### Section A — `docs/asb/post-launch-observability.md`
Inventory table of every critical organism behavior with columns: `behavior | event_name | source_file | asb_topic | consumer | owner | success_criteria`. Covers all 16 behaviors listed in the prompt (signup → trend review). Cross-references existing topic registry (`asb_topic_registry`) and identifies any behavior currently lacking a canonical topic emission — flagged as **instrumentation gap**, not fixed in this sprint.

### Section B — `docs/asb/funnel-instrumentation.md` + `src/lib/observability/funnels.ts`
Four canonical funnels (Athlete / Coach / Recruiter / Parent) defined as ordered stage arrays mapped to ASB topic predicates. `funnels.ts` is a **pure reducer** over `AsbEventRow[]` (same shape as `useAthleteCommandRows`) returning `{stage, entries, exits, completionPct, abandonmentPct, medianTimeToNextMs}` per stage. No writes. Document lists every stage → topic binding; any missing topic logged as a Section-G ledger entry.

### Section C — `docs/asb/dropoff-detection.md`
Per-stage drop-off methodology + flag thresholds (advisory, not enforcement). Defines what counts as "stalled", "orphaned", "dead-end", "unconsumed intelligence". Bound to the same projection in `funnels.ts` — no separate engine.

### Section D — `docs/asb/recommendation-effectiveness-observability.md` + `src/lib/observability/recommendationFunnel.ts`
Recommendation lifecycle projection: `shown → opened → drill_started → drill_completed → video_watched → repeat → improvement_correlation → coach_ack`. Pure reducer over existing topics (`foundation_recommendation_traces`, `foundation_video_outcomes`, drill prescription topics). Measurement only — no scoring writeback, no ranking influence (consistent with `videoConversionAnalytics.ts` posture).

### Section E — `docs/asb/intelligence-utilization-audit.md` + `src/lib/observability/intelligenceUtilization.ts`
Per-surface view counters (UHRC, detailed analysis, Hammer, roadmap, recruiting, coach intelligence, trends) derived from existing view/open topics. Identifies surfaces with **zero or near-zero consumption** as candidates for the next sprint — not redesigned here.

### Section F — `docs/asb/safeguarding-observability.md` + `src/lib/observability/safeguarding.ts`
Reducer over `safeguarding_notifications` + `relational.safeguarding.*` ASB topics: emitted, viewed, coach_ack, parent_ack, resolution_time, repeat_frequency. Verifies the constitutional invariant that **no safeguarding signal disappears or remains unseen** (RR-10, Phase 60 §G containment).

### Section G — `docs/asb/reality-feedback-ledger.md`
Append-only markdown ledger template with columns: `observed_behavior | evidence (event_id / query / file:line) | frequency | severity | recommended_future_action | status=observed`. Pre-seeded with all instrumentation gaps surfaced in Sections A–F. Constitutionally: this is a human-curated overlay, not organism truth — it never authors ledger state.

### Section H — `docs/asb/launch-success-scoreboard.md`
Day 1 / Day 7 / Day 30 targets for: activation, retention, analysis usage, recommendation completion, coach engagement, recruiter engagement, parent participation, safeguarding response, athlete progression. Targets are **measurement baselines**, not optimization goals (per RR-9 anti-engagement-optimization doctrine).

### Section I — `docs/asb/post-launch-command-center.md`
Single operational source of truth: critical dashboards (`/ops/health`, `/ops/drift`, `/asb/replay`, `/asb/timeline`), critical ASB topics (consolidates lists from `launch-operations-package.md`), critical alerts, critical tables, daily/weekly review checklists, escalation procedures, RACI for "who investigates what". Supersedes ad-hoc sections inside `launch-operations-package.md` by reference.

## Technical Section (for implementers)

**New files (9 docs + 4 TS reducers):**
- `docs/asb/post-launch-observability.md`
- `docs/asb/funnel-instrumentation.md`
- `docs/asb/dropoff-detection.md`
- `docs/asb/recommendation-effectiveness-observability.md`
- `docs/asb/intelligence-utilization-audit.md`
- `docs/asb/safeguarding-observability.md`
- `docs/asb/reality-feedback-ledger.md`
- `docs/asb/launch-success-scoreboard.md`
- `docs/asb/post-launch-command-center.md`
- `src/lib/observability/funnels.ts`
- `src/lib/observability/recommendationFunnel.ts`
- `src/lib/observability/intelligenceUtilization.ts`
- `src/lib/observability/safeguarding.ts`

**Pattern:** Each reducer mirrors `src/lib/ops/telemetry.ts` and `src/lib/digest/projections.ts` — pure functions over `AsbEventRow[]`, no I/O, no writes, no smoothing, lineage preserved (`event_id` traceable for every counted transition).

**No changes to:** migrations, edge functions, `client.ts`, `types.ts`, RLS policies, schema, intelligence engines, recommendation logic, UI surfaces. Hooks consuming these reducers can be added in a follow-up sprint once the reducers are validated against real ledger data.

**Out of scope (explicitly):** any fix to instrumentation gaps discovered, any optimization, any UI work, any recommendation/intelligence/onboarding changes.

## Sprint Exit

- 9 docs created
- 4 read-only reducers created
- All 16 critical behaviors inventoried with explicit gap flags
- 4 funnels defined and instrumentable
- Reality feedback ledger seeded with observed gaps
- Scoreboard targets defined
- Command center consolidated

## Return at completion

1. Observability inventory (Section A table)
2. Funnel coverage matrix (Section B)
3. Instrumentation gaps (rolled up from A–F into Section G ledger)
4. Reality feedback ledger (Section G)
5. 30-day success scoreboard (Section H)
6. Recommended first post-launch optimization sprint — driven by whichever gap in Section G scores highest severity × frequency (likely "instrument missing topics" before any optimization)
