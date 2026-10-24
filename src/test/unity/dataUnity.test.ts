/**
 * Data-unity contract tests — one per row of docs/owner/data-unity-matrix.md.
 *
 * Each test asserts the writer source actually writes the declared table and
 * every direct-reader source actually reads it. Gap rows assert the current
 * (gapped) behavior explicitly so the gap is documented in code and any future
 * fix flips the test, forcing the matrix doc to be updated too.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..", "..");
const src = (p: string) => readFileSync(resolve(root, p), "utf8");

/** Assert `file` mentions `table` (a write or a read of that table). */
const touches = (file: string, table: string) => {
  const body = src(file);
  expect(body.includes(table), `${file} should reference ${table}`).toBe(true);
};

describe("data-unity matrix", () => {
  it("1. plan cards & focus logs → wk_session_logs → standards, coach discipline, plan generation", () => {
    // writers
    touches("src/hooks/useExerciseLog.ts", "wk_session_logs");
    touches("src/components/hammer/WkCardCompletion.tsx", "wk_session_logs");
    touches("src/components/hammer/logging/CardOutcomeLog.tsx", "wk_session_logs");
    // readers
    touches("src/hooks/useStandards.ts", "wk_session_logs"); // General / Performance
    touches("drizzle/migrations/0052_coach_athlete_discipline.sql", "wk_session_logs"); // Coach Discipline
    touches("supabase/functions/wk-generate-daily/index.ts", "wk_session_logs"); // learning/plan
  });

  it("2. swaps → swap_log + athlete_equipment_memory → swap selection and plan generation", () => {
    touches("supabase/functions/plan-swap/index.ts", "wk_swap_item_atomic");
    touches("drizzle/migrations/0099_swap_existing_day_atomic_save.sql", "swap_log");
    touches("drizzle/migrations/0099_swap_existing_day_atomic_save.sql", "athlete_equipment_memory");
    // readers: equipment memory feeds future swaps and daily generation
    touches("supabase/functions/plan-swap/index.ts", "athlete_equipment_memory");
    touches("supabase/functions/wk-generate-daily/index.ts", "athlete_equipment_memory");
    // coach sees the swap through the saved plan snapshot
    touches("drizzle/migrations/0086_at5_coach_training_access.sql", "athlete_plan_snapshots");
  });

  it("3. coach prescriptions → coach_prescriptions + custom_activity_logs + wk_prescriptions rows → inbox, analytics, vault, compliance, discipline, engine, nightly", () => {
    touches("src/hooks/useSentActivities.ts", "coach_prescriptions");
    touches("src/hooks/useCustomActivities.ts", "custom_activity_logs");
    // Use instead / Add alongside turn the coach workout into real plan rows,
    // so completion logs to wk_session_logs like any Hammers card.
    touches("supabase/functions/coach-rx-safety/index.ts", "wk_prescriptions");
    touches("supabase/functions/_shared/coach/prescriptionSafety.ts", "user_id");
    // readers
    touches("src/hooks/useCoachPrescriptions.ts", "coach_prescriptions");
    touches("src/components/custom-activities/ActivityAnalytics.tsx", "custom_activity_logs"); // General / Growth
    touches("src/hooks/useVault.ts", "custom_activity_logs"); // Vault
    touches("src/components/coach/CoachComplianceView.tsx", "custom_activity_logs"); // Coach
    touches("supabase/functions/compute-hammer-state/index.ts", "custom_activity_logs"); // learning
    touches("supabase/functions/nightly-mpi-process/index.ts", "custom_activity_logs"); // nightly
    // Scheduling (run 6): pure date math, one row per player per scheduled day,
    // player "Use today" activation and sender edit/cancel/resend all go
    // through the same server function; scheduled days project onto the calendar.
    touches("src/lib/coachRx/schedule.ts", "computeScheduleDates");
    touches("src/hooks/useSentActivities.ts", "series_id");
    touches("supabase/functions/coach-rx-safety/index.ts", "activate_today");
    touches("supabase/functions/coach-rx-safety/index.ts", "cancel_series");
    touches("src/components/custom-activities/CoachWorkoutsPanel.tsx", "useMyCoachWorkouts");
    touches("src/lib/calendar/buildCalendarEvents.ts", "coach_prescription");
    touches("supabase/functions/coach-rx-safety/index.ts", "coach_rx_commit_choice");
    touches("drizzle/migrations/0108_coach_prescription_atomic_choice.sql", "wk_lock_plan_day");
  });

  it("4. practice logs → performance_sessions → History, load, engine, nightly", () => {
    touches("src/hooks/usePerformanceSession.ts", "performance_sessions");
    touches("src/hooks/useHistoryRecords.ts", "performance_sessions"); // History
    touches("src/hooks/useCategoryPracticeLoad.ts", "performance_sessions");
    touches("supabase/functions/compute-hammer-state/index.ts", "performance_sessions");
    touches("supabase/functions/nightly-mpi-process/index.ts", "performance_sessions");
  });

  it("5. player game logs → gp_* → History, coach games, team report, nightly", () => {
    touches("src/components/vault/quiz/MorningGameQuestions.tsx", "gp_games");
    touches("src/components/games/AtBatLogger.tsx", "gp_at_bats");
    touches("src/components/games/PitchLogger.tsx", "gp_pitches");
    touches("src/components/games/DefenseLogger.tsx", "gp_defense_plays");
    touches("src/components/games/BaserunLogger.tsx", "gp_baserun_events");
    // readers
    touches("src/hooks/useHistoryRecords.ts", "gp_games"); // History
    touches("drizzle/migrations/0037_coach_athlete_games.sql", "gp_at_bats"); // Coach Games
    touches("src/pages/CoachTeamReport.tsx", "gp_pitches"); // Coach team report
    touches("supabase/functions/nightly-mpi-process/index.ts", "gp_games"); // nightly
  });

  it("6. coach-entered game logs → coach_logged_entries + gp_games → History and Coach Games", () => {
    touches("src/components/coach/CoachLogForPlayer.tsx", "coach_log_entry");
    touches("drizzle/migrations/0063_coach_logging.sql", "coach_logged_entries");
    touches("drizzle/migrations/0063_coach_logging.sql", "arm_ledger_entries");
    // Fixed in 0105: coach_log_entry mirrors game entries into gp_games
    // (entry_source='coach', ignored_for_training=true — the arm ledger already
    // carries the throw load), and undo / not-me flag soft-delete the row.
    touches("drizzle/migrations/0105_data_unity_coach_games_combine_readiness.sql", "gp_games");
    touches("drizzle/migrations/0105_data_unity_coach_games_combine_readiness.sql", "ignored_for_training");
    touches("drizzle/migrations/0105_data_unity_coach_games_combine_readiness.sql", "gp_game_id");
    // readers: History game list and Coach Games both read gp_games
    touches("src/hooks/useHistoryRecords.ts", "gp_games");
    touches("drizzle/migrations/0037_coach_athlete_games.sql", "gp_games");
    // 0106 fixed a pre-existing crash: the player confirm/flag path referenced
    // a non-existent is_parent_of; the real parent check is is_authorizing_parent.
    touches("drizzle/migrations/0106_fix_player_resolve_coach_entry_parent_check.sql", "is_authorizing_parent");
  });

  it("7. video analyses → videos → coach development, scout profile, history aggregate", () => {
    touches("src/pages/AnalyzeVideo.tsx", "videos");
    touches("drizzle/migrations/0086_at5_coach_training_access.sql", "analysis_fault_findings"); // Coach Development
    touches("drizzle/migrations/0047_scout_athlete_profile_type_fix.sql", "videos"); // Scout Profile
    touches("src/hooks/useHistoryRecords.ts", "videos"); // aggregate count
  });

  it("8. vault tests → vault_performance_tests → vault, coach tests, org ranking, scout", () => {
    touches("src/hooks/useVault.ts", "vault_performance_tests");
    touches("drizzle/migrations/0033_coach_tests_and_private_notes.sql", "vault_performance_tests"); // Coach tests
    touches("drizzle/migrations/0042_org_test_ranking.sql", "vault_performance_tests"); // Org comparisons
    touches("drizzle/migrations/0047_scout_athlete_profile_type_fix.sql", "vault_performance_tests"); // Scout
  });

  it("9. combine results → combine_results → coach tests, org ranking, scout profile", () => {
    touches("src/hooks/useEvaluatorCombine.ts", "combine_results");
    touches("src/hooks/useMyCombineResults.ts", "combine_results"); // player's own view
    // Fixed in 0105: the coach/scout/org test RPCs now UNION combine_results
    // with vault_performance_tests.
    touches("drizzle/migrations/0105_data_unity_coach_games_combine_readiness.sql", "combine_results");
    touches("drizzle/migrations/0105_data_unity_coach_games_combine_readiness.sql", "coach_athlete_tests");
    touches("drizzle/migrations/0105_data_unity_coach_games_combine_readiness.sql", "org_test_ranking");
    touches("drizzle/migrations/0105_data_unity_coach_games_combine_readiness.sql", "scout_athlete_profile");
  });

  it("10. daily check-ins → athlete_daily_log → streaks, engine, nightly; coach readiness uses focus quizzes", () => {
    touches("src/hooks/useDailyLog.ts", "athlete_daily_log");
    touches("src/components/dashboard/DualStreakDisplay.tsx", "athlete_daily_log"); // General / Growth
    touches("supabase/functions/evaluate-behavioral-state/index.ts", "athlete_daily_log"); // learning
    touches("supabase/functions/nightly-mpi-process/index.ts", "athlete_daily_log"); // nightly
    // Fixed in 0105: coach readiness and org facility-board attendance now
    // count both check-in systems (focus quizzes + daily log).
    touches("drizzle/migrations/0053_coach_readiness_attendance_always.sql", "vault_focus_quizzes");
    touches("drizzle/migrations/0105_data_unity_coach_games_combine_readiness.sql", "athlete_daily_log");
    touches("drizzle/migrations/0105_data_unity_coach_games_combine_readiness.sql", "org_facility_board");
  });

  it("11. daily-standard checks → daily_standard_checks → vault check-in and identity widget", () => {
    touches("src/components/vault/quiz/MorningCheckInSuccess.tsx", "daily_standard_checks");
    touches("src/components/identity/DailyStandardCheck.tsx", "daily_standard_checks");
  });

  it("12. assessment → initial_assessments + movement_screen → assessment UI and coach on-spot", () => {
    touches("src/components/assessment/InitialAssessmentCard.tsx", "initial_assessments");
    touches("src/components/assessment/InitialAssessmentCard.tsx", "movement_screen");
    touches("src/components/coach/CoachOnSpotAssessment.tsx", "coach_record_movement_screen");
    touches("drizzle/migrations/0056_coach_onspot_assessment.sql", "movement_screen");
  });

  it("13. goals → athlete_body_goals → plan generation and regulation", () => {
    touches("src/hooks/useAthleteGoals.ts", "athlete_body_goals");
    touches("supabase/functions/wk-generate-daily/index.ts", "athlete_body_goals");
    touches("supabase/functions/generate-training-block/index.ts", "athlete_body_goals");
    touches("supabase/functions/calculate-regulation/index.ts", "athlete_body_goals");
  });

  it("14. equipment memory → athlete_equipment_memory → swap selection and daily generation", () => {
    touches("drizzle/migrations/0101_wk_swap_speed_item_atomic.sql", "athlete_equipment_memory");
    touches("supabase/functions/plan-swap/index.ts", "athlete_equipment_memory");
    touches("supabase/functions/wk-generate-daily/index.ts", "athlete_equipment_memory");
  });
});
