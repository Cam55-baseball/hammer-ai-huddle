# Integration Map — Next Phase (A, 0–15)

Audit date: **Nov 8 2026**. Read-only. Nothing in code, data, settings, flags, functions or migrations was
changed. Plan: `docs/NEXT-PHASE-PLAN.md`.

**How to read the tags**

- **V** = VERIFIED. The path, table, column, function or query named next to it was actually read in
  this audit.
- **NF** = NOT FOUND. Searched for and not present.
- **DOC** = the claim is stated in a repo document (named) and was **not** re-proven in code in this audit.
- Row counts are exact `count(*)` reads from the live database on Nov 8 2026.
- "Replaced by" names the release that would turn the input into a measured or derived value. When nothing
  should replace it, the row says **stays manual** and why.

---

## 0. Documents the owner asked to be read first

| Document | Result |
|---|---|
| `.lovable/canonical-measurement-architecture.md` | **V** FOUND (936 lines) |
| `.lovable/canonical-calibration-architecture.md` | **V** FOUND (591 lines) |
| `.lovable/canonical-confidence-architecture.md` | **V** FOUND (549 lines) |
| `analysis-truth-audit.md` (repo root) | **NF** at root. **V** FOUND at `.lovable/analysis-truth-audit.md` (297 lines) |
| `docs/wic/lifting-enhancement-plan-v4.md` | **V** FOUND (235 lines) |
| `docs/wic/lifting-research-inventory.md` | **V** FOUND (104 lines) |
| `docs/wic/weight-room-standards-v1.md` | **V** FOUND (78 lines) |
| `docs/REPORT-CARD-AND-COVERAGE.md` | **V** FOUND (457 lines) |
| `docs/MEASUREMENT-INVENTORY.md` | **NF** anywhere in the repo. `docs/REPORT-CARD-AND-COVERAGE.md` line 7 already records it does not exist and defers to `docs/report-card-audit.md`, `docs/asb/report-card-system-reference.md`, `src/lib/reportCard/release1.ts` |
| `HAMMERS-DEFINITIONS.md` | **NF** anywhere in the repo |
| `HANDOFF-NEXT-PHASE.md` | **NF** anywhere in the repo. Nearest: `docs/handoff/report-card-and-grading.md` (**V** exists, not part of the request) |

Also read because they bear directly on the plan: `docs/camera-requirements.md`,
`docs/delaycam-performance-spec.md`, `docs/owner/db-capacity.md` (all **V**).

Stale point found in a required doc: `.lovable/analysis-truth-audit.md` S3 says
`LANDMARK_MODEL_VERSION` is a stub. **V** `src/lib/biomech/versions.ts:29-30` now reads
`"blazepose_full@0.10.35-mediapipe-tasks-vision"`. `DETECTOR_VERSION = "events@0.0.0-stub"` and
`METRIC_ENGINE_VERSION = "metrics@0.0.0-stub"` are still stubs (**V** lines 31-32).

---

## 1. Manual inputs an ATHLETE fills in today (47)

Write paths come from a scan of every `.from('<table>').insert/upsert/update` and `.rpc(...)` call in `src/`
(excluding tests and generated types).

| # | Screen / component (V) | Writes (V) | What the person types or judges | Replaced by |
|---|---|---|---|---|
| A1 | Morning check-in `src/components/vault/VaultFocusQuizDialog.tsx` via `src/hooks/useVault.ts` | `vault_focus_quizzes.hours_slept, sleep_quality, sleep_time, wake_time` | hours slept, sleep quality 1–5, bed/wake times | **A** (HealthKit sleep) for hours/times. Sleep *quality* stays manual (a feeling) |
| A2 | `src/components/vault/quiz/RestingHeartRateCapture.tsx` | `vault_focus_quizzes.resting_hr` | typed bpm (30–200 accepted) | **A** (HealthKit resting HR) |
| A3 | Check-in weight + `src/hooks/useWeightTracking.ts` | `vault_focus_quizzes.weight_lbs`, `weight_entries.weight_lbs, body_fat_percent` (48 rows) | typed weight, body fat | **A** (HealthKit body mass, optional). Body fat stays manual (no hardware, REPORT-CARD doc §6) |
| A4 | Check-in ratings (same dialog) | `vault_focus_quizzes.mental_readiness, emotional_state, physical_readiness, mood_level, stress_level, discipline_level, mental_energy, perceived_recovery, daily_intentions, training_intent` | 1–10 / 1–5 self-ratings, intent pick | **stays manual** — these are the athlete's own feelings; they feed **9** |
| A5 | Check-in pain and body maps `src/components/vault/quiz/BodyMapSelector.tsx`, `TissueTypeSelector.tsx` | `vault_focus_quizzes.pain_location, pain_scale, pain_scales, pain_tissue_types, soreness_*, stiffness_*` | pain areas/levels | **stays manual** — athlete-reported pain outranks inferred readiness (memory RR-6) |
| A6 | `src/components/vault/quiz/QuickReactionTest.tsx` | `vault_focus_quizzes.reaction_time_ms, reaction_time_score` | app-timed taps (7 taps, 5 kept) | already app-timed; **0** must validate touch latency per device before it counts as a measurement |
| A7 | `src/components/vault/quiz/BalanceTest.tsx` | `vault_focus_quizzes.balance_left_seconds, balance_right_seconds` | athlete starts/stops a stopwatch | **5** (camera sway / phone IMU) |
| A8 | `src/components/vault/quiz/MorningGameQuestions.tsx` | `gp_games.self_reported_at_bats`; `pitcher_outings.pitch_count, innings` | at-bats yesterday, pitches, innings | **stays manual** (game facts); superseded per-game when a game is logged in `gp_at_bats` |
| A9 | Exercise logging `src/lib/logging/writeExerciseLog.ts`, `src/hooks/useExerciseLog.ts`, `src/components/hammer/WkPrescriptionCard.tsx`, `logging/CardOutcomeLog.tsx`, `logging/WkOneTapLog.tsx`, `logging/ExtraLogs.tsx`, `PowerPrimerBlock.tsx` | `wk_session_logs.sets_completed, reps_completed, load_used, rpe, bar_feel, duration_seconds_completed, distance_feet_completed, metrics` (18 rows) | sets, reps, weight, RPE, bar feel, time, distance | reps/duration → **12**; bar feel → **11** (bar speed). Load and RPE **stay manual** (weight on the bar and effort are not camera facts) |
| A10 | One-tap done `WkOneTapLog.tsx`, `WkCardCompletion.tsx`, `lib/wic/execution/liftCompletion.ts` | `wk_prescriptions` completion fields | "I did it" tap | **12** for camera-watched exercises; otherwise stays manual |
| A11 | `src/components/hammer/logging/JumpLandingRating.tsx` | `jump_landing_ratings.rating` (0 rows) | landing quality per set | **2** / **3** |
| A12 | `src/components/hammer/logging/SwingEffortEntry.tsx` | `hitting_swing_efforts.actual` (0 rows) | swings done vs prescribed | **1** (rep count while recording) |
| A13 | `src/components/hammer/logging/SprintRepFeedback.tsx` | `conditioning_rep_feedback.seconds, feel, effort, pain` (0 rows) | rep time, feel, effort, pain | seconds → **6/7**; feel/effort/pain **stay manual** |
| A14 | `src/components/hammer/cards/BarefootReadinessTest.tsx`, `SpeedReadinessCheck.tsx` | `wk_session_logs` | guided self-checks (calf raises, body feel) | **3** (contacts), **9** (readiness) |
| A15 | Standards entry `WkCardCompletion.tsx`, `src/hooks/useStandards.ts` | `wk_standard_attempts.observed_value, reps_at_value, bodyweight_lbs` (0 rows), `wk_standard_awards` (0) | best lift / mark | jumps → **2**; bar-speed marks → **11**; loads stay manual |
| A16 | "Your progress" self tests `src/components/progress/YourProgressCard.tsx` → RPC `record_my_test` | `athlete_metric_observations` keys `test.broad_jump_in, test.vertical_jump_in, test.sl_broad_jump_in, test.sprint_10yd_s, test.sprint_30yd_s, test.sprint_60yd_s, test.rot_mb_throw_ft, test.throw_velo_mph, test.bat_speed_mph, test.exit_velo_mph` (V function body) | typed result | jumps **2**; sprints **6**; velo/bat/exit **15**; med-ball throw stays manual (tape) |
| A17 | 6-week tests `src/components/vault/VaultPerformanceTestCard.tsx` (registry `src/data/performanceTestRegistry.ts`, 39 keys) | `vault_performance_tests.results` jsonb (7 rows) | typed test results | jumps **2**; sprints/shuttles **6/7**; ROM keys **4**; pop time, velos, exit velo, bat speed **15**; med-ball, long toss **stay manual** (tape measure) |
| A18 | `VaultProgressPhotosCard.tsx` via `useVault.ts` | `vault_progress_photos.weight_lbs, bmi, body_fat_percent, arm/chest/waist/leg_measurement` (5 rows) | tape measurements | **stays manual** (body composition excluded, REPORT-CARD doc §6) |
| A19 | `src/components/intelligence/PracticeSwingLog.tsx` | `practice_swing_logs.pitch_mph, release_ft, pitch_mix, swings, whiffs` (0 rows) | thrower speed, distance, swing count | pitch mph **15**; swings **1**; release distance **6** (ARKit) |
| A20 | Arm throws `src/lib/logging/logOutbox.ts` | `arm_ledger_entries.count, throw_type` (174 rows) | throw counts | stays manual for now; see §5 item X1 (**13/15**) |
| A21 | `src/hooks/usePitcherSchedule.ts` | `pitcher_outings` (8), `pitcher_availability`, `pitcher_schedule_settings` | planned/actual outings, availability | **stays manual** (schedule facts) |
| A22 | Game logging `src/components/games/GameSheet.tsx`, `AtBatPitchPanel.tsx`, `PitchLogger.tsx`, `DefenseLogger.tsx`, `BaserunLogger.tsx`, `SubLogger.tsx`, `src/components/hammer/GameDayCard.tsx` | `gp_games` (19), `gp_at_bats` (14) incl. `exit_velo, launch_angle, pitch_velo`; `gp_pitches` (27) incl. `pitch_velo, exit_velo`; `gp_defense_plays`, `gp_baserun_events`, `gp_subs` | game results; typed speeds | typed speeds → **15**; game events **stay manual** |
| A23 | `src/hooks/useDefensivePlays.ts` (route `/defense/plays/entry`, not staff-gated, V `src/App.tsx:511`) | `defensive_plays.hang_time_sec, distance_to_cover, route_efficiency, throw_velo, total_play_time_sec` (1 row) | typed times/speeds | throw velo **15**; times **later (no release owns it)**, see §5 |
| A24 | Base stealing `src/components/base-stealing/PostRepInput.tsx`, `ManualRepRunner.tsx`, page `src/pages/BaseStealingTrainer.tsx` | `performance_sessions.drill_blocks, micro_layer_data` (39 rows total, all session types) | steps taken, time to base, base distance; manual mode reaction | **8** |
| A25 | Speed Lab `src/hooks/useSpeedProgress.ts` (route `/speed-lab` = `RetiredProgramRoute`, V `App.tsx:590`) | `speed_sessions` (2), `speed_partner_timings.time_seconds, timed_by` (3), `speed_goals` | hand-timed sprints | retired screen; history to be absorbed by **0**; new timing **6** |
| A26 | Royal Timing `src/components/royal-timing/RoyalTimingModule.tsx` | `royal_timing_sessions.timer_data` (3 rows) | stopwatch splits on video | **13** (two-camera sync) / **14** |
| A27 | Initial assessment movement screen `src/lib/assessment/movementScreen.ts` (17 items), `src/components/assessment/InitialAssessmentCard.tsx`, `SavedMovementSummary.tsx`, `src/components/hammer/FinishProfileFlow.tsx` | `initial_assessments.movement_screen` (keys seen: ankle, balance, hip, shoulder, history, observations, version), `pain_flag` (26 rows) | helper-measured degrees (shoulder IR/ER, hip IR/ER, thoracic), cm (ankle wall, reach), controlled reps/5, seconds | ROM items **4**; control/pattern items **5**; history/pain **stay manual** |
| A28 | Same flow, last-season stats | `initial_assessments.last_season_stats` (23 keys: at_bats, avg, hits, rbi, stolen_bases, …) | season totals | **stays manual** (history before Hammers) |
| A29 | Starting point `src/hooks/useStartingPoint.ts`; questions `supabase/functions/_shared/wic/progression/startingPoint.ts` | `athlete_starting_points` (10), `athlete_starting_point_log` (111) | bucketed answers (throws/day "0–25"…, swings/session) | **derived** from **0** baselines once real logs exist; stays for cold start |
| A30 | Season, position, hands `src/hooks/useSeasonStatus.ts`, `contexts/SideContext.tsx`, `hooks/useSwitchHitterProfile.ts`, `pages/AthleteOnboarding.tsx` | `athlete_mpi_settings` (259) | season phase/dates, position, throwing hand, batting side | **stays manual** (identity/schedule facts) |
| A31 | Health intake `src/components/physio/PhysioHealthIntakeDialog.tsx`, `hooks/usePhysioProfile.ts` | `physio_health_profiles` (27) | medical history, conditions | **stays manual** (medical history) |
| A32 | `src/hooks/usePhysioAdultTracking.ts` | `physio_adult_tracking` (cycle phase/day, libido, sleep impact) | adult wellness | **stays manual**; see §5 X21 |
| A33 | `src/hooks/useHydration.ts` | `hydration_logs.amount_oz, liquid_type` (24) | drink amounts | **stays manual** |
| A34 | Nutrition `QuickNutritionLogDialog.tsx`, `nutrition-hub/NutritionDailyLog.tsx`, `hooks/useMealVaultSync.ts` | `vault_nutrition_logs` (287) | meals, macros, energy | **stays manual** |
| A35 | Mind Fuel `mind-fuel/emotional-awareness/EmotionCheckIn.tsx`, `TriggerTracker.tsx`, `stress-management/StressLevelTracker.tsx`, `BurnoutAssessment.tsx`, `cognitive-skills/ThoughtJournal.tsx`, journals | `emotion_tracking` (5), `stress_assessments` (1), `thought_logs`, `mental_health_journal`, `mindfulness_sessions` | feelings, journals | **stays manual** (mental health is self-report) |
| A36 | `src/components/practice/SessionIntentGate.tsx` | `session_start_moods.mood, energy` (1) | mood/energy | **stays manual** |
| A37 | `src/hooks/useDailyLog.ts`, `usePerformanceSession.ts` | `athlete_daily_log.day_status, injury_mode, injury_body_region, injury_expected_days, game_logged` (14) | day status, injury | **stays manual** |
| A38 | `src/lib/hammer/injury/recordPain.ts` | `schedule_timeline_entries` | pain events | **stays manual** |
| A39 | Tex Vision `src/hooks/useTexVisionSession.ts` | `tex_vision_drill_results.reaction_time_ms, accuracy_percent` (218) | app-timed drills | app-timed; **0** latency validation |
| A40 | Custom activities `src/hooks/useCustomActivities.ts`, `components/practice/QuickLogSheet.tsx` | `custom_activity_logs.actual_duration_minutes, performance_data, completed` (786) | time, done | **A** (HealthKit workouts, optional) else manual |
| A41 | Self grades via `useVault.ts` | `vault_scout_grades` with `grade_source` null (12 of 15 rows) | 20–80 self grades | **stays manual** (self-belief is the point) |
| A42 | Goals / prefs `hooks/useAthleteGoals.ts`, `useTrainingPreferences.ts`, `components/training/TrainingSetupCard.tsx` | `athlete_body_goals`, `training_preferences`, `training_intel_onboarding` | goals, preferences | **stays manual** |
| A43 | Swap missing-gear answers (Swap memory) | `athlete_equipment_memory` | gear owned / missing | **stays manual** (ownership is a fact only the player knows) |
| A44 | Video upload `src/pages/AnalyzeVideo.tsx` | `videos.landing_time_sec` (user-picked, V line 833) | landing frame time | **1** (in-app capture with pose anchors) |
| A45 | `src/components/identity/DailyStandardCheck.tsx` | `daily_standard_checks` | daily standard checkbox | **stays manual** |
| A46 | `src/components/hammer/CatchPlayCheckPanel.tsx` | `hammer_daily_task_completions` | catch-play checks | **stays manual** (until §5 X1) |
| A47 | `src/components/hammer/WkSomethingOff.tsx`; `hooks/useWeeklyWellnessQuiz.ts` | `ti_watch_notes`; `vault_weekly_wellness_quiz` | "something's off" note; weekly targets | **stays manual** |

Height: `athlete_height_checks` (91 rows) is written from the profile/backfill/test setup (sources seen:
profile 52, demo_seed 28, backfill 9, test_setup 2 — V query), client has SELECT only (V migration
`20260925164349`). `athlete_limb_measurements` (0 rows) has no client writer (V scan).

---

## 2. Manual inputs a COACH, SCOUT, ORGANIZATION (or owner) fills in (19)

| # | Screen / component (V) | Writes (V) | What is typed or judged | Replaced by |
|---|---|---|---|---|
| C1 | Scout evaluation `src/pages/ScoutEvaluation.tsx`, `src/hooks/useEvaluations.ts` | `vault_scout_grades` (15) + `vault_scout_grade_bat_sides`, `_pitching_sides`, `_positions` | 20–80 grades, notes | **stays manual** (human grade); measured anchors from **6/15** can sit beside it |
| C2 | Evaluator combine `src/hooks/useEvaluatorCombine.ts` (`source: 'manual_entry'`) | `combine_sessions` (0), `combine_results` (0) | event results | **6** / **2** / **4**. Route `/combine/entry` renders `CombineComingSoon` (V `App.tsx:507`) |
| C3 | `BaserunningSplitEntry` (StaffOnlyRoute, V `App.tsx:517`), `src/hooks/useBaserunningSplits.ts` | `baserunning_splits` (0) | split seconds, lead feet | **6/7** |
| C4 | `ThrowingRepEntry`, `CatchingRepEntry` (StaffOnlyRoute, V `App.tsx:519-520`), `useThrowingReps.ts`, `useCatchingReps.ts` | `throwing_reps` (0), `catching_reps` (0) | throw velo, pop time | **15** |
| C5 | `src/components/coach/CoachOnSpotAssessment.tsx` → RPC `coach_record_movement_screen` | `initial_assessments.movement_screen` (with recorded_by) | movement screen on the spot | **4/5** |
| C6 | `src/components/coach/CoachLogForPlayer.tsx` → `coach_log_entry`; `components/games/CoachGameLog.tsx` → `coach_log_general_game`; `CoachGameDetailsFields.tsx` → `coach_game_add_details` | `coach_logged_entries` (2), `gp_games` | game lines, practice notes | **stays manual** (game facts) |
| C7 | `components/authority/CoachOverridePanel.tsx`, `coach/SessionDetailView.tsx` | `coach_grade_overrides` | session grade override | **stays manual** (coach authority) |
| C8 | `components/coach/CoachTestsAndNotes.tsx` | `coach_private_notes` | notes | **stays manual** |
| C9 | `components/coach/CoachPeriodizationEditor.tsx` → `coach_phase_prepare/confirm/undo` | `coach_phase_tunings` | phase tuning | **stays manual** (coach authority) |
| C10 | `components/coach/CoachDayEditor.tsx`, sends | `custom_activity_templates`, `sent_activity_templates` | prescribed cards | **stays manual** |
| C11 | `hooks/useSessionControls.ts` → `coach_session_control_write` | `coach_session_controls` | allowed skips etc. | **stays manual** |
| C12 | `lib/coach/savedLineups.ts`, `coach/CoachMessageBox.tsx` | `coach_lineups`, `coach_lineup_players`, `coach_messages` | lineups, messages | **stays manual** |
| C13 | Org testing days `src/components/organization/TestingDays.tsx` | `testing_days.tests` (free-text comma list, V line 68), `verified_by`, `result_test_id`, `video_url` (1 row) | which tests, verification | results → **6/2** (link `result_test_id` to measured rows) |
| C14 | `src/hooks/useOrgStandards.ts` | `org_standards`, `org_standard_criteria (field, operator, value)` | org thresholds | **stays manual** (org policy) |
| C15 | `components/scout/PlayerNotesSection.tsx` | `player_notes` | scout notes | **stays manual** |
| C16 | Staff game charting `components/games/PitchLogger.tsx` (V line 224 "Velo" field) | `gp_pitches.pitch_velo` | typed pitch speed | **15** |
| C17 | Owner settings `components/intelligence/*Settings.tsx`, `owner/OwnerEngineSettingsPanel.tsx`, `pages/AdminTrainingIntelligence.tsx` | `app_settings` (6 keys), `engine_settings` (15 keys), `wk_feature_switches` (29 keys) | owner rules and switches | **stays manual** (owner authority) |
| C18 | Parent `components/parent/OptionalSharingControl.tsx`, `ParentAddOnRequests.tsx` | `parent_consents.optional_sharing`, `addon_parent_requests` | consent, approvals | **stays manual** (consent must be a person) |
| C19 | `pages/AdminVerification.tsx` | `verified_stat_profiles` | stat verification | **stays manual** |

---

## 3. Places a number is ESTIMATED, ASSUMED, DEFAULTED or GUESSED today (29)

| # | Where (V unless tagged) | What happens | Made measured by |
|---|---|---|---|
| E1 | `supabase/functions/_shared/seasonPhase.ts:71,99`; `_shared/wkPhaseQuarter.ts:94` | No season signal → `off_season` with `source:'default'` → phase `os_q1` | none of A/0–15 measures season; stays a player/coach fact (schedule import) |
| E2 | `_shared/wic/checkInReductions.ts` `checkInReductions()` | Missing check-in → sleep **7 h**, CNS readiness **7/10**, soreness **3/10** | **A** (sleep), **9** (readiness) |
| E3 | `supabase/functions/compute-hammer-state/index.ts:69,101` | Arousal and recovery axes start at **50** when no signal | **9** |
| E4 | same file `:177-180` | HRV from `wearable_metrics` only raises confidence (+0.2); it never changes the recovery score | **A** + **9** |
| E5 | `supabase/functions/hie-analyze/index.ts:1658-1663` | Readiness fallback **70**; level **'hs'**; batting side **'R'**; throwing hand **'R'** when missing | **9** (readiness); hands stay profile facts |
| E6 | `supabase/functions/_shared/generated/hammerBlockBuilder.mjs:9346,9871` | "Reduced today because readiness dropped below 40%" — readiness threshold drives recovery blocks | **9** |
| E7 | `src/components/hammer/cards/RestTimer.tsx` `liftRestBand()` | No plan rest and no %: rest **90–120 s**; holds 60–90; throws 45–60 | rule, not a guess; **11** could stop on velocity, rest stays rule |
| E8 | `_shared/wic/runRest.ts:10,30` | Sprint rest 1 min per 10 yd up to 5 min; base route 30 s, 5 min at 4 bases | owner rule; stays |
| E9 | `_shared/wic/speed/substitutions.ts:129`, `batSpeed/substitutions.ts:94`, `armCare/substitutions.ts:60` | `default_sets ?? 3` when catalog sets missing | catalog data fix, not a release |
| E10 | `_shared/wic/phases/armLedger.ts:101-115` `estimateThrows()` | Nothing logged → warm-up 30 low; practice 40 (pitcher 20, catcher 50 + 8 throw-downs); pregame 20; game 12 high (catcher 110 + 4) — every event marked `estimated: true` | **15** (ball CV) / **13**; see §5 X1 |
| E11 | same file `:50,60,48` | Unknown age → **13**; unknown age counts as youth | stays profile fact (birthdate) |
| E12 | same file `:27-42` `ARM_DEFAULTS` | Values marked **CHOSEN** (not owner-given): position daily 40/55/70/85 by age, catcher +15, pitcher-catcher share 0.7, tournament 140/day | owner decision, not a release |
| E13 | `_shared/wic/conditioning/inSeasonSprints.ts:35-43,130` | Game credit: own bases/PA only after **15** logged PA, else default **1 base per PA** × morning at-bats estimate; no log and no estimate = unknown | **7/8** improve base-path facts; game log stays |
| E14 | `_shared/wic/schedule/gameProximity.ts:40` | Unknown game time → **18:00** | stays player/coach fact |
| E15 | `_shared/wic/pap/powerPrimer.ts:96`; `wic/pitching/windmillProgram.ts:57` | Unknown equipment → bodyweight/band/med-ball/bat assumed | stays player fact |
| E16 | `_shared/wic/progression/startingPoint.ts:157,181` | Starting answers converted with bucket midpoints (`MID[...]`) | **0** baselines once logs exist |
| E17 | `_shared/wic/practiceDifficulty.ts:7-10` | "mph × standard distance ÷ release distance — a difficulty ESTIMATE" | **15** (thrower speed) + **6** (ARKit distance) |
| E18 | One-tap logging (switch `one_tap_logging` mode `all`, V `wk_feature_switches`); `WkOneTapLog.tsx` | A tap = the work was done | **12** for watched exercises |
| E19 | `_shared/wic/AGENTS.md` (Spike cap / `exposure/returner.ts`) | Easing back for returners: ≤70% intensity, RIR ≥3 | **11** (velocity-based readiness) |
| E20 | **DOC** `docs/wic/lifting-enhancement-plan-v4.md` §2 BUG-6 | Deload anchored to 2024-01-01 mod 4 (calendar, not the athlete) | **9** / Stage 6 Reload Detector; not re-proven in code here |
| E21 | **DOC** `.lovable/canonical-measurement-architecture.md` Part 1 | Bat-length prior default 33 in (low confidence). Code search for a 33-in default: **NF** | **15** |
| E22 | **DOC** `docs/REPORT-CARD-AND-COVERAGE.md` §1 | Efficiency score default 75; PIE V2 confidences 60/80/92 constants. Code search for an efficiency default of 75: **NF** | **14** |
| E23 | **DOC** same, §1 | Shoulder Tilt at Release is a vision-model estimate, visible "on sufferance" (`release1.ts` VISIBLE) | **14** |
| E24 | `supabase/functions/analyze-base-stealing-rep/index.ts` | First-move frame picked by an LLM looking at frames (`chatCompletion`, OPENAI key) | **8** |
| E25 | `src/lib/flags/parkedRegistry.ts` (PARKED) + trigger `ledger_sprint` on `sprint_analyses` | Sprint times/grades by AI model; table parked (0 rows) | **6/7** |
| E26 | `hydration_logs.ai_estimated, confidence`; `vault_nutrition_logs.data_confidence, data_source`; functions `analyze-food-photo`, `analyze-hydration-*` | AI-estimated nutrition/hydration | stays (not a performance measurement) |
| E27 | `cv_calibration_sessions.reference_distance_ft`; `src/lib/capture/referenceDistance.ts` | Ball speed scale comes from a typed reference distance | **6** (ARKit) + **15** |
| E28 | `videos` fps columns (V query) | 571 of 687 videos have no `achieved_fps`; only 4 rows are `measured`/`track_settings` | **1** (counted fps on every in-app clip) |
| E29 | Memory drift log vs `mem://features/training/universal-cns-load-mandate` | Custom activities with no exercise rows add no CNS load; the duration-based `calculateCustomActivityCNS` has no caller (per `/tmp/observability/memory-drift.log`; not changed here) | **A** (HealthKit workouts) / **9**; **owner decision needed** which rule wins |

---

## 4. Release by release: what each one reads, writes or touches

Columns: **Reads/Writes/Touches** (all V unless tagged), **Must not break**, **4.2** = does it strengthen the
App Store Guideline 4.2 "more than a website" case.

### Release A — Native pack
- **Push:** `src/components/onboarding/NotificationPrimer.tsx` (only `PushNotifications.requestPermissions()`;
  no `register()`, no token listener — V). `notification_preferences.push` column exists. Senders today:
  `_shared/notificationAdapters.ts` (email adapter only, inert without hook URL), `coach_notifications`,
  functions `training-block-notifications`, `renewal-reminders`, `send-recap-email`. No push sender **NF**;
  no device-token table **NF**; no APNs secret **NF**.
- **Rest timer/haptics:** `src/components/hammer/cards/RestTimer.tsx` (`navigator.vibrate`, V line 75),
  `src/components/hammer/cards/FocusSession.tsx`, `src/components/workout-modules/RestTimer.tsx`.
  `@capacitor/haptics` **NF**, `@capacitor/local-notifications` **NF** in `package.json`.
- **Apple Health:** `wearable_metrics (captured_at, source, hrv_ms, rhr_bpm, sleep_min, raw)` — 0 rows;
  read by `compute-hammer-state`; listed in `delete-account/ownedTables.ts:231`. Check-in fields
  `vault_focus_quizzes.hours_slept/resting_hr`. `src/lib/sensors/sensorTopicRegistry.ts` already names
  `sensor.heart_rate`, `sensor.hrv`, `sensor.sleep` (used only by `lib/asb/invariants`). HealthKit plugin **NF**.
- **iOS:** `ios/App/App/Info.plist`, `AppDelegate.swift`, `SceneDelegate.swift`; no `.entitlements` file **NF**.
- **Must not break:** `src/lib/purchase/purchaseGate.ts` `isNativeShell()`; `nativeStorefront.ts`;
  `src/lib/auth/nativeSessionStore.ts` (Preferences mirror); `nativeOAuth.ts` (Browser/App);
  `websiteHandoff.ts`; check-ins mandatory (memory Nov 6); readiness reductions in `checkInReductions.ts`.
- **4.2:** **Strong** — push, HealthKit, local notifications, haptics and widgets are native-only.

### Release 0 — Longitudinal data foundation
- **Already exists (V):** `athlete_metric_observations` (150 rows; columns `user_id, video_id, source,
  metric_key, value, unit, engine_version, recorded_at, session_id, source_row_id, capture_context jsonb,
  context_key, confidence, noise_floor`); writer `ledger_record(...)`; trigger function
  `ledger_from_sources` on `combine_results, baserunning_splits, sprint_analyses, delaycam_reps,
  block_workout_metrics, athlete_load_tracking, athlete_daily_log, hie_snapshots`; `ledger_from_videos` on
  `videos`; `ledger_record_tiles`; `capture_session_ledger` on `performance_sessions`.
  Baselines: `athlete_baseline_history` (151 rows; median, q1, q3, robust_sd, band_lo/hi, trend),
  `athlete_baseline_alerts` (0), `baseline_recompute(p_obs)`. Vocabulary: `measurement_definitions`
  (5 keys: `lifting.session_rpe`, `readiness.readiness_score`, `workload.cns_load_total`, two softball SFC
  keys). Readers: `src/components/progress/BaselineAlertsCard.tsx`, RPC `coach_athlete_trends`.
- **Missing vs the plan (V by `information_schema` scan):** `device_id` **NF** in any table;
  `capture_fps` only inside `capture_context` jsonb (delaycam path); `rep_index` **NF** on observations;
  `source` holds a domain (`combine`, `readiness`, `workload`, `lifting`, `self_test`), not
  `cv_measured/manual/healthkit`.
- **Validation Lab pieces that exist:** `src/lib/biomech/validation/tempoHarness.ts`,
  `tempoCorpusIngestion.ts`, `src/lib/biomech/gates/*` (tempoGate, livePitchGate, movementGate),
  `parity-harness.html`, `cv_calibration_sessions`/`cv_calibration_frames` (0 rows). Owner lab screen **NF**.
- **Consent:** `legal_documents` slugs include `health-data-consent`, `consumer-health-data`,
  `health-data-sharing`, `medical-safety`, `minor-waiver`, `child-safety`; a biometric/pose document **NF**.
  `consent_records`: health-data-consent accepted 53, **declined 28**. `parent_consents.training_opt_in`.
- **Also touches:** `delete-account/ownedTables.ts` (249 table entries), `legal-consent/ownedTables.ts`,
  `anon_training_refresh` / `anon_training_records` (4,167 est. rows), `wk_feature_switches` (flag home).
- **Must not break:** existing 150 observations and 151 baselines; `record_my_test`; coach Trends tab;
  `src/lib/reportCard/release1.ts` visibility; `src/test/liveSwitchGuard.test.ts` (no test writes switches).
- **4.2:** Neutral (server-side), except the Validation Lab capture which runs in the app.

### Release 1 — In-app recording ("Report Card+")
- **Touches:** `src/pages/AnalyzeVideo.tsx`, `src/components/analyze/HighFpsCapture.tsx`,
  `components/analyze/DelayCam.tsx`, `src/lib/capture/highFpsCapture.ts` (`FPS_TARGET 120`,
  `FPS_TRACKING_FLOOR 58`), `src/lib/delaycam/*` (recording, session/repSplitter, sessionStore,
  metricRegistry), `src/lib/biomech/pose/poseRunner.ts`, `biomech/camera/cameraView.ts`,
  `src/lib/reportCard/release1.ts` (`RELEASE1_HITTING_SUPPRESSED = true`), `reportCard/disciplines/bh.ts`
  (18 tiles), `docs/camera-requirements.md` (per-tile view map), tables `videos`, `delaycam_sessions` (0),
  `delaycam_reps` (0, has `rep_index`, `fps_measured`), `video_landmark_runs` (122), `video_metric_runs` (71),
  `video_analysis_runs` (367); functions `analyze-video`, `recompute-report-card`, `recompute-video-metrics`;
  routes `/analyze/:module`, `/delaycam`, `/delaycam/:module`.
- **Must not break:** Core memory "Report Card AND Game IQ internal-only" (owner/admin only); DelayCam
  owner ruling "upload = body only" (`docs/delaycam-performance-spec.md`); `bhNamingRule.test.ts`,
  `hittingCardBatch1.test.ts`; written-analysis rules (Oct 28 memory).
- **4.2:** **Strong** (camera + device tilt/motion).

### Release 2 — Jump Lab
- **Touches:** `jump_landing_ratings`, `JumpLandingRating.tsx`, `_shared/wic/jumps/taxonomy.ts` and
  `jumps/plan.ts`, RPC `set_jump_tags`, `wk_standard_attempts/awards`, `record_my_test` jump keys,
  6-week keys (`vertical_jump`, `standing_broad_jump`, `sl_broad_jump`, `sl_vert_jump`,
  `sl_lateral_broad_jump`, `sl_3x_bound`), combine `broad_jump`, `vertical_jump_height`,
  `BalanceTest.tsx` asymmetry contract (25% / 4 s / 8 s), `docs/wic/lifting-research-inventory.md`
  (CMJ/RSI marks), `docs/wic/weight-room-standards-v1.md`.
- **Must not break:** standards recognition-only (Core memory); jump competency from landing ratings
  (`wic/AGENTS.md`).
- **4.2:** **Strong**.

### Release 3 — Pogo monitor (EPI)
- **Touches:** `wk_session_logs` for pogo rows, `wk_movement_catalog` jump columns, `BarefootReadinessTest.tsx`,
  `SpeedReadinessCheck.tsx`, `src/lib/speed/speedEngine.ts` (`readinessScore`, `cutReps`),
  `wk_exposure_daily` (2,251 rows), `running_sessions.ground_contacts_total` (0 rows),
  `_shared/wic/schedule/tissueCost/*`.
- **Must not break:** Core memory "Training methods ... reps never [move]" — a GCT stop rule ends a set
  early, which is a dose change (**owner rule needed**); dose authority `resolveDose()` (v4 §1).
- **4.2:** **Strong** (high-fps native capture).

### Release 4 — Active ROM scan
- **Touches:** `src/lib/assessment/movementScreen.ts` (`shoulder_ir`, `shoulder_er`, `hip_ir`, `hip_er`,
  `thoracic`, `ankle_wall`), `initial_assessments.movement_screen`, RPC `coach_record_movement_screen`,
  `coach_athlete_movement_observations`, `SavedMovementSummary.tsx`, 6-week keys (`shoulder_rom_external`,
  `shoulder_rom_internal`, `hip_internal_rotation`, `ankle_dorsiflexion`), combine `active_rom_shoulder/elbow/hip`.
- **Must not break:** `movementScreen.ts:1` "Observations only: no normative angles, diagnosis or inferred
  painless results"; project rule "Movement: training+health consent, never dose".
- **4.2:** **Strong** (camera + IMU).

### Release 5 — Automated initial assessment
- **Touches:** route `/assessment` (`AssessmentEntry`), `InitialAssessmentCard.tsx`, `FinishProfileFlow.tsx`,
  `AssessmentProfileReview.tsx`, RPC `initial_plan_missing`, RPC `start_hammers_today`,
  switch `hammers_today_start_gate` (mode `all`), `initial_assessments.step_progress/current_step/mode_opened_at`.
- **Must not break:** Start gate (`hammers_today_started_at`); onboarding required questions (memory Nov 3);
  conservative unanswered starts; parent-present confirmation for minors (`parent_present_confirmed_at`).
- **4.2:** **Strong**.

### Release 6 — Combine timing, single gate
- **Touches:** `combine_sessions`/`combine_results` (0/0; monthly trigger
  `combine_enforce_monthly_eligibility` per REPORT-CARD doc §6, **DOC**), `src/lib/combine/events.ts`
  (19 events), `sportEvents.ts`, `tierGating.ts`, `eligibility.ts`, route `/combine/entry` (coming soon),
  `/combine/results`; `baserunning_splits` events (`home_to_first`, `ten_yard_split`, `thirty_yard_dash`,
  `sixty_yard_dash`, lead distances — V `src/lib/baserunning/splits.ts:10-17`); `record_my_test` sprint keys;
  6-week keys (`sixty_yard_dash`, `ten_yard_dash`, `seven_yard_dash`, `thirty_yard_dash`, `forty_yard_dash`,
  `first_step_5yd`); `testing_days.result_test_id`; `scale_reference` (14 rows); `sprint_analyses` (PARKED).
- **Must not break:** combine monthly cadence and tier gates; softball distances in REPORT-CARD §6
  (10/20/40/Flying 20) vs the plan's 7 yd — **owner to reconcile**; `sixty_yard_dash` **NF** in
  `combine/events.ts`, `seven_yard_dash` **NF** in combine events.
- **4.2:** **Strong** (ARKit distance).

### Release 7 — Multi-gate splits, 5-10-5, base paths, stride
- **Touches:** `baserunning_splits`, `src/lib/baserunning/homeToFirstGrade.ts`, `splitGrade.ts`, combine
  `five_ten_five_shuttle`, 6-week `pro_agility`, `ten_thirty_split`, `thirty_sixty_split`,
  `gp_baserun_events`, `_shared/wic/conditioning/inSeasonSprints.ts`, `combinedBaseRunning.ts`,
  `runRest.ts` base-route text, `speed_sessions.steps_per_rep`.
- **Must not break:** base-route Swap rule (same bases and distance); "no running-form analysis ever" —
  `sprint_analyses` already has `acceleration_profile`, `steps_per_split` (parked; keep form judgments out).
- **4.2:** **Strong**.

### Release 8 — Base-stealing reaction automation
- **Touches:** `src/pages/BaseStealingTrainer.tsx`, `components/base-stealing/*` (LiveRepRunner,
  ManualRepRunner, PostRepInput, ReactionSignal, RepReviewPlayer, SessionSummary), function
  `analyze-base-stealing-rep`, `performance_sessions` (`session_type 'base_stealing'`, `micro_layer_data`),
  `src/lib/stealAnalytics.ts`, `softballStealAnalytics.ts`, routes `/base-stealing`
  (`SoftballLock base_stealing_baseball`), `/softball-stealing`, `/pickoff-trainer`.
- **Must not break:** `trg_capture_session_ledger` on `performance_sessions`; MPI inputs (`mpi_scores`, 892 rows).
- **4.2:** **Strong**.

### Release 9 — Readiness loop
- **Touches:** `compute-hammer-state`, `hie-analyze`, `nightly-hie-process`, `hie_snapshots` (trigger
  `ledger_readiness`), `calculate-regulation` → `physio_daily_reports` (21), `_shared/wic/checkInReductions.ts`,
  `_shared/startReadiness.ts`, `_shared/readiness/runningReadiness.ts`, `app_settings.greenlight_ready_threshold`,
  RPCs `coach_athlete_readiness`, `coach_team_readiness_today`, `wk-generate-daily`, `plan-swap` day-lock,
  switches `load_spike_protection`, `adaptive_phases`, `personalization`.
- **Must not break:** saved-plan rules (no flash/rebuild on reload; seven-date day-lock; `rules_version_sweep`);
  check-ins mandatory; coach access only with health consent (Core memory).
- **4.2:** **Strong** (HealthKit).

### Release 10 — Post-activity scan → 90-s routine → 30-min re-check
- **Touches:** `_shared/wic/recovery/*`, `_shared/tissueCare/*`, `wk_recovery_acks`,
  `_shared/wic/conditioning/gameFlush.ts`, Release A local notifications (30-min ping), Release 4/2 scans.
- **Must not break:** in-season memory Nov 5 "No post-game sprints/flush" — a post-**game** routine must
  stay a note, never new work (**owner rule needed** whether it applies after games).
- **4.2:** **Strong**.

### Release 11 — Camera VBT
- **Touches:** `wk_session_logs.load_used, rpe, bar_feel, metrics`, `wk_standard_attempts`,
  `_shared/wic/dosage/doctrine.ts` `resolveDose()` (**DOC** v4 §1), lifting v4 Stage 6 Reload Detector
  (RIR drift input), `lifting-research-inventory.md:62` velocity zones, `src/components/hammer/cards/RestTimer.tsx`.
- **Must not break:** Core memory "sets may move ±1 within envelope, reps never"; Round 8 "lift schemes
  never change; never show unverified weights". A 20%/30% velocity-loss cutoff ends sets early =
  **owner rule needed**.
- **4.2:** **Strong**.

### Release 12 — Live CV coaching
- **Touches:** `src/components/hammer/cards/FocusSession.tsx`, `ExerciseInstructions.tsx`
  (RPC `get_exercise_live_text`), `ExerciseVideo.tsx` (`get_exercise_video`), Exercise Vault
  (`/owner/exercise-vault`, function `exercise-vault`, `exercise_vault_versions/drafts/audit`),
  `wk_movement_catalog`, `@mediapipe/tasks-vision` (in `package.json`).
- **Must not break:** focus cursor over canonical rows; saves before rest starts (project rules).
- **4.2:** **Strong**.

### Release 13 — Two-camera sync + native 240 fps plugin
- **Touches:** `docs/camera-requirements.md` "Two clips of one delivery — not built"; `videos`,
  `delaycam_*`, `video_landmark_runs`, `pose-landmarks` bucket (36 objects), `videos` bucket
  (1,493 objects, 8,944 MB). Native Swift camera plugin **NF** in `ios/`.
- **Must not break:** `ballTrackingGate.ts` fps floor parity with `highFpsCapture.ts`; storage/IO limits
  (`docs/owner/db-capacity.md`).
- **4.2:** **Strong** (custom native code).

### Release 14 — Mechanics tiles + Report Card back on
- **Touches:** `src/lib/reportCard/release1.ts`, disciplines `bh.ts`/`bp.ts`/`sp.ts`/`throwing.ts`,
  `src/lib/biomech/metrics/*` flags (10 `MEDIAPIPE_*_ENABLED = false`), `ROOT_EVIDENCE_ENABLED = false`,
  `TIPPING_DETECTION_ENABLED = false`, `_shared/scoredGradingGate.ts`, `delaycam_reps.metrics` (ledger
  trigger `ledger_delaycam`), `src/lib/reportCard/contracts/delaycamPerformance.ts`, function
  `recompute-report-card`, `src/components/report-card/hammer/*`.
- **Must not break:** Core memory Report Card internal-only (Oct 19) until the owner lifts it; grades by 5s;
  Elite filter (never flag arm slot/elbow height).
- **4.2:** **Strong**.

### Release 15 — Ball and bat CV
- **Touches:** `src/lib/cv/ball/onDeviceBallDetector.ts` (`ON_DEVICE_BALL_DETECTOR_ENABLED = false`),
  `src/lib/cv/runBallFlight.ts`, functions `pitch-velocity-measure`, `pitch-velocity-prep` (route
  `/pitch-velocity` StaffOnly, V `App.tsx:497`), `cv_velocity_measurements` (0), `cv_calibration_*` (0),
  `ROBOFLOW_API_KEY` (present), `onnxruntime-web` (in `package.json`), `gp_pitches.pitch_velo`,
  `gp_at_bats.exit_velo/launch_angle`, `throwing_reps`, `catching_reps`, `practice_swing_logs.pitch_mph`,
  `_shared/wic/batSpeed/*`.
- **Must not break:** Core memory "Pitch velocity pipeline is owner/admin only — gate UI AND edge function".
- **4.2:** **Strong**.

---

## 5. More places CV, sensors or automation could go further (24)

| # | Missed manual step (V where it lives) | Proposed owner release |
|---|---|---|
| X1 | Throw counts for the arm ledger (`arm_ledger_entries`, `estimateThrows`) | **15** (ball CV) or Apple Watch motion later (**A** extension) |
| X2 | Rep counting for lifts and swings (`wk_session_logs.reps_completed`, `hitting_swing_efforts`) | **12** / **1** |
| X3 | "Done" detection instead of one-tap (`wk_prescriptions`) | **12** |
| X4 | Sleep start/end (`vault_focus_quizzes.sleep_time, wake_time`) | **A** |
| X5 | Body weight (`weight_entries`) | **A** |
| X6 | Workouts outside Hammers for CNS load (`custom_activity_logs`, E29 gap) | **A** + **9** |
| X7 | Balance timer replaced by sway measurement (`BalanceTest.tsx`) | **5** |
| X8 | Per-device touch-latency calibration for reaction tests (`QuickReactionTest.tsx`, Tex Vision) | **0** |
| X9 | Landing frame auto-picked on upload (`videos.landing_time_sec`) | **1** |
| X10 | Reference distance by ARKit instead of typing (`cv_calibration_sessions.reference_distance_ft`) | **6** |
| X11 | Pitch count per outing (`pitcher_outings.pitch_count`) | **15** |
| X12 | At-bat events from game video (`gp_at_bats.source_video_id` already exists) | **15** (later phase) |
| X13 | Weather/conditions stamp (`environment_snapshots` 0 rows; function `get-weather`; `OPENWEATHER_API_KEY` present) | **0** (`capture_conditions`) |
| X14 | Device model / camera / OS stamp on every reading (no `device_id` anywhere) | **0** |
| X15 | Thrower speed in practice log (`practice_swing_logs.pitch_mph`) | **15** |
| X16 | Release distance in practice log (`practice_swing_logs.release_ft`) | **6** (ARKit) |
| X17 | Org testing-day results linked automatically (`testing_days.result_test_id`) | **6** |
| X18 | Coach on-spot screen camera-guided (`coach_record_movement_screen`) | **4/5** |
| X19 | Wingspan / limb lengths (`athlete_limb_measurements`, 0 rows) | **4** (calibrated photo/ARKit) |
| X20 | Catcher pop time (`catching_reps`, 6-week `pop_time`) | **15** + **6** |
| X21 | Cycle phase (`physio_adult_tracking.cycle_phase`) from HealthKit | **A** (adult-only, separate consent) |
| X22 | Defensive hang time / play time (`defensive_plays`) | **15** (later) |
| X23 | Hydration from HealthKit water (`hydration_logs`) | **A** (optional) |
| X24 | Sprint rep seconds auto-filled in Hammers Today (`conditioning_rep_feedback.seconds`) | **6** |

---

## 6. Measurement storage inventory (row counts Nov 8 2026)

Time / device / confidence / source: **Y** = a column exists (V `information_schema`), **–** = missing.

| Table | Rows | Time | Device | Confidence | Source | How Release 0 absorbs it |
|---|---|---|---|---|---|---|
| `athlete_metric_observations` | 150 | Y `recorded_at` | – | Y | Y (domain) | **This is the Release 0 table.** Add device/fps/conditions/rep_index/source-kind; keep rows |
| `athlete_baseline_history` | 151 | Y `computed_at` | – | – | – | **This is the baseline table.** Keep |
| `athlete_baseline_alerts` | 0 | Y | – | – | – | keep |
| `measurement_definitions` | 5 | Y | – | Y `min_confidence` | – | **This is the vocabulary table.** Extend |
| `wearable_metrics` | 0 | Y `captured_at` | – | – | Y | A writes here, trigger to ledger |
| `vault_performance_tests` | 7 | Y `test_date` | – | – | – | **no ledger trigger today** — add a link/backfill keyed by `test_type`+result key |
| `combine_results` / `combine_sessions` | 0 / 0 | Y | – | Y | Y | already triggered (`ledger_combine`) |
| `baserunning_splits` | 0 | Y | – | Y | Y | already triggered |
| `sprint_analyses` (PARKED) | 0 | Y | – | Y | Y `ai_model` | triggered; keep parked |
| `delaycam_sessions` / `delaycam_reps` | 0 / 0 | Y | – | Y `boundary_confidence` | Y `engine_version` | triggered (fps in `capture_context`) |
| `cv_velocity_measurements` | 0 | Y | – | Y | Y `method` | **no trigger** — add |
| `cv_calibration_sessions` / `_frames` | 0 / 0 | Y | – | – | – | link as evidence |
| `throwing_reps` / `catching_reps` | 0 / 0 | Y | – | Y | Y | **no trigger** — add |
| `defensive_plays` | 1 | Y | – | Y | Y | **no trigger** — add |
| `wk_session_logs` | 18 | Y `plan_date` | – | – | – | link per set; no trigger today |
| `wk_standard_attempts` / `_awards` | 0 / 0 | Y | – | – | Y | link |
| `jump_landing_ratings` | 0 | Y | – | – | – | judgment, keep separate |
| `conditioning_rep_feedback` | 0 | Y | – | – | – | has `rep_index`; link |
| `hitting_swing_efforts` | 0 | Y | – | – | – | link |
| `practice_swing_logs` | 0 | Y | – | – | – | link |
| `athlete_height_checks` | 91 | Y `measured_on` | – | – | Y | backfill as `manual` |
| `athlete_limb_measurements` | 0 | Y | – | – | Y | backfill |
| `weight_entries` | 48 | Y `entry_date` | – | – | – | backfill as `manual` |
| `vault_progress_photos` | 5 | Y | – | – | – | keep separate (photos) |
| `vault_focus_quizzes` | 184 | Y `entry_date` | – | – | – | link sleep/RHR/reaction/balance keys |
| `physio_daily_reports` | 21 | Y | – | – | – | derived; keep |
| `hie_snapshots` | n/c | Y | – | – | – | already triggered (`ledger_readiness`) |
| `athlete_load_tracking` | 22 | Y | – | – | – | already triggered |
| `athlete_daily_log` | 14 | Y | – | – | – | already triggered |
| `block_workout_metrics` | 2 | Y | – | – | – | already triggered |
| `wk_cns_ledger` | 605 | Y | – | – | – | derived; keep |
| `wk_exposure_daily` | 2,251 | Y | – | – | Y `sources` | derived; keep |
| `arm_ledger_entries` | 174 | Y | – | – | Y | link (throw counts) |
| `pitcher_outings` | 8 | Y | – | – | Y | link |
| `tex_vision_drill_results` | 218 | Y `completed_at` | – | – | – | link with latency caveat |
| `tex_vision_metrics` | 0 | Y | – | – | – | derived |
| `royal_timing_sessions` | 3 | Y | – | – | – | keep |
| `speed_sessions` / `speed_partner_timings` | 2 / 3 | Y | – | – | Y `timed_by` | backfill as `manual` (retired screen) |
| `performance_sessions` | 39 | Y | – | – | – | already triggered (`trg_capture_session_ledger`) |
| `gp_at_bats` / `gp_pitches` / `gp_games` | 14 / 27 / 19 | Y | – | – | Y `entry_source` | link typed speeds as `manual` |
| `vault_scout_grades` | 15 | Y `graded_at` | – | – | Y `grade_source` | keep (grades, not measurements) |
| `videos` | 687 | Y | – | – | Y `capture_fps_source` | already triggered (`ledger_videos`) |
| `video_landmark_runs` / `video_metric_runs` / `video_analysis_runs` | 122 / 71 / 367 | Y | – | partial | Y versions | evidence; keep |
| `mpi_scores` | 892 | Y | – | – | – | derived; keep |
| `initial_assessments` | 26 | Y | – | – | Y `recorded_by` | link movement-screen numbers |
| `analysis_fault_findings` | 760 | Y | – | – | Y | evidence; keep |
| `scale_reference` | 14 | Y | – | – | – | anchors; keep |
| `records` | 0 | Y | – | – | – | keep |

"n/c" = not counted in this audit. Absorb rule for Release 0: **never move or delete source rows**; add
triggers or a one-time backfill into `athlete_metric_observations` with `source_row_id` pointing back
(the existing pattern), stamp historical rows `source = manual` and device unknown.

---

## 7. Native inventory

**Plugins in `package.json` (V lines 26-34) and real use:**

| Plugin | Used in (V) | State |
|---|---|---|
| `@capacitor/push-notifications ^8` | `src/components/onboarding/NotificationPrimer.tsx` only | Asks permission. No `register()`, no `registration` listener, no token saved, no server sender, no APNs secret. AppDelegate has no remote-notification methods |
| `@capgo/native-purchases ^8.9.6` | `src/lib/addons/client.ts:31` | Add-on in-app purchase; server `verify-apple-purchase` |
| `@capacitor-community/stripe ^8.3.0` | `src/lib/addons/client.ts:43` | Payment sheet; server `create-lesson-payment-sheet` |
| `@capacitor/preferences ^8` | `src/lib/auth/nativeSessionStore.ts` | Session mirror for iOS |
| `@capacitor/browser ^8` | `src/lib/auth/nativeOAuth.ts` | OAuth |
| `@capacitor/app ^8` | `nativeOAuth.ts`, `purchase/websiteHandoff.ts`, `purchase/nativeStorefront.ts` | URL/resume events |
| `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli` | throughout | 8.5.1 |
| Custom `Storefront` plugin | `src/lib/purchase/nativeStorefront.ts:14` `registerPlugin("Storefront")` | Swift side below |

**Not installed (NF):** haptics, local-notifications, motion, camera (native), HealthKit, widgets, ARKit.

**iOS files in the repo (V):** `ios/App/App/AppDelegate.swift`, `SceneDelegate.swift`, `Info.plist`,
`Base.lproj/Main.storyboard`, `LaunchScreen.storyboard`, `Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
(one 1024×1024 universal icon), `Splash.imageset` (3 PNGs), **`HammersBridgeViewController.swift`**,
**`StorefrontPlugin.swift`**, `App.xcodeproj/project.pbxproj`, `CapApp-SPM/Package.swift`, `ios/debug.xcconfig`.
Bundle id `com.hammersmodality.app`, iOS 15.0.

**Referenced but missing / not wired (V):**
- `HammersBridgeViewController.swift` and `StorefrontPlugin.swift` are in the folder but **not in
  `project.pbxproj`** (only AppDelegate.swift, SceneDelegate.swift, Main.storyboard are), and
  `Main.storyboard` uses `customClass="CAPBridgeViewController"`, not `HammersBridgeViewController`. In this
  repo copy the Storefront plugin would not compile or register. The owner's Mac copy is the working one.
- Sign in with Apple entitlements: no `.entitlements` file **NF**; no `CODE_SIGN_ENTITLEMENTS` in pbxproj **NF**.
- `CapApp-SPM/Package.swift` lists only Capacitor/Cordova — none of the 6 npm plugins (it is regenerated
  by `cap sync`, so the repo copy is stale).
- `Info.plist` has **no** `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`,
  `NSMotionUsageDescription`, `NSHealthShareUsageDescription`, `NSPhotoLibraryUsageDescription` **NF**.
- App icon set has only the single 1024 icon (the owner keeps the full icon on his Mac).

**How native vs web is detected today (V):**
- `src/lib/purchase/purchaseGate.ts` `isNativeShell()` — `window.__HAMMERS_NATIVE__`, then
  `Capacitor.isNativePlatform()`, then `window.Capacitor`, then `capacitor:`/`ionic:` protocol. Documented as
  the single source for purchase UI.
- `src/lib/addons/client.ts:9` `isIOSApp()` = `isNativePlatform() && getPlatform() === "ios"`.
- `nativeSessionStore.ts:20`, `NotificationPrimer.tsx:20,28` call `Capacitor.isNativePlatform()` directly.

**Where in-app-only gating should live:** one shared judge next to `isNativeShell()` (e.g. a
`measurementSurface` helper) used by **both** the route/screen and the server write path (the server can
only trust a signed device attestation or a native-only header — today **NF**). Plus the per-release
`wk_feature_switches` row (existing `mode` + `allowlist` pattern; used by `swap_v2` with 14 allowlisted
accounts).

**Secrets by NAME (V `secrets` list, 17):** `APPLE_BUNDLE_ID`, `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_KEY_ID`,
`APPLE_IAP_PRIVATE_KEY`, `GOOGLE_AI_API_KEY`, `GOOGLE_CALENDAR_API_KEY`, `LOVABLE_API_KEY`, `OPENAI_API_KEY`,
`OPENWEATHER_API_KEY`, `OWNER_INIT_KEY`, `Owner_Key`, `RESEND_API_KEY`, `ROBOFLOW_API_KEY`,
`STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TCS_RUNNER_TOKEN`.
Push/APNs secret **NF**.

---

## 8. Tools needed per release (identify before each section starts)

| Release | Ground-truth device | Apple keys / capabilities | Plugins / native code | Accounts / secrets |
|---|---|---|---|---|
| A | iPhone + Apple Watch (HRV/RHR reference); a second phone for push tests | APNs Auth Key (.p8) + Key ID + Team ID; Push Notifications capability (`aps-environment`); HealthKit capability + `NSHealthShareUsageDescription`; App Group + WidgetKit extension (widget, later) | push token registration; `@capacitor/local-notifications`, `@capacitor/haptics`; a HealthKit plugin; widget extension | new APNs secrets (names to be chosen; none exist) |
| 0 | none new (the lab logs whichever device each release uses) | — | — | migration authorization by name |
| 1 | iPhone with 120/240 fps; tripod; owner-labeled clips | `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSMotionUsageDescription` | native camera (or WebView getUserMedia with plist strings); CoreMotion tilt | — |
| 2 | force plate or contact mat (CMJ, mRSI); tape (broad jump) | camera + motion strings | 240 fps capture | — |
| 3 | contact mat / force plate with ms timing | same | 240 fps native camera (15–20 ms drift is sub-frame at 60 fps) | — |
| 4 | goniometer / digital inclinometer, clinician | `NSMotionUsageDescription` | CoreMotion (IMU tilt) | — |
| 5 | PT/athletic-trainer scored reference screens | camera | on-device pose (`@mediapipe/tasks-vision` present) | — |
| 6 | timing gates (e.g. laser/photocell) + measuring wheel | ARKit (world tracking) | ARKit plugin | — |
| 7 | multi-gate timing system | ARKit | ARKit + 240 fps | — |
| 8 | synced light/sound start signal + timing gate | camera | 240 fps | `OPENAI_API_KEY` today (to be removed from the value path) |
| 9 | Apple Watch / chest strap (HRV) + Release 2 device | HealthKit | from A and 2 | — |
| 10 | from 2 and 4 | local notifications | from A | — |
| 11 | linear position transducer or validated VBT device | camera | 240 fps; bar/plate tracking model | — |
| 12 | owner-labeled rep set | camera | on-device pose | — |
| 13 | two iPhones + a time-sync method | camera | **custom Swift 240 fps plugin** (NF today), sync | — |
| 14 | labeled clip corpus per tile | camera | from 1 and 13 | — |
| 15 | radar gun (ball), bat sensor (bat speed), launch monitor (exit velo/spin) | camera | ONNX model asset (detector returns `model_asset_missing` without it — DOC REPORT-CARD §7) | `ROBOFLOW_API_KEY` (present) |

---

## 9. Risks (16)

| # | Risk (V source) |
|---|---|
| R1 | **iOS repo drift.** Bridge VC and Storefront plugin not in the Xcode project; storyboard uses the stock bridge; SPM package lists no plugins; no entitlements; no camera/mic/motion/health usage strings. Any native release built from this repo would break purchases or crash on permission use. |
| R2 | **Second measurement table.** `athlete_metric_observations` + `ledger_record` + baselines + `measurement_definitions` already exist with 150/151/5 rows. A new table would split truth; Release 0 must extend these. |
| R3 | **Silent ledger loss.** `ledger_from_sources` catches every error and only `RAISE WARNING` — failed records vanish without a trace a test can see (by design "never cost a clip", project rule). |
| R4 | **Four metric vocabularies** for the same tests: combine events (`thirty_yard_dash`, `vertical_jump_height`, `broad_jump`), baserunning (`sixty_yard_dash`, `ten_yard_split`), 6-week registry (39 keys incl. `vertical_jump`, `standing_broad_jump`, `seven_yard_dash`), self-tests (`test.sprint_60yd_s`, `test.broad_jump_in`). One live key is `combine.TEST 60-yard dash` (spaces). |
| R5 | **6-week tests are outside the ledger** (no trigger on `vault_performance_tests`); units live in untyped jsonb. |
| R6 | **No biometric/pose consent document**; 28 accounts declined health-data consent; minors and under-13 (parent `training_opt_in`); anonymous training store scope is lawyer-approved and must not silently grow. |
| R7 | **Report Card internal-only (Core memory, Oct 19)** collides with Release 1 "Report Card+" and Release 14 — owner must say what athletes may see. |
| R8 | **Dose-authority conflicts:** Release 3 GCT stop rule and Release 11 velocity-loss cutoff end sets early; Core memory says reps never move and methods never author dose. Release 9 "auto-adjusts Hammers Today" must go through the existing day-lock and safety order. |
| R9 | **Normative angles vs observation-only doctrine:** `movementScreen.ts:1` forbids normative angles; Release 4 wants catalog matching. |
| R10 | **Combine distances disagree:** plan (60 yd, 10 yd baseball, 7 yd softball) vs `combine/events.ts` (no 60, no 7) and REPORT-CARD §6 softball set (10/20/40/Flying 20). |
| R11 | **Frame rate truth:** 571/687 videos carry no fps; WebView capture is MediaRecorder; 240 fps needs a native plugin that does not exist. Gate 1 (real fps counted) fails for history. |
| R12 | **IO and storage:** DB 3,381 MB; `videos` bucket 8,944 MB / 1,493 objects; Oct 30 IO outage (`docs/owner/db-capacity.md`). Per-rep 240 fps storage and per-rep ledger rows multiply load. |
| R13 | **Readiness defaults drive the plan** (sleep 7, CNS 7, soreness 3; readiness 70; axes 50). Replacing them with "unknown" changes plan behavior and must be proven against the saved-plan rules. |
| R14 | **No server-trustable "came from the iPhone app" signal.** Web users could call write paths directly unless the server checks something only the app can send (NF today). |
| R15 | **Flag names already taken:** 29 `wk_feature_switches` keys (incl. `swap_v2`, `one_tap_logging`, `adaptive_phases`, `personalization`, `load_spike_protection`, `plan_prompts_v2`); code flags `ON_DEVICE_BALL_DETECTOR_ENABLED`, `TIPPING_DETECTION_ENABLED`, 10 `MEDIAPIPE_*_ENABLED`, `RELEASE1_HITTING_SUPPRESSED`. New releases need new unique keys. |
| R16 | **Account deletion and legal lists** (`delete-account/ownedTables.ts`, 249 entries; `legal-consent/ownedTables.ts`) must include every new table, or deletion leaves biometric data behind. |
