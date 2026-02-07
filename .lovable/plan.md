

# Fix Build Error and Complete E2E Speed Lab Plan

## Overview

This plan fixes the build error in `SpeedSessionHistory.tsx` and completes all missing pieces from the original plan that were not fully implemented -- specifically barefoot drill progression, missing i18n keys in all 7 non-English locales, and the German sprint step button text still showing the old wording.

---

## 1. Fix Build Error: SpeedSessionHistory.tsx

**Problem**: Line 69 calls `.toFixed(2)` on `session.distances[dist.key]`, which is now `number | number[]` after the multi-rep migration. TypeScript correctly flags this because arrays don't have `.toFixed()`.

**Fix**: Import the `getBestTime` helper from `speedLabProgram.ts` and use it to extract the best time from either format before displaying.

```text
// Before (broken):
const time = session.distances[dist.key];
return time ? <p>{time.toFixed(2)}s</p> : null;

// After (fixed):
const rawTime = session.distances[dist.key];
const time = getBestTime(rawTime);
return time > 0 ? <p>{time.toFixed(2)}s</p> : null;
```

**File**: `src/components/speed-lab/SpeedSessionHistory.tsx`

---

## 2. Add Barefoot Level to Drills

**Problem**: The `barefootLevel` field was added to the `DrillData` interface but no drills actually have it set. This means the barefoot badge system has no drill-level data.

**Fix**: Add `barefootLevel` values to appropriate drills in `src/data/speedLabProgram.ts`:

| Drill | Barefoot Level | Meaning |
|-------|---------------|---------|
| Barefoot Ankle Circles + Toe Grips | 0 (foundation) | Always barefoot |
| A-Skips | 1 (introduction, session 10+) | Barefoot A-skips after session 10 |
| Ankling Drills | 1 (introduction, session 10+) | Barefoot ankling after session 10 |
| Pogo Hops | 2 (integration, session 15+) | Barefoot pogo after session 15 |
| Single-Leg Pogo Hops | 3 (advanced, session 20+) | Barefoot SL pogo after session 20 |

All other drills remain without `barefootLevel` (shoes only).

**File**: `src/data/speedLabProgram.ts`

---

## 3. Add Barefoot Badge to Drill Cards

**Problem**: `SpeedDrillCard.tsx` doesn't show any indication of whether a drill is a barefoot drill, even though the data now supports it.

**Fix**: Add a small barefoot badge next to the drill name when the drill's `barefootLevel` qualifies for the current session. Pass `sessionNumber` and `readinessScore` to `SpeedDrillCard` from `SpeedSessionFlow`, and show a small "Barefoot" indicator with an explanation of why barefoot training matters.

**Files**: `src/components/speed-lab/SpeedDrillCard.tsx`, `src/components/speed-lab/SpeedSessionFlow.tsx`

---

## 4. Complete i18n for All 7 Non-English Locales

**Problem**: The new keys added to `en.json` (sprint reps, game-ready progress, barefoot tips, per-rep labels, PB labels) are missing from `de.json`, `es.json`, `fr.json`, `ja.json`, `ko.json`, `nl.json`, and `zh.json`. Additionally, German still shows "Fertig mit Sprinten" instead of "Sprinten beginnen" for the button.

**Keys to add to all 7 locales** (within existing `speedLab` sections):

- `sprintStep.reps` -- "{{count}} reps"
- `sprintStep.gameReadyProgress` -- "{{current}} of {{target}} game-ready sprints"
- `sprintStep.gameReadyBaseball` -- "Train to sprint 16 times in a game. Full MLB season ready."
- `sprintStep.gameReadySoftball` -- "Train to sprint 16 times in a game. Full AUSL season ready."
- `sprintStep.readinessAdjusted` -- "Your body is recovering today. We've adjusted your sprint count."
- `sprintStep.barefoot` -- "Barefoot OK"
- `sprintStep.barefootTip` -- "Barefoot training strengthens feet, ankles, and fascial connections..."
- `sprintStep.done` -- "Begin Sprinting" (update existing translations)
- `logResults.rep` -- "Rep {{number}}"
- `logResults.pbLabel` -- "PB: {{time}}s"
- `logResults.newPB` -- "New PB!"
- `barefoot.disclaimer` -- full legal disclaimer
- `barefoot.whyTitle` -- "Why Barefoot?"
- `barefoot.whyDescription` -- "Barefoot drills develop the fascia..."

**Files**: All 7 locale JSON files in `src/i18n/locales/`

---

## 5. Session History Best-Time Display for Multi-Rep Data

**Problem**: Beyond the `.toFixed()` build error, the session history currently only shows a single "best" time per distance. With multi-rep data, it would be valuable to show rep count alongside the best time.

**Fix**: In `SpeedSessionHistory.tsx`, show the best time plus a small rep count indicator when the data is an array with multiple values (e.g., "1.82s (3 reps)").

**File**: `src/components/speed-lab/SpeedSessionHistory.tsx`

---

## Summary of All Files

| File | Change |
|------|--------|
| `src/components/speed-lab/SpeedSessionHistory.tsx` | Fix build error: use `getBestTime()` for backward-compatible display; add rep count indicator |
| `src/data/speedLabProgram.ts` | Add `barefootLevel` to 5 drills |
| `src/components/speed-lab/SpeedDrillCard.tsx` | Add barefoot badge to qualifying drills |
| `src/components/speed-lab/SpeedSessionFlow.tsx` | Pass `sessionNumber` to drill cards for barefoot badge logic |
| `src/i18n/locales/de.json` | Add 14 missing speedLab keys, fix sprint button text |
| `src/i18n/locales/es.json` | Add 14 missing speedLab keys, fix sprint button text |
| `src/i18n/locales/fr.json` | Add 14 missing speedLab keys, fix sprint button text |
| `src/i18n/locales/ja.json` | Add 14 missing speedLab keys, fix sprint button text |
| `src/i18n/locales/ko.json` | Add 14 missing speedLab keys, fix sprint button text |
| `src/i18n/locales/nl.json` | Add 14 missing speedLab keys, fix sprint button text |
| `src/i18n/locales/zh.json` | Add 14 missing speedLab keys, fix sprint button text |

**Total**: 11 files modified, 0 database migrations

