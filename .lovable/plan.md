

# Integrate Speed Lab into Game Plan and Calendar E2E with Premium Logic

## Overview

Speed Lab currently lives as an isolated page (`/speed-lab`). This plan integrates it into the Game Plan dashboard and Calendar module as a first-class system task -- gated behind the throwing module subscription, with full skip/schedule/lock/order support, completion tracking, and calendar routing, exactly like every other task in the system.

---

## What This Adds

1. **Speed Lab as a Game Plan system task** -- appears in the "Training" section alongside Iron Bambino, Heat Factory, and Tex Vision
2. **Speed Lab as a Calendar event** -- shows on every scheduled day with proper icon, color, and routing
3. **Premium gating** -- only visible to users with a throwing module subscription (or owners/admins)
4. **Completion tracking** -- checks `speed_sessions` for today's date to mark as done
5. **Skip/schedule support** -- fully integrated with the `calendar_skipped_items` table and `game_plan_task_schedule`
6. **Lock/order support** -- supports both date-specific and weekly template locking via existing order key system
7. **Calendar routing** -- clicking Speed Lab in the Calendar Day Sheet navigates to `/speed-lab`
8. **12-hour lockout awareness** -- if the Speed Lab CNS lockout is active, the Game Plan task shows a subtle "Locked" badge instead of the normal "DO IT" button

---

## 1. Game Plan Hook (`useGamePlan.ts`)

### Changes:

**Add Speed Lab completion check in `fetchTaskStatus`** (alongside existing video-throwing, workout-hitting, etc.):

```text
// After the video-throwing completion check (~line 234):
if (hasThrowingAccess) {
  const today = getTodayDate();
  const { data: speedData } = await supabase
    .from('speed_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('sport', selectedSport)
    .eq('session_date', today)
    .limit(1);

  status['speed-lab'] = (speedData?.length || 0) > 0;
}
```

**Add Speed Lab task to the Training section** (after workout-pitching and Tex Vision, before video tasks):

```text
if (hasThrowingAccess && !isSystemTaskSkippedToday('speed-lab')) {
  tasks.push({
    id: 'speed-lab',
    titleKey: 'gamePlan.speedLab.title',
    descriptionKey: 'gamePlan.speedLab.description',
    completed: completionStatus['speed-lab'] || false,
    icon: Zap,
    link: '/speed-lab',
    module: 'throwing',
    taskType: 'workout',
    section: 'training',
  });
}
```

**Add `Zap` to the import** from lucide-react (already imported in SpeedLab.tsx, needs adding to useGamePlan.ts).

---

## 2. Calendar Hook (`useCalendar.ts`)

### Changes:

**Register Speed Lab in the `SYSTEM_TASKS` map**:

```text
'speed-lab': { title: 'Speed Lab', icon: Zap, color: '#eab308' },
```

This is a `game_plan` type (not `program`), so it will appear on scheduled days via the existing `game_plan_task_schedule` logic or as a default daily task.

**Add `speed-lab` to `MODULE_GATED_TASKS`**:

```text
throwing: ['video-throwing', 'speed-lab'],
```

This ensures Speed Lab calendar events only appear for users with throwing access. Currently there's no `throwing` key in `MODULE_GATED_TASKS`, so this is a new entry.

**Add `Zap` to the import** from lucide-react.

---

## 3. Calendar Activity Detail Routing (`useCalendarActivityDetail.ts`)

### Changes:

**Add route mapping** for Speed Lab:

```text
'speed-lab': '/speed-lab',
```

This ensures clicking Speed Lab in the Calendar Day Sheet navigates to `/speed-lab`.

---

## 4. Calendar Day Order Key Support (`useCalendarDayOrders.ts`)

No changes needed -- Speed Lab will use the standard `gp:speed-lab` order key format, which is already handled by the existing `getOrderKey` function for `game_plan` type events.

---

## 5. i18n Keys (All 8 Locales)

**New keys under the existing `gamePlan` section**:

| Key | English |
|-----|---------|
| `gamePlan.speedLab.title` | "Complete Speed Lab Session" |
| `gamePlan.speedLab.description` | "Build elite speed with structured sprints" |

These will be translated into all 7 non-English locales (de, es, fr, ja, ko, nl, zh).

---

## 6. CNS Lockout Badge (Optional Enhancement)

When the Speed Lab's 12-hour CNS recovery lockout is active, the Game Plan task card can show a small "Locked" indicator. This requires checking the latest `speed_sessions.created_at` in `fetchTaskStatus` and comparing against `SPEED_UNLOCK_DELAY_MS`. If locked, a `badge` field is set on the task.

This is a small addition to `fetchTaskStatus`:

```text
// Check if Speed Lab is in CNS lockout
if (hasThrowingAccess) {
  const { data: latestSession } = await supabase
    .from('speed_sessions')
    .select('created_at')
    .eq('user_id', user.id)
    .eq('sport', selectedSport)
    .order('created_at', { ascending: false })
    .limit(1);

  if (latestSession?.[0]) {
    const lastTime = new Date(latestSession[0].created_at).getTime();
    const unlockAt = lastTime + 43200000; // 12 hours
    if (Date.now() < unlockAt) {
      status['speed-lab-locked'] = true;
    }
  }
}
```

The badge text ("Recovery Mode") will inform the user that the system is protecting their body.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/hooks/useGamePlan.ts` | Add `speed-lab` completion check + task definition in Training section, import `Zap` icon |
| `src/hooks/useCalendar.ts` | Add `speed-lab` to `SYSTEM_TASKS` map + `MODULE_GATED_TASKS.throwing`, import `Zap` icon |
| `src/hooks/useCalendarActivityDetail.ts` | Add `'speed-lab': '/speed-lab'` to `SYSTEM_TASK_ROUTES` |
| `src/i18n/locales/en.json` | Add `gamePlan.speedLab.title` and `gamePlan.speedLab.description` |
| `src/i18n/locales/de.json` | Add translated `gamePlan.speedLab` keys |
| `src/i18n/locales/es.json` | Add translated `gamePlan.speedLab` keys |
| `src/i18n/locales/fr.json` | Add translated `gamePlan.speedLab` keys |
| `src/i18n/locales/ja.json` | Add translated `gamePlan.speedLab` keys |
| `src/i18n/locales/ko.json` | Add translated `gamePlan.speedLab` keys |
| `src/i18n/locales/nl.json` | Add translated `gamePlan.speedLab` keys |
| `src/i18n/locales/zh.json` | Add translated `gamePlan.speedLab` keys |

**Total**: 11 files modified, 0 database migrations

---

## How It Works E2E

1. **User subscribes to throwing module** -- `useSubscription` returns `hasThrowingAccess = true`
2. **Game Plan loads** -- `useGamePlan` checks `speed_sessions` for today's date, adds "Speed Lab" task to Training section
3. **Calendar loads** -- `useCalendar` adds Speed Lab event on every scheduled day (or daily by default via `MODULE_GATED_TASKS`)
4. **User clicks task on Game Plan** -- navigates to `/speed-lab`
5. **User clicks event on Calendar Day Sheet** -- `useCalendarActivityDetail.navigateToSystemTask` routes to `/speed-lab`
6. **User completes a Speed Lab session** -- `speed_sessions` row is inserted for today's date
7. **Game Plan refetches** -- task shows as completed (green check)
8. **Skip/schedule** -- user can schedule Speed Lab to specific days via the pencil icon, skip for today, or lock the order
9. **CNS lockout** -- if user completed a session less than 12 hours ago, task shows "Recovery Mode" badge

No premium logic gaps: the task only appears when `hasThrowingAccess` is true, matching the existing pattern used by video-throwing.

