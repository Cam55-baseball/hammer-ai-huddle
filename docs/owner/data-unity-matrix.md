# Data-unity matrix — where every entry lands (Oct 24)

One row per entry kind. "Writes" is the table the entry is saved to. Each surface
column is marked: **direct** (the surface queries the table), **derived** (it reads
a saved summary/state built from the table), **by design** (intentionally not shown
there), or **GAP** (expected but not connected — listed honestly, not hidden).

Automated contract tests live in `src/test/unity/dataUnity.test.ts`: one test per
row asserts the writer source writes the declared table and every direct reader
source reads it. A FAIL cell below means the contract test fails until the gap is
fixed or re-classified.

## Surfaces key

- **General** = The General tabs (Today / Performance / Growth), `src/pages/ProgressDashboard.tsx`
- **History** = `src/pages/History.tsx` via `src/hooks/useHistoryRecords.ts`
- **Vault** = `src/hooks/useVault.ts` / `useVaultVideos.ts`
- **Coach** = Coach View: summary (`coach_athlete_glance`), Hammers' plan (`coach_athlete_plan` → `athlete_plan_snapshots`), Development (`coach_athlete_development`), Discipline (`coach_athlete_discipline`)
- **Org** = org dashboard and comparisons (`org_board_checkin_attendance`, `org_test_ranking`, `org_compare_athletes`)
- **Scout** = Scout Profile (`scout_athlete_profile`), within sharing consent
- **Learning** = learning loop (`compute-hammer-state`, `evaluate-behavioral-state`, `extract-patterns` → `anonymized_pattern_library`)
- **Nightly** = nightly jobs (`nightly-mpi-process`, `wk-daily-plan-job`, `nightly-foundation-health`)

## Matrix

| # | Entry kind | Writes to | General | History | Vault | Coach | Org | Scout | Learning | Nightly |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Plan cards & focus-mode logs | `wk_session_logs` | direct (StandardsBoard, Performance) | by design (practices/games/reports only) | by design | direct (Discipline joins wk_prescriptions→wk_session_logs); plan via derived `athlete_plan_snapshots` | derived (status counts) | by design | direct (wk-generate-daily, trendDeload) | derived (wk-daily-plan-job reads prescriptions) |
| 2 | Swaps | `swap_log` + `athlete_equipment_memory` (server RPCs `wk_swap_*_atomic`) | via saved plan | by design | by design | derived (coach_athlete_plan reads saved plan) | by design | by design | direct (plan-swap, wk-generate-daily read equipment memory) | by design |
| 3 | Coach prescriptions (incl. scheduling: any day / dates / recurring series, player "Use today" activation, sender edit/cancel/resend) | `coach_prescriptions` (one row per player per scheduled day, shared `series_id`) + `custom_activity_logs`; on Use instead / Add alongside / Use today the workout also becomes real `wk_prescriptions` rows (coach-rx-safety), so completion logs to `wk_session_logs` like any Hammers card | direct (ActivityAnalytics, Growth) | direct (ActivityHistoryList; separate from main History page) | direct (useVault) | direct (CoachComplianceView, CoachPrescriptionStatus "Sent workouts" with schedule + per-player response + completion via coach-rx-safety manage mode; Discipline via wk_session_logs) | by design | by design | direct (compute-hammer-state, evaluate-behavioral-state, evaluate-advice-effectiveness; plan generation reads wk_session_logs) | direct (nightly-mpi-process) |
| 3b | Coach prescription days on the player calendar | read-only projection of `coach_prescriptions` (buildCalendarEvents source `coach_prescription`) | by design | by design | by design | by design | by design | by design | by design | by design |
| 4 | Practice logs | `performance_sessions` (+ optional `athlete_daily_log`, `governance_flags`) | by design | direct (usePracticeHistory) | by design | derived (load/coach views) | by design | by design | direct (compute-hammer-state) | direct (nightly-mpi-process) |
| 5 | Game logs (player scorekeeping) | `gp_games`, `gp_at_bats`, `gp_pitches`, `gp_defense_plays`, `gp_baserun_events` | direct (Game IQ tab, not Today/Performance/Growth) | direct (useGameHistory, gp_reports) | by design | direct (coach_athlete_games, CoachTeamReport) | by design | by design | by design | direct (nightly-mpi-process finalized games) |
| 6 | Game logs (coach-entered) | `coach_logged_entries` (+ `arm_ledger_entries`, + `gp_games` mirror with `entry_source='coach'`, `ignored_for_training=true`) | by design | direct (useGameHistory reads the gp_games mirror) | by design | direct (CoachLogForPlayer panel + coach_athlete_games) | by design | by design | by design | by design |
| 7 | Video analyses | `videos` | by design | derived (aggregate count only; History is the non-video home) | **partial** — `useVaultVideos` reads `session_videos`, not `videos` (Players Club is the video vault) | direct (coach_athlete_development reads videos + analysis_fault_findings) | by design | direct (scout_athlete_profile, within consent) | by design | by design (nightly-foundation-health reads `library_videos`, not athlete videos) |
| 8 | Tests (Vault) | `vault_performance_tests` | derived (Performance links to Vault tests) | by design | direct (useVault) | direct (coach_athlete_tests, glance) | direct (org_test_ranking, board attendance) | direct (scout_athlete_profile) | by design | by design |
| 9 | Tests (combine) | `combine_sessions`, `combine_results` | by design | by design | by design | direct (coach_athlete_tests UNIONs combine results) | direct (org_test_ranking includes combine events) | direct (scout_athlete_profile metrics includes combine results) | by design | by design |
| 10 | Check-ins (daily status) | `athlete_daily_log` | direct (DualStreakDisplay, Growth) | by design | by design | direct (coach_athlete_readiness counts both check-in systems; contents behind health sharing) | direct (org_facility_board checkins_7d counts both) | by design | direct (evaluate-behavioral-state, detect-behavior-patterns, hie-analyze) | direct (nightly-mpi-process) |
| 11 | Check-ins (daily standard) | `daily_standard_checks` | by design | by design | direct (MorningCheckInSuccess, DailyStandardCheck identity widget) | by design | by design | by design | by design | by design |
| 12 | Assessment / movement screen | `initial_assessments`, `movement_screen` | by design | by design | by design | direct (CoachOnSpotAssessment) | by design | by design | by design | by design |
| 13 | Goals | `athlete_body_goals` | by design | by design | by design | by design | by design | by design | direct (wk-generate-daily, generate-training-block, calculate-regulation) | by design |
| 14 | Equipment memory | `athlete_equipment_memory` | by design | by design | by design | derived (via saved plan) | by design | by design | direct (plan-swap, wk-generate-daily) | by design |

## Known gaps (honest, not hidden)

None remaining. The three gaps found on Oct 24 were fixed the same day
(migration `0105_data_unity_coach_games_combine_readiness`):

1. **Coach-entered game logs (row 6)** now mirror into `gp_games` with
   `entry_source='coach'` and `ignored_for_training=true` (the arm ledger already
   carries the throw load, so training math is unchanged). Undo and a player's
   "not me" flag soft-delete the mirrored game. The game now appears in the
   player's History game list and the Coach Games tab.
2. **Combine results (row 9)** are now read by `coach_athlete_tests`,
   `org_test_ranking` (events list + per-athlete latest value), and
   `scout_athlete_profile` (metrics scope), each UNIONed with vault tests.
3. **Coach readiness / org attendance (row 10)** now count both check-in
   systems: `coach_athlete_readiness` attendance and shared contents include
   `athlete_daily_log` rows, and `org_facility_board` `checkins_7d` counts
   distinct days across focus quizzes and the daily log.

## Rules this matrix must keep satisfying

- Every measurement joins baselines by declaring itself through `public.ledger_record`
  (source triggers + `ledger_record_tiles`); recording must never cost a clip.
- Cross-athlete view-audit events go only through `record_view_audit_event`.
- TEST-only catalog rows (`visible_to`) are filtered out of every non-owner list.
- Service-role functions returning athlete data to a non-self viewer pass
  `_shared/recruitingGate.ts`.
