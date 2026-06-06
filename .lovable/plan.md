# Intelligence Consumption Sprint — Plan

Goal: prove every existing intelligence output is consumed end-to-end. Build the Universal Hammers Report Card (UHRC) as the single analysis surface, standardize AI Hammer as a deterministic translator, and produce nine audit artifacts that gate baseball public launch.

No new doctrine. No new scoring. No new intelligence engines. Translation, consumption, and proof only.

---

## Section 1 — Intelligence Consumption Audit
**Deliverable:** `docs/asb/intelligence-consumption-audit.md`

Inventory every producer with `| System | Engine Version | Inputs | Outputs | Consumed By | Orphan? |`:
- PIE V2 (pitching aggregates, arm-health caution, talking points)
- HIE (weakness clusters, hitting doctrine, roadmap, causal chains)
- Foundation Engine (fatigue, onboarding decisions, replay outcomes)
- Athlete State (`athlete_foundation_state`, `pie_v2_caution_state`)
- Longitudinal (`trajectoriesAll`, trend windows)
- Injury Detection (`deriveInjuryCaution`, RR-6)
- Safeguarding (RR-9 visibility, parent supremacy)
- Drill Recommendations (`recommendDrills`, drill_prescriptions)
- Video Recommendations (`VideoSuggestionsPanel`, pieV2VideoCatalog)
- Coach Intelligence (`PieV2CoachPanel`, roster projection)
- Recruiting Intelligence (recruiter visibility surface)
- AI Hammer Inputs (`talkingPointsForSession`, MPI prompts)
- MPI Scores / Hammer State Snapshots
- Any additional engines discovered during audit

For each output the audit must name a concrete consumer file:line, or flag ORPHAN.

---

## Section 2 — Universal Hammers Report Card (UHRC)
**New code:** `src/lib/uhrc/`, `src/components/report-card/`

- `src/lib/uhrc/types.ts` — `UhrcReport`, `UhrcPillar`, `UhrcSignalContribution`, `UhrcEvidence`.
- `src/lib/uhrc/buildReport.ts` — pure builder consuming HIE snapshot + latest PIE V2 aggregate + foundation state + longitudinal trends → `UhrcReport`. Replay-safe, engine-version pinned, confidence/missingness preserved (no fabrication).
- `src/lib/uhrc/pillars.ts` — canonical pillar list and signal→pillar map (single source).
- `src/components/report-card/UhrcReportCard.tsx` — primary view (pillars + composite + biggest leak/win).
- `src/components/report-card/UhrcDetailedAnalysis.tsx` — secondary view; existing `WeaknessClusterCard`, `HittingDoctrineBlock`, `PieV2CoachPanel` become drill-down children.
- Mount UHRC as default on `AthleteCommand`, `ProgressDashboard`, `CoachAthleteDetail`. Existing analysis cards demoted behind "Detailed analysis" disclosure — not deleted, just no longer the default.

Constraints: UHRC reads only existing intelligence; never re-scores. Every pillar value traces to a source event with lineage handle exposed one click away.

---

## Section 3 — Pillar Reduction Audit
**Deliverable:** `docs/asb/uhrc-pillar-mapping-audit.md`

For every PIE V2 signal, HIE signal, athlete-state output: `Signal → Pillar → Weight → Explanation`. Audit fails if `signals_produced ≠ signals_consumed` or any signal lands in two pillars. Includes diff against `pillars.ts` so drift is visible.

---

## Section 4 — AI Hammer Standardization
**New:** `src/lib/uhrc/generateHammerBrief.ts`

Deterministic translator. Input: `{ uhrc, recommendations, trends, athleteState }`. Output:
```
{ biggest_win, biggest_leak, priority_fix, why_it_matters, drill, video, trend, evidence[] }
```
Every field carries `source_event_id` / `source_signal_id`. Updates `PieV2HammerBriefPanel` to consume `generateHammerBrief` exclusively. No independent scoring/ranking/selection — pure projection over UHRC + recommendation engine outputs. RR-5 envelope preserved.

---

## Section 5 — Recommendation Resolution Audit
**Deliverable:** `docs/asb/recommendation-resolution-audit.md`

Script `scripts/audit-recommendation-resolution.ts` walks every PIE V2 signal and every HIE phase, verifying:
- ≥1 assignable drill (drill_definitions / pieV2DrillCatalog)
- ≥1 playable video (library_videos / pieV2VideoCatalog)
- ≥1 coach action
- ≥1 athlete action

Per-signal verdict GREEN/YELLOW/RED. Dead URLs, missing drills, orphan catalog entries surface as RED with file:line.

---

## Section 6 — Coach Intelligence Consumption
**Deliverable:** `docs/asb/coach-intelligence-audit.md`

Audit `CoachAthleteDetail`, `CoachConsole`, coach dashboard. Confirm every recommendation, caution, trend, pillar, drill, video reaches a non-debug coach surface. Any gap → mount fix in the smallest surface change (no new coach surfaces).

---

## Section 7 — Recruiting Intelligence Consumption
**Deliverable:** `docs/asb/recruiting-intelligence-audit.md`

Verify pitcher recruiting surfaces only render pitching intelligence; hitter surfaces only hitting. Confirm RR-9 visibility gating and RR-10 minor protection. Cross-sport leakage = blocker.

---

## Section 8 — Forensic Consumption Test
Two journey transcripts appended to `docs/asb/intelligence-consumption-audit.md` (Pitcher + Hitter): Capture → Analysis → UHRC → AI Hammer → Recommendation → Coach → Recruiting → Athlete State. PASS/FAIL + file:line + event lineage per step. Evidence only.

---

## Section 9 — Launch Blocker Report
**Deliverable:** `docs/asb/pre-publication-audit.md`
- P0 / P1 blockers
- Baseball launch readiness %
- Softball launch readiness %
- Baseball public-launch verdict
- Softball public-launch verdict
- Exact remaining work before public release

---

## Files

**New:** `docs/asb/intelligence-consumption-audit.md`, `docs/asb/uhrc-pillar-mapping-audit.md`, `docs/asb/recommendation-resolution-audit.md`, `docs/asb/coach-intelligence-audit.md`, `docs/asb/recruiting-intelligence-audit.md`, `docs/asb/pre-publication-audit.md`, `src/lib/uhrc/{types,pillars,buildReport}.ts`, `src/lib/uhrc/generateHammerBrief.ts`, `src/components/report-card/{UhrcReportCard,UhrcDetailedAnalysis}.tsx`, `scripts/audit-recommendation-resolution.ts`, `src/lib/uhrc/__tests__/{buildReport,generateHammerBrief}.test.ts`.

**Edited (mount only, no logic changes):** `src/pages/AthleteCommand.tsx`, `src/pages/ProgressDashboard.tsx`, `src/pages/CoachAthleteDetail.tsx`, `src/components/coach/PieV2HammerBriefPanel.tsx`.

## Out of scope
New scoring engines, new doctrine, new recommendations, new athlete-state systems, softball parity work, onboarding redesign, database schema changes (UHRC is pure projection over existing snapshots/events).

## Exit criteria
UHRC default on athlete + coach surfaces. AI Hammer consumes canonical intelligence only. All six audit docs committed. Recommendation resolution GREEN for every shipped signal. Zero orphan intelligence outputs. Pitcher + hitter forensic journeys PASS end-to-end.
