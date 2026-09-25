> **Correction (2026-09-25, owner):** no drops. Every item previously marked removed is now **PARKED** — kept, locked from users, labelled, and listed in `parked-features.md`. Only the unused cron schedule stays off (function code kept).

# Step 28 — Dead-End Audit (2026-09-25)

## A. Tables and columns
Automated scan of all 370 public tables (a writer and a reader in src/ or supabase/functions, excluding account deletion and tests): 340 WIRED, 21 used only by database functions/triggers, 9 DEAD.

The owner's 7 empty tables:
| Table | Written by | Read by | Verdict |
|---|---|---|---|
| baserunning_progress | useBaserunningProgress.ts | same hook (Baserunning IQ progress) | WIRED, empty because nobody has finished a lesson yet |
| cv_calibration_frames | pitch-velocity-prep | pitch-velocity-measure | DEFERRED: staff-only pitch velocity, locked by owner rule |
| follower_reports / follower_report_events | generate-follower-reports / mark-follower-report-viewed | get-follower-reports (parent/follower screen) | WIRED: no follower has an active report yet (logs show 3,393 sends) |
| foundation_replay_outcomes | foundations-replay | FoundationHealthDashboard, RetentionTab | WIRED (owner ops), empty until a replay runs |
| hie_dirty_users | trigger mark_hie_dirty | hie-refresh-worker (drains it every 15 min) | WIRED: a queue that is normally empty |
| tcs_test_run_chunks | tcs-test-runner | tcs-test-runner | WIRED (test runner), cleared after each run |

Parked (no code writes or reads them): game_plan_week_overrides, sprint_analyses, video_pose_analysis, udl_alerts, udl_constraint_overrides, udl_drill_completions, udl_daily_plans (12 old rows), udl_audit_log (13 old rows).
Kept as undo backups: wk_slug_rename_step26, wk_ti0a1_backup.

New columns (wk_movement_catalog):
| Column | Read by | What people see | Verdict |
|---|---|---|---|
| bucket | generator, matrix, safety audit, admin page (51 files) | card grouping, review queue | WIRED |
| sub_bucket, ub_tier | safetyAudit.ts, AdminTrainingIntelligence | staff review grouping | WIRED (staff) |
| plyo_tier, contacts_per_rep, exposure_channel | exposure/ledger.ts → wk_exposure_daily → governor in wk-generate-daily | load-spike caps on plyo contacts | WIRED |
| plane | generator + balance checks (27 files) | movement variety | WIRED |
| surface_hint | nothing (filled on all 974 rows) | nothing | DEFERRED: needs a place on the card; no owner-approved cue text yet |

wk_exposure_daily (all fields): written by wk-generate-daily and tcs-shadow-run, read by the governor. WIRED.
wk_schedule_decisions (all fields): written by wk-generate-daily; read by ti-watchdog, StaffView, AdminTrainingIntelligence. WIRED.
ti_watch_notes: written by watchdog, auto-activate, auto-off, "Something's off"; read by AdminTrainingIntelligence (Watch tab). WIRED.
schedule_timeline_entries: WIRED (generator re-plans when tell_hammers is on). adaptive_phase_shadow: WIRED (read by the generator, the phase strip and Staff View when adaptive_phases is on). adaptive_phase_credit: written and read by adaptive-phases-shadow (phase priority). WIRED.

## B. Questions asked
| Ask | Read by | Result | Verdict |
|---|---|---|---|
| Check-in readiness, soreness, fatigue, sleep | Command Center cards, Coach Hammer; **now also wk-generate-daily** | low sleep or readiness now reduces heavy work on the day | FIXED (see WIRED NOW) |
| Stress, hydration, plan-for-today | Command Center cards, Coach Hammer | visible trend cards | WIRED |
| Morning/night quiz | compute-hammer-state, MPI, recap, readiness | readiness and recap | WIRED |
| "Anything change?" chips, Tell Hammers | timeline → generator | re-plan (tell_hammers switch) | WIRED |
| "When's your next game?" | adaptive-phases-shadow | season state / not-sure maintenance | WIRED (shadow until adaptive_phases is on) |
| Pain / body-part pickers | recordPain → timeline + injury history → generator, pain patterns | limits exercises, pain map | WIRED |
| "Something's off" | ti_watch_notes → staff Watch tab | staff see it | WIRED |
| One-tap logging, weight, reps, "How hard?" | wk logs → progressionState.ts | next loads progress | WIRED |
| Onboarding goals, level, height/limbs | athlete_context → generator | movement choice | WIRED |
| Speed Lab RPE | Speed Lab only | speed feedback | WIRED (narrow) |

## C. Buttons, screens, promises
Removed: 3 "Game IQ 101 (Coming soon)" menu items; home page "Exciting updates coming soon", "Advanced analytics coming soon", "Performance Rankings — coming soon" and the motion-capture claim. They are replaced by three features the app really has.
Still present (see STILL BROKEN): coming-soon pages for Combine and Softball, the pitch-tipping page line, Start Here preview line, report-card stub, Games import toast.

## D. Switches (off → on)
| Switch | Off | On |
|---|---|---|
| rest_day_calculator | fixed spacing rules | tissue-cost decision picks the day class |
| personalization | default doses | like-you-first progression after 8 sessions |
| offseason_arc | plain offseason block | 6-4-2-4-4 arc |
| in_season_post_game | normal day after a game | post-game recovery day |
| load_spike_protection | no spike cap | exposure governor trims spikes |
| one_tap_logging | full log form | one-tap buttons |
| staff_view | staff page locked | staff page open |
| tell_hammers | timeline saved, no re-plan | saves re-plan 7 days |
| adaptive_phases | season.ts phase | adaptive phase plan + strip + ramps |
| phase_feedback | default phase lengths | bounded learned lengths |
Deleted: ub_plyo_hand_wrist and onboarding_off_days. Both were set to everyone but nothing read them.

## E. Jobs
63 scheduled jobs. Removed: extract-patterns-daily (writes anonymized_pattern_library, which nothing reads). Reduced: retry-follower-reports from every 5 min to hourly (11 failed sends in the log).
Invocations per day: before ≈ 1,040 (288 follower retries, 96 hammer-state, 96 HIE refresh, 48 auto-recovery, 24 each for hourly jobs, rest daily); after ≈ 775.
49 functions have no in-app caller: most are scheduled jobs or webhooks (stripe-webhook, mcp). Unscheduled leftovers are listed under DEFERRED.

## F. Rules vs code
Each doc now opens with a "Live status" line. Summary:
- training-intelligence-v1: exposure governor, spacing, methods, personal gates, dose — LIVE.
- tissue-cost-scheduler v1 + addendum: LIVE behind rest_day_calculator (Off); circuit breaker LIVE; Silent Signals NOT IMPLEMENTED as its own rule.
- ramp-law-v1: phases/rampLaw.ts — SHADOW (adaptive_phases Off).
- upper-body-plyo: ubPlyo/* — NOT LIVE (tests only); catalog fields and exposure channel LIVE.
- adaptive-phases v1/v1.1/v1.2: SHADOW, except the single pain record (LIVE).
- throwing-coverage: armLedger.ts — SHADOW (Staff View + demo).
- youth-throwing: caps, innings cap, fatigue flag, pitcher-catcher 70%, growth-adjusted age — NOT LIVE; only the offseason break ratio is used (shadow).
