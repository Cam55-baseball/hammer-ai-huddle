# Program Consolidation Research Report

**Programs covered:** Heat Factory, Iron Bambino, The Unicorn, Speed Lab, Explosive Conditioning
**Date:** 2026-10-06 · **Type:** Research only. Nothing in the app, database or schedule was changed.
**Sources:** source code (pages, components, hooks, data files, edge functions, migrations), locale files, docs, and read-only database queries.

---

## 0. Headline findings (read this first)

1. **There are really only two engines behind the five programs.**
   - **The "program engine"** (`useSubModuleProgress` + table `sub_module_progress`) runs **Iron Bambino**, **Heat Factory** and **The Unicorn**. All three use the same screens, unlock timers, streaks and weight logging. Only the content files are different.
   - **The "speed engine"** (`useSpeedProgress` + tables `speed_sessions`, `speed_goals`, `speed_partner_timings`) runs **Speed Lab** and **Explosive Conditioning**. Explosive Conditioning is a near-copy of the Speed Lab page. It uses the same hook, data, components and tables. The only differences are which subscription unlocks it and that its text is in English only.
2. **Almost nobody uses them.** No program has had a single active player in the last 30 days. All-time totals: Iron Bambino 3 completed workouts, Heat Factory 19, The Unicorn 0, Speed Lab + Explosive Conditioning 2 sessions (see §10 of each program).
3. **All content is hard-coded in the app** (TypeScript data files), not in the database. None of it is in `wk_movement_catalog`, which is the library Hammers Today plans from.
4. **The programs ignore the rules Hammers Today enforces.** They have no age limits, no in-season/off-season logic (Speed has one partial exception), no game-day awareness and no pitch counts. The only spacing rule is a **12-hour unlock timer** after the last completed day. Hammers Today already does more on safety.
5. **Several published rules are not built** (for example The Unicorn's "auto-suggests rest if weekly throwing exceeds threshold"). Deload logic exists in Iron Bambino but is never used. The readiness-based weight suggestion is never switched on in Heat Factory.
6. **What makes them feel premium** is their shared look and feel, mostly from the program engine:
   - a full-screen guided "Focus Mode" with neon colors per sport and a rest timer between sets
   - flame streaks, milestone confetti and haptics
   - set-by-set weight logging with "Last: X lb — try Y?" suggestions
   - loops, cycles and named phases
   - Speed's own extras: a check-in, timed sprints, personal bests, the Speed Track tiers, a partner stopwatch and automatic break days

   Hammers Today does not have most of these yet.
7. **Known bug that affects Game Plan today:** `src/hooks/useGamePlan.ts` looks up `sub_module = 'iron_bambino'` and `'heat_factory'`. The database only allows `production_lab`, `production_studio` and `the-unicorn`, so its "is today a strength day?" check never finds a row.

---

## 1. Usage at a glance (database, queried 2026-10-06)

| Program | Storage | Players with a row (all time) | Completed workouts / sessions (all time) | Active players, last 30 days | Last activity |
|---|---|---|---|---|---|
| Iron Bambino | `sub_module_progress` (`production_lab`) | 20 players (19 baseball rows, 3 softball) | 3 (2 baseball, 1 softball); furthest week reached = 1 | 0 | 2026-03-07 |
| Heat Factory | `sub_module_progress` (`production_studio`) | 10 players (9 baseball rows, 3 softball) | 19 (17 baseball, 2 softball); furthest week = 4 | 0 | 2026-03-03 |
| The Unicorn | `sub_module_progress` (`the-unicorn`) | 5 players (5 baseball rows, 1 softball) | 0 | 0 | 2026-07-26 (opened only) |
| Speed Lab + Explosive Conditioning (shared tables; cannot be told apart) | `speed_sessions`, `speed_goals`, `speed_partner_timings` | 2 players with sessions; 6 `speed_goals` rows | 2 sessions (both session #1, baseball), 0 break days; 1 partner timing | 0 | 2026-02-24 |

Other details:
- **Program loops completed:** 0 in all three programs.
- **Longest streak:** Iron Bambino 3, Heat Factory 5 (summed across rows).
- **Weight logs:** Iron Bambino 1 row with weights logged, Heat Factory 4.
- **Program status values found:** `not_started`, `active`, `paused`.
- **Experience levels found:** beginner, intermediate and advanced.

Active subscriptions (who could unlock them):

| Subscription | Count |
|---|---|
| `baseball_hitting` | 39 |
| `baseball_pitching` | 20 |
| `baseball_throwing` | 15 |
| `softball_hitting` | 7 |
| `softball_pitching` | 6 |
| `softball_throwing` | 5 |
| `baseball_5tool` | 2 |
| `baseball_golden2way` | 2 |
| legacy `hitting` / `throwing` / `pitching` | 1 each |

Related tables:
- `sprint_analyses`: 0 rows.
- `running_sessions`: 0 rows.
- `vault_workout_notes`: 4 rows (post-workout notes from the program engine).

---

# PART 1 — THE PROGRAM ENGINE (shared by Iron Bambino, Heat Factory, The Unicorn)

This section is described once to avoid repeating it three times. Each program section below refers back to it.

### Engine files
- Hook: `src/hooks/useSubModuleProgress.ts`
  - Constants: `TOTAL_CYCLES=4`, `TOTAL_WEEKS=6`, `DAYS_PER_WEEK=5`, `UNLOCK_DELAY_MS=12h`.
- Shared UI (`src/components/workout-modules/`):
  - `WorkoutProgressStreakCard`, `ConfettiEffect`
  - `WeekGateModal`, `ExperienceLevelSelector`, `EquipmentList`
  - `DayWorkoutDetailDialog`, `FullScreenWorkoutMode`
  - `RestTimer`, `ExerciseDisplayCard`, `WorkoutProgressBar`
  - `CountdownTimer`, `NotificationPermissionCard`
  - `ProgramStatusBanner` (`ProgramStartCard`, `ProgramPausedBanner`, `ProgramPauseButton`)
- Other shared hooks: `useWorkoutNotifications`, `useVault` (`VaultWorkoutNotesDialog`).
- Table: `sub_module_progress`.
  - Created in `supabase/migrations/20251204204329_*.sql`. RLS lets each player select, insert and update only their own row.
  - A check constraint allows `sub_module ∈ {production_lab, production_studio, the-unicorn}` (`20260222213131_*.sql`).
  - Columns:

| Column(s) | What it holds |
|---|---|
| `current_week`, `current_cycle` | Where the player is |
| `week_progress` | Per-week, per-day done flags |
| `exercise_progress` | Per-exercise done flags |
| `weight_log` | Week → day → exercise → set weights |
| `day_completion_times` | Drives the 12-hour unlock |
| `experience_level` | beginner / intermediate / advanced |
| `equipment_checklist` | Exists but is never used |
| `workout_streak_current`, `workout_streak_longest`, `total_workouts_completed`, `last_workout_date`, `streak_last_updated` | Streaks and totals |
| `loops_completed` | Times the 24 weeks were finished |
| `program_status` | not_started / active / paused |
| `started_at`, `last_activity` | Dates |

### How a player moves forward
- **Start:** `ProgramStartCard` → `startProgram()` sets `program_status='active'`.
  - Pause and resume are available at any time (`pauseProgram`/`resumeProgram`).
  - The paused banner shows a resume button.
- **Day unlock:** Week 1 Day 1 is always open. Each later day opens **12 hours after the previous day was completed**. Until then a live hh:mm:ss `CountdownTimer` shows.
  - The 12 hours run from the completion time, not from the calendar.
- **Week unlock:** the previous week must be **100%** done (all 5 days, `canUnlockWeek`).
  - Clicking a locked week opens `WeekGateModal`. Its default text says **70%** is needed (`WeekGateModal.tsx` default `requiredPercent=70`). **Mismatch.**
- **Cycle advance:** when all 6 weeks are 100%, `checkAndAdvanceCycle` → `advanceToCycle`. Week, day and exercise progress reset; the **weight log is kept**.
- **Loop:** after Cycle 4, `loopBackToCycle1()` goes back to Cycle 1 and adds 1 to `loops_completed`. The weight log is kept.
  - Toast: *"🔄 Loop {n} Starting! Let's keep building — your weight history carries forward!"*
  - Header badge: "🔄 Loop N — Cycle X".
- **Missed or skipped days:** no missed state, no catch-up, no penalty.
  - The day simply waits; the program pauses in place forever.
  - Streak: same calendar day = no change; the next day = +1; a gap of more than 1 day resets it to 1 (`calculateStreak`).
  - Un-checking a completed day removes its completion time but **does not lower the streak or total-workout counters** (they can be inflated by toggling). It also does not re-lock later days.

### Weights and suggestions
- Each set has a weight box.
- `getWeightSuggestion` averages earlier logged weights and multiplies by a readiness factor:

| Readiness value | Multiplier |
|---|---|
| default (`full_send`) | ×1.02 |
| `modify_volume` | ×1.0 |
| `recovery_focus` | ×0.95 |

  - The result is rounded to the nearest 2.5 lb and shown as 💡 "Last: X lbs — Try Y?".
- A green up arrow (`TrendingUp`) appears when a weight beats the last one. A total-weight-lifted figure is calculated (`DayWorkoutDetailDialog.tsx:97-159`).
- Experience level changes the shown %1RM through `getAdjustedPercent` (`src/types/workout.ts`): beginner −10 points (floor 50%), intermediate unchanged, advanced +5.
- Readiness banner in the day dialog (`DayWorkoutDetailDialog.tsx:444-463`):
  - *"Readiness score: {score}. Consider dropping 1 set per compound exercise today."*
  - *"…Reduce to 60% intensity. Skip plyometrics if present."*
  - It only shows if a readiness value is passed in. The program pages do not pass one, so the banner and the readiness multiplier are effectively **switched off**.

### Look and feel (the premium part)
- **Header:** back button, program title and subtitle, loop/cycle badge, pause button.
- **Progress + streak card** (`WorkoutProgressStreakCard.tsx`):
  - Week % and overall % progress bars, and the last-activity date.
  - Flame streak counter: the flame appears at a streak of 5 or more, and glows and pulses (drop shadow) at 25 or more.
  - The flame color moves through red → yellow → purple → green → blue every 100 workouts (repeating every 500).
  - "New Record" star, plus best and total stat chips.
  - **Milestones** at 10, 50, 100, 200, 350, 500, 700 and 1,000 total workouts:
    - a milestone badge shown for about 5–6 seconds
    - **confetti** with 40–100 particles depending on milestone size, lasting 3–4 seconds
    - **haptic vibration** `[100,50,100,50,100]`
- **Week accordion:** locked weeks are dimmed (`opacity-60`) with a lock icon. Day rows show check, open or lock icons, "Strength"/"Isometric" badges, and the live countdown.
- **Day dialog:** checkbox rows for each exercise.
  - Strength and isometric items show a card with sets×reps or hold-time badges, a %1RM badge (Target icon), a description, a 💡 tip line and a weight grid per set.
  - Completing a day opens `VaultWorkoutNotesDialog` (post-workout notes) if the player has Vault.
- **Full-screen "Focus Mode"** (`FullScreenWorkoutMode.tsx`, opened through a portal):
  - Framer Motion animations.
  - **Neon colors by sport and exercise type:** baseball = orange / cyan / lime; softball = pink / green / yellow.
  - Steps through each set, with a progress bar, an exercise display card and confetti and trophy/sparkles at the end.
  - Resumes at the first unfinished exercise.
  - **Automatic rest timer:**

| Exercise | Rest |
|---|---|
| Strength at 80%+ of 1RM | 180 s |
| Strength at 65–79% | 120–150 s |
| Strength under 65% | 90–120 s |
| Isometric | 60–90 s |
| Skill / throwing | 45–60 s |

- **Equipment checklist card:** checkboxes, but **not saved** (local state only).
- **Notifications:** `NotificationPermissionCard` asks for browser permission, then a notification is scheduled 12 hours after a day is completed, when the next day unlocks (not on The Unicorn page).
- **Disclaimer:** an orange/destructive alert at the bottom of every page.
- **States:** loading skeleton; no access → `PurchaseUnavailable` (neutral, no price) or a "Subscribe" card linking to `/pricing`; not started → `ProgramStartCard`.
- **Languages:** text is translated into en/es/fr/de/ja/ko/nl/zh under `workoutModules.*`.
- **No exercise videos** in any of the three programs.
- **No sounds.**

### Links to the rest of the app
- **Game Plan** (`useGamePlan.ts`):
  - Tasks `workout-hitting` (Iron Bambino), `workout-pitching` (Heat Factory) and `workout-unicorn`.
  - The Unicorn task replaces both of the others while The Unicorn is active.
  - A task shows as done when `last_workout_date = today`.
  - `STRENGTH_TRAINING_DAYS=[1,5]`.
  - Default schedules (`src/constants/trainingSchedules.ts`): Unicorn Mon–Sat.
- **Calendar:** `useCalendar.ts` turns `sub_module_progress` rows into "Heat Factory" / "Iron Bambino" events. Legend color for Heat Factory is `#f97316` with a Flame icon. Clicking an event opens the program route (`useCalendarActivityDetail.ts`). Day order groups them as "Program workouts" (`useCalendarDayOrders.ts`).
- **Hammers Today:** service function `wk_external_training_days` (migration `20261006161817_*.sql`).
  - A completed program day counts as a **lift day** for Hammers Today's rest spacing and fatigue (moderate unless marked otherwise).
  - A completed day today removes today's Hammers Today lift (`finalCheck.ts`, rule `trained_elsewhere_today`).
  - Only completed days count; planned program days do not.
- **AI:** none inside the programs.
  - The `ai-helpdesk` support chat has a short description of each program and its price.
  - No report card reads these tables.

---

# PART 2 — PROGRAM REPORTS

## A. Heat Factory

### 1. Purpose and audience
- *"HEAT FACTORY: ELITE 24-WEEK PERIODIZED PITCHING DEVELOPMENT PROGRAM … velocity development, arm care, and elite pitcher development"* (`src/data/heatFactoryProgram.ts:3-9`).
- Description on the Complete Pitcher hub: "Build arm strength and durability with structured training."
- **Who it's for:** pitchers, baseball or softball, chosen with the sport toggle. Each sport has its own progress row.
  - No pitcher / position / 2-Way split inside the program.
  - **No age limits.**
  - Experience level is chosen by the player.
- **Unlocked by:** any `{sport}_pitching` subscription, or owner/admin (`ProductionStudio.tsx:204`).
  - Sold in **Complete Pitcher** ($200) and **The Golden 2Way** ($400) (`src/constants/tiers.ts`).
  - The page uses its own text match, not the shared `hasFeatureAccess`.
- Route `/production-studio`, page `src/pages/ProductionStudio.tsx`, internal key `production_studio`, module `pitching`.

### 2. Structure
- 4 cycles × 6 weeks = 24 weeks, then it loops (engine rules above).
  - Cycle 1: Foundation & Arm Health
  - Cycle 2: Velocity Development
  - Cycle 3: Pitch Arsenal Development
  - Cycle 4: Game Readiness & Maintenance/Peak
- **Weekly template** (`generateCycleWeeks`, `ProductionStudio.tsx:54-136`):

| Day | What happens |
|---|---|
| Day 1 | Strength (workout A/B/C/D in rotation) + post-lift arm care (`STRENGTH_DAY_ARM_CARE`) |
| Day 2 | Rest & Recovery ("Active Recovery" — light stretching / foam rolling / optional bands) |
| Day 3 | Throwing day, depends on the cycle: C1 arm care + Velocity Day 1; C2 rotating Velocity Days 1–3; C3 rotating Pitch Dev Days + Velocity 1; C4 mixed |
| Day 4 | Rest & Recovery (band arm-care work encouraged) |
| Day 5 | Strength (next letter) + Command Work (first 3 throws of the throwing set) |

- **Progression:** heavier loads cycle by cycle. Example, Trap Bar Deadlift: C1 4×5 @75% → C2 5×3 @85% → C4 4×3 @88%. Isometric holds get shorter (20 s → 15 s).
  - C1 ~60–75%, C2 ~70–85%, C3 ~55–85% with tempo work (pause squats, Spoto press), C4 65–88% peak.
- **No deload week** and **no test day**.
  - The closest thing to a benchmark is the drill "Velo Day – Gun Readings".
- Missed days: engine behavior (waits, the streak resets).

### 3. Content (all in `src/data/heatFactoryProgram.ts`, 695 lines)
**Strength:** 16 workouts (4 per cycle).
- Line ranges: C1 `:16-102`, C2 `:109-195`, C3 `:202-288`, C4 `:295-381`.
- Every item has a name, type (strength/isometric), sets, reps or hold, %1RM, a "track weight" flag, a description and notes.
- Templates: A = trap bar focus, B = RDL / Bulgarian split squat, C = hip thrust / box squat, D = sumo / walking lunge.
- Example, Cycle 1 Workout A:

| Exercise | Sets×Reps | %1RM | Note |
|---|---|---|---|
| Trap Bar Deadlift | 4×5 | 75 | "Explosive drive, hip extension focus" |
| Front Squat | 4×5 | 72 | "Deep depth, chest up" |
| Dumbbell Bench Press | 4×6 | 72 | "Full ROM, pause at bottom" |
| Chest-Supported Row | 4×6 | 70 | "Squeeze shoulder blades, strict form" |
| Resist-Turning Press | 3×8 | 60 | each side, 3 s hold |
| Isometric Wall Sit | 3×20 s | — | "Maximum tension" |

- Other lifts that appear include: RDL, Bulgarian split squat, hip thrust, box squat, sumo deadlift, walking lunge, face pulls, cable woodchop, pause squat, Spoto press, and more.
- **For an exact item-by-item copy, export the four cycle arrays from the file.**

**Arm-care library** (15 drills, text cues only, no sets/reps):
- Band internal/external rotation, band scap retraction, band high pulls, band throwing motion
- Sleeper stretch, cross-body stretch, doorway pec stretch, lat stretch, thoracic rotation
- Wrist flexion/extension, pronation/supination, rice bucket dig, ball squeezes, rhythmic stabilization

**Velocity library** (17 drills, 3 ready-made days):
- **Velocity Day 1:** long-toss ladder — warm-up 60 ft → build 90 ft → extension 120 ft → max 150–200 ft → pull-down phase.
- **Velocity Day 2:** weighted balls — 4 oz underload, 5 oz standard, 7/9/11 oz overload; contrast throws; crow hop; max-intent bullpen; Velo Day gun readings.
- **Velocity Day 3:** PlyoCare pivot pickoffs, roll-ins, reverse throws, rocker throws.
- **No throw counts or distances per set are tracked.** These are "skill" items with no logging.

**Pitch development library** (14 drills, 3 ready-made days):
- Curveball grip / spin / shape; slider grip / wrist / tunnel; changeup grip / arm speed / feel
- Quadrant work, glove side / arm side, up/down ladder, pitch sequencing, tunnel drills

**Equipment** (18 items):
- Glove; balls (24+); mound; bands; strike-zone target
- Barbell & plates; dumbbells 10–80+ lb; cable machine; pull-up bar; bench; trap bar
- Weighted balls 4–11 oz; PlyoCare set of 5; foam roller; med ball
- Optional: radar gun, rice bucket, lacrosse ball

### 4. Rules and philosophy
- Rules in code: 12-hour unlock, 100% week gate, rest timer by intensity, readiness multiplier (not switched on here).
- **None of these exist:** pitch counts, throw-volume caps, in-season vs off-season, age rules or game-day logic.
- **Philosophy** lives in each exercise's description. Every lift is tied to pitching:
  - *"Builds posterior chain power crucial for leg drive off the mound"* (trap bar)
  - *"Crucial for posterior shoulder health"* (face pulls)
  - *"Mimics pitching rotation pattern"* (woodchop)
  - *"Teaches rate of force development from dead stop"* (box squat)
- Disclaimer key `workoutModules.disclaimer.pitchingText`.

### 5. Modes
- Sport toggle (baseball/softball)
- Experience level
- Start / pause / resume
- Full-screen Focus Mode
- Notification permission
- Equipment checklist (not saved)

### 6. Look and feel
- Engine look and feel (Part 1), page `ProductionStudio.tsx`.
- Locale key `workoutModules.productionStudio.title = "Heat Factory"`.
- Sidebar label "Heat Factory".
- Calendar color orange `#f97316` with a Flame icon.
- No screenshots were taken: the program pages need a signed-in subscriber, and no player session was available this round.

### 7. Tracking
- Engine data: done flags, set weights, streaks, totals, loops.
- **No personal bests and no velocity log.** The gun readings are not saved.
- Feeds Game Plan task `workout-pitching`, the calendar, and Hammers Today as a lift day.

### 8. AI
- None. Only the support chat description.

### 9. Sport differences
- Content is identical for both sports.
- Only differences: the "Baseballs/Softballs" equipment label and the Focus Mode colors.
- **The long-toss distances (60–200 ft) are baseball numbers reused unchanged for softball.**
- **Softball pitching (windmill) is not modeled at all.**
- No pitcher vs position split (the program is pitchers only).

### 10. Usage
- 10 players have rows (12 rows).
- 19 workouts completed in total; furthest week 4.
- 0 active players in the last 30 days; last activity 2026-03-03.

### 11. Problems
- Game Plan looks up `sub_module='heat_factory'`, so its strength-day detection never matches.
- No deload and no test day.
- Readiness suggestion never switched on.
- Equipment checklist not saved.
- 70% vs 100% week-gate text mismatch.
- Streak inflation when a day is un-checked.
- Softball distances and windmill pitching missing.
- No throw logging.
- Access check does not use the shared helper.

---

## B. Iron Bambino

### 1. Purpose and audience
- Hitting strength + bat speed program.
- Route `/production-lab`, page `src/pages/ProductionLab.tsx`, internal key `production_lab`, module `hitting`.
- Sidebar: "Iron Bambino".
- Support chat: "Iron Bambino upgraded workout program".
- **Who it's for:** any hitter, baseball or softball.
  - No position, pitcher or age split.
  - Experience level is chosen by the player.
- **Unlocked by:** `{sport}_hitting` or owner/admin (`ProductionLab.tsx:170`, its own text match).
  - Sold as "Iron Bambino (Upgraded)" in **5Tool Player** ($300).
  - In **The Golden 2Way** it is replaced by The Unicorn.
  - Not included in Complete Pitcher.

### 2. Structure
- 4 cycles × 6 weeks × 5 days, then it loops.
  - Cycle 1: Concentric-Isometric Foundation
  - Cycle 2: Concentric Weightlifting Focus
  - Cycle 3: Concentric-Isometric Intensification
  - Cycle 4: Eccentric Focus for Muscle Growth
- Each cycle has workouts A–D (`src/data/ironBambinoProgram.ts:543-592`).
- **Weekly template** (`generateCycleWeeks`, `ProductionLab.tsx:38-100`):

| Day | What happens |
|---|---|
| Day 1 | Strength (rotating letter) + `STRENGTH_DAY_BAT_SPEED` (4 drills) |
| Day 2 | Rest ("Active Recovery") |
| Day 3 | Bat speed only (`BAT_SPEED_DAY_1..4`, rotating by week) |
| Day 4 | Rest |
| Day 5 | Strength + bat speed drills |

- **Deload:** `isDeloadWeek(week % 4 === 0)` and `DELOAD_VOLUME_MODIFIER = 0.6` are defined but **never used**.
- **No test day.** 1RM is only implied through the % fields.
- Missed days: engine behavior.

### 3. Content
**Cycle 1** (full):

| Workout | Exercise | Sets×Reps | %1RM | Note |
|---|---|---|---|---|
| A | Trap Bar Deadlift | 4×4 | 80 | Full hip extension |
| A | Barbell Back Squat | 4×4 | 78 | Break parallel |
| A | Bench Press | 4×4 | 80 | Pause at chest |
| A | Barbell Row | 4×5 | 75 | 1 s squeeze |
| A | Landmine Rotational Press | 3×5 | 70 | Each side |
| A | Isometric Wall Sit | 4×8 s | — | |
| A | Resist-Turning Press Hold | 3×10 s | — | Each side |
| B | Front Squat | 4×4 | 75 | |
| B | Incline DB Press | 4×5 | 75 | 30° |
| B | Weighted Pull-Up | 4×4 | 80 | Dead hang |
| B | Romanian Deadlift | 4×5 | 70 | |
| B | Cable Woodchop High-to-Low | 3×5 | 70 | Each side |
| B | Isometric Push-Up Hold | 4×8 s | — | |
| B | Isometric Single-Leg Glute Bridge | 3×10 s | — | Each leg |
| C | Box Squat | 4×4 | 78 | Pause on box |
| C | Close-Grip Bench | 4×5 | 75 | |
| C | Single-Arm DB Row | 4×5 | 75 | |
| C | Bulgarian Split Squat | 3×5 | 70 | Each leg |
| C | Resist-Turning Press | 3×5 | 65 | 3 s hold |
| C | Isometric Inverted Row Hold | 3×10 s | — | |
| C | Isometric Side Plank | 3×10 s | — | Each side |
| D | Sumo Deadlift | 4×4 | 80 | |
| D | Overhead Press | 4×4 | 75 | |
| D | Lat Pulldown | 4×5 | 75 | |
| D | Walking Lunge | 3×5 | 65 | Each leg |
| D | Med Ball Rotational Slam | 3×5 | — (no weight) | Max intent |
| D | Isometric Split Squat Hold | 3×10 s | — | Each leg |
| D | Isometric Hollow Body Hold | 3×10 s | — | |

**Cycle 2** (heavier, 3–5 reps at 75–85%):
- Workout A: trap bar 5×3 @85, box squat 4×4 @80, bench 5×3 @85, weighted pull-up 4×4 @82, Bulgarian split squat 3×5 @72, wall sit 3×6 s, hip-flexor hold 3×8 s.
- New accessories: chest-supported row, dead hang 3×15 s, glute bridge march 3×10, plank shoulder tap 3×10.

**Cycle 3** (tempo and position work):
- Deficit trap bar 4×4 @82, pause squat 4×4 @75 (3 s), Spoto press 4×4 @78, Pendlay row 4×4 @78, single-leg RDL 3×5 @65, isometric GHD hold.

**Cycle 4** (slow lowering, muscle growth):
- DB bench with 4 s lowering 4×5 @70, lat pulldown with slow release 4×5 @70, walking lunge with 3 s descent 3×5 @60, resist-turning press with reach 4×6 @65, dead bug with band 3×8, GHD hold 3×10 s.
- **For every item verbatim, export `ironBambinoProgram.ts:16-418`.**

**Bat-speed bank** (`:425-479`, 20 skill drills; reps are written into the name):
- **Core speed:** speed swings (10), light bat max speed (20), heavy-light contrast (10 sets), velocity ladder (3 @70 / 3 @85 / 3 @100% intent), intent tee work.
- **Quick hands:** quick hands, wrist snap, fast hands reaction.
- **Rotation:** bat behind back rotations, rotational snap, no-stride speed swings.
- **Connection:** connection ball, barrel speed focus, one-handed speed swings.
- **Overload / underload:** band speed swings, overload/underload protocol.
- **Measurement:** swing speed measurement, exit speed competition, bat waggle, bat flip, speed tee (15).
- Bat-speed days 1–4 have 6 drills each. Strength days add 4 drills: speed swings, quick hands, rotational snap, intent tee.
- **Bat speed and exit speed are not saved anywhere.**

**Equipment** (19 items):
- Game bat, tee, 12+ balls, net
- Barbell & plates, dumbbells 10–80+ lb, trap bar, cable machine, pull-up bar, bench
- Weighted bat, speed bat, bands, 6–10 lb med ball
- Optional: plyo box, landmine, 2–11 oz weighted balls, Therabands, foam roller

**Defined in this file but not used by Iron Bambino:**
- `ARM_CARE_BLOCK` (8 drills: band pull-aparts 3×15, wall slides 3×10, serratus push-up 3×10, prone Y-T-W 3×8, side-lying ER 3×12, prone I 3×10, eccentric wrist flexor 3×10 with 4 s lowering, 90/90 ER hold 3×15 s). **Used by The Unicorn.**
- `VELOCITY_DEV_BLOCK_A/B` and `VELOCITY_SPORT_NOTES`. **Used by The Unicorn.**
- `CNS_BUDGET_DAILY = 100` with a cost table, and `FIVE_TOOL_WEEKLY_TEMPLATE`. **Not used anywhere live.**

### 4. Rules and philosophy
- Engine rules; readiness banner and multiplier (not switched on); experience scaling.
- No age, season, game-day or swing-count rules.
- Philosophy in the exercise notes: explosive concentric drive, full range of motion, "max intent", "no casual reps", strength held in position, and slow lowering in Cycle 4.
- Disclaimer (verbatim): *"Hammer's Modality is not responsible for any injury that may occur during exercises. There are no guarantees in results. Always consult with a qualified healthcare professional before beginning any exercise program. Listen to your body and stop immediately if you experience pain."*

### 5. Modes
- Same as Heat Factory.
- The marketing demo `IronBambinoDemo.tsx` has its own fake settings (goal power/speed/durability, 3/4/5 days, level). It uses a simulation (`programSim`), not the real program.

### 6. Look and feel
- Engine look and feel.
- Demo shell: `WeekGridHeatmap`, blurred locked days, and a "Your days vs Elite days" gap panel.

### 7. Tracking
- Engine data.
- Feeds Game Plan task `workout-hitting` (with the same key-mismatch bug), the calendar, and Hammers Today as a lift day.

### 8. AI
- None.

### 9. Sport differences
- Content identical for both sports; Focus Mode colors differ.
- No pitcher/position split.
- 2-Way players get The Unicorn instead.

### 10. Usage
- 20 players (22 rows).
- **3 workouts completed, all time.** Nobody went past week 1.
- 0 active players in the last 30 days; last activity 2026-03-07.

### 11. Problems
- Deload not wired.
- Arm care not wired.
- Dead throwing/CNS code in the file.
- Game Plan key bug (`iron_bambino`).
- Access check does not use the shared helper.
- Equipment checklist not saved.
- 70% vs 100% gate text.
- Streak inflation.
- No bat-speed metrics are saved.

---

## C. The Unicorn

### 1. Purpose and audience
- *"THE UNICORN: ELITE 24-WEEK MERGED PROGRAM — Combines Heat Factory + Iron Bambino + Speed Lab — 4 cycles × 6 weeks = 24 weeks, then loops — 5 training days + 2 rest days per week."* (`src/data/unicornProgram.ts:4-10`)
- Hub copy: "Elite merged workout: strength, speed, velocity, and arm care."
- Support chat: "…with CNS load management."
- **Who it's for:** 2-Way players, baseball or softball. No age rules.
- **Unlocked by:** `hasUnicornAccess` — any subscription containing `golden2way` — or owner/admin.
  - Entitlement `the_unicorn`. Tier **The Golden 2Way** ($400, `workoutSubmodule: 'the-unicorn'`).
- Route `/the-unicorn`, page `src/pages/TheUnicorn.tsx`.
  - Sidebar "The Unicorn" with a Sparkles icon: "Elite merged workout system".
  - Highlighted tile on `/golden-2way`.
- **Starting it automatically pauses Iron Bambino and Heat Factory** for that sport.
  - Toast: "Iron Bambino and Heat Factory have been paused. The Unicorn replaces them."

### 2. Structure
- 4 cycles × 6 weeks.
- **Cycles only raise %1RM.** Exercises, sets and reps are the same in every cycle (`buildCycle`).

| Cycle | Name | Intensity | Load multiplier | Description |
|---|---|---|---|---|
| 1 | Foundation | 75% | ×1.00 | "Build movement quality, establish base strength, learn velocity mechanics." |
| 2 | Development | 80–85% | ×1.07 | "Increase loading across all modalities. Refine throwing mechanics." |
| 3 | Intensification | 82–88% | ×1.12 | "Higher intensity, advanced exercise variations, increased sprint demands." (no new exercises exist) |
| 4 | Peaking | 85–90% | ×1.17 | "Peak performance phase. Highest loads, max intent throws, competition prep." |

- **7-day template:**
  - Day 1 Strength + arm care
  - Day 2 Pitching velocity + sprints
  - Day 3 Bat speed + recovery
  - Day 4 REST
  - Day 5 Strength + throwing velocity
  - Day 6 Speed + light arm care
  - Day 7 REST
- Game Plan schedule: Mon–Sat.
- The engine still counts 5 days per week (`DAYS_PER_WEEK`).
- **Deload (actually built here):** every 4th overall week (weeks 4, 8, 12, 16, 20, 24 of the 24), sets ×0.6 (rounded, minimum 1). " (DELOAD)" is added to the title.
- No test days. Missed days: engine behavior.

### 3. Content (Cycle 1 base values; multiply %1RM by the cycle multiplier)
**Arm care every training day:** `ARM_CARE_BLOCK` (8 drills, see Iron Bambino). Days 3 and 6 use a light version: 1 fewer set (minimum 1), labeled "(light)".

| Day (CNS) | Main block | Second block |
|---|---|---|
| 1 Strength (35) | Trap bar deadlift 4×4 @75; front squat 3×5 @70; bench 4×5 @75; barbell row 3×6 @70 | Resist-turning press 3×8 @60 each side; isometric wall sit 3×10 s |
| 2 Pitch velocity + sprint (40) | Velocity block A: hip-lead throws 2×8; pivot pickoffs 2×8 each side; reverse throws 2×6; 3 oz weighted ball 3×8; progressive long toss to 120 ft+ (1×, "track throw count") | A-skip 3×20 yd; wall drives 3×8 each leg; falling starts 4× at 60–90%; build-up sprints 3× at 60–90% |
| 3 Bat speed (25) | Overload swings 3×10; underload swings 3×10; game-bat speed swings 3×8 | Med ball rotational slam 3×6 each side; foam rolling & mobility 10–15 min |
| 4 | REST — "Light stretching, foam rolling, or complete rest." | |
| 5 Strength + throw velocity (40) | RDL 4×5 @70; Bulgarian split squat 3×6 @65; incline DB press 4×6 @72; weighted pull-up 3×5 @75 | Cable woodchop 3×8 @65; velocity block B: 7–11 oz overload ball into wall 3×6; 2–3 oz underload 3×6; pull-down throws 3×3 max; long toss with intent to max distance; "CNS Throw Count Tracker" ("Record total throws × intensity coefficient… Baseball: overhand. Softball: position player overhand throws.") |
| 6 Speed (25) | Pogo hops 3×15; depth jumps 3×5 (12–18" box); sprint mechanics A-skip→B-skip→accel 4×20 yd | Isometric split squat hold 3×15 s each leg; single-leg bound 3×5 each leg |
| 7 | REST | |

### 4. Rules and philosophy
- **"Key Rules" shown to players** (`UNICORN_RULES`, rendered on `TheUnicorn.tsx:362-377`):
  1. "Never pitch and throw max effort on the same day"
  2. "Never heavy lower body strength + max sprints on the same day"
  3. "Arm care integrated every training day"
  4. "Deload week every 4th week (all volume drops 40%)"
  5. "Throwing load tracked as pitch count equivalents"
  6. "Auto-suggests rest if weekly throwing exceeds threshold"
- **Built:** rules 3 and 4, plus rules 1 and 2 through the fixed template design.
- **Not built:** rules 5 and 6. `UNICORN_THROWING_THRESHOLD = 150` is never read, and no throws are logged.
- **CNS budget card:** the week's CNS total versus `UNICORN_WEEKLY_CNS_TARGET = 165`. The bar turns red when over. This is display only.
- Disclaimer key `unicornProgram.disclaimer`.
- No age, season or game rules.

### 5. Modes
- Sport toggle, experience level, start/pause/resume, Focus Mode.
- **No notification card** (unlike the other two).

### 6. Look and feel
- Engine look and feel, plus:
  - the CNS budget card
  - Key Rules list
  - different day icons in rotation (Dumbbell / Zap / Target / Heart)
  - Sparkles branding
  - back button goes to `/golden-2way`
- Marketing demo `unicorn-engine` (`src/demo/...`) is a simulation only.

### 7. Tracking
- Engine data.
- Game Plan `workout-unicorn` replaces the other two tasks.
- Calendar/source label "The Unicorn" in the Hammers Today external-training function (counts as a lift day).
- Vault notes.

### 8. AI
- None (support chat text plus the demo simulation).

### 9. Sport differences
- Content identical for both sports.
- Only the "CNS Throw Count Tracker" note mentions softball ("position player overhand throws").
- `VELOCITY_SPORT_NOTES` (baseball: "All throws overhand. Focus on mound mechanics transfer and arm slot consistency."; softball: "Position player overhand throws. Focus on footwork patterns and transfer mechanics for defensive throws.") is not shown anywhere.
- **No softball windmill pitching content.**

### 10. Usage
- 5 players (6 rows).
- **0 workouts ever completed.**
- 0 in the last 30 days; last opened 2026-07-26.

### 11. Problems
- Throwing threshold and throw counting promised but not built.
- Cycles don't change exercises despite the copy saying they do.
- The engine's 5-days-per-week count versus a 7-day template with 5 training days: needs checking when real use happens.
- 70% vs 100% gate text.
- Streak inflation.
- No notification card.
- Dead sport notes.

---

# PART 3 — THE SPEED ENGINE (shared by Speed Lab and Explosive Conditioning)

### Files
- Data: `src/data/speedLabProgram.ts`
- Hook: `src/hooks/useSpeedProgress.ts`
- Session flow: `src/components/speed-lab/*` — `SpeedSessionFlow`, `SpeedCheckIn`, `SpeedDrillCard`, `SpeedSprintStep`, `SpeedTimeEntry`, `PartnerTimer`, `SpeedRPESlider`, `BreakDayContent`, `SpeedTrackCard`, `SpeedGoalAdjustmentCard`, `SpeedFocusCard`, `SpeedSessionHistory`
- Body map: `BodyAreaSelector` (from the Vault quiz)
- Tables (`supabase/migrations/20260206231242_*.sql`; each player sees only their own rows):

| Table | Columns |
|---|---|
| `speed_sessions` | session_number, session_date, distances (jsonb of times), rpe, body_feel_before/after, sleep_rating, pain_areas, drill_log, is_break_day, readiness_score, notes, steps_per_rep |
| `speed_goals` | current_track, goal_distances, weeks_without_improvement, last_adjustment_date, adjustment_history, personal_bests, program_status |
| `speed_partner_timings` | session_id, distance, time_seconds, timed_by self/partner |

### Structure
- **No weeks or phases.** It is an endless 7-session rotation.
- `generateSessionDrills` uses `(session−1) % 7` and picks:
  - 3 activation, 2 isometric, 2 sprint-mechanics and 1 plyometric drill
  - from session 7: + 1 resisted drill
  - 3 cool-down drills
- **Unlocks:** the next session opens 12 hours after the last one (countdown, "Recovery builds speed."). Resisted drills from session 7; overspeed downhill from session 10.
- **Sprint reps per distance [short, mid, long] by session number:**

| Sessions | Reps |
|---|---|
| 1–3 | 2,1,1 |
| 4–6 | 3,2,1 |
| 7–9 | 3,2,2 |
| 10–14 | 4,3,2 |
| 15–19 | 4,3,3 |
| 20–24 | 5,4,3 |
| 25+ | 6,5,5 |

  - Readiness under 40 → reps ×0.6; 40–59 → ×0.75.
- **Barefoot stages:**
  - Foundation: under 10 sessions
  - Introduction: 10+
  - Integration: 15+ with readiness 60+, shortest distance only
  - Advanced: 20+ with readiness 60+, all distances
- **Readiness score** = 50 + (sleep − 3)×10; body feel good +15 / okay 0 / tight −15; −5 per pain area; limited to 0–100.
- **Automatic break day** (`detectBreakDay`) if any of these is true:
  - the last two sessions were both RPE 8 or higher
  - last sleep rating was 2 or lower
  - 3 or more pain areas
  - 2 or more distances more than 5% slower than the personal best

  The player can override it ("Override Break Day?").
- `READINESS_BREAK_THRESHOLD = 40` is defined but not used.
- **Plateau:** 4 sessions without a personal best → `adjustment_history` entry `focus_shift` and the `SpeedGoalAdjustmentCard` appears.
- **Missed sessions:** none tracked. The session number always goes up, even after months off, so high rep counts can return after a long break.
  - The streak allows gaps of up to 2 days.
- Game Plan default schedule: Mon/Wed/Fri ("48h CNS recovery").
- **No dedicated test day.** Every session's timed sprints act as the test.

### Content
**Distances:**

| Sport | Short | Mid | Long |
|---|---|---|---|
| Baseball | 10 yd | 30 yd | 60 yd |
| Softball | ⅓ base (~7 yd) | 1 base (~20 yd) | 2 bases (~40 yd) |

- World-class reference times: baseball 1.41 / 3.30 / 6.40 s; softball 1.00 / 2.20 / 4.25 s.
- **Speed Track tiers** (percentage of the world-class time):
  - Building Speed: 0–60
  - Competitive Speed: 60–80
  - Elite Speed: 80–95
  - World Class: 95–100

**Drill library:**
- **Activation:**
  - Barefoot ankle circles + toe grips — 10 each direction
  - A-skips (low amplitude) — 2×20 yd
  - B-skips — 2×20 yd
  - Ankling — 2×15 yd
  - Skipping for height — 2×20 yd
  - Dynamic leg swings — 10 each
- **Isometric** (8 s each side): single-leg ankle hold, split squat hold, wall push (hip extension), calf raise hold.
- **Sprint mechanics:**
  - Wall drives (A-position) — 3×8 each leg
  - Wall drive + march-out — 3×5 each
  - Falling starts — 3×10 yd
  - 3-point starts — 3×10 yd
  - Standing starts (arm drive) — 3×10 yd
  - Wicket runs — 3×30 yd
  - Build-up sprints at 60–70–80–90% — 3×40 yd
- **Plyometric:**
  - Pogo hops — 3×10
  - Single-leg pogo — 3×8 each
  - Broad jump + stick — 3×3
  - Bounding (3–5 contacts) — 3×5
  - Depth drops (6–12" box) — 3×5
  - Mini hurdle hops — 3×5
- **Resisted:**
  - Light sled push — 3×10 yd (from session 7)
  - Band-resisted starts — 3×10 yd (from session 7)
  - Partner-resisted march — 3×15 yd (from session 7)
  - Overspeed downhill at 2–3% grade — 3×30 yd (from session 10)
- **Cool-down:**
  - Walking mechanics — 2×30 yd
  - Leg swings — 10 each
  - Foam roll — 30 s per area
  - 90/90 hip stretch — 30 s per side
  - Box breathing 4-4-4-4 — 4 rounds
- **Break day:**
  - Elastic holds — 15 s each
  - Light skips at 50% — 2×20 yd
  - Hip & ankle CARs — 5 each direction
  - Breathing & posture — 3 min
  - Walking lunge flow — 2×10 each
- Each drill has cues, a description, a "why it helps" line and a barefoot level.
- **Equipment is mentioned only in the text**; there is no equipment field.
- **Sprint rest:** "Rest 2-3 minutes between sprints. Walk back slowly."
- **Game-ready target:** 16 sprints per session (progress bar).
- **RPE scale:** 1 "Super Easy" … 10 "Max Effort", with color-coded emoji 😴→💀.

### Rules and philosophy
- **Rules in code:**
  - 12-hour lock
  - break-day triggers
  - readiness rep scaling
  - barefoot gating
  - resisted/overspeed gating
  - plateau shift
- **Context layer** (RFL-030, `src/lib/hammer/context/decisionFilters.ts:393-458`, `selectSpeedFocus`), in priority order:
  1. Minor whose parent flagged a concern about max-effort sprints → tempo/recovery, no max effort, 4 reps.
  2. Hamstring, ankle, knee or groin injury → tempo/recovery, no max effort.
  3. High workload or readiness under 0.4 → deload, 3 reps.
  4. Left/right difference over 10% → single-leg symmetry focus, 6 reps.
  5. In-season → freshness focus, 4 reps; off-season → volume focus, 8 reps.
  6. Speed or power is the player's priority → max velocity, 5 reps; otherwise acceleration base, 5 reps.

  **It is calculated but never shown or used by either page** (both pages read only the plain `sessionFocus`).
- **Philosophy quotes:**
  - "Fast bodies are springy bodies."
  - "Recovery builds speed." / "Recovery is where speed is built."
  - "Today we protect speed."
  - "Your body is telling us it needs a lighter day. Smart athletes listen. This session focuses on recovery and mobility so you come back faster."
  - "Your body signals suggest a recovery day… Listen to your body — there is no shame in protecting it."
  - "Your body is adapting. We're shifting focus to help speed stick."
  - "Your body is recovering today. We've adjusted your sprint count."
  - "Barefoot training strengthens feet, ankles, and fascial connections — the foundation of elastic speed."
  - Barefoot disclaimer: "Barefoot training is introduced gradually… If you experience pain, stop immediately and return to shoes…"
  - "Find a flat, open space. Sprint as fast as you can!"
  - "Train to sprint 16 times in a game. Full MLB season ready." / "…Full AUSL season ready."
- **Seven session-focus lines:** "Today we build explosive first steps." / "…develop top-end speed." / "…sharpen acceleration mechanics." / "…train fast & relaxed." / "…develop stride power." / "…build springy speed." / "…build elastic energy."

### Modes
- Sport toggle
- Start / pause / resume
- Normal session vs break day (with override)
- **Partner Mode**: a stopwatch per rep (Start/Stop/Reset/Save, accurate timing), saved as `timed_by`
- Optional steps per rep (shows stride length and step-rate badges live)
- Barefoot flag (calculated by the app, not a setting)

### Look and feel
- **Session flow with progress pills:** check-in → focus → drills → sprint efforts → log results → complete. On a break day: check-in → break day → complete.
- **First visit:** gradient card with a Zap icon, "Start My Speed Journey", then `ProgramStartCard`.
- **Check-in:**
  - sleep with 5 emoji 😫😴🙂😊🤩
  - body feel 💪 Good / 👍 Okay / 😬 Tight
  - a body-map pain picker
- **Drills:** "Do The Work", drill cards with done toggles, category badges in different colors (amber / blue / red / purple / emerald / teal / sky), "Go Sprint! →".
- **Sprint efforts:** 🏃‍♂️💨, the 16-sprint progress bar, amber readiness banner, rep badges, a green "🦶 Barefoot OK" badge, rest and barefoot tips.
- **Log results:** time per rep (self or partner), steps, RPE slider, body feel after.
- **Complete:** 🎉, **confetti** (120 particles, 3 s), "Session Complete!", a gold 🏆 "New Personal Best!" card, a preview of the next unlock countdown and the taglines.
- **Dashboard:**
  - header + pause button
  - `SpeedTrackCard` (tier gradient: blue / green / purple / amber-gold; personal-best grid; trend arrows; plateau banner)
  - plateau card
  - streak card (Flame current, Trophy longest, Calendar total)
  - next-session card
  - collapsible history (last 20 sessions, break badge, best per distance, rep count, RPE)
  - disclaimer
- Fade, slide and zoom animations.
- No videos, no sounds, no reminders (only error toasts).

### Tracking and links
- Personal bests per distance, trend over the last 5 sessions, plateau counter, stride analytics (calculated but **not shown**), streaks.
- **Bug:** the "longest" streak always equals the current streak.
- `runningAggregator.ts` adds sprint distance to running mileage totals.
- **Game Plan:**
  - `speed-lab` task for throwing-tier players
  - `explosive-conditioning` task for pitching-only players
  - the two are mutually exclusive, share one completion flag, and show a recovery badge while locked
- **Hammers Today:** a non-break session counts as a **hard running day** (`wk_external_training_days`, "Speed Lab / Explosive Conditioning"). It enforces the 1-day spacing and the no-hard-running-the-day-before-a-game rule. A session today removes today's hard running.
- **HIE** (`supabase/functions/hie-analyze/index.ts:347-396`, `analyzeSpeedLabMicro`):
  - Finds stride inefficiency (steps per rep up 8% or more; high if 15% or more).
  - Finds effort/output mismatch (RPE 7+ with short max distance, twice or more / 30% or more of sessions).
  - These lead to `speed-lab` drill prescriptions elsewhere: "Sprint Mechanics Drill", "Resisted Sprint Starts", "First-Step Reaction Drill", "Base Path Sprint Work", "Explosive Strength Circuit", "Sprint Mechanics Lab", "Pro Agility Work", "Lateral Shuffle Circuit".
- `docs/audits/module-coverage-matrix.md:21` notes that `selectSpeedFocus` does not use the detected stride inefficiency ("two disconnected paths").
- `docs/asb/athlete-development-intelligence-audit.md:58` says the speed profile is "captured, not projected" into Hammer.
- **No leaderboards.**

---

## D. Speed Lab

1. **Purpose and audience:** "Build elite speed with structured training, recovery science, and professional drills." / "Build elite speed, protect your body."
   - Baseball or softball. No position or age gate.
   - The context layer has minor/parent rules, but they are not used (see Part 3).
   - **Unlocked by:** `{sport}_throwing` or owner/admin. Sold in **5Tool Player** and **The Golden 2Way**.
   - Route `/speed-lab`, page `src/pages/SpeedLab.tsx` (328 lines, fully translated with `t()`).
2. **Structure:** speed engine (Part 3).
3. **Content:** speed engine (Part 3).
4. **Rules and philosophy:** speed engine (Part 3).
5. **Modes:** speed engine (Part 3).
6. **Look and feel:** speed engine (Part 3).
7. **Tracking:** speed engine (Part 3).
8. **AI:** rule-based context layer (not shown to players) + HIE pattern mining. No AI chat.
9. **Sport differences:** distances, reference times and MLB/AUSL wording. Everything else is the same. No pitcher/position differences.
10. **Usage:** shared with Explosive Conditioning — 2 players, 2 sessions all time, 0 in the last 30 days, last session 2026-02-24; 6 `speed_goals` rows.
11. **Problems:**
    - context layer not shown or used
    - stride analytics not shown
    - "longest" streak bug
    - unused readiness constant
    - session number keeps rising after long breaks
    - no structured equipment
    - `speed_partner_timings` is written but never read back
    - stride inefficiency not fed into focus selection

## E. Explosive Conditioning

1. **Purpose and audience:** "Explosive Conditioning unlocks with the Complete Pitcher module. Subscribe to start your speed journey."
   - **It is the Speed Lab program re-skinned for pitchers who have pitching but not throwing.**
   - **Unlocked by:** `{sport}_pitching` (`ExplosiveConditioning.tsx:73`). Sold in **Complete Pitcher** ($200).
   - Route `/explosive-conditioning`, page `src/pages/ExplosiveConditioning.tsx` (327 lines).
2–8. **Identical to Speed Lab** (speed engine, Part 3): same drills, rules, tables and progress. Progress is shared, so a player with both subscriptions has one program with two names.
   - Game Plan schedule key `explosive-conditioning` Mon/Wed/Fri: "48h CNS recovery, mirrors Speed Lab."
   - **No pitcher-specific content at all:** no conditioning for the day after a start, no tempo runs, no arm-friendly work.
9. **Sport differences:** same as Speed Lab.
10. **Usage:** shared with Speed Lab (above). The data cannot be split between the two.
11. **Problems:**
    - **Copy-pasted page:** English only. `t` is imported and never used. Text is hard-coded and has already drifted from Speed Lab.
    - The name promises "conditioning", but the content is sprint speed. It has nothing to do with the Hammers Today Conditioning card.
    - All Speed Lab problems apply.

---

# PART 4 — SHARED ACROSS ALL FIVE

| Area | What they share |
|---|---|
| Access | Each page checks subscriptions with its own text match (`{sport}_hitting/_pitching/_throwing` or `golden2way`). Owner/admin bypass. `PurchaseUnavailable` when purchase screens are hidden (coach/scout storefront rule), otherwise a lock card linking to `/pricing`. |
| Program state | `not_started / active / paused` with `ProgramStartCard`, `ProgramPausedBanner`, `ProgramPauseButton`. |
| Spacing | 12-hour unlock after the last completion, shown by `CountdownTimer`. |
| Missed days | Never recorded. No catch-up. The program just waits. Streaks reset after a gap (1 day for the program engine, 2 days for speed). |
| Celebration | Confetti (`ConfettiEffect`), streak cards with Flame / Trophy icons. |
| Sport | `localStorage.selectedSport` toggle. Separate progress per sport. Content is the same except speed distances and Focus Mode colors. |
| Safety | Disclaimer alert on every page. **No age, season, game-day or pitch-count rules** (only the unused speed context layer). |
| Game Plan | One task per program in `useGamePlan.ts`. Default schedules in `trainingSchedules.ts`. Calendar events and colors. |
| Hammers Today | Counted only through `wk_external_training_days` (lift day / hard running day). Nothing flows the other way. |
| Content storage | Hard-coded TypeScript. No database catalog. No videos. |
| AI | No AI chat inside any program. The support chat knows their names and prices. |
| Notifications | Only the program engine (Iron Bambino and Heat Factory) has a browser notification when the next day unlocks. |
| Layout | `DashboardLayout`, `useSmartBack` back button, `PageLoadingSkeleton`. |

---

# PART 5 — COMPARED WITH HAMMERS TODAY

### What Hammers Today already does (all programs)
- **One plan per day per player:**
  - built on the player's local date
  - a Start button and switch, then a daily job
  - never rebuilt as a whole
  - changes only for a player request, tracked activity or a rule check
  - changes are logged and shown to the player as "Plan change: …"
- **Card types:** warm-up (including the fast-twitch primer), speed, bat speed, conditioning, lift, plyometrics/jumps, pitching/throwing, arm care, mobility/recovery, cross-sport, nutrition and mental (`CARD_REGISTRY`).
- **Rules enforced at build time and on every re-check:**
  - lift spacing and weekly limits
  - no lift on doubleheader or tournament days; lift after the game on game days
  - starting-pitcher rules
  - Pitch Smart rest and weekly caps (shown on the Pitching card)
  - hard running spacing and no hard running the day before a game
  - jump spacing
  - bat over/underload not on back-to-back days
  - minimum age (13), growth mode under 18, eccentric overload limits
  - season legality, and eccentric overload never in-season
  - equipment fallbacks
  - automatic adjustment on return after 14+ days off
- **Completion for every card:** Done / Cut short / Missed (changeable for 7 days).
- **Uses readiness, check-ins, games, practices, season, goals and baselines.** Analysis findings can influence the plan through the one-slot overlay.
- **Has a movement catalog** with season eligibility, minimum age, equipment and regressions.
- **Counts completed program sessions** toward rest rules and fatigue.

### What none of the programs have that Hammers Today would need to keep
These are the premium features shared by all programs:
- [ ] Full-screen guided Focus Mode: step-by-step sets, automatic rest timer by intensity, neon colors per sport, animations
- [ ] Set-by-set weight logging with "Last: X — try Y?" suggestions and up arrows
- [ ] Workout streaks (flame tiers, glow at 25), milestone badges at 10…1,000, confetti and haptics
- [ ] Named phases / cycles / loops ("Cycle 2 — Velocity Development", "🔄 Loop 2") that show a long-term journey
- [ ] Post-workout Vault notes
- [ ] Equipment checklist per program
- [ ] Notification when the next session is available
- [ ] Session history list

### Heat Factory → checklist for Hammers Today
- [ ] Pitcher-specific strength rationale on each lift ("leg drive off the mound", "posterior shoulder health", etc.)
- [ ] 24-week pitcher journey with 4 named cycles (Foundation & Arm Health → Velocity → Pitch Arsenal → Game Readiness/Peak) and rising %1RM
- [ ] **Velocity work:** long-toss ladder 60→90→120→150–200 ft + pull-downs; weighted-ball protocols (4/5/7/9/11 oz, contrast); PlyoCare (pivot pickoffs, roll-ins, reverse, rocker); crow hop; max-intent bullpen — all inside the existing throwing/pitch-count rules
- [ ] **Pitch development:** curveball, slider and changeup grip/spin/shape/tunnel drills; quadrant, glove/arm side, up/down ladder, sequencing
- [ ] Command work after Day-5 lifts
- [ ] The 15-drill arm-care library (some already in Hammers Today arm care; check for duplicates)
- [ ] Velocity gun-reading day, with a place to **save velocity** (not built in Heat Factory either)
- [ ] Softball pitching (windmill) content and softball distances — missing in Heat Factory; must be written new
- [ ] Add all items to `wk_movement_catalog` as **inactive rows** for owner review (with minimum ages, season eligibility, equipment, no outside brand names)

### Iron Bambino → checklist
- [ ] Hitter strength progression: 4 named cycles (concentric-isometric → weightlifting → intensification → slow-lowering muscle growth) with set/rep/% tables
- [ ] Rotational and isometric hitter accessories (landmine rotational press, resist-turning press/holds, woodchops, med ball slams, isometric holds)
- [ ] 20-drill bat-speed bank (quick hands, rotation, connection, overload/underload, measurement drills) — compare with Hammers Today's bat-speed templates, which already have over/underload, PAP, primer and recovery
- [ ] Bat speed added to lift days (4 drills) — check against the bat over/underload back-to-back rule
- [ ] Saving bat speed and exit speed (not built in Iron Bambino either)
- [ ] Experience-level load scaling (beginner −10%, advanced +5%)

### The Unicorn → checklist
- [ ] A merged 2-Way week (strength, pitch velocity + sprints, bat speed, rest, strength + throw velocity, speed, rest). Hammers Today already makes per-day plans for 2-Way players — compare how it balances them.
- [ ] Visible **"Key Rules"** list and a **weekly CNS budget bar** (165 target, red when over) — a strong trust feature to copy
- [ ] Deload every 4th week (sets ×0.6) — check how this fits Hammers Today's adaptive phases
- [ ] Velocity blocks A/B (hip-lead, pivot pickoffs, reverse throws, 3 oz ball, 7–11 oz overload, 2–3 oz underload, pull-downs, long toss)
- [ ] Arm care every training day (light on lighter days)
- [ ] Throw counting / "pitch-count equivalents" and an automatic rest suggestion — promised by The Unicorn but never built; Hammers Today's pitch-count rules may cover it
- [ ] Clear message to Golden 2Way buyers that The Unicorn is their included program (pricing copy)

### Speed Lab → checklist
- [ ] **Session check-in** (sleep emoji, body feel, body-map pain) → readiness score → fewer reps when readiness is low
- [ ] **Automatic break day** with the four triggers, a recovery drill set and a player override
- [ ] **Timed sprints**, sport-specific (baseball 10/30/60 yd; softball ⅓, 1 and 2 bases) with **personal bests**, trend arrows and the **Speed Track tiers** (Building → World Class) against reference times
- [ ] **Partner stopwatch** mode and optional steps per rep (stride length / step rate)
- [ ] Plateau detection (4 sessions) with a focus shift and its message
- [ ] Rep progression by session number (2-1-1 … 6-5-5) and the 16-sprint game-ready target
- [ ] **Barefoot progression** with its disclaimer and safety gating
- [ ] Unlocking resisted work (session 7) and overspeed (session 10) — map to Hammers Today training age/legality
- [ ] The drill library (activation, isometric, mechanics, plyo, resisted, cool-down, break day) with cues and "why it helps" — compare with Hammers Today speed templates (`sp.acceleration`, `sp.top_speed`, `sp.mixed`, `sp.elastic`, `sp.game_day_primer`, `sp.practice_day`, `sp.recovery`, `sp.return_to_run`)
- [ ] The tone ("Fast bodies are springy bodies", "Today we protect speed") and the 7 rotating focus lines
- [ ] Session-complete celebration with a 🏆 New Personal Best card
- [ ] Moving history from `speed_sessions` / `speed_goals` (2 sessions; small)
- [ ] Connecting the HIE stride-inefficiency finding (currently disconnected)

### Explosive Conditioning → checklist
- [ ] Everything in Speed Lab (it is the same program)
- [ ] Decide what "conditioning for pitchers" should mean. The owner's pitcher/recovery conditioning doctrine and Hammers Today's conditioning card already cover the day after a start and recovery work; the program does not.
- [ ] Complete Pitcher buyers must still get speed work in Hammers Today (their tier currently gets speed only through this page)

### Things to decide before closing the programs
1. **Pricing and marketing copy** in `src/constants/tiers.ts`, the pricing pages, `GoldenTwoWay.tsx`, `CompletePitcher.tsx`, the `ai-helpdesk` text and the demo registry (`iron-bambino`, `heat-factory`, `speed-lab`, `explosive-conditioning`, `unicorn-engine` demos) all name these programs.
2. **Game Plan tasks, calendar legend/events and default schedules** for the five programs must be removed or redirected. The `useGamePlan.ts` key bug disappears with them.
3. **Hammers Today's other-program mapping** (`wk_external_training_days`) can stay for history or be removed. While any program is open, it must stay.
4. **Existing player data:** the `sub_module_progress` rows (22 / 12 / 6), the speed tables and 4 Vault notes. Keep read-only or move. Nothing may be deleted without the owner's instruction and a snapshot.
5. **Routes** `/production-lab`, `/production-studio`, `/the-unicorn`, `/speed-lab`, `/explosive-conditioning`: redirect to Hammers Today.
6. **Translations:** program text exists in 8 languages; Hammers Today cards will need the same.

---

## Notes on method and limits
- **No screenshots:** the program pages need a signed-in subscriber, and no player session was available this round.
- **Full exercise lists:** Cycle 1 of Iron Bambino and The Unicorn are listed in full. Heat Factory and the later Iron Bambino cycles are summarized with line ranges. An exact item-by-item export can be produced from the data files on request.
- **Speed usage:** Speed Lab and Explosive Conditioning usage cannot be separated, because they write to the same tables.
