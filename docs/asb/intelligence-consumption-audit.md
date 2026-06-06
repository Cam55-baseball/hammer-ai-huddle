# Intelligence Consumption Audit

**Sprint:** Intelligence Consumption Sprint  
**Generated:** 2026-06-06  
**Engine pins:** `uhrc-1.0.0`, `pie-v2.0.0`, `hie-1.0.0`  
**Scope:** baseball pitching + hitting (softball deferred per launch gate)

---

## Section 1 — Producer / Consumer Matrix

Every intelligence-producing system in the platform, with consumer evidence.
ORPHAN status means an output is computed but never reaches an athlete- or
coach-visible surface. ORPHAN entries block launch.

| System | Engine Version | Inputs | Outputs | Consumed By | Orphan? |
|---|---|---|---|---|---|
| **PIE V2 — session aggregate** | `pie-v2.0.0` | rep capture (`PitchingV2MicroInput`, `PieV2FrameTagger`) → `aggregateSession` | `PieV2SessionAggregate` event `pitching.v2.session_aggregate` | `usePitchingV2Trends` → `PieV2CoachPanel` (coach), `UhrcAthleteSection` (athlete), `PieV2HammerBriefPanel`, `PieV2RecruitingCard`, `buildUhrcReport` | ✅ no |
| **PIE V2 — arm-health caution** | `pie-v2.0.0` | aggregate + recent windows + RR-6 pain flag | `pitching.v2.arm_health_caution`, projection `athlete_foundation_state.pie_v2_caution_state` | `PieV2CoachPanel` (RR-6 advisory block), athlete foundation overlays | ✅ no |
| **PIE V2 — talking points** | `pie-v2.0.0` | per-signal tier | `PieV2TalkingPoint[]` | `PieV2HammerBriefPanel` (per-leak section) + UHRC `generateHammerBrief` envelope | ✅ no |
| **PIE V2 — drill recommender** | `pie-v2.0.0` | aggregate + caution | `PieV2DrillRecommendation[]` | `PieV2CoachPanel` "Recommended drills" + `generateHammerBrief.drill` | ✅ no |
| **PIE V2 — video recommender** | `pie-v2.0.0` | aggregate | `PieV2VideoRecommendation[]` | `generateHammerBrief.video`, AnalyzeVideo suggestions | ✅ no |
| **PIE V2 — longitudinal** | `pie-v2.0.0` | aggregate window | `PieV2Trajectory[]` | `PieV2CoachPanel`, `PieV2RecruitingCard`, UHRC trend envelope | ✅ no |
| **PIE V2 — athlete-state delta** | `pie-v2.0.0` | aggregate | `PieV2AthleteStateDelta` (additive priors) | `athlete_foundation_state` projection | ✅ no |
| **HIE — snapshot** | `hie-1.0.0` | weakness scores, prescriptive actions, MPI | `hie_snapshots` row (clusters, prescriptions, risk alerts) | `useHIESnapshot` → `WeaknessClusterCard`, `PrescriptiveActionsCard`, `ReadinessCard`, UHRC | ✅ no |
| **HIE — hitting doctrine** | `hie-1.0.0` | weakness clusters → `deriveHittingDoctrine` | `hie_snapshots.hitting_doctrine` JSON (violated phases, priority, causal chains, roadmap) | `HittingDoctrineBlock` (athlete + coach), UHRC `mechanics` + `stuff` pillars | ✅ no |
| **HIE — decision speed / movement efficiency** | `hie-1.0.0` | derived from cluster + foundation | `hie_snapshots.decision_speed_index`, `movement_efficiency_score` | UHRC `decision_quality` pillar | ✅ no |
| **Foundation engine — fatigue decisions** | foundation-engine | load events + onboarding | `foundation_fatigue_decisions` | `LoadDashboard`, athlete foundation overlays | ✅ no |
| **Foundation engine — onboarding decisions** | foundation-engine | first-event lineage | `foundation_onboarding_decisions` | `useAthleteOnboardingState` → `AthleteCommand` route guard | ✅ no |
| **Athlete state** | n/a | upstream events | `athlete_foundation_state` projection (caution + freshness) | `PieV2CoachPanel`, AthleteCommand overlay | ✅ no |
| **Injury detection (RR-6)** | `pie-v2.0.0` | aggregate + recent + pain flag | `PieV2InjuryCaution` | `PieV2CoachPanel` advisory, athlete foundation state | ✅ no |
| **Safeguarding** | sg-1.0.0 | safeguarding events | `safeguarding_notifications` | `SafetyCenter`, parent invite flow | ✅ no |
| **MPI scores / prompts** | mpi-1.0.0 | training data | `mpi_scores`, `development_prompts` | `useAIPrompts`, `MPIScoresCard` | ✅ no |
| **Hammer state snapshots** | hammer-1.0.0 | session feedback | `hammer_state_snapshots` | Coach drilldown surfaces | ⚠️ partial (debug-leaning) |
| **Recruiting (RR-9)** | recruiting-1.0.0 | aggregate + trajectories + opt-in | `PieV2RecruitingCard` | CoachAthleteDetail (RR-9 gated toggle) | ✅ no |
| **UHRC report (new)** | `uhrc-1.0.0` | PIE V2 + HIE + athlete state | `UhrcReport` | `UhrcAthleteSection` (athlete), `UhrcReportCard` (coach), `PieV2HammerBriefPanel` (AI Hammer envelope) | ✅ no |
| **AI Hammer brief (new)** | `uhrc-1.0.0` | UHRC + recommendations + trends | `HammerBrief` with full evidence chain | `PieV2HammerBriefPanel` canonical envelope | ✅ no |

**Verdict:** 0 ORPHANS for baseball. 1 PARTIAL (`hammer_state_snapshots`) — surface is reached but only on coach drilldown; not a launch blocker, escalated as P1 follow-up.

---

## Section 8 — Forensic Consumption Test

### Pitcher Journey

| Step | Producer | Consumer | Evidence (file:line) | Lineage | Verdict |
|---|---|---|---|---|---|
| 1. Capture | `PitchingV2MicroInput` (PracticeHub) | `usePerformanceSession.finalizePieV2Session` | `src/pages/PracticeHub.tsx`, `src/hooks/usePerformanceSession.ts` | rep → `asb_events:pitching.v2.session_aggregate` | PASS |
| 2. Analysis | `aggregateSession` → `emitPieV2SessionAggregate` | `usePitchingV2Trends` (30d window) | `src/lib/pieV2/finalizeSession.ts:54-58` | engine `pie-v2.0.0` | PASS |
| 3. UHRC | `buildUhrcReport` | `UhrcAthleteSection` on `/athlete/command` & `/dashboard` | `src/components/report-card/UhrcAthleteSection.tsx` | engine `uhrc-1.0.0` | PASS |
| 4. AI Hammer | `generateHammerBrief` | `PieV2HammerBriefPanel` (canonical envelope block) | `src/components/coach/PieV2HammerBriefPanel.tsx:39-66` | every field carries `source_signal_id` + `source_event_id` | PASS |
| 5. Recommendation | `recommendDrills`, `recommendVideos` | UHRC `drill` / `video` slots + `PieV2CoachPanel` | `src/lib/pieV2/recommendDrills.ts`, `recommendVideos.ts` | tier-aware ranking | PASS |
| 6. Coach | `UhrcReportCard` + `PieV2CoachPanel` + `PieV2HammerBriefPanel` on `/coach/athlete/:athleteId` | `CoachAthleteDetail` | `src/pages/CoachAthleteDetail.tsx:163-181` | replay handle one click away | PASS |
| 7. Recruiting | `PieV2RecruitingCard` (RR-9 opt-in) | `CoachAthleteDetail` toggle | `src/pages/CoachAthleteDetail.tsx:190-200` | opt-in gated | PASS |
| 8. Athlete state | `persistPieV2Session` → `athlete_foundation_state` | foundation overlays | `src/lib/pieV2/persistSession.ts` | RR-6 caution projected | PASS |

### Hitter Journey

| Step | Producer | Consumer | Evidence | Lineage | Verdict |
|---|---|---|---|---|---|
| 1. Capture | swing capture → `hie-analyze` | `hie_snapshots` row | `supabase/functions/hie-analyze/index.ts` | engine `hie-1.0.0` | PASS |
| 2. Analysis | `deriveHittingDoctrine` | `hie_snapshots.hitting_doctrine` | `supabase/functions/_shared/deriveHittingDoctrine.ts` | P1-P4 attribution | PASS |
| 3. UHRC | `buildUhrcReport({ disciplines:["hitting"] })` | `UhrcAthleteSection` | `src/lib/uhrc/buildReport.ts:99-126` | uses `hitting_doctrine` JSON | PASS |
| 4. AI Hammer | `generateHammerBrief` over HIE-derived UHRC | (panel currently pitching-scoped) | `src/lib/uhrc/generateHammerBrief.ts` | hitter brief generated by UHRC envelope; standalone hitter panel = P1 polish | PASS (engine), P1 UI surface |
| 5. Recommendation | `prescriptive_actions` in `hie_snapshots` | `PrescriptiveActionsCard` + `HittingDoctrineBlock` (roadmap) | `src/components/hie/WeaknessClusterCard.tsx`, `src/components/hitting/HittingDoctrineBlock.tsx` | per-cluster drills | PASS |
| 6. Coach | `HittingDoctrineBlock` + `UhrcReportCard` on coach drilldown | `CoachAthleteDetail` | `src/pages/CoachAthleteDetail.tsx:172-181` | shared JSON | PASS |
| 7. Recruiting | pitching-only today; hitter recruiting surface = P1 | n/a | — | hitting recruiting card not yet shipped | P1 |
| 8. Athlete state | `hie_dirty_users` recompute triggers, MPI prompts | `useAIPrompts` | `src/hooks/useAIPrompts.ts` | dev prompts | PASS |

**Hitter verdict:** PASS at engine + athlete + coach surfaces. Recruiting hitter card and a hitter-scoped Hammer brief panel remain as P1 polish (non-blocking for baseball soft-launch since hitting intelligence is consumed via UHRC + HittingDoctrineBlock).
