# Benchmark Inventory & Staleness Audit — 2026-09-08

Scope: every measured metric that feeds a 20–80 grade.
Two grading sources exist in the app and both are listed here:

1. `src/data/gradeBenchmarks.ts` — `GRADE_BENCHMARKS`, 34 metrics × 2 sports × up to 4 age bands × 6 grade anchors (20/30/45/55/65/80). Drives `rawToGrade()` for all performance-test and longitudinal grading.
2. `scale_reference` (database) — 14 rows, baseball only, floor/avg/record triplets. Drives catching, throwing, baserunning and defensive grading.

Rule applied throughout: **no invented values.** Nothing was changed except the one number the owner supplied.

---

## 1. Change applied this pass — pitching velocity, baseball pro band

Re-anchored to the sourced triplet already in `scale_reference.fastball_velocity`
(floor 84 / avg 94.7 / record 104.2, Statcast four-seam distribution), with the
grade-45 anchor set at **94.5** per owner direction. Grades 30/55/65 are straight
linear interpolations between the three sourced anchors, so the curve has no kink
at the new point.

| Grade | Before (mph) | After (mph) |
|---|---|---|
| 20 | 75 | 84 |
| 30 | 83 | 88.2 |
| 45 | 92 | **94.5** |
| 55 | 95 | 97.3 |
| 65 | 98 | 100.1 |
| 80 | 103 | 104.2 |

Before / after grade for a pro-band athlete:

| Fastball | Grade before | Grade after |
|---|---|---|
| 90 mph | 42 (Below Average) | **34 (Fringe)** |
| 94.5 mph | 53 (Above Average) | **45 (Average)** |
| 100 mph | 71 (Elite) | **65 (Plus-Plus)** |

Non-pro bands (14u / 18u / college) were **not** touched — no source was available to move them, and the owner has not supplied one. They are flagged Stale below.

---

## 2. `scale_reference` (database) — baseball only

| Metric | Direction | Floor (20) | Avg (45) | Record (80) | Verdict |
|---|---|---|---|---|---|
| fastball_velocity | higher | 84 | 94.7 | 104.2 | **Current** — owner-confirmed |
| catcher_pop_time | lower | 2.15 | 2.02 | 1.90 | Unsourced ("public benchmark research", no citation) |
| exchange_time_sec | lower | 0.85 | 0.70 | 0.50 | Sourced (documented pop-time breakdowns) |
| hit_tool_avg | higher | .215 | .260 | .315 | Unsourced |
| home_to_first_lhh | lower | 4.50 | 4.20 | 3.90 | Unsourced |
| home_to_first_rhh | lower | 4.60 | 4.30 | 4.00 | Unsourced |
| lead_distance_primary | higher | 8 | 11 | 14 | Sourced (Statcast) |
| lead_distance_secondary | higher | 15 | 20 | 24 | Sourced (Statcast) |
| power_home_runs | higher | 4 | 20 | 40 | Unsourced |
| speed_60yd_dash | lower | 7.5 | 6.95 | 6.4 | Unsourced; likely **Stale** |
| ten_yard_split | lower | 2.0 | 1.7 | 1.5 | **Unsourced — self-declared DERIVED** in its own note |
| throw_velo_mph_catcher | higher | 65 | 75 | 85 | Unsourced |
| throw_velo_mph_infield | higher | 75 | 88 | 95 | Partially sourced; **Stale suspect** |
| throw_velo_mph_outfield | higher | 78 | 90 | 98 | Partially sourced; **Stale suspect** |

**Softball rows in `scale_reference`: zero.** Every catching, throwing, baserunning and defensive grade a softball athlete receives is either produced against a baseball anchor or not produced at all. This is the single largest gap in the app.

---

## 3. Verdict by metric — `GRADE_BENCHMARKS`

Source strings are what the file itself records.

| Metric | Recorded source | Baseball verdict | Softball verdict |
|---|---|---|---|
| ten_yard_dash | PG/PBR, MLB Combine | Sourced | **Sport gap** (none; softball uses seven_yard_dash) |
| seven_yard_dash | PG/PBR softball events | n/a | Unsourced (no citation for the band values) |
| thirty_yard_dash | PG data + Estimate | Partly unsourced | **Unsourced** — baseball values shifted, no softball source |
| sixty_yard_dash | MLB Combine 2019-23 | **Stale** (window ends 2023) | **Sport gap** (none) |
| forty_yard_dash | PG/PBR softball | n/a | Unsourced |
| ten_thirty_split | Estimate | **Unsourced** | **Unsourced** |
| thirty_sixty_split | Estimate | **Unsourced** | **Unsourced** |
| pro_agility | NFL/MLB Combine cross-ref | Partly sourced | **Unsourced** |
| lateral_shuffle | Estimate | **Unsourced** | **Unsourced** |
| first_step_5yd | Estimate | **Unsourced** | **Unsourced** |
| sl_broad_jump | NSCA, PG | Sourced | **Unsourced** (scaled from baseball) |
| sl_lateral_broad_jump | NSCA, Estimate | Partly unsourced | **Unsourced** |
| sl_vert_jump | NSCA, PG | Sourced | **Unsourced** |
| vertical_jump | NSCA | Sourced | **Unsourced** |
| standing_broad_jump | NSCA | Sourced | **Unsourced** |
| mb_situp_throw | NSCA, Estimate | **Unsourced** | **Unsourced** |
| seated_chest_pass | NSCA, Estimate | **Unsourced** | **Unsourced** |
| mb_rotational_throw | Estimate | **Unsourced** | **Unsourced** |
| mb_overhead_throw | Estimate | **Unsourced** | **Unsourced** |
| tee_exit_velocity | MLB Combine, Driveline, PG | **Stale suspect** (pro 45 = 88) | **Unsourced** |
| max_tee_distance | PG + Estimate | **Unsourced** | **Unsourced** |
| bat_speed | Blast Motion, Driveline | **Stale suspect** (pro 45 = 71) | **Unsourced** |
| avg_exit_velo_bp | Driveline, MLB Combine | **Stale suspect** (pro 45 = 85) | **Unsourced** |
| long_toss_distance | Driveline, PG | Sourced, undated | **Unsourced** |
| pitching_velocity | Combine + PG/PBR | pro band **fixed this pass**; 14u/18u/college **Stale** | **Unsourced** — no AUSL source at all |
| position_throw_velo | PG/PBR | **Stale suspect** (pro 45 = 86, vs `scale_reference` 88–90) — **and inconsistent with the DB anchors** | **Unsourced** |
| pulldown_velocity | Driveline | **Stale suspect**, undated | **Unsourced** |
| fielding_exchange_time | MLB stats + Estimate | Partly unsourced; conflicts with DB `exchange_time_sec` | **Unsourced** |
| pop_time | MLB Statcast | **Stale suspect**, undated; conflicts with DB `catcher_pop_time` | **Unsourced** |
| sixty_yard_shuttle | Estimate | **Unsourced** | **Unsourced** |
| sl_balance_eyes_closed | Research | Sourced | **Unsourced** |
| deceleration_10yd | Estimate | **Unsourced** | **Unsourced** |
| three_hundred_yd_shuttle | NSCA | Sourced | **Unsourced** |
| sprint_repeat_avg | Estimate | **Unsourced** | **Unsourced** |
| sl_3x_bound | NSCA + research | Sourced | **Unsourced** |
| shoulder_rom_internal | Research (GIRD norms) | Sourced | **Unsourced** |
| shoulder_rom_external | Research | Sourced | **Unsourced** |
| hip_internal_rotation | Research | Sourced | **Unsourced** |
| ankle_dorsiflexion | Research (knee-to-wall) | Sourced | **Unsourced** |

### Headline findings

- **Softball is unsourced end to end.** Not one softball row in either system carries a citation, and there are no AUSL-derived values anywhere. Where softball numbers exist they are scaled-down baseball figures. Where they don't (sixty-yard dash, ten-yard dash, every `scale_reference` metric), softball athletes fall back to a baseball band or get nothing.
- **Two systems disagree with each other.** `pop_time` / `catcher_pop_time`, `fielding_exchange_time` / `exchange_time_sec`, and `position_throw_velo` / `throw_velo_mph_*` grade the same act against different numbers depending on which screen the athlete is on.
- **15 of 34 metrics are self-declared Estimates.** They were never sourced; they were interpolated. They should be labelled unvalidated on screen or replaced with owner-supplied figures.
- **No benchmark carries a date** except the ones in `scale_reference`. There is no way to tell a 2019 figure from a 2026 one.

### Needs the owner to supply a number

Pro/college anchors for: exit velocity (tee, BP), bat speed, position throw velocity, pulldown velocity, pop time, sixty-yard dash, and the 14u/18u/college pitching-velocity bands. Every softball anchor in both systems.

---

## 4. Full anchor table — every metric, sport, band and grade

| Metric | Sport | Band | 20 | 30 | 45 | 55 | 65 | 80 |
|---|---|---|---|---|---|---|---|---|
| ten_yard_dash | baseball | 14u | 2.2 | 2 | 1.85 | 1.75 | 1.65 | 1.55 |
| ten_yard_dash | baseball | 18u | 2 | 1.85 | 1.7 | 1.6 | 1.55 | 1.45 |
| ten_yard_dash | baseball | college | 1.9 | 1.75 | 1.62 | 1.52 | 1.45 | 1.35 |
| ten_yard_dash | baseball | pro | 1.85 | 1.7 | 1.55 | 1.48 | 1.4 | 1.3 |
| ten_yard_dash | softball | — | — no benchmarks (SOFTBALL/SPORT GAP) |||||
| seven_yard_dash | baseball | — | — no benchmarks (SOFTBALL/SPORT GAP) |||||
| seven_yard_dash | softball | 14u | 1.85 | 1.7 | 1.55 | 1.45 | 1.38 | 1.28 |
| seven_yard_dash | softball | 18u | 1.7 | 1.55 | 1.42 | 1.34 | 1.28 | 1.18 |
| seven_yard_dash | softball | college | 1.6 | 1.48 | 1.36 | 1.28 | 1.22 | 1.13 |
| seven_yard_dash | softball | pro | 1.55 | 1.43 | 1.32 | 1.24 | 1.18 | 1.1 |
| thirty_yard_dash | baseball | 14u | 5.2 | 4.8 | 4.4 | 4.15 | 3.95 | 3.7 |
| thirty_yard_dash | baseball | 18u | 4.8 | 4.4 | 4.1 | 3.9 | 3.7 | 3.5 |
| thirty_yard_dash | baseball | college | 4.5 | 4.2 | 3.85 | 3.65 | 3.5 | 3.3 |
| thirty_yard_dash | baseball | pro | 4.3 | 4 | 3.75 | 3.55 | 3.45 | 3.2 |
| thirty_yard_dash | softball | 14u | 5.5 | 5.1 | 4.7 | 4.4 | 4.2 | 3.9 |
| thirty_yard_dash | softball | 18u | 5.1 | 4.7 | 4.3 | 4.1 | 3.9 | 3.7 |
| thirty_yard_dash | softball | college | 4.8 | 4.4 | 4.1 | 3.9 | 3.75 | 3.55 |
| thirty_yard_dash | softball | pro | 4.6 | 4.3 | 4 | 3.8 | 3.65 | 3.45 |
| sixty_yard_dash | baseball | 14u | 9 | 8.3 | 7.6 | 7.2 | 6.9 | 6.5 |
| sixty_yard_dash | baseball | 18u | 8.2 | 7.6 | 7.1 | 6.8 | 6.6 | 6.3 |
| sixty_yard_dash | baseball | college | 7.8 | 7.3 | 6.85 | 6.55 | 6.35 | 6.1 |
| sixty_yard_dash | baseball | pro | 7.5 | 7.1 | 6.65 | 6.4 | 6.3 | 6 |
| sixty_yard_dash | softball | — | — no benchmarks (SOFTBALL/SPORT GAP) |||||
| forty_yard_dash | baseball | — | — no benchmarks (SOFTBALL/SPORT GAP) |||||
| forty_yard_dash | softball | 14u | 6.8 | 6.3 | 5.85 | 5.55 | 5.3 | 4.95 |
| forty_yard_dash | softball | 18u | 6.3 | 5.85 | 5.45 | 5.18 | 4.95 | 4.65 |
| forty_yard_dash | softball | college | 5.95 | 5.55 | 5.2 | 4.95 | 4.78 | 4.5 |
| forty_yard_dash | softball | pro | 5.75 | 5.4 | 5.05 | 4.85 | 4.65 | 4.4 |
| ten_thirty_split | baseball | 14u | *missing band* |||||
| ten_thirty_split | baseball | 18u | 3.5 | 3.1 | 2.7 | 2.5 | 2.3 | 2.1 |
| ten_thirty_split | baseball | college | *missing band* |||||
| ten_thirty_split | baseball | pro | 3 | 2.7 | 2.4 | 2.25 | 2.1 | 1.9 |
| ten_thirty_split | softball | 14u | *missing band* |||||
| ten_thirty_split | softball | 18u | 3.7 | 3.3 | 2.9 | 2.7 | 2.5 | 2.3 |
| ten_thirty_split | softball | college | *missing band* |||||
| ten_thirty_split | softball | pro | 3.3 | 3 | 2.6 | 2.45 | 2.3 | 2.1 |
| thirty_sixty_split | baseball | 14u | *missing band* |||||
| thirty_sixty_split | baseball | 18u | 3.8 | 3.4 | 3 | 2.8 | 2.65 | 2.4 |
| thirty_sixty_split | baseball | college | *missing band* |||||
| thirty_sixty_split | baseball | pro | 3.4 | 3.1 | 2.8 | 2.65 | 2.5 | 2.3 |
| thirty_sixty_split | softball | 14u | *missing band* |||||
| thirty_sixty_split | softball | 18u | 4 | 3.6 | 3.2 | 3 | 2.8 | 2.6 |
| thirty_sixty_split | softball | college | *missing band* |||||
| thirty_sixty_split | softball | pro | 3.7 | 3.3 | 3 | 2.8 | 2.65 | 2.45 |
| pro_agility | baseball | 14u | 5.8 | 5.4 | 5 | 4.7 | 4.5 | 4.2 |
| pro_agility | baseball | 18u | 5.4 | 5 | 4.6 | 4.4 | 4.2 | 3.9 |
| pro_agility | baseball | college | 5.1 | 4.7 | 4.4 | 4.2 | 4.05 | 3.8 |
| pro_agility | baseball | pro | 4.9 | 4.6 | 4.3 | 4.1 | 3.95 | 3.7 |
| pro_agility | softball | 14u | 6 | 5.6 | 5.2 | 4.9 | 4.7 | 4.4 |
| pro_agility | softball | 18u | 5.6 | 5.2 | 4.8 | 4.55 | 4.35 | 4.1 |
| pro_agility | softball | college | 5.3 | 4.9 | 4.6 | 4.4 | 4.2 | 3.95 |
| pro_agility | softball | pro | 5.1 | 4.8 | 4.5 | 4.3 | 4.1 | 3.85 |
| lateral_shuffle | baseball | 14u | *missing band* |||||
| lateral_shuffle | baseball | 18u | 4 | 3.6 | 3.2 | 3 | 2.8 | 2.5 |
| lateral_shuffle | baseball | college | *missing band* |||||
| lateral_shuffle | baseball | pro | 3.6 | 3.3 | 2.9 | 2.75 | 2.6 | 2.35 |
| lateral_shuffle | softball | 14u | *missing band* |||||
| lateral_shuffle | softball | 18u | 4.2 | 3.8 | 3.4 | 3.2 | 3 | 2.7 |
| lateral_shuffle | softball | college | *missing band* |||||
| lateral_shuffle | softball | pro | 3.8 | 3.5 | 3.1 | 2.9 | 2.75 | 2.5 |
| first_step_5yd | baseball | 14u | *missing band* |||||
| first_step_5yd | baseball | 18u | 1.6 | 1.4 | 1.2 | 1.1 | 1 | 0.85 |
| first_step_5yd | baseball | college | *missing band* |||||
| first_step_5yd | baseball | pro | 1.4 | 1.25 | 1.1 | 1 | 0.92 | 0.8 |
| first_step_5yd | softball | 14u | *missing band* |||||
| first_step_5yd | softball | 18u | 1.7 | 1.5 | 1.3 | 1.2 | 1.1 | 0.95 |
| first_step_5yd | softball | college | *missing band* |||||
| first_step_5yd | softball | pro | 1.5 | 1.35 | 1.2 | 1.1 | 1 | 0.87 |
| sl_broad_jump | baseball | 14u | 35 | 45 | 55 | 62 | 70 | 82 |
| sl_broad_jump | baseball | 18u | 45 | 55 | 68 | 75 | 82 | 95 |
| sl_broad_jump | baseball | college | 50 | 60 | 72 | 80 | 88 | 100 |
| sl_broad_jump | baseball | pro | 55 | 65 | 76 | 84 | 92 | 105 |
| sl_broad_jump | softball | 14u | 30 | 40 | 50 | 57 | 65 | 76 |
| sl_broad_jump | softball | 18u | 40 | 50 | 62 | 69 | 76 | 88 |
| sl_broad_jump | softball | college | 45 | 55 | 66 | 74 | 82 | 94 |
| sl_broad_jump | softball | pro | 48 | 58 | 70 | 78 | 86 | 98 |
| sl_lateral_broad_jump | baseball | 14u | 30 | 38 | 48 | 55 | 62 | 74 |
| sl_lateral_broad_jump | baseball | 18u | 38 | 48 | 58 | 65 | 72 | 84 |
| sl_lateral_broad_jump | baseball | college | 42 | 52 | 62 | 70 | 78 | 90 |
| sl_lateral_broad_jump | baseball | pro | 45 | 55 | 65 | 73 | 81 | 93 |
| sl_lateral_broad_jump | softball | 14u | 28 | 36 | 44 | 51 | 58 | 68 |
| sl_lateral_broad_jump | softball | 18u | 35 | 44 | 54 | 61 | 68 | 78 |
| sl_lateral_broad_jump | softball | college | 39 | 48 | 58 | 65 | 73 | 84 |
| sl_lateral_broad_jump | softball | pro | 42 | 51 | 61 | 68 | 76 | 87 |
| sl_vert_jump | baseball | 14u | 12 | 16 | 20 | 23 | 26 | 30 |
| sl_vert_jump | baseball | 18u | 15 | 19 | 24 | 27 | 30 | 35 |
| sl_vert_jump | baseball | college | 17 | 21 | 26 | 29 | 32 | 37 |
| sl_vert_jump | baseball | pro | 18 | 22 | 27 | 30 | 33 | 38 |
| sl_vert_jump | softball | 14u | 10 | 14 | 18 | 21 | 24 | 28 |
| sl_vert_jump | softball | 18u | 13 | 17 | 22 | 25 | 28 | 32 |
| sl_vert_jump | softball | college | 15 | 19 | 24 | 27 | 30 | 34 |
| sl_vert_jump | softball | pro | 16 | 20 | 25 | 28 | 31 | 35 |
| vertical_jump | baseball | 14u | 14 | 18 | 22 | 25 | 28 | 33 |
| vertical_jump | baseball | 18u | 18 | 22 | 27 | 30 | 33 | 38 |
| vertical_jump | baseball | college | 20 | 24 | 29 | 32 | 35 | 40 |
| vertical_jump | baseball | pro | 22 | 26 | 31 | 34 | 37 | 42 |
| vertical_jump | softball | 14u | 12 | 16 | 20 | 23 | 26 | 30 |
| vertical_jump | softball | 18u | 16 | 20 | 24 | 27 | 30 | 35 |
| vertical_jump | softball | college | 18 | 22 | 26 | 29 | 32 | 37 |
| vertical_jump | softball | pro | 19 | 23 | 27 | 30 | 33 | 38 |
| standing_broad_jump | baseball | 14u | *missing band* |||||
| standing_broad_jump | baseball | 18u | 60 | 72 | 85 | 93 | 100 | 115 |
| standing_broad_jump | baseball | college | *missing band* |||||
| standing_broad_jump | baseball | pro | 70 | 82 | 95 | 103 | 110 | 125 |
| standing_broad_jump | softball | 14u | *missing band* |||||
| standing_broad_jump | softball | 18u | 55 | 66 | 78 | 86 | 93 | 106 |
| standing_broad_jump | softball | college | *missing band* |||||
| standing_broad_jump | softball | pro | 62 | 74 | 87 | 95 | 102 | 116 |
| mb_situp_throw | baseball | 14u | 10 | 15 | 22 | 27 | 32 | 40 |
| mb_situp_throw | baseball | 18u | 15 | 22 | 30 | 35 | 40 | 50 |
| mb_situp_throw | baseball | college | 18 | 25 | 33 | 38 | 43 | 52 |
| mb_situp_throw | baseball | pro | 20 | 27 | 35 | 40 | 45 | 55 |
| mb_situp_throw | softball | 14u | 8 | 12 | 18 | 23 | 28 | 35 |
| mb_situp_throw | softball | 18u | 12 | 18 | 25 | 30 | 35 | 43 |
| mb_situp_throw | softball | college | 15 | 21 | 28 | 33 | 38 | 46 |
| mb_situp_throw | softball | pro | 17 | 23 | 30 | 35 | 40 | 48 |
| seated_chest_pass | baseball | 14u | 8 | 12 | 18 | 22 | 26 | 33 |
| seated_chest_pass | baseball | 18u | 12 | 17 | 24 | 28 | 32 | 39 |
| seated_chest_pass | baseball | college | 14 | 19 | 26 | 30 | 34 | 41 |
| seated_chest_pass | baseball | pro | 16 | 21 | 28 | 32 | 36 | 43 |
| seated_chest_pass | softball | 14u | 6 | 10 | 15 | 19 | 23 | 29 |
| seated_chest_pass | softball | 18u | 10 | 14 | 20 | 24 | 28 | 34 |
| seated_chest_pass | softball | college | 12 | 16 | 22 | 26 | 30 | 36 |
| seated_chest_pass | softball | pro | 13 | 17 | 23 | 27 | 31 | 37 |
| mb_rotational_throw | baseball | 14u | 14 | 19 | 25 | 29 | 33 | 40 |
| mb_rotational_throw | baseball | 18u | 18 | 24 | 31 | 35 | 39 | 46 |
| mb_rotational_throw | baseball | college | *missing band* |||||
| mb_rotational_throw | baseball | pro | 22 | 28 | 35 | 39 | 43 | 50 |
| mb_rotational_throw | softball | 14u | 12 | 17 | 22 | 26 | 30 | 36 |
| mb_rotational_throw | softball | 18u | 16 | 21 | 27 | 31 | 35 | 42 |
| mb_rotational_throw | softball | college | *missing band* |||||
| mb_rotational_throw | softball | pro | 19 | 25 | 31 | 35 | 39 | 46 |
| mb_overhead_throw | baseball | 14u | *missing band* |||||
| mb_overhead_throw | baseball | 18u | 18 | 25 | 33 | 38 | 43 | 52 |
| mb_overhead_throw | baseball | college | *missing band* |||||
| mb_overhead_throw | baseball | pro | 22 | 30 | 38 | 43 | 48 | 57 |
| mb_overhead_throw | softball | 14u | *missing band* |||||
| mb_overhead_throw | softball | 18u | 15 | 21 | 28 | 33 | 38 | 46 |
| mb_overhead_throw | softball | college | *missing band* |||||
| mb_overhead_throw | softball | pro | 18 | 25 | 33 | 38 | 43 | 51 |
| tee_exit_velocity | baseball | 14u | 50 | 58 | 68 | 74 | 80 | 90 |
| tee_exit_velocity | baseball | 18u | 60 | 70 | 82 | 87 | 92 | 100 |
| tee_exit_velocity | baseball | college | 65 | 74 | 85 | 90 | 95 | 103 |
| tee_exit_velocity | baseball | pro | 70 | 78 | 88 | 93 | 98 | 107 |
| tee_exit_velocity | softball | 14u | 35 | 42 | 50 | 55 | 60 | 68 |
| tee_exit_velocity | softball | 18u | 42 | 50 | 60 | 65 | 70 | 78 |
| tee_exit_velocity | softball | college | 48 | 55 | 65 | 70 | 75 | 83 |
| tee_exit_velocity | softball | pro | 50 | 58 | 68 | 73 | 78 | 86 |
| max_tee_distance | baseball | 14u | 100 | 150 | 210 | 250 | 290 | 350 |
| max_tee_distance | baseball | 18u | 150 | 210 | 280 | 310 | 340 | 400 |
| max_tee_distance | baseball | college | *missing band* |||||
| max_tee_distance | baseball | pro | 200 | 260 | 330 | 360 | 390 | 450 |
| max_tee_distance | softball | 14u | 70 | 100 | 140 | 165 | 190 | 230 |
| max_tee_distance | softball | 18u | 100 | 140 | 190 | 215 | 240 | 290 |
| max_tee_distance | softball | college | *missing band* |||||
| max_tee_distance | softball | pro | 130 | 175 | 230 | 255 | 280 | 330 |
| bat_speed | baseball | 14u | 40 | 47 | 55 | 60 | 65 | 73 |
| bat_speed | baseball | 18u | 48 | 55 | 64 | 69 | 74 | 82 |
| bat_speed | baseball | college | 52 | 59 | 68 | 73 | 78 | 86 |
| bat_speed | baseball | pro | 55 | 62 | 71 | 76 | 81 | 89 |
| bat_speed | softball | 14u | 35 | 42 | 50 | 55 | 60 | 68 |
| bat_speed | softball | 18u | 42 | 49 | 57 | 62 | 67 | 75 |
| bat_speed | softball | college | 46 | 53 | 61 | 66 | 71 | 79 |
| bat_speed | softball | pro | 48 | 55 | 63 | 68 | 73 | 81 |
| avg_exit_velo_bp | baseball | 14u | *missing band* |||||
| avg_exit_velo_bp | baseball | 18u | 55 | 65 | 78 | 83 | 88 | 96 |
| avg_exit_velo_bp | baseball | college | *missing band* |||||
| avg_exit_velo_bp | baseball | pro | 65 | 75 | 85 | 90 | 95 | 103 |
| avg_exit_velo_bp | softball | 14u | *missing band* |||||
| avg_exit_velo_bp | softball | 18u | 40 | 48 | 57 | 62 | 67 | 75 |
| avg_exit_velo_bp | softball | college | *missing band* |||||
| avg_exit_velo_bp | softball | pro | 46 | 54 | 63 | 68 | 73 | 81 |
| long_toss_distance | baseball | 14u | 80 | 110 | 150 | 175 | 200 | 250 |
| long_toss_distance | baseball | 18u | 120 | 160 | 210 | 240 | 270 | 320 |
| long_toss_distance | baseball | college | 150 | 190 | 250 | 290 | 330 | 380 |
| long_toss_distance | baseball | pro | 170 | 220 | 280 | 320 | 360 | 420 |
| long_toss_distance | softball | 14u | 60 | 85 | 115 | 135 | 155 | 190 |
| long_toss_distance | softball | 18u | 90 | 120 | 160 | 185 | 215 | 260 |
| long_toss_distance | softball | college | 110 | 145 | 190 | 220 | 250 | 290 |
| long_toss_distance | softball | pro | 125 | 165 | 210 | 240 | 270 | 310 |
| pitching_velocity | baseball | 14u | 48 | 55 | 65 | 70 | 75 | 82 |
| pitching_velocity | baseball | 18u | 62 | 70 | 80 | 84 | 88 | 94 |
| pitching_velocity | baseball | college | 70 | 77 | 87 | 92 | 96 | 101 |
| pitching_velocity | baseball | pro | 84 | 88.2 | 94.5 | 97.3 | 100.1 | 104.2 |
| pitching_velocity | softball | 14u | 35 | 40 | 47 | 51 | 55 | 62 |
| pitching_velocity | softball | 18u | 42 | 48 | 56 | 60 | 65 | 72 |
| pitching_velocity | softball | college | 48 | 54 | 63 | 67 | 71 | 76 |
| pitching_velocity | softball | pro | 52 | 58 | 66 | 70 | 73 | 78 |
| position_throw_velo | baseball | 14u | 45 | 52 | 62 | 67 | 72 | 80 |
| position_throw_velo | baseball | 18u | 55 | 63 | 74 | 79 | 84 | 92 |
| position_throw_velo | baseball | college | 62 | 70 | 81 | 87 | 92 | 99 |
| position_throw_velo | baseball | pro | 68 | 76 | 86 | 91 | 95 | 102 |
| position_throw_velo | softball | 14u | 35 | 42 | 50 | 55 | 60 | 68 |
| position_throw_velo | softball | 18u | 42 | 50 | 60 | 65 | 71 | 80 |
| position_throw_velo | softball | college | 48 | 55 | 66 | 71 | 77 | 85 |
| position_throw_velo | softball | pro | 52 | 60 | 70 | 75 | 80 | 88 |
| pulldown_velocity | baseball | 14u | *missing band* |||||
| pulldown_velocity | baseball | 18u | 65 | 73 | 84 | 90 | 95 | 103 |
| pulldown_velocity | baseball | college | *missing band* |||||
| pulldown_velocity | baseball | pro | 78 | 86 | 95 | 100 | 104 | 111 |
| pulldown_velocity | softball | 14u | *missing band* |||||
| pulldown_velocity | softball | 18u | 48 | 55 | 63 | 67 | 71 | 78 |
| pulldown_velocity | softball | college | *missing band* |||||
| pulldown_velocity | softball | pro | 55 | 62 | 70 | 74 | 78 | 84 |
| fielding_exchange_time | baseball | 14u | *missing band* |||||
| fielding_exchange_time | baseball | 18u | 2.2 | 1.8 | 1.4 | 1.2 | 1.05 | 0.85 |
| fielding_exchange_time | baseball | college | *missing band* |||||
| fielding_exchange_time | baseball | pro | 1.8 | 1.5 | 1.2 | 1.05 | 0.9 | 0.75 |
| fielding_exchange_time | softball | 14u | *missing band* |||||
| fielding_exchange_time | softball | 18u | 2.4 | 2 | 1.6 | 1.4 | 1.2 | 1 |
| fielding_exchange_time | softball | college | *missing band* |||||
| fielding_exchange_time | softball | pro | 2 | 1.7 | 1.35 | 1.2 | 1.05 | 0.85 |
| pop_time | baseball | 14u | 2.4 | 2.25 | 2.1 | 2 | 1.95 | 1.85 |
| pop_time | baseball | 18u | 2.3 | 2.15 | 2 | 1.95 | 1.9 | 1.8 |
| pop_time | baseball | college | 2.2 | 2.1 | 1.95 | 1.9 | 1.85 | 1.78 |
| pop_time | baseball | pro | 2.15 | 2.05 | 1.93 | 1.88 | 1.83 | 1.75 |
| pop_time | softball | 14u | 2.5 | 2.35 | 2.2 | 2.1 | 2 | 1.9 |
| pop_time | softball | 18u | 2.35 | 2.2 | 2.05 | 1.98 | 1.9 | 1.8 |
| pop_time | softball | college | 2.25 | 2.12 | 2 | 1.93 | 1.87 | 1.78 |
| pop_time | softball | pro | 2.2 | 2.08 | 1.96 | 1.9 | 1.84 | 1.75 |
| sixty_yard_shuttle | baseball | 14u | *missing band* |||||
| sixty_yard_shuttle | baseball | 18u | 17 | 15.5 | 14 | 13.2 | 12.5 | 11.5 |
| sixty_yard_shuttle | baseball | college | *missing band* |||||
| sixty_yard_shuttle | baseball | pro | 15.5 | 14.2 | 13 | 12.3 | 11.7 | 10.8 |
| sixty_yard_shuttle | softball | 14u | *missing band* |||||
| sixty_yard_shuttle | softball | 18u | 18 | 16.5 | 15 | 14.2 | 13.5 | 12.5 |
| sixty_yard_shuttle | softball | college | *missing band* |||||
| sixty_yard_shuttle | softball | pro | 16.5 | 15.2 | 14 | 13.3 | 12.7 | 11.8 |
| sl_balance_eyes_closed | baseball | 14u | 5 | 12 | 22 | 30 | 40 | 60 |
| sl_balance_eyes_closed | baseball | 18u | 8 | 16 | 28 | 38 | 50 | 75 |
| sl_balance_eyes_closed | baseball | college | *missing band* |||||
| sl_balance_eyes_closed | baseball | pro | 10 | 20 | 35 | 48 | 60 | 90 |
| sl_balance_eyes_closed | softball | 14u | 5 | 12 | 22 | 30 | 40 | 60 |
| sl_balance_eyes_closed | softball | 18u | 8 | 16 | 28 | 38 | 50 | 75 |
| sl_balance_eyes_closed | softball | college | *missing band* |||||
| sl_balance_eyes_closed | softball | pro | 10 | 20 | 35 | 48 | 60 | 90 |
| deceleration_10yd | baseball | 14u | *missing band* |||||
| deceleration_10yd | baseball | 18u | 3.2 | 2.8 | 2.3 | 2.1 | 1.85 | 1.6 |
| deceleration_10yd | baseball | college | *missing band* |||||
| deceleration_10yd | baseball | pro | 2.8 | 2.4 | 2 | 1.8 | 1.65 | 1.4 |
| deceleration_10yd | softball | 14u | *missing band* |||||
| deceleration_10yd | softball | 18u | 3.4 | 3 | 2.5 | 2.3 | 2.05 | 1.8 |
| deceleration_10yd | softball | college | *missing band* |||||
| deceleration_10yd | softball | pro | 3 | 2.6 | 2.2 | 2 | 1.8 | 1.55 |
| three_hundred_yd_shuttle | baseball | 14u | *missing band* |||||
| three_hundred_yd_shuttle | baseball | 18u | 75 | 68 | 60 | 56 | 52 | 47 |
| three_hundred_yd_shuttle | baseball | college | *missing band* |||||
| three_hundred_yd_shuttle | baseball | pro | 68 | 62 | 55 | 52 | 49 | 44 |
| three_hundred_yd_shuttle | softball | 14u | *missing band* |||||
| three_hundred_yd_shuttle | softball | 18u | 80 | 73 | 65 | 61 | 57 | 52 |
| three_hundred_yd_shuttle | softball | college | *missing band* |||||
| three_hundred_yd_shuttle | softball | pro | 73 | 67 | 60 | 56 | 53 | 48 |
| sprint_repeat_avg | baseball | 14u | *missing band* |||||
| sprint_repeat_avg | baseball | 18u | 5.2 | 4.8 | 4.3 | 4.1 | 3.9 | 3.6 |
| sprint_repeat_avg | baseball | college | *missing band* |||||
| sprint_repeat_avg | baseball | pro | 4.8 | 4.4 | 4 | 3.8 | 3.65 | 3.4 |
| sprint_repeat_avg | softball | 14u | *missing band* |||||
| sprint_repeat_avg | softball | 18u | 5.5 | 5.1 | 4.6 | 4.35 | 4.15 | 3.85 |
| sprint_repeat_avg | softball | college | *missing band* |||||
| sprint_repeat_avg | softball | pro | 5.1 | 4.7 | 4.3 | 4.1 | 3.9 | 3.65 |
| sl_3x_bound | baseball | 14u | 14 | 18 | 23 | 27 | 31 | 37 |
| sl_3x_bound | baseball | 18u | 18 | 23 | 28 | 32 | 36 | 42 |
| sl_3x_bound | baseball | college | 21 | 26 | 31 | 35 | 39 | 45 |
| sl_3x_bound | baseball | pro | 23 | 28 | 33 | 37 | 41 | 47 |
| sl_3x_bound | softball | 14u | 12 | 16 | 20 | 24 | 28 | 33 |
| sl_3x_bound | softball | 18u | 16 | 20 | 25 | 29 | 33 | 38 |
| sl_3x_bound | softball | college | 19 | 23 | 28 | 32 | 36 | 41 |
| sl_3x_bound | softball | pro | 21 | 25 | 30 | 34 | 38 | 43 |
| shoulder_rom_internal | baseball | 14u | *missing band* |||||
| shoulder_rom_internal | baseball | 18u | 25 | 32 | 42 | 48 | 55 | 65 |
| shoulder_rom_internal | baseball | college | *missing band* |||||
| shoulder_rom_internal | baseball | pro | 28 | 35 | 45 | 52 | 58 | 68 |
| shoulder_rom_internal | softball | 14u | *missing band* |||||
| shoulder_rom_internal | softball | 18u | 28 | 35 | 45 | 52 | 58 | 68 |
| shoulder_rom_internal | softball | college | *missing band* |||||
| shoulder_rom_internal | softball | pro | 30 | 37 | 47 | 54 | 60 | 70 |
| shoulder_rom_external | baseball | 14u | *missing band* |||||
| shoulder_rom_external | baseball | 18u | 60 | 70 | 82 | 89 | 95 | 105 |
| shoulder_rom_external | baseball | college | *missing band* |||||
| shoulder_rom_external | baseball | pro | 65 | 75 | 87 | 93 | 99 | 110 |
| shoulder_rom_external | softball | 14u | *missing band* |||||
| shoulder_rom_external | softball | 18u | 62 | 72 | 84 | 90 | 96 | 106 |
| shoulder_rom_external | softball | college | *missing band* |||||
| shoulder_rom_external | softball | pro | 66 | 76 | 88 | 94 | 100 | 111 |
| hip_internal_rotation | baseball | 14u | *missing band* |||||
| hip_internal_rotation | baseball | 18u | 18 | 24 | 32 | 37 | 42 | 50 |
| hip_internal_rotation | baseball | college | *missing band* |||||
| hip_internal_rotation | baseball | pro | 20 | 26 | 34 | 39 | 44 | 52 |
| hip_internal_rotation | softball | 14u | *missing band* |||||
| hip_internal_rotation | softball | 18u | 20 | 26 | 34 | 39 | 44 | 52 |
| hip_internal_rotation | softball | college | *missing band* |||||
| hip_internal_rotation | softball | pro | 22 | 28 | 36 | 41 | 46 | 54 |
| ankle_dorsiflexion | baseball | 14u | *missing band* |||||
| ankle_dorsiflexion | baseball | 18u | 2 | 2.8 | 3.8 | 4.3 | 4.8 | 5.8 |
| ankle_dorsiflexion | baseball | college | *missing band* |||||
| ankle_dorsiflexion | baseball | pro | 2.2 | 3 | 4 | 4.5 | 5 | 6 |
| ankle_dorsiflexion | softball | 14u | *missing band* |||||
| ankle_dorsiflexion | softball | 18u | 2.2 | 3 | 4 | 4.5 | 5 | 6 |
| ankle_dorsiflexion | softball | college | *missing band* |||||
| ankle_dorsiflexion | softball | pro | 2.5 | 3.2 | 4.2 | 4.7 | 5.2 | 6.2 |

pro pitching_velocity 90 => 34
pro pitching_velocity 94.5 => 45
pro pitching_velocity 100 => 65
