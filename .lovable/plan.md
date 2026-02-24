

# What's Done vs. What's Remaining

## COMPLETED

### Database (Phase 1) -- DONE
- All 7 migrations executed (15+ tables created with RLS, triggers, realtime)

### Sport-Specific Data Files (Phase 2) -- DONE
- All 16 baseball/softball files + All 13 shared data files

### Edge Functions (Phase 3) -- DONE
- `calculate-session` + `nightly-mpi-process` created and deployed

### Hooks (Phase 4) -- 19 of 19 DONE
- `useSportTerminology`, `usePerformanceSession`, `useMPIScores`
- `useGovernanceFlags`, `useHeatMaps`, `useSplitAnalytics`, `useSwitchHitterProfile`
- `useRoadmapProgress`, `useVerifiedStats`, `useProfessionalStatus`, `useHoFEligibility`
- `useSportConfig`, `useMicroLayerInput`, `useDataDensityLevel`, `useDeltaAnalytics`
- `useAIPrompts`, `useOrganization`, `useFatigueState`, `useGradeHierarchy`

### Session Entry Components (Phase 5 Partial) -- 7 DONE
- `SessionTypeSelector`, `DrillBlockBuilder`, `IntentSelector`, `ExecutionSlider`
- `OutcomeTagBubbles`, `GameSessionFields`, `VoiceNoteInput`

### Pages (Phase 6 Partial)
- `PracticeHub.tsx` -- FULLY WIRED (6 tabs, session type selection, drill block builder, game fields, voice notes, save flow)
- `ProgressDashboard.tsx` -- skeleton (MPI/rank/probability cards, placeholder roadmap)
- `AppSidebar.tsx` -- UPDATED with Practice Intelligence section (Practice Hub, Progress Dashboard, Organization links)
- Routes wired in App.tsx

---

## REMAINING

### Phase 5: ~38 Components Still Needed

**Session Entry (1 remaining)**
- `QuickAddSession` -- 3-tap quick entry

**Micro Layer (10 components, Level 3-4)**
- `MicroLayerInput`, `DataDensityGate`, `PitchLocationGrid`, `SwingDecisionTag`, `ContactQualitySelector`, `ExitDirectionSelector`, `SituationTagSelector`, `CountSelector`, `FieldingMicroInput`, `PitchingMicroInput`

**Split Components (8 components)**
- `SplitToggle`, `BattingSideSelector`, `ThrowingHandSelector`, `SoftballPitcherStyleTag`, `SplitAnalyticsView`, `SplitComparisonCard`, `SplitStatLine`, `GameAtBatLogger`

**Heat Map Components (3 components)**
- `HeatMapGrid`, `HeatMapFilterBar`, `HeatMapDashboard`

**Analytics & Display (11 components)**
- `MPIScoreCard`, `ProProbabilityCard`, `ProProbabilityCap`, `HoFCountdown`, `MLBSeasonCounter`, `RankMovementBadge`, `DataBuildingGate`, `DeltaTrendChart`, `AIPromptCard`, `RoadmapBlockedBadge`, `IntegrityScoreBar`

**Professional Status (4 components)**
- `VerifiedStatSubmission`, `VerifiedStatBadge`, `ContractStatusCard`, `SportBadge`

**Organization (5 components)**
- `OrganizationDashboard`, `OrganizationRegistration`, `OrganizationMemberList`, `TeamComplianceCard`, `TeamHeatMapOverlay`

**Authority (4 components)**
- `CoachOverridePanel`, `ScoutEvaluationForm`, `GovernanceFlagCard`, `ArbitrationPanel`

### Phase 6: Page Updates (4 Modifications + 1 New Page)

1. **`Rankings.tsx`** -- Complete rebuild to MPI-based global ranking
2. **`Profile.tsx`** -- Add Professional Status, Verified Stats, Sport Badge, Split stat lines, Organization
3. **`AdminDashboard.tsx`** -- Add Governance tabs, Verified Stats management, Organization verification
4. **`Dashboard.tsx`** -- Add Practice Intelligence quick-access card, MPI score summary, streak, AI prompt
5. **`ProgressDashboard.tsx`** -- Flesh out with analytics and heat map components
6. **`OrganizationDashboard.tsx`** (new page at `/organization`) -- Org owner team view

### Phase 7: i18n Updates (8 Locale Files)
- Add `sportTerms` namespace to all 8 locales

### Nightly Cron Job Setup
- pg_cron schedule for nightly-mpi-process at 05:00 UTC

---

## Summary Scorecard

| Category | Planned | Done | Remaining |
|----------|---------|------|-----------|
| Database migrations | 7 | 7 | 0 |
| Sport data files | 29 | 29 | 0 |
| Edge functions | 2 | 2 | 0 |
| Hooks | 19 | 19 | 0 |
| Components | ~45 | 7 | ~38 |
| Pages | 3 new + 5 mod | 1 full + 1 skeleton + 1 sidebar | ~6 |
| i18n locale updates | 8 | 0 | 8 |
| Cron job | 1 | 0 | 1 |

### Recommended Next Steps

1. **Analytics Components** -- MPIScoreCard, ProProbabilityCard, RankMovementBadge, SplitAnalyticsView, SplitStatLine
2. **Heat Map Components** -- HeatMapGrid, HeatMapFilterBar, HeatMapDashboard
3. **Flesh out ProgressDashboard** -- Wire analytics and heat map components
4. **Split Components** -- SplitToggle, BattingSideSelector, ThrowingHandSelector, GameAtBatLogger
5. **Rankings Rebuild** -- Replace video-based rankings with MPI-based leaderboard
6. **Micro Layer Components** -- Level 3-4 inputs
7. **Authority + Organization Components**
8. **Professional Status Components**
9. **Page Modifications** -- Dashboard, Profile, AdminDashboard
10. **i18n** -- sportTerms namespace across all 8 locales
11. **Cron Job** -- pg_cron for nightly-mpi-process
