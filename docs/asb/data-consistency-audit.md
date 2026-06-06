# Data Consistency Audit — Hostile Verification

**Sprint:** Hostile Baseball Launch Verification
**Generated:** 2026-06-06
**Engines pinned:** `uhrc-1.0.0`, `pie-v2.0.0`, `hie-1.0.0`
**Method:** trace every displayed value through component → hook → projection → canonical store (`asb_events`, `hie_snapshots`, `performance_sessions`). Flag any value that diverges across surfaces, bypasses `buildUhrcReport` / `generateHammerBrief`, or recomputes scoring locally.

---

## 1. Canonical source map

| Surface | Component | File:line | UHRC builder | Hammer translator | Direct table read |
|---|---|---|---|---|---|
| Athlete dashboard | `UhrcAthleteSection` | `src/components/report-card/UhrcAthleteSection.tsx:27` | ✅ `buildUhrcReport` | — | `useHIESnapshot`, `usePitchingV2Trends` |
| Athlete progress | `UhrcAthleteSection` (re-mount) | `src/pages/ProgressDashboard.tsx:107` | ✅ same instance, same inputs | — | identical |
| Coach drilldown — UHRC | `UhrcReportCard` | `src/pages/CoachAthleteDetail.tsx:166` | ✅ `buildUhrcReport` | — | `pieV2Latest`, `hittingDoctrineSnap` |
| Coach drilldown — Hammer | `PieV2HammerBriefPanel` | `src/components/coach/PieV2HammerBriefPanel.tsx:27,39` | ✅ `buildUhrcReport` (internal) | ✅ `generateHammerBrief` | — |
| Coach drilldown — forensic | `PieV2CoachPanel` | `src/pages/CoachAthleteDetail.tsx:182` | n/a — debug surface | — | reads aggregate only |
| Recruiting snapshot | `PieV2RecruitingCard` | `src/pages/CoachAthleteDetail.tsx:211` | n/a — aggregate display only | — | `pieV2Latest` + trajectories |
| Hitting doctrine (athlete) | `HittingDoctrineBlock` | `src/components/hie/WeaknessClusterCard.tsx` | n/a — pure render | — | `hie_snapshots.hitting_doctrine` |
| Hitting doctrine (coach) | `HittingDoctrineBlock` | `src/pages/CoachAthleteDetail.tsx:191` | n/a — pure render | — | identical hook |

## 2. Per-value consistency table

| Value | UHRC (athlete) | UHRC (coach) | Hammer brief | Coach forensic | Recruiting | Canonical source | Match? | Evidence |
|---|---|---|---|---|---|---|---|---|
| Composite score | `report.composite` | `report.composite` | implicit via worst/best contribution | n/a | n/a | `buildUhrcReport` weighted mean | ✅ | identical inputs in `UhrcAthleteSection.tsx:27` + `CoachAthleteDetail.tsx:167` |
| Pillar scores (6) | `report.pillars[].score` | same | same instance walks pillars | n/a | n/a | `buildUhrcReport.pillars` | ✅ | one builder, no parallel reducer |
| Per-signal value | `contribution.value` | same | `worst.value` / `best.value` | aggregate tier | aggregate tier | `pieV2Latest.signals[].average` | ✅ | all surfaces read `PieV2SessionAggregate` |
| Hitting phase scores | violated/priority → 25/40/85 projection | same | same UHRC walk | n/a | n/a | `hie_snapshots.hitting_doctrine.violated_phases / priority_phase` | ✅ | single projection in `buildReport.ts` |
| Decision speed index | `hie.decision_speed_index` raw | same | inherited from UHRC | n/a | n/a | `hie_snapshots.decision_speed_index` | ✅ | no recompute |
| Priority fix | `biggest_leak` evidence | same | `priority_fix.headline` (worst contribution) | n/a | n/a | UHRC contribution scan | ✅ | deterministic argmin over same set |
| Biggest win | `biggest_win` evidence | same | `biggest_win.headline` | n/a | n/a | UHRC contribution scan | ✅ | deterministic argmax over same set |
| Trend direction | n/a in card | n/a in card | `trend.direction` from `UhrcTrendEnvelope` | n/a | trajectory arrow | `usePitchingV2Trends` → trajectory | ⚠ partial | coach Hammer panel currently passes `trends: []` in current snapshot of `PieV2HammerBriefPanel`; trend direction degrades to `insufficient_data` — visible to coach but never inconsistent with another surface |
| Missingness | `report.missingness.missing_signal_ids` | same | inherited | n/a | `missing_count` per signal | UHRC + aggregate | ✅ | preserved end-to-end |
| Confidence | `pillar.confidence` (0..100) | same | inherited | n/a | `confidence.score` per signal | aggregate confidence | ✅ | no fabrication path |
| Hitting doctrine card | same `HittingDoctrineBlock` instance | same instance | n/a | n/a | n/a | `hie_snapshots.hitting_doctrine` | ✅ | one component, one snapshot |
| Engine version pin | `report.engine_version = uhrc-1.0.0` | same | `brief.engine_version` | aggregate engine version | aggregate engine version | constant + upstream pins | ✅ | replay-equivalent across surfaces |

## 3. Divergence findings

- **None** between athlete-UHRC / coach-UHRC / coach-Hammer for the same athlete + window. All three surfaces are mathematically forced into agreement because they share `buildUhrcReport` and read the same hooks.
- **Recruiting card** intentionally shows only the aggregate (per-signal tier + trajectory). It does NOT publish UHRC composite or pillar values — RR-9 envelope minimization. This is a correct *omission*, not a divergence.
- **Coach forensic panel** (`PieV2CoachPanel`) shows raw aggregate fields; values are direct passthrough from the same `pieV2Latest` object that feeds UHRC. No competing computation.

## 4. Trend envelope gap (observation, not divergence)

`PieV2HammerBriefPanel` currently constructs the Hammer brief with an empty `trends: []` envelope. The brief still resolves deterministically (`trend.direction = "insufficient_data"`) and is internally consistent with what the athlete sees, but **does not yet propagate the same trajectory arrows visible on `PieV2RecruitingCard`**. Cross-surface inconsistency is structurally impossible (no two surfaces disagree on the same value); the gap is that the coach Hammer panel under-reads available trend data.

Classification (Section 6 in `baseball-launch-verification.md`): **P2** — UX completeness, not a consistency failure.

## 5. Verdict

- **No conflicting scores.**
- **No conflicting trends across consumers.**
- **No conflicting recommendations.** Single recommendation envelope passed into `generateHammerBrief`.
- **No conflicting athlete state.** Single foundation/HIE snapshot per render.
- **Every displayed value traces to a single canonical source.**

Consistency verdict: **PASS**.
