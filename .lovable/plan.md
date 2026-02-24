

# Add "Explosive Conditioning" to Complete Pitcher (Baseball + Softball)

## Overview

Create **Explosive Conditioning** as a pitcher-tier version of Speed Lab. Since the underlying `useSpeedProgress` hook already accepts a `SportType` (`'baseball'` | `'softball'`) and provides sport-specific distance protocols (Baseball: 10/30/60 yd; Softball: 7/20/40 yd), the new page inherits full sport support automatically. Speed Lab remains completely untouched for 5Tool and Golden 2Way users.

## Changes

### 1. New File: `src/pages/ExplosiveConditioning.tsx`

Copy of `SpeedLab.tsx` with these differences:
- All display text changed from "Speed Lab" to "Explosive Conditioning"
- Access check uses `pitching`/`pitcher` module instead of `throwing`
- No-access message references Complete Pitcher subscription
- Same `useSpeedProgress(selectedSport)` call, which already handles baseball vs softball distances, drills, and protocols

### 2. `src/App.tsx`

- Add lazy import for `ExplosiveConditioning`
- Add route: `/explosive-conditioning`

### 3. `src/pages/CompletePitcher.tsx`

Add a third tile:
- Key: `explosive-conditioning`
- Icon: `Zap`
- Label: "Explosive Conditioning"
- Description: "Build elite speed and explosive power with structured conditioning"
- Route: `/explosive-conditioning`

### 4. `src/components/AppSidebar.tsx`

Add "Explosive Conditioning" to the Complete Pitcher sidebar subModules, linking to `/explosive-conditioning`.

### 5. `src/constants/tiers.ts`

Add `'Explosive Conditioning'` to the pitcher tier's `includes` array.

### 6. `src/constants/trainingSchedules.ts`

Add: `'explosive-conditioning': [1, 3, 5]` (Mon, Wed, Fri -- same CNS recovery pattern as Speed Lab).

### 7. `src/hooks/useGamePlan.ts`

Add an "Explosive Conditioning" Game Plan task:
- Gated by `hasPitchingAccess` and NOT `hasThrowingAccess` (avoids duplication for Golden 2Way users who already see Speed Lab)
- Task ID: `explosive-conditioning`, links to `/explosive-conditioning`
- Reads completion from the same `speed_sessions` table
- Shows CNS lockout/recovery badge identically to Speed Lab

### 8. `src/hooks/useCalendar.ts`

- Add `'explosive-conditioning'` to task metadata (title "Explosive Conditioning", Zap icon)
- Add `'explosive-conditioning'` to the pitching module task list

### 9. `src/hooks/useCalendarActivityDetail.ts`

Add route mapping: `'explosive-conditioning': '/explosive-conditioning'`

## Sport Support

No special handling needed. The `useSpeedProgress` hook already:
- Reads `selectedSport` from localStorage (`'baseball'` or `'softball'`)
- Selects sport-specific distances (10/30/60 yd vs 7/20/40 yd)
- Filters drills by sport
- Stores sessions with the sport column in `speed_sessions`

Both baseball and softball users on the Complete Pitcher tier will get the correct protocols automatically.

## What Does NOT Change

- Speed Lab page, route, components, and all 5Tool/Golden 2Way references
- Database tables (`speed_sessions`, `speed_goals`, `athlete_load_tracking`)
- Edge functions and CNS load calculations
- `useSpeedProgress` hook

## Access Summary

| Tier | Speed Lab | Explosive Conditioning |
|------|-----------|----------------------|
| Complete Pitcher (baseball) | No | Yes |
| Complete Pitcher (softball) | No | Yes |
| 5Tool Player | Yes | No |
| Golden 2Way | Yes | No |
| Owner/Admin | Both | Both |

