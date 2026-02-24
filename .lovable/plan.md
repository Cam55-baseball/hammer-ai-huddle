

# What's Done vs. What's Remaining

## COMPLETED (Phases 1-3 Partial)

### Database (Phase 1) -- DONE
- All 7 migrations executed (15+ tables created with RLS, triggers, realtime)
- `performance_sessions`, `mpi_scores`, `governance_flags`, `athlete_mpi_settings`, `coach_grade_overrides`, `scout_evaluations`, `lesson_trainers`, `roadmap_milestones`, `athlete_roadmap_progress`, `verified_stat_profiles`, `athlete_professional_status`, `heat_map_snapshots`, `organizations`, `organization_members`
- Validation triggers (24hr delete, 48hr edit, lock, retroactive limit, game opponent)
- Profile table updated with handedness columns

### Sport-Specific Data Files (Phase 2) -- DONE
- All 16 baseball/softball files (pitchTypes, outcomeTags, drillDefinitions, positionWeights, pitchTypeWeights, ageCurves, tierMultipliers, probabilityBaselines, pitcherStyles)
- All 13 shared data files (sportTerminology, heatMapConfig, gameWeighting, dataDensityLevels, segmentPoolRules, fatigueThresholds, aiPromptRules, contractStatusRules, verifiedStatBoosts, hofRequirements, splitDefinitions, integrityRules)

### Edge Functions (Phase 3) -- DONE
- `calculate-session` created and deployed
- `nightly-mpi-process` created and deployed

### Hooks (Phase 4) -- 3 of 19 DONE
- `useSportTerminology` -- done
- `usePerformanceSession` -- done
- `useMPIScores` -- done

### Pages (Phase 6) -- Skeleton Only
- `PracticeHub.tsx` -- exists but is a skeleton (shows 6 tabs with session type buttons, but no actual session entry flow)
- `ProgressDashboard.tsx` -- exists but is a skeleton (shows MPI/rank/probability cards, placeholder roadmap)
- Routes wired in App.tsx

---

## REMAINING -- Everything Below Needs to Be Built

### Phase 4: 16 Remaining Hooks
1. `useGovernanceFlags` -- Fetch/manage governance flags
2. `useHeatMaps` -- Fetch pre-computed heat map snapshots
3. `useSplitAnalytics` -- Split-specific composite indexes and heat maps
4. `useSwitchHitterProfile` -- Dual batting side profiles + combined view
5. `useRoadmapProgress` -- Milestones + user progress
6. `useVerifiedStats` -- Verified stat profile CRUD + sync
7. `useProfessionalStatus` -- Contract status + MLB/AUSL season tracking
8. `useHoFEligibility` -- HoF activation check + countdown
9. `useSportConfig` -- Load sport-specific configs based on user sport
10. `useMicroLayerInput` -- Per-rep granular data entry state (Level 3-4)
11. `useDataDensityLevel` -- Data density level from subscription tier
12. `useDeltaAnalytics` -- Self vs coach delta trend tracking
13. `useAIPrompts` -- AI development prompts from mpi_scores
14. `useOrganization` -- Organization CRUD + member management
15. `useFatigueState` -- Latest focus quiz data for fatigue proxy
16. `useGradeHierarchy` -- Effective grade from Admin > Coach > Scout > Player

### Phase 5: ~45 Components (NONE Built Yet)

**Session Entry (9 components)**
- `SessionTypeSelector` -- 8 session type cards
- `DrillBlockBuilder` -- Modular drill block entry (type + intent + volume + execution + outcomes)
- `IntentSelector` -- Mandatory intent tag selector per drill block
- `ExecutionSlider` -- 1-5 slider mapped to 20-80 backend
- `OutcomeTagBubbles` -- Sport-specific tap bubbles
- `VoiceNoteInput` -- Voice-to-text for session notes
- `GameSessionFields` -- Opponent name + level (required for game/scrimmage)
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

### Phase 6: Page Updates (5 Modifications + 1 New Page)

1. **`Rankings.tsx`** -- Complete rebuild from video-based to MPI-based global ranking (exact rank, percentile, #X of Y, sport pools, Top 100 leaderboard, segment filters)
2. **`Profile.tsx`** -- Add expandable sections: Professional Status, Verified Stats, Sport Badge, Split stat lines, Organization membership
3. **`AdminDashboard.tsx`** -- Add Governance tabs (flag management, arbitration, delta trends, inflation heat maps), Verified Stats management, Organization verification, Coefficient editor, Emergency freeze, Audit export, Ranking exclusion
4. **`Dashboard.tsx`** -- Add Practice Intelligence quick-access card, MPI score summary, streak display, AI development prompt
5. **`AppSidebar.tsx`** -- Add "Practice Intelligence" section with Practice + Progress links; Organization link for org owners
6. **`OrganizationDashboard.tsx`** (new page at `/organization`) -- Org owner team view

### Phase 7: i18n Updates (8 Locale Files)
- Add `sportTerms` namespace to all 8 locales (en, es, fr, de, ja, zh, nl, ko) with baseball + softball terms for: pitchTypes, sessionTypes, metrics, drillNames, outcomeHitting, outcomePitching, split labels, heat map labels, roadmap milestones, AI prompt templates

### Nightly Cron Job Setup
- The `nightly-mpi-process` edge function exists but the `pg_cron` schedule to call it at 05:00 UTC daily has NOT been set up in a migration yet

---

## Summary Scorecard

| Category | Planned | Done | Remaining |
|----------|---------|------|-----------|
| Database migrations | 7 | 7 | 0 |
| Sport data files | 29 | 29 | 0 |
| Edge functions | 2 | 2 | 0 |
| Hooks | 19 | 3 | 16 |
| Components | ~45 | 0 | ~45 |
| New pages | 3 | 2 (skeleton) | 1 new + 2 flesh out |
| Modified pages | 5 | 0 | 5 |
| i18n locale updates | 8 | 0 | 8 |
| Cron job | 1 | 0 | 1 |
| **Total files remaining** | | | **~78** |

### Recommended Build Order

1. **Sidebar + Navigation** -- Wire Practice Intelligence links into AppSidebar so pages are accessible
2. **16 Hooks** -- All hooks in parallel (no UI dependencies)
3. **Session Entry Components** -- SessionTypeSelector, DrillBlockBuilder, IntentSelector, ExecutionSlider, OutcomeTagBubbles (the core session logging flow)
4. **Split Components** -- SplitToggle, BattingSideSelector, ThrowingHandSelector, GameAtBatLogger
5. **Flesh out PracticeHub** -- Connect session entry components to create the full logging flow
6. **Analytics Components** -- MPIScoreCard, ProProbabilityCard, RankMovementBadge, SplitAnalyticsView, SplitStatLine
7. **Heat Map Components** -- HeatMapGrid, HeatMapFilterBar, HeatMapDashboard
8. **Flesh out ProgressDashboard** -- Wire analytics and heat map components
9. **Rankings Rebuild** -- Replace video-based rankings with MPI-based leaderboard
10. **Micro Layer Components** -- Level 3-4 inputs (PitchLocationGrid, ContactQualitySelector, etc.)
11. **Authority Components** -- CoachOverridePanel, ScoutEvaluationForm, GovernanceFlagCard, ArbitrationPanel
12. **Organization Components** -- OrganizationDashboard page + member management
13. **Professional Status Components** -- VerifiedStatSubmission, ContractStatusCard, HoFCountdown
14. **Page Modifications** -- Dashboard, Profile, AdminDashboard updates
15. **i18n** -- sportTerms namespace across all 8 locales
16. **Cron Job** -- pg_cron migration for nightly-mpi-process

