

# Workout Program Start, Pause, and Resume Control System

## Overview

Add manual start/pause/resume controls to all four structured workout programs: Iron Bambino, Heat Factory, The Unicorn, and Speed Lab. Users must explicitly opt in before workouts appear on their Game Plan. Programs can be paused and resumed without losing progress.

## Why This Matters

- Independent athletes get guided onboarding without being overwhelmed
- Trainer-supported athletes are not forced into auto-scheduling
- Game Plan stays clean -- only shows workouts the user has chosen to start
- Works identically for baseball and softball across all tiers

## Database Changes

Two columns need to be added:

1. **`sub_module_progress.program_status`** -- controls Iron Bambino, Heat Factory, and The Unicorn
   - Values: `not_started` (default), `active`, `paused`
   - Existing rows with progress get set to `active` automatically

2. **`speed_goals.program_status`** -- controls Speed Lab
   - Values: `not_started` (default), `active`, `paused`
   - Existing rows with sessions get set to `active` automatically

## Code Changes

### 1. Hook: `src/hooks/useSubModuleProgress.ts`

- Add `programStatus` to the `SubModuleProgress` interface
- Read `program_status` from the fetched database row (default `'not_started'`)
- Add three new functions:
  - `startProgram()` -- sets status to `active`
  - `pauseProgram()` -- sets status to `paused`
  - `resumeProgram()` -- sets status to `active`
- Remove auto-initialization logic from the hook (pages will handle start explicitly)

### 2. Hook: `src/hooks/useSpeedProgress.ts`

- Add `programStatus` to the hook state
- Read `program_status` from `speed_goals` table
- Modify existing `initializeJourney()` to also set `program_status = 'active'`
- Add `pauseProgram()` and `resumeProgram()` functions
- Expose `programStatus` from the hook

### 3. Page: `src/pages/ProductionLab.tsx` (Iron Bambino)

- Remove the auto-initialize `useEffect` (lines 145-149)
- Add a "not started" landing state:
  - Clean card with program icon
  - Message: "Start your structured training program to add workouts to your Game Plan."
  - Large "Start Program" button
- Add a "paused" banner state:
  - Message: "Your program is paused. Resume anytime to continue your progression."
  - "Resume Program" button
  - Progress/history visible as read-only
- Add a "Pause Program" button in the header when active

### 4. Page: `src/pages/ProductionStudio.tsx` (Heat Factory)

- Same pattern as Iron Bambino above
- Remove auto-initialize `useEffect` (lines 180-184)
- Add Start/Pause/Resume UI states

### 5. Page: `src/pages/TheUnicorn.tsx` (The Unicorn)

- Same Start/Pause/Resume pattern
- Remove auto-initialize `useEffect` (lines 111-115)
- **Conflict resolution**: When The Unicorn is started, auto-pause Iron Bambino and Heat Factory if they are active
- Show a toast notification: "Iron Bambino and Heat Factory have been paused. The Unicorn replaces them."

### 6. Page: `src/pages/SpeedLab.tsx`

- Speed Lab already has a manual "Start My Speed Journey" button -- wire it to also set `program_status = 'active'`
- Add "Pause Program" and "Resume Program" buttons
- Speed Lab can run concurrently with any other program (no auto-pause)

### 7. Hook: `src/hooks/useGamePlan.ts` (Game Plan Integration)

This is the critical integration point. Currently, Game Plan shows workout tasks based solely on module access. After this change:

- For `workout-hitting` (Iron Bambino): query `sub_module_progress` where `module='hitting'` and only show if `program_status = 'active'`
- For `workout-pitching` (Heat Factory): query `sub_module_progress` where `module='pitching'` and only show if `program_status = 'active'`
- For `speed-lab`: query `speed_goals` and only show if `program_status = 'active'`
- For `quiz-prelift` (Pre-Lift Check-in): only show on strength days when the relevant program is active
- Paused or not-started programs produce zero tasks on Game Plan

### 8. Conflict Rules

```text
Program Started          Auto-Pause Effect
--------------------     -------------------------
The Unicorn              Iron Bambino + Heat Factory
Iron Bambino             Nothing
Heat Factory             Nothing
Speed Lab                Nothing (always concurrent)
```

- Only one primary structured system active at a time
- Speed Lab always allowed alongside any primary system
- Tier switches preserve progress; incompatible programs stay paused

## User Flow

```text
Purchase tier
    |
    v
Open workout module page
    |
    v
See "Start Program" card
(clean, simple, one big button)
    |
    v
Click "Start Program"
    |
    v
Program initializes (Week 1, Day 1)
Game Plan starts showing workouts
CNS + load tracking begins
    |
    v
"Pause" button available anytime
(progress saved, Game Plan clears)
    |
    v
"Resume" button picks up exactly where you left off
```

## Files Changed Summary

| File | Change |
|---|---|
| Database migration (2 statements) | Add `program_status` column to `sub_module_progress` and `speed_goals` |
| `src/hooks/useSubModuleProgress.ts` | Add `programStatus`, `startProgram()`, `pauseProgram()`, `resumeProgram()` |
| `src/hooks/useSpeedProgress.ts` | Add `programStatus`, `pauseProgram()`, `resumeProgram()` |
| `src/pages/ProductionLab.tsx` | Remove auto-init, add Start/Pause/Resume UI |
| `src/pages/ProductionStudio.tsx` | Remove auto-init, add Start/Pause/Resume UI |
| `src/pages/TheUnicorn.tsx` | Remove auto-init, add Start/Pause/Resume UI + conflict auto-pause |
| `src/pages/SpeedLab.tsx` | Wire existing start to status, add Pause/Resume |
| `src/hooks/useGamePlan.ts` | Filter workout tasks by `program_status = 'active'` |

## Non-Negotiables Checklist

- No auto-starting programs
- No forced scheduling
- No loss of progress when paused
- Clean UX with simple buttons
- Zero confusion
- Works across baseball and softball
- Works for all tiers (Pitcher, 5Tool, Golden 2Way)
- Only one primary structured system active at a time (The Unicorn overrides Iron Bambino + Heat Factory)
- Speed Lab can run concurrently
- No duplicate workouts or CNS stacking

