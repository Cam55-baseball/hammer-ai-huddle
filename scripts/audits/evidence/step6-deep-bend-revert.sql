-- Step 6 decision 8 — REVERT for the nine deep-bend rows tightened out of
-- in-season / post-season. Restores the exact pre-change values.
-- Rehearse with: supabase run_sql (read the before/after table first).

update public.wk_movement_catalog set
  phase_allow = '{os_q1,os_q2,os_q3,os_q4,pre_season,in_season,post_season}'::text[],
  season_eligibility = '{os_q1,os_q2,os_q3,os_q4,in_season,post_season}'::text[],
  season_legality = season_legality
    || jsonb_build_object('in_season', (slug in ('kot_lunge','lift_kot_sissy_squat','lift_patrick_step','lift_stepup','backward_step_down_heel_elevated','slide_lunge')),
                          'post_season', (slug in ('kot_lunge','lift_kot_sissy_squat','lift_patrick_step','lift_stepup','backward_step_down_heel_elevated','slide_lunge')))
where slug in (
  'lift_deficit_deadlift','lift_jefferson_curl','lift_kot_sissy_squat','lift_patrick_step',
  'lift_paused_front_squat','lift_stepup','kot_lunge','backward_step_down_heel_elevated','slide_lunge'
);
