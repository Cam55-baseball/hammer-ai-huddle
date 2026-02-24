

# Practice Intelligence Engine -- Full Implementation Plan

This is the complete, consolidated implementation plan covering every system discussed across all conversations. Nothing is omitted. The build proceeds as a single implementation with logical ordering (database tables first, then edge functions, then frontend).

---

## Phase 1: Database Foundation (15 Migrations)

All tables created in a single migration batch before any frontend code. Each table includes RLS policies.

### Migration 1: Core Tables

**`performance_sessions`** -- Central session table for ALL practice/game data.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | gen_random_uuid() | |
| user_id | uuid NOT NULL | | FK to profiles |
| sport | text NOT NULL | | baseball / softball |
| session_type | text NOT NULL | | personal_practice, team_practice, coach_lesson, game, post_game_analysis, bullpen, live_scrimmage, rehab_session |
| session_date | date NOT NULL | CURRENT_DATE | |
| calendar_event_id | uuid | NULL | Duplicate prevention via existing calendar system |
| season_context | text | 'in_season' | in_season, off_season, pre_season |
| drill_blocks | jsonb NOT NULL | '[]' | Array of drill block objects with per-rep micro data |
| composite_indexes | jsonb | '{}' | BQI, FQI, PEI, Decision, Competitive Execution + all split variants |
| player_grade | numeric | NULL | Player self-grade (20-80 scale) |
| coach_grade | numeric | NULL | Coach override grade |
| coach_id | uuid | NULL | Coach who overrode |
| effective_grade | numeric | NULL | Final grade used for calculations |
| intent_compliance_pct | numeric | NULL | % of reps with intent tags |
| is_locked | boolean | false | Set true by nightly cron (permanent) |
| deleted_at | timestamptz | NULL | Soft delete (24hr window only) |
| edited_at | timestamptz | NULL | Last edit (48hr window only) |
| is_retroactive | boolean | false | Logged after the fact (24hr limit) |
| voice_notes | text[] | '{}' | Transcribed voice notes |
| notes | text | NULL | |
| opponent_name | text | NULL | Required for game/scrimmage |
| opponent_level | text | NULL | rec, travel, hs, college, pro |
| micro_layer_data | jsonb | NULL | Per-rep granular data (Level 3-4) |
| data_density_level | integer | 1 | 1-4, auto from subscription |
| fatigue_state_at_session | jsonb | NULL | Sleep + stress snapshot |
| organization_id | uuid | NULL | If logged under org context |
| throwing_hand_used | text | NULL | For ambidextrous (session-level) |
| batting_side_used | text | NULL | For switch hitters (session-level) |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

RLS: User INSERT/SELECT/UPDATE own (within time windows). Coach SELECT for primary athletes. Admin SELECT all. Realtime enabled.

**`mpi_scores`** -- Nightly MPI calculation snapshots.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL | |
| sport | text NOT NULL | |
| calculation_date | date NOT NULL | |
| adjusted_global_score | numeric | Final normalized score |
| global_rank | integer | Exact rank (#X) |
| global_percentile | numeric | Percentile position |
| total_athletes_in_pool | integer | Y in "#X of Y" |
| pro_probability | numeric | 0-100, capped at 99 for non-MLB/AUSL |
| pro_probability_capped | boolean | True if capped |
| hof_probability | numeric | NULL until eligible |
| hof_tracking_active | boolean | false | |
| mlb_season_count | integer | 0 | |
| trend_direction | text | rising, stable, dropping |
| trend_delta_30d | numeric | 30-day rolling change |
| segment_pool | text | baseball_youth, baseball_hs, etc. |
| game_practice_ratio | numeric | |
| fatigue_correlation_flag | boolean | false |
| delta_maturity_index | numeric | Self vs coach delta trend |
| verified_stat_boost | numeric | 0 |
| contract_status_modifier | numeric | 0 |
| integrity_score | numeric | 100 |
| composite_bqi | numeric | |
| composite_fqi | numeric | |
| composite_pei | numeric | |
| composite_decision | numeric | |
| composite_competitive | numeric | |
| development_prompts | jsonb | AI suggestions array |
| created_at | timestamptz | now() |

RLS: User SELECT own. Admin SELECT all.

**`governance_flags`** -- Integrity alerts with realtime.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL | |
| flag_type | text NOT NULL | inflated_grading, suspicious_volume, rapid_improvement, integrity_below_50, integrity_below_70, self_coach_delta, retroactive_abuse, fatigue_inconsistency_hrv, game_inflation, arbitration_request, volume_spike, grade_consistency, manual_admin, grade_reversal |
| severity | text | info, warning, critical |
| source_session_id | uuid | NULL |
| details | jsonb | |
| status | text | pending, reviewed, resolved, dismissed |
| admin_notes | text | NULL |
| admin_action | text | NULL | accept, adjust, reject, freeze |
| video_evidence_url | text | NULL |
| tagged_rep_index | integer | NULL |
| resolved_by | uuid | NULL |
| resolved_at | timestamptz | NULL |
| created_at | timestamptz | now() |

RLS: Admin full CRUD. User SELECT own (limited fields). Realtime enabled.

### Migration 2: Settings and Authority Tables

**`athlete_mpi_settings`** -- Per-user MPI configuration.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid UNIQUE NOT NULL | |
| sport | text NOT NULL | Locked at account creation |
| primary_position | text | |
| secondary_position | text | NULL |
| primary_coach_id | uuid | NULL |
| secondary_coach_ids | uuid[] | '{}' |
| league_tier | text | rec, travel, hs_jv, hs_varsity, college_d3, college_d2, college_d1, indie_pro, milb, mlb, ausl |
| date_of_birth | date | NULL | For age curve |
| games_minimum_met | boolean | false | 60+ sessions |
| integrity_threshold_met | boolean | false | >= 80 |
| coach_validation_met | boolean | false | >= 40% |
| data_span_met | boolean | false | 14+ days |
| ranking_eligible | boolean | false | All gates passed |
| admin_progression_locked | boolean | false |
| admin_probability_frozen | boolean | false |
| admin_ranking_excluded | boolean | false |
| streak_current | integer | 0 |
| streak_best | integer | 0 |
| is_switch_hitter | boolean | false |
| is_ambidextrous_thrower | boolean | false |
| primary_batting_side | text | L / R / S |
| primary_throwing_hand | text | L / R |
| is_college_verified | boolean | false |
| is_pro_verified | boolean | false |
| verified_stat_profile_id | uuid | NULL |
| data_density_level | integer | 1 | Auto from subscription |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

**`lesson_trainers`** -- Verified trainer registry.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text NOT NULL | |
| facility | text | NULL |
| verified | boolean | false |
| verified_by | uuid | NULL |
| sport | text | |
| specializations | text[] | '{}' |
| created_at | timestamptz | now() |

**`coach_grade_overrides`** -- Immutable override log.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid NOT NULL | FK to performance_sessions |
| coach_id | uuid NOT NULL | |
| original_grade | numeric | |
| override_grade | numeric | |
| override_reason | text | |
| created_at | timestamptz | now() |

INSERT only, no UPDATE/DELETE. RLS: Coach INSERT for primary athletes. Admin SELECT all.

**`scout_evaluations`** -- Independent scout submissions (immutable).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| scout_id | uuid NOT NULL | |
| athlete_id | uuid NOT NULL | |
| sport | text NOT NULL | |
| evaluation_date | date NOT NULL | |
| tool_grades | jsonb NOT NULL | 20-80 grades per tool |
| overall_grade | numeric | |
| notes | text | |
| game_context | text | NULL |
| created_at | timestamptz | now() |

INSERT only. RLS: Scout INSERT own. Admin SELECT all. Athlete SELECT own evaluations (summary only).

### Migration 3: Roadmap and Progression Tables

**`roadmap_milestones`** -- Progression definitions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| sport | text NOT NULL | |
| module | text NOT NULL | hitting, pitching, fielding, etc. |
| milestone_name | text NOT NULL | |
| milestone_order | integer | |
| requirements | jsonb NOT NULL | Volume, quality, coach validation, integrity, heat map clearance thresholds |
| badge_name | text | |
| badge_icon | text | |
| created_at | timestamptz | now() |

Admin INSERT/UPDATE. All users SELECT.

**`athlete_roadmap_progress`** -- Per-user roadmap state.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL | |
| milestone_id | uuid NOT NULL FK | |
| status | text | not_started, in_progress, blocked, completed |
| blocked_reason | text | NULL | e.g., "Chase heat map above threshold" |
| progress_pct | numeric | 0 |
| completed_at | timestamptz | NULL |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: User SELECT/UPDATE own. Admin full CRUD.

### Migration 4: Professional and Verification Tables

**`verified_stat_profiles`** -- External stat links with admin verification.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL | |
| sport | text NOT NULL | |
| league | text NOT NULL | mlb, milb, ncaa_d1, ncaa_d2, ncaa_d3, naia, ausl, indie_pro, foreign_pro |
| team_name | text | |
| profile_url | text NOT NULL | Baseball Savant, Baseball Reference, NCAA, official sites |
| screenshot_path | text | NULL | Optional secondary validation |
| verified | boolean | false |
| verified_by | uuid | NULL |
| verified_at | timestamptz | NULL |
| identity_match | boolean | false |
| external_metrics | jsonb | NULL |
| last_synced_at | timestamptz | NULL |
| sync_frequency | text | 'manual' | manual, admin, weekly |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: User INSERT/SELECT own. Admin SELECT/UPDATE all.

**`athlete_professional_status`** -- Contract status and MLB season tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid UNIQUE NOT NULL | |
| sport | text NOT NULL | |
| contract_status | text | 'none' | active, injured_list, free_agent, released, retired, none |
| current_league | text | NULL |
| current_team | text | NULL |
| mlb_seasons_completed | integer | 0 |
| ausl_seasons_completed | integer | 0 |
| hof_eligible | boolean | false |
| hof_activated_at | timestamptz | NULL |
| release_count | integer | 0 |
| last_release_date | date | NULL |
| last_resign_date | date | NULL |
| roster_verified | boolean | false |
| roster_verified_by | uuid | NULL |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: User SELECT own. Admin full CRUD.

### Migration 5: Heat Maps, Organizations, Validation

**`heat_map_snapshots`** -- Pre-computed nightly heat map data.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL | |
| sport | text NOT NULL | |
| map_type | text NOT NULL | pitch_location, swing_chase, barrel_zone, fielding_range, throw_accuracy, pitch_command, miss_cluster, situational_performance |
| time_window | text NOT NULL | 7d, 30d, season, career |
| context_filter | text NOT NULL | all, practice_only, game_only |
| split_key | text NOT NULL | all, vs_lhp, vs_rhp, vs_lhb, vs_rhb, batting_left, batting_right, vs_riseball, vs_dropball, vs_speed, vs_spin |
| grid_data | jsonb NOT NULL | Aggregated frequency/intensity per grid cell |
| blind_zones | jsonb | '[]' | Zones with below-threshold activity |
| total_data_points | integer | 0 |
| computed_at | timestamptz | now() |

RLS: User SELECT own. Coach SELECT for primary players. Admin SELECT all.

**`organizations`** -- Team/org registration.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text NOT NULL | |
| sport | text NOT NULL | |
| org_type | text NOT NULL | travel_team, high_school, college, pro, independent |
| verified | boolean | false |
| verified_by | uuid | NULL |
| owner_user_id | uuid NOT NULL | |
| logo_url | text | NULL |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

**`organization_members`** -- Org-player/coach linkage.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid NOT NULL FK | |
| user_id | uuid NOT NULL | |
| role_in_org | text NOT NULL | player, coach, manager, admin |
| status | text | 'active' | active, inactive, removed |
| joined_at | timestamptz | now() |
| removed_at | timestamptz | NULL |

RLS: Org owner full CRUD. Members SELECT own org. App admin SELECT all.

### Migration 6: Validation Triggers

- **24-hour delete trigger**: `performance_sessions` rows can only be soft-deleted within 24 hours of creation
- **48-hour edit trigger**: `drill_blocks` and `composite_indexes` columns can only be updated within 48 hours
- **Lock trigger**: Prevents any UPDATE on locked sessions (`is_locked = true`)
- **Retroactive limit trigger**: `is_retroactive` sessions must have `session_date` within 24 hours of `created_at`
- **Game opponent trigger**: `session_type IN ('game', 'live_scrimmage')` requires non-null `opponent_name` and `opponent_level`
- **Updated_at trigger**: Auto-update `updated_at` on all new tables
- **Enable realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE performance_sessions, governance_flags;`

### Migration 7: Profile Updates

Add columns to existing `profiles` table:
- `is_switch_hitter` boolean DEFAULT false
- `is_ambidextrous_thrower` boolean DEFAULT false
- `primary_batting_side` text DEFAULT 'R'
- `primary_throwing_hand` text DEFAULT 'R'

---

## Phase 2: Sport-Specific Data Files (Created Simultaneously)

All data files created in parallel -- these are TypeScript constants, no database interaction.

### Baseball Data Files
| File | Contents |
|------|----------|
| `src/data/baseball/pitchTypes.ts` | 11 pitch types (4-Seam, 2-Seam, Cutter, Slider, Curveball, Changeup, Splitter, Sinker, Knuckle Curve, Knuckle Ball, Eephus) with velocity baselines and spin norms |
| `src/data/baseball/outcomeTags.ts` | Hitting tags (Barrel, Hard Hit, Line Drive, Ground Ball, Fly Ball, Pop Up, Foul, Swing and Miss, Take Ball, Take Strike, HBP) + Pitching tags (Called Strike, Swinging Strike, Ball, Foul, In Play Out, In Play Hit, HBP, Wild Pitch) |
| `src/data/baseball/drillDefinitions.ts` | Baseball-specific drills (Mound Work, Long Toss 150-200ft, Crow Hop Throws, PlyoCare, Pitch Tunneling, Velocity Day, BP Rounds, Tee Work, Live ABs, Ground Ball Work, etc.) |
| `src/data/baseball/positionWeights.ts` | FQI position-based weights (C: 1.3x, SS: 1.2x, CF: 1.15x, etc.) |
| `src/data/baseball/pitchTypeWeights.ts` | PEI pitch-type tier weights |
| `src/data/baseball/ageCurves.ts` | Age-performance curves (peak 27-31 MLB) |
| `src/data/baseball/tierMultipliers.ts` | League tier multipliers (Rec: 0.6x through MLB: 1.5x) |
| `src/data/baseball/probabilityBaselines.ts` | Pro and HoF probability baselines |

### Softball Data Files
| File | Contents |
|------|----------|
| `src/data/softball/pitchTypes.ts` | 11 pitch types (Fastball Windmill, Circle Change, Riseball, Drop Ball, Drop Curve, Screwball, Drop Screw, Flip Change, Curveball, Knuckle Ball, Off-Speed) |
| `src/data/softball/outcomeTags.ts` | Hitting tags (adds Slap Single, Drag Bunt, Power Slap, Soft Slap) + Pitching tags (adds Illegal Pitch, Drop Ball Strike, Rise Ball Chase) |
| `src/data/softball/drillDefinitions.ts` | Softball-specific drills (Circle Work, Windmill Mechanics 5-phase, Riseball Tracking, Drop Ball Location, Snap Angle, Release Point Consistency, Power Line, Slap Hitting Progression, Reaction Speed) |
| `src/data/softball/positionWeights.ts` | Softball FQI weights |
| `src/data/softball/pitchTypeWeights.ts` | Softball PEI weights |
| `src/data/softball/ageCurves.ts` | Softball age curves (peak earlier than baseball) |
| `src/data/softball/tierMultipliers.ts` | Softball league tiers (through AUSL: 1.5x) |
| `src/data/softball/probabilityBaselines.ts` | Softball Pro/HoF baselines |

### Shared Data Files
| File | Contents |
|------|----------|
| `src/data/sportTerminology.ts` | Master dictionary mapping every UI term to sport-appropriate version (pitchTypes, sessionTypes, metrics, drillNames, outcomeHitting, outcomePitching labels) |
| `src/data/heatMapConfig.ts` | 8 map type definitions, grid sizes, color scales, blind zone thresholds |
| `src/data/gameWeighting.ts` | Game (+25% competitive, +18% decision, 0.7x volume) vs Practice (+15% refinement, +20% intent) vs Rehab (0.3x) |
| `src/data/dataDensityLevels.ts` | Level 1-4 field definitions mapped to subscription tiers (Free=L1, Pitcher=L2, 5Tool=L3, Golden2Way=L4) |
| `src/data/segmentPoolRules.ts` | Age + tier + league to segment pool mapping (7 pools: baseball_youth/hs/college/pro, softball_youth/college/ausl) |
| `src/data/fatigueThresholds.ts` | Sleep + stress to fatigue proxy formula and flag thresholds |
| `src/data/aiPromptRules.ts` | Pattern detection rules for development prompts (14-day minimum, 8% stability threshold) |
| `src/data/contractStatusRules.ts` | Release penalty coefficients (-12% first, escalating), re-sign 30-day relaxation, free agent rules |
| `src/data/verifiedStatBoosts.ts` | Per-league verification impact (MLB: +22% competitive, NCAA: +12% validation, MiLB: +8%) |
| `src/data/hofRequirements.ts` | HoF activation criteria (100% Pro + 5 consecutive MLB/AUSL seasons, season = 1+ regular season game) |
| `src/data/splitDefinitions.ts` | Split key definitions, cross-split combinations, display labels |
| `src/data/softball/pitcherStyles.ts` | Pitcher style tags (riseball, dropball, speed, spin) and BQI impact rules |
| `src/data/integrityRules.ts` | 14+ flag type definitions with deduction amounts and rebuild rate (+0.5/verified session) |

---

## Phase 3: Edge Functions (2 Functions)

### `calculate-session` (New Edge Function)

**Trigger**: Called after every session save from the frontend.

**Processing pipeline**:
1. Validate session data (type, required fields, time windows)
2. Determine `data_density_level` from user subscription tier
3. Load sport-specific weighting tables
4. Calculate composite indexes (BQI, FQI, PEI, Decision Index, Competitive Execution)
5. Apply game vs practice weighting multipliers based on `session_type`
6. Compute split-specific indexes (BQI vs LHP, BQI vs RHP, per-batting-side for switch hitters, etc.)
7. Apply 20-80 scout grade conversion
8. Snapshot fatigue state from latest focus quiz
9. Run 14+ integrity detection rules (inflated grading, suspicious volume, rapid improvement, fatigue inconsistency, game inflation, self-coach delta)
10. Create governance_flags for any violations
11. Update streak tracking in athlete_mpi_settings
12. Update load tracking integration
13. Return calculated session with composite indexes

### `nightly-mpi-process` (New Edge Function + Cron)

**Schedule**: 12:00 AM EST (05:00 UTC) daily via pg_cron.

**23-step strict processing order**:
1. Process pending governance_flags (auto-resolve info-level, escalate critical)
2. Apply contract status modifiers (release penalties, free agent reductions)
3. Process new scout_evaluations (recency weighted)
4. Lock all unlocked performance_sessions (`is_locked = true`)
5. Snapshot fatigue data from focus_quizzes
6. Pre-compute heat_map_snapshots (8 types x 4 time windows x 3 context filters x split keys per user)
7. Calculate composite indexes per session
8. Apply game vs practice weighting
9. Calculate self vs coach delta maturity index
10. Apply league tier multiplier (0.6x-1.5x)
11. Apply in-season multiplier (+18% competitive / -12% volume)
12. Apply governance dampening (stability x credibility x integrity x fatigue)
13. Apply verified external stat boosts
14. Calculate adjusted_global_score per sport pool
15. Global sort + rank assignment (tie-break: stability > competitive exec > integrity > recency)
16. Calculate Pro Probability (cap 99% for non-MLB/AUSL; 100% only verified)
17. Calculate HoF Probability (if eligible: 100% Pro + 5 MLB/AUSL seasons)
18. Check roadmap milestones (volume + quality + coach validation + integrity + heat map clearance)
19. Generate AI development prompts (14-day patterns, blind zones, stability drops >8%)
20. Award badges
21. Calculate trend direction (30-day rolling delta)
22. Generate rank movement notifications (>3 percentile pts or >2% population)
23. Insert snapshot into mpi_scores

**Cron setup** via pg_cron + pg_net extensions, calling the edge function URL at 05:00 UTC daily.

---

## Phase 4: Hooks (Created Simultaneously)

| Hook | Purpose |
|------|---------|
| `usePerformanceSession.ts` | Full session CRUD: create drill blocks, save session, call calculate-session edge function, enforce 24hr delete / 48hr edit rules |
| `useMPIScores.ts` | Fetch latest MPI scores, rank, percentile, probability, trend for current user |
| `useGovernanceFlags.ts` | Fetch/manage governance flags (admin: all users; user: own flags) |
| `useHeatMaps.ts` | Fetch pre-computed heat map snapshots with filter params (map_type, time_window, context, split_key) |
| `useSplitAnalytics.ts` | Fetch and display split-specific composite indexes and heat maps |
| `useSwitchHitterProfile.ts` | Manage dual batting side profiles and combined view |
| `useRoadmapProgress.ts` | Fetch milestones + user progress, display completed/in_progress/blocked states |
| `useVerifiedStats.ts` | Verified stat profile CRUD + sync |
| `useProfessionalStatus.ts` | Contract status + MLB/AUSL season tracking |
| `useHoFEligibility.ts` | HoF activation check + countdown |
| `useSportConfig.ts` | Load sport-specific configs (drills, weights, curves, terminology) based on user sport |
| `useSportTerminology.ts` | Hook returning sport-correct labels via i18n + SportThemeContext |
| `useMicroLayerInput.ts` | Manage per-rep granular data entry state (Level 3-4) |
| `useDataDensityLevel.ts` | Determine data density level from subscription tier |
| `useDeltaAnalytics.ts` | Self vs coach delta trend tracking |
| `useAIPrompts.ts` | Fetch and display AI development prompts from mpi_scores |
| `useOrganization.ts` | Organization CRUD + member management |
| `useFatigueState.ts` | Fetch latest focus quiz data for fatigue proxy |
| `useGradeHierarchy.ts` | Determine effective grade from Admin > Coach > Scout > Player hierarchy |

---

## Phase 5: Components (Created Simultaneously)

### Session Entry Components
| Component | Purpose |
|-----------|---------|
| `PracticeHub.tsx` | Main Practice page with 6 tabs (Hitting, Pitching, Throwing, Fielding, Baserunning, Mental) |
| `SessionTypeSelector.tsx` | 8 session type cards (Personal Practice, Team Practice, Lesson, Game, Post-Game, Bullpen, Scrimmage, Rehab) |
| `DrillBlockBuilder.tsx` | Modular drill block entry (type + intent + volume + execution slider + outcome tags) |
| `IntentSelector.tsx` | Mandatory intent tag selector per drill block |
| `ExecutionSlider.tsx` | 1-5 slider UI that maps to 20-80 backend scale |
| `OutcomeTagBubbles.tsx` | Sport-specific tap bubble selectors for outcomes |
| `VoiceNoteInput.tsx` | Voice-to-text input for session notes |
| `GameSessionFields.tsx` | Opponent name + level inputs (required for game/scrimmage) |
| `QuickAddSession.tsx` | 3-tap quick session entry from Game Plan |

### Micro Layer Components (Level 3-4)
| Component | Purpose |
|-----------|---------|
| `MicroLayerInput.tsx` | Wrapper that shows/hides micro inputs based on data density level |
| `DataDensityGate.tsx` | Gates micro-layer visibility by subscription tier |
| `PitchLocationGrid.tsx` | 9-box pitch location tap input |
| `SwingDecisionTag.tsx` | Correct/Incorrect swing decision bubble |
| `ContactQualitySelector.tsx` | Miss/Foul/Barrel/Weak/Hard tap selector |
| `ExitDirectionSelector.tsx` | Pull/Middle/Oppo (+ Slap Side for softball) |
| `SituationTagSelector.tsx` | Runner position + outs situation picker |
| `CountSelector.tsx` | Ball-strike count selector |
| `FieldingMicroInput.tsx` | Pre-pitch position, reaction, clean field, exchange, throw inputs |
| `PitchingMicroInput.tsx` | Pitch type, velocity band, spin, intended vs actual location |

### Split Components
| Component | Purpose |
|-----------|---------|
| `SplitToggle.tsx` | L/R handedness selector for per-rep tagging (large tap targets) |
| `BattingSideSelector.tsx` | Switch hitter side selector (session-level + per-rep) |
| `ThrowingHandSelector.tsx` | Ambidextrous thrower hand selector |
| `SoftballPitcherStyleTag.tsx` | Pitcher style bubble selector (riseball/dropball/speed/spin) |
| `SplitAnalyticsView.tsx` | Tabbed split display: Overall / Left / Right with full stat lines |
| `SplitComparisonCard.tsx` | Side-by-side left vs right performance comparison |
| `SplitStatLine.tsx` | Single split stat line display (MLB splits page format) |
| `GameAtBatLogger.tsx` | Game-specific at-bat entry with mandatory handedness |

### Heat Map Components
| Component | Purpose |
|-----------|---------|
| `HeatMapGrid.tsx` | Reusable heat map visualization (9-box grid, range map, accuracy quadrant) using recharts |
| `HeatMapFilterBar.tsx` | Time window + context + tier + split filter controls |
| `HeatMapDashboard.tsx` | Player-facing view with all 8 heat map types |

### Analytics and Display Components
| Component | Purpose |
|-----------|---------|
| `MPIScoreCard.tsx` | Grade label + trend arrow + exact % + global percentile + rank (#X of Y) |
| `ProProbabilityCard.tsx` | Pro probability display with cap indicator ("98.7% / Pre-MLB") |
| `ProProbabilityCap.tsx` | "Pre-MLB" badge for capped athletes |
| `HoFCountdown.tsx` | "MLB Seasons: 3 / HOF in 2 Seasons" countdown |
| `MLBSeasonCounter.tsx` | Season counter display |
| `RankMovementBadge.tsx` | Trend arrow (Rising/Stable/Dropping) with 30-day delta |
| `DataBuildingGate.tsx` | "Performance Data Under Review" / "Data Building Phase" before gate met |
| `DeltaTrendChart.tsx` | Self vs coach grade delta chart (admin view) |
| `AIPromptCard.tsx` | Optional development suggestion display (instructional, dismissable) |
| `RoadmapBlockedBadge.tsx` | "Blocked: Chase heat map above threshold" display |
| `IntegrityScoreBar.tsx` | Integrity score indicator (admin only for player view) |

### Professional Status Components
| Component | Purpose |
|-----------|---------|
| `VerifiedStatSubmission.tsx` | Link paste + screenshot upload for pro/college verification |
| `VerifiedStatBadge.tsx` | "Verified Stat Profile" badge display |
| `ContractStatusCard.tsx` | Professional status display with league, team, status |
| `SportBadge.tsx` | Baseball/Softball locked sport indicator |

### Organization Components
| Component | Purpose |
|-----------|---------|
| `OrganizationDashboard.tsx` | Org owner team view (compliance, heat maps, delta trends) |
| `OrganizationRegistration.tsx` | Org registration + verification flow |
| `OrganizationMemberList.tsx` | Member management for org owners |
| `TeamComplianceCard.tsx` | Practice completion % |
| `TeamHeatMapOverlay.tsx` | Aggregated team heat maps |

### Authority Components
| Component | Purpose |
|-----------|---------|
| `CoachOverridePanel.tsx` | Grade override form for coaches (immutable log) |
| `ScoutEvaluationForm.tsx` | Scout MPI submission (INSERT only, no edit/delete) |
| `GovernanceFlagCard.tsx` | Individual flag display with admin actions |
| `ArbitrationPanel.tsx` | Video upload + rep tagging for disputes |

---

## Phase 6: Page Updates

### New Pages
| Page | Route | Purpose |
|------|-------|---------|
| `PracticeHub.tsx` | `/practice` | 6-tab Practice Intelligence entry (Hitting, Pitching, Throwing, Fielding, Baserunning, Mental) |
| `ProgressDashboard.tsx` | `/progress` | MPI trends, roadmap progress, streak, probability display, heat maps |
| `OrganizationDashboard.tsx` | `/organization` | Org owner view |

### Modified Pages
| Page | Changes |
|------|---------|
| `Rankings.tsx` | **Complete rebuild**: Remove video-based rankings. Replace with MPI-based global ranking (exact rank, percentile, #X of Y), sport-separated pools, Top 100 leaderboard, segment filters |
| `Profile.tsx` | Add expandable sections: Professional Status (league, team, contract, seasons, HoF countdown), Verified Stats (links, badge, sync), Sport Badge (locked), Split stat lines, Organization membership |
| `AdminDashboard.tsx` | Add tabs: Governance (flag management, arbitration, delta trend charts, inflation heat maps), Verified Stats management (approve/reject/sync), Organization verification, Coefficient editor, Emergency freeze, Audit export (CSV/JSON), Ranking exclusion controls |
| `Dashboard.tsx` | Add Practice Intelligence quick-access card, MPI score summary, streak display, AI development prompt (if triggered) |
| `App.tsx` | Add routes: `/practice`, `/progress`, `/organization` |
| `AppSidebar.tsx` | Add new section "Practice Intelligence" containing Practice, Progress links. Add Organization link for org owners |

---

## Phase 7: i18n Updates

Add `sportTerms` namespace to all 8 locale files (`en.json`, `es.json`, `fr.json`, `de.json`, `ja.json`, `zh.json`, `nl.json`, `ko.json`) with:
- `sportTerms.baseball.pitchTypes` (11 entries)
- `sportTerms.baseball.sessionTypes` (8 entries)
- `sportTerms.baseball.metrics` (all metric labels)
- `sportTerms.baseball.drillNames` (all drill names)
- `sportTerms.baseball.outcomeHitting` (11 tags)
- `sportTerms.baseball.outcomePitching` (8 tags)
- `sportTerms.softball.*` (same structure with softball-specific terms)
- Split labels, heat map labels, roadmap milestone names, AI prompt templates

---

## Key Architecture Rules (Enforced Throughout)

### Data Integrity
- 24hr delete window, 48hr edit window, nightly permanent lock
- Retroactive sessions limited to 24hrs
- Coach overrides are immutable (INSERT only, no UPDATE/DELETE)
- Scout evaluations are immutable
- All admin actions logged to existing `audit_log` table

### Sport Separation
- Sport locked at account creation (stored in `athlete_mpi_settings.sport`)
- All data files, weights, curves, terminology loaded per sport via `useSportConfig`
- Rankings computed within sport pools (baseball vs softball)
- No cross-sport data mixing at any level
- `useSportTerminology()` hook ensures every UI label is sport-native

### Scoring Rules
- Player sees 1-5 slider, backend stores 20-80
- Grade hierarchy: Admin > Primary Coach > Secondary Coach > Scout > Player
- Game: +25% Competitive Execution, +18% Decision Index, 0.7x volume
- Practice: +15% Skill Refinement, +20% Intent Compliance
- Rehab: 0.3x all indexes
- MiLB/minor league Pro Probability capped at 99% (no rounding)
- HoF hidden until 100% Pro + 5 consecutive MLB/AUSL seasons
- Release: -12% baseline (escalating), 30-day governance relaxation on re-sign

### UX Mandates
- 3 taps to begin any session
- Max 5 inputs per screen
- Sliders and tap bubbles primary (no typing unless necessary)
- Advanced/micro hidden by default (gated by data density level)
- Voice-to-text available on all note fields
- Auto-save every 5 seconds during session
- Mobile-first responsive
- Young athlete mode: swipe-based, reward animations
- Old coach mode: minimal fields, large buttons, no metric overload

### Splits
- Every hitting rep logs batter_side (L/R) + pitcher_hand (L/R)
- Every pitching rep logs batter_hand (L/R) + batter_active_side
- Switch hitters get dual stat profiles per side + combined view + 4 cross-split combinations
- Ambidextrous throwers select hand per session or per rep
- Defensive splits at Level 3-4 (batter_hand on fielded balls)
- Softball pitcher style tags at Level 3-4 (riseball/dropball/speed/spin)
- Game sessions require handedness on every at-bat/pitch

---

## File Count Summary

| Category | Count |
|----------|-------|
| Database migrations | 7 |
| Sport-specific data files | 16 (8 baseball + 8 softball) |
| Shared data files | 13 |
| Edge functions | 2 (calculate-session + nightly-mpi-process) |
| New hooks | 19 |
| New components | ~45 |
| New pages | 3 |
| Modified pages | 5 |
| i18n locale updates | 8 |
| **Total new/modified files** | **~120** |

This is an enterprise-grade build. Every system from the forensic consolidation is accounted for: session types, micro-layer logging, heat maps, game vs practice weighting, HRV/fatigue, roadmaps with heat map clearance, self vs coach delta, AI prompts, data density tiers, global segmentation, organizations, daily rank batch cycle, video arbitration, verified stats, pro probability caps, HoF gating, contract status, release logic, sport-specific terminology, and handedness splits.

