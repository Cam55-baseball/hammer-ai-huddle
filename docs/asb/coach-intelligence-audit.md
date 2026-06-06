# Coach Intelligence Consumption Audit

**Generated:** 2026-06-06  
**Surfaces audited:** `CoachConsole`, `CoachAthleteDetail`, coach dashboard

Confirms every recommendation, caution, trend, pillar, drill, and video is
visible on a non-debug coach surface.

---

## `CoachAthleteDetail` — primary drilldown

| Intelligence | Visible? | Component | File:line |
|---|---|---|---|
| UHRC report card (composite + pillars) | ✅ | `UhrcReportCard` | `src/pages/CoachAthleteDetail.tsx:163-180` |
| PIE V2 signal aggregates | ✅ | `PieV2CoachPanel` | `:182` |
| PIE V2 per-signal trend | ✅ | `PieV2CoachPanel` (trajectory column) | derived via `trajectoriesAll` |
| RR-6 arm-health caution | ✅ | `PieV2CoachPanel` advisory block | `src/components/coach/PieV2CoachPanel.tsx:58-68` |
| Drill recommendations | ✅ | `PieV2CoachPanel` "Recommended drills" | `:84-99` |
| AI Hammer brief (UHRC envelope + per-leak) | ✅ | `PieV2HammerBriefPanel` | `:183` |
| Hitting doctrine (P1-P4 causal chain + roadmap) | ✅ | `HittingDoctrineBlock` | `:172-176` |
| Recruiting snapshot (RR-9 opt-in) | ✅ | `PieV2RecruitingCard` | `:190-200` |
| Readiness / fatigue / workload projection | ✅ | inline cards over `snapshotAthlete` | `:142-161` |
| Replay drill-down handle | ✅ | `ReplayDrilldownCTA` | `:155` |

## `CoachConsole` — roster view

| Intelligence | Visible? | Component |
|---|---|---|
| Roster readiness distribution | ✅ | `ReadinessDistributionStrip` |
| Escalation queue | ✅ | `EscalationQueue` |
| Missing-signal queue | ✅ | `MissingSignalQueue` |
| Workload continuity | ✅ | `WorkloadContinuityPanel` |
| Override visibility | ✅ | `OverrideVisibilityQueue` |
| Recent behavioral feed | ✅ | `RecentBehavioralFeed` |

## Hidden / debug-only paths

| Output | Status | Resolution |
|---|---|---|
| `hammer_state_snapshots` raw rows | accessible only via `/asb/replay/:eventId` debug route | P1 follow-up: surface the latest hammer state delta inside `PieV2CoachPanel` |
| Foundation replay outcomes | ops-only via `/ops/replay` | Acceptable — ops surface |

## Verdict

**All launch-critical coach intelligence is visible** on production coach
surfaces (`CoachConsole`, `CoachAthleteDetail`). No launch blockers. One P1
polish item recorded above.
