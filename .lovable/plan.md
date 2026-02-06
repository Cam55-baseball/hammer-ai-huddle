

# Speed Intelligence Submodule -- E2E Implementation Plan

## Overview

A new submodule called **Speed Lab** that unlocks automatically when users purchase the throwing module. It provides a structured, kid-friendly speed development program with sport-specific distances (baseball vs softball), 12-hour session locks, auto-adjusting goals, fascia integration, readiness-based break days, and a professional drill library -- all presented with an elite yet simple UI.

---

## Architecture Summary

The Speed Lab follows the exact same proven architecture as the existing **Production Lab** (hitting) and **Production Studio** (pitching):

- **Database**: New `speed_sessions` and `speed_goals` tables + reuses `sub_module_progress` with `module='throwing'`, `sub_module='speed_lab'`
- **Data file**: New `src/data/speedLabProgram.ts` containing the full drill library, fascia protocols, and sport-specific distance configs
- **Hook**: New `src/hooks/useSpeedProgress.ts` that wraps `useSubModuleProgress` with speed-specific logic (time logging, goal tracking, auto-adjustment, break day detection)
- **Page**: New `src/pages/SpeedLab.tsx` (route: `/speed-lab`)
- **Components**: New `src/components/speed-lab/` directory with speed-specific UI components
- **Access**: Gated by `throwing` module subscription (same pattern as Production Lab checks `hitting`)

---

## 1. Database Changes (3 new tables)

### Table: `speed_sessions`
Stores every speed session result.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK to auth.users |
| sport | text | 'baseball' or 'softball' |
| session_number | integer | Sequential session index |
| session_date | date | |
| distances | jsonb | `{ "10y": 1.52, "30y": 3.45, "60y": 6.78 }` or softball equivalents |
| rpe | integer | 1-10 RPE slider |
| body_feel_before | text | 'good', 'okay', 'tight' |
| body_feel_after | text | 'good', 'okay', 'tight' |
| sleep_rating | integer | 1-5 |
| pain_areas | jsonb | string[] from body map |
| drill_log | jsonb | Array of completed drill names |
| is_break_day | boolean | Whether system triggered a break day |
| readiness_score | integer | 0-100 from check-in data |
| notes | text | Optional user notes |
| created_at | timestamptz | |

RLS: Users can only read/write their own rows.

### Table: `speed_goals`
Stores the current goal track for each user/sport.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| sport | text | |
| current_track | text | 'building_speed', 'competitive_speed', 'elite_speed', 'world_class' |
| goal_distances | jsonb | Current target times per distance |
| weeks_without_improvement | integer | Counter for auto-adjustment |
| last_adjustment_date | date | |
| adjustment_history | jsonb | Log of all auto-adjustments |
| personal_bests | jsonb | Best times per distance |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Users can only read/write their own rows.

### Table: `speed_partner_timings`
Optional partner timer results.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid | FK to speed_sessions |
| user_id | uuid | |
| distance | text | e.g. '10y', '30y', '60y' |
| time_seconds | numeric | |
| timed_by | text | 'self' or 'partner' |
| created_at | timestamptz | |

RLS: Users can only read/write their own rows.

### Reuses: `sub_module_progress`
Existing table with `module='throwing'`, `sub_module='speed_lab'` for session locking (12-hour timer), streak tracking, and completion tracking. No schema changes needed.

---

## 2. Data File: `src/data/speedLabProgram.ts`

A comprehensive data file containing:

### Sport-Specific Distance Configs
```text
Baseball: 10 Yard, 30 Yard, 60 Yard
Softball: 1/3 base (~7 yd), 1 base (~20 yd), 2 bases (~40 yd)
```

### World-Class Reference Tables (Internal Only)
```text
Baseball: 10Y <= 1.41, 30Y <= 3.30, 60Y <= 6.40
Softball: 7Y <= 1.00, 20Y <= 2.20, 40Y <= 4.25
```

### Speed Track Tiers (User-Facing)
```text
Building Speed -> Competitive Speed -> Elite Speed -> World Class
```
Each tier maps to percentage ranges of the world-class reference. Users only see the track name and their next goal.

### Professional Drill Library (~30 drills organized by category)

**Activation & Elastic Warm-Up** (every session)
- Barefoot ankle circles + toe grips
- A-skips (low amplitude)
- B-skips
- Ankling drills
- Light skipping for height
- Dynamic leg swings (sagittal + frontal)

**Isometric Preload** (every session)
- ISO ankle hold (single-leg, 8s)
- ISO split squat hold (8s)
- ISO wall push (hip extension, 8s)
- ISO calf raise hold (8s)

**Sprint Mechanics** (2-3 per session, rotated)
- Wall drives (A-position)
- Wall drive + march-out
- Falling starts (10y)
- 3-point starts
- Standing starts with arm drive focus
- Wicket runs (spacing varies by age)
- Build-up sprints (60-70-80-90%)

**Elastic/Plyometric** (1-2 per session)
- Pogo hops (ankle stiffness)
- Single-leg pogo hops
- Broad jump + stick
- Bounding (3-5 contacts)
- Depth drops (low box, 6-12")
- Hurdle hops (mini)

**Resisted/Assisted** (1 per session, weeks 3+)
- Sled push (light, 10y)
- Band-resisted starts
- Partner-resisted march
- Overspeed downhill runs (2-3% grade)

**Cool-Down / Tissue Reset** (every session)
- Walking mechanics drill (heel-to-toe emphasis)
- Light oscillatory leg swings
- Foam rolling (calves, hamstrings, quads)
- 90/90 hip stretch
- Deep breathing (box breathing, 4 rounds)

### Break Day Content
- Elastic holds (ankles, hips)
- Light skips (50% effort)
- Mobility with intent (hip CARs, ankle CARs)
- Breathing + posture (diaphragmatic + thoracic extension)
- Walking lunge flow

### Session Templates
Each session follows the structure:
1. Speed Check-In (30-45 sec): sleep, body feel, pain map
2. Today's Speed Focus (1 sentence + icon)
3. Elastic Warm-Up (3-4 drills, ~5 min)
4. Isometric Preload (2-3 holds, ~3 min)
5. Sprint Work (2-3 efforts, full rest, ~8 min)
6. Cool-Down/Tissue Reset (3-4 drills, ~5 min)
7. Log Results (times, RPE, body feel)

Weekly rotation ensures variety across sessions within a week.

---

## 3. Hook: `src/hooks/useSpeedProgress.ts`

Wraps `useSubModuleProgress` and adds speed-specific logic:

- **Session scheduling**: Determines which session is next, enforces 12-hour lock
- **Goal engine**: Calculates current track, detects plateaus (3-4 weeks no improvement), triggers auto-adjustment
- **Break day detection**: Checks readiness score from latest `vault_focus_quizzes` entry (sleep, physical readiness, pain areas). If readiness is below threshold, flags session as a break day
- **Personal bests tracking**: Maintains PBs per distance
- **Trend analysis**: Calculates improvement trends for export
- **Partner timer state**: Manages the start/stop timing UX

---

## 4. Page: `src/pages/SpeedLab.tsx`

### First-Time Experience ("Start My Speed Journey")
When no `sub_module_progress` row exists for `throwing/speed_lab`:
- Full-screen clean card with a single big button: **"Start My Speed Journey"**
- Tapping it initializes progress and shows Session 1 immediately
- No configuration choices -- sport is auto-detected from subscription/localStorage

### Main View (After Initialization)
Follows the same layout pattern as Production Lab but adapted for speed:

**Header**: Back arrow + "Speed Lab" title + subtitle

**Speed Track Card** (replaces week progress)
- Shows current track tier with visual indicator (e.g., "Building Speed")
- Shows goal text: "Goal: Move into Competitive Speed"
- Personal best badges per distance
- Trend arrows (improving / maintaining / needs attention)

**Streak & Stats Card** (reuses `WorkoutProgressStreakCard`)

**Next Session Card**
- If locked: Shows countdown timer + "Recovery builds speed." message
- If break day triggered: Shows break day content with "Today we protect speed."
- If ready: Shows "Start Session" button with today's focus preview

**Session History** (collapsible)
- Recent sessions with times, RPE, and trend indicators

### Session Flow (Full-Screen Mode)
When user taps "Start Session", enters a step-by-step flow:

**Step 1: Speed Check-In** (30-45 sec)
- Sleep: 5 tap icons (bed/moon emoji-style)
- Body feel: 3 buttons (Good / Okay / Tight)
- Pain: Tap to open simplified body map (reuses existing `BodyAreaSelector`)

**Step 2: Today's Speed Focus**
- Big icon (e.g., lightning bolt) + 1 sentence
- Example: "Today we build explosive first steps."
- Auto-selected based on session rotation

**Step 3: Do The Work** (drill cards)
- 3-5 drill cards, each showing:
  - Drill name + 1-2 cues
  - Sets/reps or duration
  - Checkbox to mark complete
  - Category badge (Warm-Up / Sprint / Cool-Down)
- Simple, large touch targets (44x44px minimum)

**Step 4: Log Results**
- Time entry per distance (big numeric inputs)
- "Partner Mode" toggle: when ON, shows a start/stop timer UI for a coach/parent to time
- RPE slider (1-10, kid-friendly labels: "Easy" to "Max Effort")
- Body feel after: Good / Okay / Tight

**Step 5: Session Complete**
- Celebration animation (reuses ConfettiEffect)
- Personal best callout if achieved
- Lock timer begins: "Next speed session unlocks in 12:00:00 -- Recovery builds speed."
- Fascia insight: "Fast bodies are springy bodies."

---

## 5. Components: `src/components/speed-lab/`

| Component | Purpose |
|-----------|---------|
| `SpeedTrackCard.tsx` | Displays current tier, goal, PBs, trends |
| `SpeedCheckIn.tsx` | Sleep/body/pain quick check-in form |
| `SpeedFocusCard.tsx` | Big icon + focus sentence for the session |
| `SpeedDrillCard.tsx` | Individual drill with cues, completion toggle |
| `SpeedTimeEntry.tsx` | Distance time input with manual + partner timer |
| `PartnerTimer.tsx` | Start/Stop timer for coach/parent timing |
| `SpeedRPESlider.tsx` | Kid-friendly RPE slider with labels |
| `BreakDayContent.tsx` | Break day drills and messaging |
| `SpeedSessionFlow.tsx` | Step-by-step session orchestrator |
| `SpeedSessionHistory.tsx` | Past sessions list with trends |
| `SpeedGoalAdjustmentCard.tsx` | Shown when goals auto-adjust |

---

## 6. Navigation & Access Integration

### Route
- New route: `/speed-lab`
- Lazy-loaded in `App.tsx` following existing pattern

### Sidebar (`AppSidebar.tsx`)
- Add as a subModule under the `throwing` key (currently throwing has no subModules):
```text
throwing -> subModules: [
  { title: "Speed Lab", url: "/speed-lab", icon: Zap }
]
```

### Dashboard (`Dashboard.tsx`)
- No changes to the throwing module card itself
- Speed Lab is accessible via sidebar + from within the throwing analysis page as a link

### Access Check
- Same pattern as Production Lab: `modules.some(m => m.startsWith('${selectedSport}_throwing'))`
- Owners and admins get automatic access

---

## 7. 12-Hour Lock Logic

Reuses the exact same mechanism from `useSubModuleProgress`:
- `UNLOCK_DELAY_MS = 12 * 60 * 60 * 1000` (already defined)
- `completeWorkoutDay` records `day_completion_times`
- `isDayAccessible` checks if 12 hours have passed
- `CountdownTimer` component shows live countdown
- `useWorkoutNotifications` schedules a push notification when the session unlocks

The speed module uses a continuous session model (session 1, session 2, session 3...) rather than week/day, but maps to the existing week_progress structure: each "week" holds 2-3 sessions, auto-advancing when all sessions are complete.

---

## 8. Auto-Adjusting Goals

### Logic (in `useSpeedProgress.ts`)
After each session:
1. Compare new times against PBs
2. If no PB improvement in any distance for 3-4 consecutive sessions (configurable):
   - Increment `weeks_without_improvement`
   - When threshold hit, trigger adjustment
3. Adjustment actions:
   - Shift focus to shortest distance (acceleration)
   - Extend time horizon messaging
   - Log adjustment in `adjustment_history`
4. User sees: "Your body is adapting. We're shifting focus to help speed stick."

### Goal Track Progression
Progression between tiers (Building -> Competitive -> Elite -> World Class) happens automatically when PBs cross tier thresholds.

---

## 9. Break Day Injection

### Detection (runs at session start)
Checks latest `vault_focus_quizzes` entry:
- Sleep quality <= 2/5
- Physical readiness <= 2/5
- 3+ pain areas flagged
- Back-to-back high-RPE sessions (RPE >= 8 on last 2 sessions)
- Declining sprint quality (last 2 sessions slower than PB by > 5%)

### Break Day Experience
- Different UI: calming colors, no sprint work
- Content: elastic holds, light skips, mobility, breathing
- Copy: "Today we protect speed."
- Still counts as a completed session (lock timer starts)
- User can override ("I feel ready to train") with a confirmation dialog

---

## 10. Fascia Integration

Every session includes fascia-aligned content (embedded in drill library):

**Pre-session**: Elastic warm-up + barefoot/minimal contact exposure + isometric preload
**During**: Short contacts, low volume, full rest, rebound emphasis
**Post**: Tissue reset, light oscillation, walking mechanics

Kid-friendly copy throughout: "Fast bodies are springy bodies."

---

## 11. Visibility & Export

### Visible to
- Athlete (full view)
- Coaches/Scouts following the athlete (via existing follow system)
- Scout Game Plan integration (speed data appears in export)

### Export Data (future phase)
- Best times per distance
- Trend lines
- Consistency score (sessions completed / sessions available)
- Speed track tier

---

## 12. Internationalization

All user-facing strings will be added to all 8 locale files (`en`, `de`, `es`, `fr`, `ja`, `ko`, `nl`, `zh`) under a new `speedLab` key namespace. Kid-friendly language throughout, "Hammer" branding (not "AI").

---

## 13. File Change Summary

| File | Action | Description |
|------|--------|-------------|
| **Database migration** | Create | 3 new tables with RLS policies |
| `src/data/speedLabProgram.ts` | Create | Full drill library, distance configs, session templates, goal tiers |
| `src/hooks/useSpeedProgress.ts` | Create | Speed-specific progress hook wrapping useSubModuleProgress |
| `src/pages/SpeedLab.tsx` | Create | Main page with onboarding + session flow + history |
| `src/components/speed-lab/*.tsx` | Create | ~11 new components (listed above) |
| `src/App.tsx` | Edit | Add lazy import + route for SpeedLab |
| `src/components/AppSidebar.tsx` | Edit | Add Speed Lab as subModule under throwing |
| `src/i18n/locales/*.json` (8 files) | Edit | Add speedLab translation keys |

**Total: ~15 new files, ~10 edited files**

---

## 14. Implementation Order

1. Database tables + RLS policies
2. Data file (speedLabProgram.ts)
3. Speed progress hook (useSpeedProgress.ts)
4. Core UI components (speed-lab/ directory)
5. Main page (SpeedLab.tsx) with onboarding + session flow
6. Routing (App.tsx) + sidebar navigation (AppSidebar.tsx)
7. Internationalization (all 8 locale files)
8. Integration testing

Due to the scope of this feature, implementation will be done across multiple prompts, starting with the foundation (database + data + hook) and building up to the full UI.

