# Handoff — Report Card, Grade Engine, Combine Registry, Wiring

Extracted from the code on 2026-09-13. Every number below was read out of the source
files named beside it. Where the code contradicts itself or a fact could not be
established from the code, this document says so instead of resolving it.

Doctrine and decision history are **not** in this document. They live in chat and are to
be appended separately.

---

## Section 1 — The grade engine

### Files

| File | Role |
|---|---|
| `src/lib/benchmarks/gradeScale.ts` | the scale constants, sub-floor tail, rounding, formatting |
| `src/lib/gradeEngine.ts` | `rawToGrade()` — the only conversion entry point; interpolation; labels; colours |
| `src/data/gradeBenchmarks.ts` | `GRADE_BENCHMARKS` — the anchor table |
| `src/data/performanceTestRegistry.ts` | `METRIC_BY_KEY` — supplies `higherIsBetter` to the grader |
| `src/lib/benchmarks/canonical.ts` | duplicate-metric resolution; `SCALE_ANCHOR_SNAPSHOT` |
| `src/lib/defense/beatenRunnerGrade.ts` | `gradeFromScaleRow()` — grades the `scale_reference`-owned metrics |

### Raw number → grade, step by step (`rawToGrade(metricKey, rawValue, sport, age?)`)

1. **`age` is accepted and ignored.** The signature still takes it so callers did not have
   to change, but it no longer selects a curve (`gradeEngine.ts:20-25, 76-81`). Nothing is
   age-adjusted. A 14-year-old is graded against the same curve as a big leaguer.
2. **Duplicate-metric short circuit.** If `sport === 'baseball'` and the key is one of the
   three duplicated acts (`isScaleOwned`), grading is delegated to `gradeFromScaleRow()`
   against `SCALE_ANCHOR_SNAPSHOT`, so the report-card path and the rep surfaces score the
   same input identically. Returns `null` if that row reports missing.
3. **Softball honesty gate.** If `sport === 'softball'` and `isSoftballGradable(metricKey)`
   is false, return `null` — the raw value is stored, the grade is withheld. See Section 2.
4. **Anchor lookup.** `GRADE_BENCHMARKS[metricKey][sport]`. Missing entry or empty array →
   `null`.
5. **Direction.** `METRIC_BY_KEY[metricKey].higherIsBetter`, defaulting to `true` when the
   metric is not in the registry.
6. **Interpolation** (`interpolate()`, `gradeEngine.ts:36-69`):
   - anchors sorted by raw ascending
   - the **floor point** is the worst-end anchor: lowest raw for higher-is-better, highest
     raw for lower-is-better (times)
   - the **best point** is the opposite end
   - the **average point** is the anchor whose grade is exactly 50, falling back to the
     second-from-worst anchor if no anchor is graded 50
   - worse than the floor → hand off to `extendBelowFloor()` (below)
   - at or past the best point → clamp to that anchor's grade (80)
   - otherwise straight linear interpolation between the two bracketing anchors
   - if none of those branches hit, return 50
   - zero anchors returns 50, one anchor returns that anchor's grade
7. **Rounding** (`roundGrade()`): clamp to 0…80; below 20 keep one decimal, at or above 20
   round to a whole number.

### The scale

| Constant | Value | Meaning |
|---|---|---|
| `MLB_FLOOR_GRADE` | 20 | the MLB/professional entry mark |
| — | 50 | the MLB/professional **average** |
| `GRADE_MAX` | 80 | the **all-time record** |
| `GRADE_MIN` | 0 | hard bottom; never negative |

Three things to state plainly, all of them explicit in the source:

- **20 is the MLB floor, not the app's floor.** An athlete below it is not clipped to 20;
  the scale keeps going so he can see himself move (`gradeScale.ts:4-6`).
- **Nothing is age-adjusted.** Age bands (14u / 18u / college / pro) were removed on
  2026-09-08 because they contradicted standing doctrine (`gradeBenchmarks.ts:4-7`).
- **The 80 ceiling only moves when a real all-time record moves.** It is not a percentile
  and not a population top end.

### The sub-floor development curve

`extendBelowFloor(value, floorRaw, averageRaw)`:

```
span    = averageRaw - floorRaw          // if 0 or non-finite → return 20
perUnit = (30 / span) * 0.25             // SUB_FLOOR_SLOPE_FRACTION
grade   = 20 + (value - floorRaw) * perUnit
return clamp(grade, 0, 20)
```

- **Quarter slope** (`SUB_FLOOR_SLOPE_FRACTION = 0.25`) — one quarter of the floor→average
  slope, which puts grade 0 four floor-to-average spans below the floor.
- **This is a convention, not a benchmark.** `SUB_FLOOR_TAIL_PROVENANCE` records
  `source: "convention"`, `as_of: "2026-09-08"`. The header states it is not derived from
  any published data, tracked population, or scouting source, and must never be cited as
  one. The rationale recorded in code: at full slope, five of twelve realistic 14u marks
  pinned flat at 0 — no separation, no roadmap. A quarter slope is the shallowest tail
  that still separates every metric at the bottom.
- **One decimal below the floor, whole numbers at or above it** (`roundGrade`,
  `formatGrade`: `"8.4"` vs `"45"`).
- **Never negative** — a negative grade reads as a verdict rather than a starting line.
- Any surface rendering a sub-20 number must present it as progress toward the floor.
  `SUB_FLOOR_DISCLOSURE` is the sanctioned copy: *"Below 20 this is a development curve,
  not a scouting grade — it measures progress toward the professional floor."*
  `isBelowFloor(grade)` is the test for when it must appear.

### Labels (`gradeToLabel`, `gradeEngine.ts:117-128`)

≥80 Elite · ≥70 Plus-Plus · ≥60 Plus · ≥55 Above Average · ≥50 Average · ≥45 Fringe ·
≥40 Below Average · ≥30 Well Below Average · ≥20 Poor · below 20 **Developing**.

> **Contradiction to flag.** `src/lib/gradeLabel.ts` exports a *different* `getGradeLabel`
> with a different mapping (≥55 "Plus", ≥50 "Above Average", ≥45 "Average", ≥40 "Below
> Average", ≥30 "Fringe", else "Poor"). Two label ladders exist for the same 20–80 number
> and they disagree in the 40–60 band — 50 reads "Average" in one and "Above Average" in
> the other. Which one is canonical could not be determined from the code.

### Other conversions in the same file

- `efficiencyToScoutGrade(score)` maps a 0–100 model efficiency score onto the scale as
  `20 + score * 0.6`. This is a linear remap of a model output, not a benchmarked grade.
- `gradeToColor` / `gradeToHex` / `gradeToSurface` are presentation only and must be kept
  in lockstep with each other.
- `gradeAllResults(results, sport, age?)` batch-grades a result object, skipping `_`-prefixed
  metadata keys and dropping any metric that grades to `null`.

### Duplicate-metric resolution (`canonical.ts`)

Three acts were graded by two systems and scored differently by screen. Resolution rule:
the side with a recorded source wins; where neither has one, `scale_reference` wins because
it at least carries a date. **No benchmark value was changed** — the losing side stops
holding its own copy and reads the winner's. Baseball only; softball keeps its own table
entries because the scale rows are baseball-seeded.

| Key | Canonical owner | Winner | Reason recorded in code |
|---|---|---|---|
| `pop_time` / `catcher_pop_time` | `pop_time` | `GRADE_BENCHMARKS` | cites MLB Statcast; the scale row carried only generic research boilerplate |
| `fielding_exchange_time` | `exchange_time_sec` | `scale_reference` | the table entry is an admitted estimate; the scale row is documented and dated |
| `position_throw_velo` | `throw_velo_mph_infield` | `scale_reference` | both sourced; the scale row is dated and position-specific. Infield is the position-neutral default |

`SCALE_ANCHOR_SNAPSHOT` mirrors those winning rows verbatim so a static path can grade
without a query:

| Metric | Direction | Floor (20) | Avg (50) | Record (80) | Source | as_of |
|---|---|---|---|---|---|---|
| `exchange_time_sec` | lower better | 0.85 | 0.70 | 0.50 | documented elite pop-time breakdowns (Realmuto 1.80s pop = 0.54s transfer) | 2026-08-29 |
| `throw_velo_mph_infield` | higher better | 75 | 88 | 95 | owner | 2026-09-08 |
| `throw_velo_mph_outfield` | higher better | 78 | 92 | 98 | owner | 2026-09-08 |

> **Note for whoever edits benchmarks.** Because `position_throw_velo` is scale-owned for
> baseball, editing its `GRADE_BENCHMARKS` baseball anchors changes **nothing** for a
> baseball athlete — the grader never reads them. The softball anchors on that same key
> *are* read (and then suppressed by the softball gate, see Section 2), so today those
> anchors are effectively dead for both sports.
>
> `throw_velo_mph_outfield` is in the snapshot but no `DUPLICATE_RESOLUTIONS` entry routes
> any key to it, so nothing reaches it through `rawToGrade`. Whether an outfield-specific
> path is intended to exist could not be determined from the code.

---

## Section 2 — Every graded metric

Full contents of `GRADE_BENCHMARKS` (`src/data/gradeBenchmarks.ts`). **39 metric keys.**
Anchors are listed in grade order 20 · 30 · 40 · 50 · 60 · 70 · 80. Unit comes from the
registry (Section 3). "—" means that sport has an empty anchor array.

Provenance classes used in the last column:

- **sourced+dated** — a named source and a non-null `as_of`
- **sourced, undated** — a named source, `as_of: null`
- **estimate** — `source: "estimate"`; interpolated, explicitly *not* a citation
  (`isEstimateBenchmark()` returns true for exactly these)
- **convention** — only the sub-floor tail is in this class; no table row is

| Metric key | Sport | 20 | 30 | 40 | 50 | 60 | 70 | 80 | Unit | source | as_of | Class |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ten_yard_dash` | BB | 1.85 | 1.75 | 1.65 | 1.55 | 1.467 | 1.383 | 1.30 | s | PG/PBR event timing, MLB Combine — baseball only | null | sourced, undated |
| | SB | — | | | | | | | | | | |
| `seven_yard_dash` | BB | — | | | | | | | s | PG/PBR softball event timing — softball acceleration test | null | sourced, undated |
| | SB | 1.55 | 1.473 | 1.397 | 1.32 | 1.247 | 1.173 | 1.10 | | | | |
| `thirty_yard_dash` | BB | 4.30 | 4.117 | 3.933 | 3.75 | 3.567 | 3.383 | 3.20 | s | estimate | null | **estimate** |
| | SB | 4.60 | 4.40 | 4.20 | 4.00 | 3.817 | 3.633 | 3.45 | | | | |
| `sixty_yard_dash` | BB | 7.50 | 7.267 | 7.033 | 6.80 | 6.533 | 6.267 | 6.00 | s | owner | 2026-09-08 | sourced+dated |
| | SB | — | | | | | | | | | | |
| `forty_yard_dash` | BB | — | | | | | | | s | PG/PBR softball event timing — softball top-end speed test | null | sourced, undated |
| | SB | 5.75 | 5.517 | 5.283 | 5.05 | 4.833 | 4.617 | 4.40 | | | | |
| `ten_thirty_split` | BB | 3.00 | 2.80 | 2.60 | 2.40 | 2.233 | 2.067 | 1.90 | s | estimate | null | **estimate** |
| | SB | 3.30 | 3.067 | 2.833 | 2.60 | 2.433 | 2.267 | 2.10 | | | | |
| `thirty_sixty_split` | BB | 3.40 | 3.20 | 3.00 | 2.80 | 2.633 | 2.467 | 2.30 | s | estimate | null | **estimate** |
| | SB | 3.70 | 3.467 | 3.233 | 3.00 | 2.817 | 2.633 | 2.45 | | | | |
| `pro_agility` | BB | 4.90 | 4.70 | 4.50 | 4.30 | 4.10 | 3.90 | 3.70 | s | NFL/MLB Combine cross-reference, PG data | null | sourced, undated |
| | SB | 5.10 | 4.90 | 4.70 | 4.50 | 4.283 | 4.067 | 3.85 | | | | |
| `lateral_shuffle` | BB | 3.60 | 3.367 | 3.133 | 2.90 | 2.717 | 2.533 | 2.35 | s | estimate | null | **estimate** |
| | SB | 3.80 | 3.567 | 3.333 | 3.10 | 2.90 | 2.70 | 2.50 | | | | |
| `first_step_5yd` | BB | 1.40 | 1.30 | 1.20 | 1.10 | 1.00 | 0.90 | 0.80 | s | estimate | null | **estimate** |
| | SB | 1.50 | 1.40 | 1.30 | 1.20 | 1.09 | 0.98 | 0.87 | | | | |
| `sl_broad_jump` | BB | 55 | 62 | 69 | 76 | 85.667 | 95.333 | 105 | in | NSCA normative tables, PG data | null | sourced, undated |
| | SB | 48 | 55.333 | 62.667 | 70 | 79.333 | 88.667 | 98 | | | | |
| `sl_lateral_broad_jump` | BB | 45 | 51.667 | 58.333 | 65 | 74.333 | 83.667 | 93 | in | estimate | null | **estimate** |
| | SB | 42 | 48.333 | 54.667 | 61 | 69.667 | 78.333 | 87 | | | | |
| `sl_vert_jump` | BB | 18 | 21 | 24 | 27 | 30.667 | 34.333 | 38 | in | NSCA, PG event data | null | sourced, undated |
| | SB | 16 | 19 | 22 | 25 | 28.333 | 31.667 | 35 | | | | |
| `vertical_jump` | BB | 22 | 25 | 28 | 31 | 34.667 | 38.333 | 42 | in | NSCA normative tables | null | sourced, undated |
| | SB | 19 | 21.667 | 24.333 | 27 | 30.667 | 34.333 | 38 | | | | |
| `standing_broad_jump` | BB | 70 | 78.333 | 86.667 | 95 | 105 | 115 | 125 | in | NSCA normative tables | null | sourced, undated |
| | SB | 62 | 70.333 | 78.667 | 87 | 96.667 | 106.333 | 116 | | | | |
| `mb_situp_throw` | BB | 20 | 25 | 30 | 35 | 41.667 | 48.333 | 55 | ft | estimate | null | **estimate** |
| | SB | 17 | 21.333 | 25.667 | 30 | 36 | 42 | 48 | | | | |
| `seated_chest_pass` | BB | 16 | 20 | 24 | 28 | 33 | 38 | 43 | ft | estimate | null | **estimate** |
| | SB | 13 | 16.333 | 19.667 | 23 | 27.667 | 32.333 | 37 | | | | |
| `mb_rotational_throw` | BB | 22 | 26.333 | 30.667 | 35 | 40 | 45 | 50 | ft | estimate | null | **estimate** |
| | SB | 19 | 23 | 27 | 31 | 36 | 41 | 46 | | | | |
| `mb_overhead_throw` | BB | 22 | 27.333 | 32.667 | 38 | 44.333 | 50.667 | 57 | ft | estimate | null | **estimate** |
| | SB | 18 | 23 | 28 | 33 | 39 | 45 | 51 | | | | |
| `tee_exit_velocity` | BB | 70 | 77.667 | 85.333 | 93 | 97.667 | 102.333 | 107 | mph | owner | 2026-09-08 | sourced+dated |
| | SB | 50 | 56 | 62 | 68 | 74 | 80 | 86 | | | | |
| `max_tee_distance` | BB | 200 | 243.333 | 286.667 | 330 | 370 | 410 | 450 | ft | estimate | null | **estimate** |
| | SB | 130 | 163.333 | 196.667 | 230 | 263.333 | 296.667 | 330 | | | | |
| `bat_speed` | BB | 55 | 60.333 | 65.667 | 71 | 77 | 83 | 89 | mph | Statcast bat tracking, league-wide (MLB avg 71.5, elite 78–80+) | 2026-01-01 | sourced+dated |
| | SB | 48 | 53 | 58 | 63 | 69 | 75 | 81 | | | | |
| `avg_exit_velo_bp` | BB | 65 | 71.667 | 78.333 | 85 | 91 | 97 | 103 | mph | Driveline, MLB Combine avg | null | sourced, undated |
| | SB | 46 | 51.667 | 57.333 | 63 | 69 | 75 | 81 | | | | |
| `long_toss_distance` | BB | 170 | 206.667 | 243.333 | 280 | 326.667 | 373.333 | 420 | ft | Driveline, PG event data | null | sourced, undated |
| | SB | 125 | 153.333 | 181.667 | 210 | 243.333 | 276.667 | 310 | | | | |
| `pitching_velocity` | BB | 84 | 87.5 | 91 | 94.5 | 97.733 | 100.967 | 104.2 | mph | MLB Combine avg 2019-2023, PG/PBR event data | 2023-12-31 | sourced+dated |
| | SB | 52 | 56.667 | 61.333 | 66 | 70 | 74 | 78 | | | | |
| `position_throw_velo` | BB | 75 | 79.333 | 83.667 | 88 | 90.333 | 92.667 | 95 | mph | owner | 2026-09-08 | sourced+dated — **but baseball is scale-owned; these anchors are not read** |
| | SB | 52 | 58 | 64 | 70 | 76 | 82 | 88 | | | | |
| `pulldown_velocity` | BB | 78 | 83 | 88 | 93 | 99 | 105 | 111 | mph | owner | 2026-09-08 | sourced+dated |
| | SB | 55 | 60 | 65 | 70 | 74.667 | 79.333 | 84 | | | | |
| `fielding_exchange_time` | BB | 0.85 | 0.80 | 0.75 | 0.70 | 0.633 | 0.567 | 0.50 | s | estimate | null | **estimate** — baseball is scale-owned, anchors not read |
| | SB | 2.00 | 1.783 | 1.567 | 1.35 | 1.183 | 1.017 | 0.85 | | | | |
| `pop_time` | BB | 2.50 | 2.333 | 2.167 | 2.00 | 1.867 | 1.733 | 1.60 | s | Baseball Savant pop time leaderboard (MLB avg 2.00s to 2B) | 2026-01-01 | sourced+dated |
| | SB | 2.20 | 2.12 | 2.04 | 1.96 | 1.89 | 1.82 | 1.75 | | | | |
| `sixty_yard_shuttle` | BB | 15.5 | 14.667 | 13.833 | 13.0 | 12.267 | 11.533 | 10.8 | s | estimate | null | **estimate** |
| | SB | 16.5 | 15.667 | 14.833 | 14.0 | 13.267 | 12.533 | 11.8 | | | | |
| `sl_balance_eyes_closed` | BB | 10 | 18.333 | 26.667 | 35 | 53.333 | 71.667 | 90 | s | Research — balance norms for athletes | null | sourced, undated |
| | SB | 10 | 18.333 | 26.667 | 35 | 53.333 | 71.667 | 90 | | | | |
| `deceleration_10yd` | BB | 2.80 | 2.533 | 2.267 | 2.00 | 1.80 | 1.60 | 1.40 | s | estimate | null | **estimate** |
| | SB | 3.00 | 2.733 | 2.467 | 2.20 | 1.983 | 1.767 | 1.55 | | | | |
| `three_hundred_yd_shuttle` | BB | 68 | 63.667 | 59.333 | 55 | 51.333 | 47.667 | 44 | s | NSCA normative tables | null | sourced, undated |
| | SB | 73 | 68.667 | 64.333 | 60 | 56 | 52 | 48 | | | | |
| `sprint_repeat_avg` | BB | 4.80 | 4.533 | 4.267 | 4.00 | 3.80 | 3.60 | 3.40 | s | estimate | null | **estimate** |
| | SB | 5.10 | 4.833 | 4.567 | 4.30 | 4.083 | 3.867 | 3.65 | | | | |
| `sl_3x_bound` | BB | 23 | 26.333 | 29.667 | 33 | 37.667 | 42.333 | 47 | ft | NSCA bound norms + sport-specific elastic output research | null | sourced, undated |
| | SB | 21 | 24 | 27 | 30 | 34.333 | 38.667 | 43 | | | | |
| `shoulder_rom_internal` | BB | 28 | 33.667 | 39.333 | 45 | 52.667 | 60.333 | 68 | deg | Research — GIRD norms, throwing athlete ROM studies | null | sourced, undated |
| | SB | 30 | 35.667 | 41.333 | 47 | 54.667 | 62.333 | 70 | | | | |
| `shoulder_rom_external` | BB | 65 | 72.333 | 79.667 | 87 | 94.667 | 102.333 | 110 | deg | Research — throwing athlete ROM studies | null | sourced, undated |
| | SB | 66 | 73.333 | 80.667 | 88 | 95.667 | 103.333 | 111 | | | | |
| `hip_internal_rotation` | BB | 20 | 24.667 | 29.333 | 34 | 40 | 46 | 52 | deg | Research — hip mobility norms for rotational athletes | null | sourced, undated |
| | SB | 22 | 26.667 | 31.333 | 36 | 42 | 48 | 54 | | | | |
| `ankle_dorsiflexion` | BB | 2.2 | 2.8 | 3.4 | 4.0 | 4.667 | 5.333 | 6.0 | in | Research — knee-to-wall test norms | null | sourced, undated |
| | SB | 2.5 | 3.067 | 3.633 | 4.2 | 4.867 | 5.533 | 6.2 | | | | |

**Tally:** 39 keys — 7 sourced+dated, 18 sourced-undated, 14 estimates, 0 conventions
(the only convention in the grading system is the sub-floor tail).

### Softball: deliberately ungraded

`SOFTBALL_GRADED_METRICS` (`gradeBenchmarks.ts:657-665`) is a whitelist of **7** keys:
`seven_yard_dash`, `forty_yard_dash`, `shoulder_rom_internal`, `shoulder_rom_external`,
`hip_internal_rotation`, `ankle_dorsiflexion`, `sl_balance_eyes_closed`.

Everything else with a non-empty softball array is **measured and stored but not graded**
(`SOFTBALL_UNGRADED_METRICS`, computed at module load). That is **30 keys**:

`thirty_yard_dash`, `ten_thirty_split`, `thirty_sixty_split`, `pro_agility`,
`lateral_shuffle`, `first_step_5yd`, `sl_broad_jump`, `sl_lateral_broad_jump`,
`sl_vert_jump`, `vertical_jump`, `standing_broad_jump`, `mb_situp_throw`,
`seated_chest_pass`, `mb_rotational_throw`, `mb_overhead_throw`, `tee_exit_velocity`,
`max_tee_distance`, `bat_speed`, `avg_exit_velo_bp`, `long_toss_distance`,
`pitching_velocity`, `position_throw_velo`, `pulldown_velocity`,
`fielding_exchange_time`, `pop_time`, `sixty_yard_shuttle`, `deceleration_10yd`,
`three_hundred_yd_shuttle`, `sprint_repeat_avg`, `sl_3x_bound`.

**Why**, recorded verbatim in the file header: AUSL is in its second season (six teams,
25-game schedule) and publishes no tracking-metric averages — there is no
Statcast-equivalent leaderboard for professional softball. Every softball column with a
baseball counterpart was produced by **scaling the baseball figure by a constant**, which
is exactly what the app will not grade an athlete against. The raw value is still logged;
the grades light up the moment AUSL publishes or the owner supplies figures. *"A wrong
grade is worse than an absent one."*

**Why the seven are not suppressed:** `seven_yard_dash` and `forty_yard_dash` are
softball-native tests with their own PG/PBR softball timing source and no baseball table
to have been converted from. The ROM / balance metrics are clinical human-movement norms,
not a professional-league performance scale.

> **Gap to flag.** The softball anchors for the 30 suppressed keys are still present in
> the table and still look authoritative on inspection. Nothing in the data marks them as
> converted — only the prose header and the whitelist do. Deleting a key from
> `SOFTBALL_GRADED_METRICS` is the only guard; adding one back silently turns a converted
> number into a grade.

---

## Section 3 — The combine and the test registry

`src/data/performanceTestRegistry.ts` — the 6-Week Test system. **39 metrics.** Metric
keys are immutable once created; new metrics get new keys.

Every registry key has a matching `GRADE_BENCHMARKS` entry, and every benchmark key has a
matching registry entry — the two lists are 1:1 today. "Feeds a grade" below means
`rawToGrade` can return a number for that sport: it requires a non-empty anchor array for
the sport, and for softball it additionally requires membership in the graded whitelist.

Ten categories: `speed`, `quickness`, `power_lower`, `power_upper`, `exit_velocity`,
`throwing_velocity`, `fielding`, `body_control`, `energy_system`, `mobility`
(labelled "Fascial Elasticity").

| Key | Display name | Unit | Category | Direction | Tier | Sports | Grades BB? | Grades SB? |
|---|---|---|---|---|---|---|---|---|
| `ten_yard_dash` | 10-Yard Dash | s | speed | lower better | free | BB | yes | n/a |
| `seven_yard_dash` | 7-Yard Dash | s | speed | lower better | free | SB | n/a | **yes** |
| `thirty_yard_dash` | 30-Yard Dash | s | speed | lower better | paid | BB, SB | yes | no (converted) |
| `forty_yard_dash` | 40-Yard Dash | s | speed | lower better | paid | SB | n/a | **yes** |
| `sixty_yard_dash` | 60-Yard Dash | s | speed | lower better | paid | BB | yes | n/a |
| `ten_thirty_split` | 10-30 Split | s | speed | lower better | elite | BB, SB | yes | no |
| `thirty_sixty_split` | 30-60 Split | s | speed | lower better | elite | BB, SB | yes | no |
| `pro_agility` | 5-10-5 Pro Agility | s | quickness | lower better | free | BB, SB | yes | no |
| `lateral_shuffle` | Lateral Shuffle (10yd) | s | quickness | lower better | paid | BB, SB | yes | no |
| `first_step_5yd` | First Step (5yd) | s | quickness | lower better | elite | BB, SB | yes | no |
| `sl_broad_jump` | SL Broad Jump | in | power_lower | higher better | free | BB, SB | yes | no |
| `sl_lateral_broad_jump` | SL Lateral Broad Jump | in | power_lower | higher better | free | BB, SB | yes | no |
| `sl_vert_jump` | SL Vertical Jump | in | power_lower | higher better | paid | BB, SB | yes | no |
| `vertical_jump` | Vertical Jump | in | power_lower | higher better | free | BB, SB | yes | no |
| `standing_broad_jump` | Standing Broad Jump | in | power_lower | higher better | paid | BB, SB | yes | no |
| `mb_situp_throw` | MB Situp Throw (5lb) | ft | power_upper | higher better | free | BB, SB | yes | no |
| `seated_chest_pass` | Seated Chest Pass (5lb) | ft | power_upper | higher better | free | BB, SB | yes | no |
| `mb_rotational_throw` | MB Rotational Throw (5lb) | ft | power_upper | higher better | paid | BB, SB | yes | no |
| `mb_overhead_throw` | MB Overhead Throw (5lb) | ft | power_upper | higher better | elite | BB, SB | yes | no |
| `tee_exit_velocity` | Tee Exit Velocity | mph | exit_velocity | higher better | free | BB, SB | yes | no |
| `max_tee_distance` | Max Tee Distance | ft | exit_velocity | higher better | free | BB, SB | yes | no |
| `bat_speed` | Bat Speed | mph | exit_velocity | higher better | paid | BB, SB | yes | no |
| `avg_exit_velo_bp` | Avg Exit Velo (BP, 10 swings) | mph | exit_velocity | higher better | elite | BB, SB | yes | no |
| `long_toss_distance` | Long Toss Distance | ft | throwing_velocity | higher better | free | BB, SB | yes | no |
| `pitching_velocity` | Pitching Velocity | mph | throwing_velocity | higher better | free | BB, SB | yes | no |
| `position_throw_velo` | Position Player Throw Velo | mph | throwing_velocity | higher better | free | BB, SB | yes (via `throw_velo_mph_infield`) | no |
| `pulldown_velocity` | Pulldown Velocity | mph | throwing_velocity | higher better | elite | BB, SB | yes | no |
| `fielding_exchange_time` | Fielding Exchange Time | s | fielding | lower better | paid | BB, SB | yes (via `exchange_time_sec`) | no |
| `pop_time` | Pop Time (Catchers) | s | fielding | lower better | paid | BB, SB | yes | no |
| `sixty_yard_shuttle` | 60yd Shuttle | s | fielding | lower better | elite | BB, SB | yes | no |
| `sl_balance_eyes_closed` | SL Balance (Eyes Closed) | s | body_control | higher better | paid | BB, SB | yes | **yes** |
| `deceleration_10yd` | Deceleration (10yd stop) | s | body_control | lower better | elite | BB, SB | yes | no |
| `three_hundred_yd_shuttle` | 300yd Shuttle | s | energy_system | lower better | paid | BB, SB | yes | no |
| `sprint_repeat_avg` | Sprint Repeatability (6×30yd avg) | s | energy_system | lower better | elite | BB, SB | yes | no |
| `sl_3x_bound` | Single Leg 3x Bound | ft | mobility | higher better | free | BB, SB | yes | no |
| `shoulder_rom_internal` | Shoulder ROM Internal | deg | mobility | higher better | paid | BB, SB | yes | **yes** |
| `shoulder_rom_external` | Shoulder ROM External | deg | mobility | higher better | paid | BB, SB | yes | **yes** |
| `hip_internal_rotation` | Hip Internal Rotation | deg | mobility | higher better | paid | BB, SB | yes | **yes** |
| `ankle_dorsiflexion` | Ankle Dorsiflexion | in | mobility | higher better | elite | BB, SB | yes | **yes** |

Bilateral metrics (tested per side, `bilateralType`): `sl_broad_jump`,
`sl_lateral_broad_jump`, `sl_vert_jump`, `sl_3x_bound`, `sl_balance_eyes_closed`,
`ankle_dorsiflexion` (leg); `mb_rotational_throw`, `shoulder_rom_internal`,
`shoulder_rom_external`, `hip_internal_rotation` (side).

Tier gating (`getMetricsForContext`): `free` always; `paid` requires data-density level ≥2;
`elite` requires level ≥4. Density level comes from the subscription tier
(`src/data/dataDensityLevels.ts`: free 1, pitcher 2, 5tool 3, golden2way 4) — so a
`paid` metric is available from Complete Pitcher upward, and an `elite` metric only on
The Golden 2Way.

### Combine-style measurement vs. in-app derived

**Every one of the 39 is a self-entered or externally-instrumented field measurement.**
Each carries an `instructions` string describing a physical protocol, and several name
outside equipment explicitly: radar gun or HitTrax (`tee_exit_velocity`,
`pitching_velocity`, `position_throw_velo`, `pulldown_velocity`), Blast Motion or Diamond
Kinetics (`bat_speed`), goniometer (`shoulder_rom_*`, `hip_internal_rotation`), video
analysis (`fielding_exchange_time`), stopwatch or laser (the sprints).

**Nothing in this registry is derived by the app from video or gameplay.** No registry
metric is populated by the pose pipeline, the ball detector, or in-game logging — the
athlete or a timer enters the number.

> **Naming collision to flag.** There are **two separate "combine" systems** and they do
> not share keys:
>
> - This registry (the 6-Week Test), 39 keys, feeding `GRADE_BENCHMARKS`.
> - `src/lib/combine/events.ts` — a 20-event `COMBINE_EVENTS` catalog with tier gating
>   (`combine/tierGating.ts`) and monthly eligibility (`combine/eligibility.ts`), writing
>   to `combine_sessions` / `combine_results`. Its own source comments say
>   **"FOUNDATION ONLY. Not wired to any live surface."**
>
> The two overlap conceptually (`vertical_jump_height`, `broad_jump`, `exit_velocity`,
> `throw_velocity`, `pop_time`, `forty_yard_dash`…) but use **different string keys**, so
> nothing in `src/lib/combine/` feeds a grade today. Which of the two is intended to
> survive could not be determined from the code.

---

## Section 4 — The report card tiles

> **Source note.** The brief names `docs/MEASUREMENT-INVENTORY.md` as the tile inventory.
> **That file does not exist in this repo** (verified by path check). The inventory below
> was rebuilt from the tile components themselves plus `docs/report-card-audit.md` and
> `docs/asb/report-card-system-reference.md`. If a measurement inventory is later written,
> it should be generated from `src/lib/reportCard/` rather than maintained by hand.

### The visibility gate

`src/lib/reportCard/release1.ts` is the single enforcement point. Three classes:

- **VISIBLE** — landmark-backed end to end; may render and contribute to scores.
  **Exactly two metric keys: `tempo_sec`, `shoulder_tilt_deg`.**
- **HIDDEN** — LLM-derived; must not appear in any athlete-facing surface, trend,
  recommendation, pillar contribution, or coaching output. 27 keys.
- **SHOWCASE_FUTURE** — pose-derivable in principle, blocked on calibration / object
  tracking / a release anchor that does not exist. 23 keys. Reversible without new doctrine.

Plus `RELEASE1_HITTING_SUPPRESSED = true`, which empties the hitting tile set wholesale,
and `RELEASE1_HIDDEN_SIGNAL_IDS`, which forces UHRC pillar contributions sourced from a
hidden metric to `missing: true` rather than fabricating a score.

Each discipline file filters itself:

- `bp.ts` drops a tile if its backing metric is hidden **or** showcase-future.
- `sp.ts` renders a tile only if **all** of its backing metrics are explicitly VISIBLE —
  unknown or partially promoted metrics stay suppressed.
- `bh.ts` returns `[]` outright while the hitting flag is true.
- `throwing.ts` reuses the surviving BP tiles.

### Baseball Pitching — `src/lib/reportCard/disciplines/bp.ts` (9 defined, **2 render**)

| Tile | Claims to measure | Definition / threshold | Backing metric | Honest number? | State |
|---|---|---|---|---|---|
| Tempo | Speed of the delivery | Peak leg lift → front foot strike. PASS ≤1.05s | `tempo_sec` | **Yes — the only deterministic one.** Computed by `src/lib/biomech/metrics/tempoSec.ts` from frame anchors + true fps; the AI-vision `tempo_sec` is deliberately never read because every returned value fell outside the contract's plausible 0.4–2.0s range | **VISIBLE** |
| Shoulder Tilt at Release | Shoulder levelness at release | PASS ≤10° absolute | `shoulder_tilt_deg` | Model estimate, not deterministic. Visible on sufferance, not on proof | **VISIBLE** |
| Energy Angle | Plant-foot centre → front hip at peak leg lift | PASS ≥18°, elite 25° | `energy_angle_deg` | **No — constant.** Returned the identical value on every clip measured | HIDDEN |
| Head Stability (non-negotiable) | Vertical head travel | PASS ≤2% | `head_vertical_movement_pct` | **No — never measures.** Returned `missing` on 12/12 real clips | HIDDEN |
| Lift & Thrust | Combined lift-and-thrust angle off the rubber | PASS ≥18° | `lift_thrust_deg` | **No — constant.** 20 on 6/6 stored clips, zero variance; value pinned to the standard's threshold anchor | HIDDEN |
| Hip / Shoulder Separation (non-negotiable) | Shoulders closed until landing | PASS ≤0° premature opening | `premature_shoulder_open_deg` | **No — near-constant.** 20 on 7/8 clips (one outlier at 25); pinned to the threshold anchor | HIDDEN |
| Stride Length | Back ankle at foot raise → front ankle at landing, as % of height | PASS ≥90% | `stride_pct_of_height` | Not producible — needs calibration | SHOWCASE_FUTURE |
| Glove / Front Side | Glove stays inside the shoulder frame | PASS ≤0" drift | `glove_drift_outside_frame_in` | Not producible — needs calibration | SHOWCASE_FUTURE |
| Head at Release | Head alignment to target line | PASS ≤15° absolute | `head_at_release_deg` | Not producible — needs a release anchor | SHOWCASE_FUTURE |

**Fabricated-value tiles — do not unhide.** `energy_angle_deg`, `lift_thrust_deg`,
`premature_shoulder_open_deg` returned a *constant* rather than a measurement, and
`head_vertical_movement_pct` never returned anything. Evidence:
`docs/asb/ai-vision-metric-variability-audit.md` (2026-08) and the full-app audit
(2026-08-29). None has a pose-derived implementation in `src/lib/biomech/metrics/`.
Unhiding any of them without first building that implementation restores four fake
numbers, two of which are non-negotiable gates that cap the letter grade.

> **Contradiction to flag.** The comment above `BP_TILE_TO_METRIC` (`bp.ts:250-258`) states
> "The complete Release-1 BP visible set per Phase 44 §10 is: tempo_sec, energy_angle_deg,
> lift_thrust_deg, premature_shoulder_open_deg, shoulder_tilt_deg,
> head_vertical_movement_pct" — six metrics, four of which `release1.ts` lists as HIDDEN.
> The **code is correct and the comment is stale** (the filter reads `release1.ts`, so only
> two tiles render), but the comment reads like an instruction to restore six. It should be
> deleted before it misleads someone.

### Throwing — `src/lib/reportCard/disciplines/throwing.ts` (**1 renders**)

Reuses BP minus the from-windup-only tiles (Energy Angle, Tempo, Lift & Thrust) by key
allowlist. Of the six it keeps, five are hidden or showcase-future, so **only Shoulder Tilt
at Release survives**. Note this means Throwing loses the *only deterministic tile in the
app* by design, and is left with a single model-estimated one.

### Hitting — `src/lib/reportCard/disciplines/bh.ts` (**0 render**)

`bhReportCard.tiles` is `[]` while `RELEASE1_HITTING_SUPPRESSED` is true. The spec is
preserved so downstream shapes do not change. Tiles, grouped by phase:

| Phase | Tiles |
|---|---|
| P1 Hip Load | Hip Load Stability |
| P2 Hand Load | Hand Load · P2 Timing → Knee Lift · Eyes / Head Tracking |
| P3 Stride / Landing | Stride Direction · Heel Plant / Landing · P3 Timing → Release · Hands Outside Shoulders at Landing |
| P4 Hitter's Move | Sequencing · Bat Path In/Out of Zone · On-Plane % · Time to Contact · Bat Speed Through Contact · Connection & Barrel Delivery · Hitter's Move Quality · Shoulder Plane Steadiness · Finish & Balance · Shoulder-to-Shoulder Hold |

Why every one is hidden, per `release1.ts`:

- **Physics / bat heuristics** (`bat_speed_contact_mph`, `time_to_contact_ms`,
  `on_plane_pct`, `bat_path_score_100`) — LLM-only. No bat detector, no swing-start or
  contact anchor, no calibration. A speed in mph from those inputs is invention.
- **0–100 judgement tiles** (`hip_stability_score_100`, `hand_load_score_100`,
  `eyes_track_score_100`, `heel_plant_score_100`, `connection_barrel_delivery_score_100`,
  `hitters_move_score_100`, `shoulder_plane_steadiness_score_100`,
  `finish_balance_score_100`) — model opinion formatted as a measurement.
- **Boolean anchors** (`p2_timing_pass`, `sequencing_ok`,
  `hands_outside_shoulders_at_landing_pass`, `shoulder_to_shoulder_hold_pass`,
  `front_shoulder_leak_before_contact`) — pose-derivable in principle, LLM-only today.
- **Pose-only tiles that DO have real MediaPipe geometry built** but stay hidden because
  hitting is suppressed and their thresholds are unvalidated:
  `back_knee_flex_maintained_pass` (`backKneeFlexMaintained.ts`),
  `post_landing_hip_drift_pass` (`postLandingHipDrift.ts`),
  `hands_stay_up_at_plant_pass`, `lead_elbow_bend_increasing_pass`,
  `head_vertical_movement_post_landing_pct`, `pelvis_rotation_efficiency_deg`. These are
  the nearest to honest of the hitting set — real geometry, unvalidated thresholds.
- **Showcase-future hitting keys** (blocked on anchors + fps verification):
  `p3_release_offset_ms`, `stride_dir_deg_off_square`,
  `front_shoulder_leak_pct_of_window`, `shoulder_to_shoulder_hold_pct_to_contact`.

One behaviour worth preserving if hitting ever returns: the Shoulder-to-Shoulder Hold tile
carries an **auto-FAIL override** — a front-shoulder leak before contact nullifies the tile
regardless of spacing held, and writes a verbatim `note` explaining why, so the athlete is
never left guessing at a FAIL.

> **Contradiction to flag.** The `bh.ts` header comment says "17-tile contract", but the
> array contains **18** tiles (the list above). Which count is authoritative could not be
> determined from the code.

### Softball Pitching — `src/lib/reportCard/disciplines/sp.ts` (13 defined, **0 render**)

Every backing metric is SHOWCASE_FUTURE until the windmill output has been reviewed on
real video.

| Tile | Standard as written | Backing metric(s) |
|---|---|---|
| Wind-up Trunk / Tibia | **Proposed** ≤10° from parallel | `windup_trunk_tibia_deg` |
| Wind-up Hip Square | **Proposed** ≤10° from home-plate line | `windup_hip_square_deg` |
| Wind-up Knee Over Foot | **Proposed** ≤10° from mid-foot | `windup_knee_over_foot_deg` |
| Drive Foot on Power Line | **Proposed** ≤10° from rubber-to-plate line | `windup_foot_power_line_deg` |
| Stride Triple Extension | Drive leg extends; trunk still faces home | `stride_triple_extension_pass` |
| SFC Foot Angle | **Sourced:** 0–45° toward pitching-arm side | `sfc_foot_angle_deg` |
| SFC Arm Path | **Proposed** ≤15° from near-vertical | `sfc_arm_path_deg` |
| SFC Trunk Alignment | Head-to-ground line through belly button | `sfc_trunk_alignment_pass` |
| SFC Knee Over Ankle | **Proposed** ≤10° from ankle centre | `sfc_knee_ankle_deg` |
| SFC Hip / Shoulder Rotation | **Proposed** ≥20° toward pitching-arm side | `sfc_hip_shoulder_rotation_deg` |
| Acceleration Path | Arm close; back leg near power line | `accel_arm_path_pass` |
| Follow-Through Stability | **Proposed** ≤10° knee-to-ankle deviation | `ft_knee_ankle_deg` |
| Three-Moment Stride Profile | **Sourced bands:** Youth ≈98/89/68 · Collegiate ≈93/89/73, ±10 points | `stride_pct_top`, `stride_pct_sfc`, `stride_pct_release` |

The file deliberately labels **"Proposed"** vs **"Sourced"** in the standard text so a
starting tolerance is never presented as published evidence. Keep that convention.

### Other constants on the report-card surface

Per `docs/report-card-audit.md §5`: the headline "efficiency score" on an analysis is a
model estimate with a hard-coded default of **75**, and the PIE V2 confidence values
(**60 / 80 / 92**) are constants rather than computed confidences. Neither is gated by
`release1.ts` — they are outside the tile system and are still rendered.

### Grading a card (`src/lib/reportCard/grade.ts`)

Separate from the 20–80 benchmark scale. Per measured tile: pass 100, warn 70, fail 0;
score is the mean across **measured** tiles only. Missing tiles do not drag the average but
show in the "X of Y measured" chip. One non-negotiable failure caps at 60 (D), two or more
cap at 40 (F). Letter: ≥90 A · ≥80 B · ≥70 C · ≥60 D · else F. Replay-stable: identical
tiles → identical letter.

> **Worth knowing.** With only two visible pitching tiles and one throwing tile, the letter
> grade is computed off a one- or two-tile average. Whether a letter should be issued at
> that sample size could not be determined from the code — nothing suppresses it.

---

## Section 5 — What's wired to what

*(Wiring trace was still running when this section was written; see the "Could not
determine" list below for what is confirmed versus outstanding.)*

### Benchmark consumers — everything downstream of a benchmark edit

Every file that imports `GRADE_BENCHMARKS`, `rawToGrade`, the `gradeScale` helpers,
`SCALE_ANCHOR_SNAPSHOT`, or `performanceTestRegistry`:

| File | What it does with it |
|---|---|
| `src/lib/gradeEngine.ts` | the conversion itself |
| `src/data/gradeBenchmarks.ts` | the table + softball gate |
| `src/lib/benchmarks/canonical.ts` | duplicate resolution + scale snapshot |
| `src/lib/benchmarks/gradeScale.ts` | scale constants + sub-floor tail |
| `src/lib/defense/beatenRunnerGrade.ts` | grades scale-owned rows |
| `src/lib/catching/popTimeGrade.ts` | catcher pop-time grading |
| `src/lib/speedScoring.ts` | speed metric scoring |
| `src/lib/longitudinalEngine.ts` | trend / over-time grading |
| `src/lib/testIntelligenceEngine.ts` | test interpretation |
| `src/lib/adaptiveTestPriority.ts` | which test to prioritise next |
| `src/data/positionToolProfiles.ts` | position tool weighting |
| `src/components/vault/VaultPerformanceTestCard.tsx` | the athlete-facing test card |
| `src/components/grades/DevelopmentCurveNote.tsx` | sub-floor disclosure + "what moves it" |
| `src/components/grades/EstimateBenchmarkNote.tsx` | estimate-provenance disclosure |
| `src/lib/benchmarks/__tests__/canonicalParity.test.ts` | parity between the two systems |
| `src/lib/catching/__tests__/popTimeGrade.test.ts` | pop-time grade cases |
| `src/test/engine-invariants.test.ts` | registry/engine invariants |

Change an anchor and all of the above move. The provenance guard
(`scripts/check-benchmark-provenance.ts`) fails the build on undated, unsourced, or stale
anchors.

### Sub-floor grade → symptom-to-fix families

`src/components/grades/DevelopmentCurveNote.tsx:13,42` calls
`firstWhatMovesIt(subFloorMetricKeys)` from `src/lib/benchmarks/whatMovesIt.ts`. That module
maps a metric to the **fault family** that moves it, plus a tier-0 movement (doable with no
equipment) and the next earnable standards mark. It reads:

- `src/lib/wic/faultLedger/families.ts` — `FAULT_FAMILIES`, the ten problems: first step,
  deceleration base, posterior braking, ankle and depth, back leg block, arm health,
  rotational output, landing and elastic, trunk transfer, grip and forearm. Each has a
  ladder of frozen `wk_movement_catalog` slugs by equipment tier 0→3.
- `src/lib/hammer/standards/catalog.ts` — the standard whose Standard tier is the next mark.

Doctrine enforced in that file: it **names a family, a movement and a target — it never
authors a dose.** Sets and reps come only from the dosage doctrine. A metric with no honest
family renders no guidance rather than a guess. `scripts/check-family-coverage.ts` fails the
build if any family lacks a tier-0 rung.

`DevelopmentCurveNote.tsx` is the **only** consumer of `whatMovesIt` in the repo.

### The fault ledger — who writes it

Table: `wk_fault_signals`. **There is no client-side or edge-function writer anywhere in
the app.** Every row is written by a Postgres trigger; all TypeScript access is read-only.

| Writer (all SQL) | Trigger | Fires on | `source` |
|---|---|---|---|
| `wk_record_fault_signal_from_finding()` — `20260908120738_*.sql:8-54` | `analysis_fault_findings_to_ledger` | `AFTER INSERT ON analysis_fault_findings` | `video_analysis` |
| `wk_fielding_signals_from_session()` — `20260908122244_*.sql:110-156` | `performance_sessions_fielding_to_ledger` | `AFTER INSERT ON performance_sessions` (module `fielding`) | `log_trend` |
| `wk_fielding_signals_from_game_play()` — `20260908122244_*.sql:164-192` | `gp_defense_plays_to_ledger` | `AFTER INSERT ON gp_defense_plays` | `game_hub` |

All three funnel through `wk_upsert_fault_signal()` (`20260908122244_*.sql:82-107`), which
upserts on `(user_id, source, discipline, fault_key, root_pattern_id)` — incrementing
`sample_size`, recomputing `severity`, bumping `observed_at`. `EXECUTE` on the writers is
revoked from `public`/`anon`/`authenticated`, so only SECURITY DEFINER trigger context can
call them. `discipline` is constrained to hitting/pitching/throwing/fielding/running/lifting.

| Reader | Role |
|---|---|
| `src/hooks/useFaultLedger.ts:31-40` | client read; also `useFamilyAlternatives()` (`:13-17,54-55`) for same-problem swap ladders gated by equipment tier |
| `src/lib/wic/faultLedger/ranking.ts` | client-side ranking (`rankFaults`, `familyForRootPattern` at `:15,120`) |
| `supabase/functions/_shared/wic/faultLedger/priority.ts` | `buildFaultPriority` — the server mirror |
| `supabase/functions/wk-generate-daily/index.ts:888-899` | the daily-plan consumer (below) |
| `supabase/functions/delete-account/ownedTables.ts` | included in account deletion |

> **Duplication risk to know about.** `priority.ts:37-166` hard-codes `ROOT_PATTERN_FAMILY`
> and `FAMILY_LADDER_SLUGS` as a **manual copy** of `families.ts`, because an edge function
> cannot import from `src/`. `src/test/faultLedgerPriorityParity.test.ts` catches drift, but
> nothing syncs them automatically. Edit `families.ts` and you must edit `priority.ts`.

> **Dead schema to flag.** The `source` check constraint (`20260906210728_*.sql:4`) and the
> `FaultSource` type (`ranking.ts:17-26`) both allow `complaint`, `report_card`,
> `standards_gap`, `grade_low`, `daily_checkin`, `coach_note`. **Nothing writes any of
> them.** Whether these are planned or dead could not be determined — no TODO or ticket
> reference exists.



### Fault ledger → Hammer's Today (daily plan)

`supabase/functions/wk-generate-daily/index.ts`:

- reads `wk_fault_signals` **120 days back**, selecting
  `source, fault_key, root_pattern_id, discipline, confidence, sample_size, severity, observed_at`
  (`index.ts:888-896`)
- the comment at `:888` states the read is **"Read-only, priority-only"**
- `buildFaultPriority(faultSignals, planDateEpoch)` (`:1109-1118`) collapses the athlete's
  recorded faults into **at most three root-pattern families**, weighted
  `RANK_BONUS = [0.9, 0.55, 0.3]` (`priority.ts:236, :262-280`)
- the only effect is `faultPriority.bonusForSlug(m.slug)` added as one additive term inside
  `scoreCandidate` (`:1120-1136`), alongside `emphasisFor()` and `shortfallBonus()`, minus
  `varietyPenalty()`
- an empty or unreadable ledger yields `active: false` and a bonus of 0 for every slug
  (`priority.ts:282-287`) — a read failure can never block a plan
- the decision is recorded for replay at `:3370-3377` as
  `fault_priority: { version, active, signals_read, ranked }`

So a fault signal changes **which of the already-legal options wins a discretionary slot**.
By construction it cannot filter a pool, remove a movement, empty a slot, or author a dose
(`priority.ts:1-16`). Pools and gates run before scoring; doses are resolved separately from
catalog defaults and the dosage doctrine (`index.ts:1289-1428`), which never reads fault
priority.

### Fault ledger → video recommendations

`src/lib/videoRecommendationEngine.ts` `recommendVideos()` is a **pure function** with no DB
or ledger awareness. It builds a `faultScope` as the deduped union of correction tags and
movement patterns (`:184, :223, :436`), used for the unseen-first rotation: unseen videos
rank above seen ones *for the same fault* until all are seen, then the scope resets.

Two upstream paths feed it, and only one touches the ledger:

1. **Ledger path (one component).** `src/components/hammer/DefensivePrepVideo.tsx:18,32,35-44`
   calls `useFaultLedger()`, filters to `discipline === 'fielding'`, and passes the fault
   keys as both `movementPatterns` and `correctionTags` into `useVideoSuggestions()` →
   `recommendVideos()`.
2. **Bypass paths (most surfaces).** `src/hooks/useRecentFaultKeys.ts:20-28` reads
   `analysis_fault_findings.correction_key` **directly**, feeding
   `AnalysisVideoRecommendations.tsx:19,78-90`. `TodaysHammerPick.tsx:29-71` reads
   `hie_snapshots.weakness_clusters` plus recent `performance_sessions`.
   `DailyPlanVideoChips.tsx:103` consumes taxonomy-aggregated movement patterns. None of
   these read `wk_fault_signals`.

**`fault_scope` analytics.** Nullable column on `library_video_analytics`
(`20260908125728_*.sql:1-4`), written by `trackVideoWatched()`
(`useVideoSuggestions.ts:248-262`) and read back for the seen-set at `:105-109`. Passed
through by `useVideoMoment.ts:84`, `VideoSuggestionsPanel.tsx:60-81`, `VideoMoment.tsx:69`,
`TodaysHammerPick.tsx:120`, `AnalysisVideoRecommendations.tsx:191-224`,
`GameVideoRecommendations.tsx:96-121`, `DefensivePrepVideo.tsx:81-99`,
`DailyPlanVideoChips.tsx:122-151`. Note it holds the **recommendation engine's tag-layer
scope**, not `wk_fault_signals.fault_key` — they coincide only in the `DefensivePrepVideo`
path, because that component seeds its tags from the ledger. Tests:
`videoRecommendationEvidence.test.ts`, `videoRecommendationCoverage.test.ts`.

### The link that does NOT exist

**A report-card grade does not reach the fault ledger.** Nothing in `src/lib/reportCard/`
writes to `wk_fault_signals`, and nothing in the fault-ledger files imports from
`src/lib/reportCard/`. The schema anticipates it — `report_card`, `grade_low` and
`standards_gap` are legal `source` values — but no writer exists. The report card reads the
same analysis payload the trigger reads; it is a parallel presentation layer, not a writer.

Concretely, the chain from a benchmark edit is:

```
GRADE_BENCHMARKS / scale_reference anchor
        ↓ rawToGrade()
grade (20–80, or sub-floor decimal)
        ↓ only if sub-floor
DevelopmentCurveNote → whatMovesIt → FAULT_FAMILIES        (display guidance only)

analysis_fault_findings ─┐
performance_sessions ────┼─ DB trigger ─→ wk_fault_signals ─┬─→ buildFaultPriority
gp_defense_plays ────────┘                                  │      → wk-generate-daily
                                                            └─→ useFaultLedger
                                                                   → DefensivePrepVideo
                                                                     → recommendVideos
```

The two halves meet only in the *family vocabulary* (`FAULT_FAMILIES`), never in data flow.
Editing a benchmark anchor changes grades and the sub-floor guidance text; it does not
change a single daily-plan movement or video recommendation.


---

## What I could not determine from the code

1. **`docs/MEASUREMENT-INVENTORY.md` does not exist.** Section 4 was rebuilt from the tile
   components and `docs/report-card-audit.md`. If that inventory once existed it is not in
   this repo now.
2. **Two grade-label ladders disagree.** `gradeEngine.gradeToLabel` and
   `src/lib/gradeLabel.getGradeLabel` return different words for the same number in the
   40–60 band. Which is canonical is not stated anywhere.
3. **Which "combine" survives.** `src/data/performanceTestRegistry.ts` (39 keys, wired to
   grading) and `src/lib/combine/*` (20 events, self-described as "FOUNDATION ONLY. Not
   wired to any live surface") are separate systems with different keys for overlapping
   tests. No code reconciles them.
4. **`throw_velo_mph_outfield` is unreachable.** It sits in `SCALE_ANCHOR_SNAPSHOT` but no
   `DUPLICATE_RESOLUTIONS` entry routes to it, so `rawToGrade` never reads it. Whether an
   outfield-specific route is intended is not recorded.
5. **BH tile count.** The header says 17; the array holds 18.
6. **The stale `bp.ts` comment** claims a six-metric Release-1 visible set that contradicts
   `release1.ts`. The code behaves correctly; the comment is wrong. I did not change it —
   flagging rather than editing, since this pass is documentation only.
7. **Whether a letter grade should be issued off one or two measured tiles.** Nothing
   suppresses `gradeFromTiles` at low tile counts, and no minimum is recorded.
8. **Provenance-guard current state.** `scripts/check-benchmark-provenance.ts` exists and
   is wired to the build, but I did not run it in this pass, so the live
   sourced/undated/estimate tallies it reports were not re-verified here. The counts in
   Section 2 were counted by hand from the table.
9. **Whether the 30 suppressed softball rows should be deleted or retained.** The code keeps
   them and gates them by whitelist; nothing states the intended end state.
