

# Multi-Feature Implementation Plan

This plan covers 8 distinct areas of work. Due to the scope, I recommend implementing in 2-3 batches.

---

## Batch 1: Game Plan Skip/Push System + Calendar Sync

### 1A. Game Plan Day-Level Skip & Push Controls

**Current state**: GamePlanCard already has per-task skip/restore via `handleSkipTask`/`handleRestoreTask` and the `game_plan_skipped_tasks` table. But there are no day-level "Skip Day" or "Push Day" actions.

**Changes to `src/components/GamePlanCard.tsx`**:
- Add two buttons in the header area (near the sort/lock controls): **Skip Day** and **Push Day**
- **Skip Day**: Bulk-skip all non-completed tasks for today by inserting rows into `game_plan_skipped_tasks` for each task, plus write a `calendar_events` entry marking the day as rest/skipped
- **Push Day** opens a dialog with 3 options:
  1. **Push Forward One Day** — for each task's underlying schedule, shift all from today onward by +1 day (update `calendar_events` dates, write schedule overrides)
  2. **Push to Specific Date** — date picker, shift all subsequent sessions accordingly
  3. **Replace This Day** — show a day picker to select a source day, duplicate that day's tasks onto today

**New component: `src/components/game-plan/GamePlanPushDayDialog.tsx`**:
- Dialog with 3 tab-like options
- Push Forward: calls shared reschedule utility
- Push to Date: calendar date picker + shift logic
- Replace Day: day selector + duplication logic

### 1B. Shared Reschedule Engine

**New utility: `src/hooks/useRescheduleEngine.ts`**:
- `skipDay(date)` — bulk skip all tasks + calendar events for a date
- `pushForwardOneDay(fromDate)` — shift all non-mandatory events from `fromDate` onward by +1 day in both `calendar_events` and `game_plan_skipped_tasks`
- `pushToDate(fromDate, targetDate)` — shift events to target date, cascade subsequent
- `replaceDay(targetDate, sourceDate)` — copy source day's configuration to target
- All operations invalidate both `['calendar']` and `['gameplan']` query keys
- Operates on both `calendar_events` table AND game plan skip/schedule tables

### 1C. Calendar Integration

**Changes to `src/components/calendar/RestDayScheduler.tsx`**:
- Import and use the shared reschedule engine instead of inline logic
- Ensures identical behavior whether triggered from Calendar or Game Plan

**Changes to `src/hooks/useCalendar.ts`**:
- Already fetches skips — verify it correctly applies overrides from the reschedule engine

---

## Batch 2: Sport-Specific Practice Enhancements

### 2A. Softball "Slap" Swing Decision + Batted Ball Type

**Changes to `src/components/practice/RepScorer.tsx`**:
- In the hitting swing decision section (~line 876): add `{ value: 'slap', label: '👋 Slap' }` option, conditionally shown when `sport === 'softball'`
- In the hitting batted ball type section (~line 972): remove `{ value: 'barrel', label: 'Barrel' }`, replace with `{ value: 'slap', label: 'Slap' }` for softball
- In the fielding infield batted ball type section (~line 1436): add `{ value: 'slap', label: 'Slap' }` for softball

**Changes to `src/components/practice/AdvancedRepFields.tsx`**:
- In batted ball type options (~line 204): remove 'barrel', add 'slap' when softball

### 2B. "Slap Hit" Option for Softball Pitching Against Hitters

**Changes to `src/components/practice/RepScorer.tsx`**:
- In the pitching hitter outcome section (~line 1267): add a "Slap Hit?" Yes/No toggle for softball, stored as `slap_hit` field

### 2C. Softball Pitching: Separate In Zone & Hit Spot

**Current state**: The pitching section uses `in_zone` for both "In Zone?" and "Hit Spot?" — they map to the same boolean field (~lines 1358-1389).

**Fix in `src/components/practice/RepScorer.tsx`**:
- Add a new field `hit_spot` (boolean) to `ScoredRep` interface
- Show "In Zone?" as one toggle and "Hit Spot?" as a separate toggle for softball pitching
- For baseball, keep current combined behavior

### 2D. Softball Pitching Mound Distance Default

**Changes to `src/components/practice/SessionConfigPanel.tsx`**:
- When `sport === 'softball' && isPitching`, default `pitchDistance` to 43 (instead of 60)
- The league distance data already has 43ft for softball (`softballLeagueDistances`), but the initial state defaults to 60

### 2E. Softball Baserunning: Steal 3rd + Steal Home

**Changes to `src/components/practice/BaserunningRepFields.tsx`**:
- Add `{ value: 'steal_3rd', label: 'Steal 3rd' }` and `{ value: 'steal_home', label: 'Steal Home' }` to `softballDrills` array

### 2F. Remove "Barreled" from Hitting Batted Ball Type

**Changes to `src/components/practice/RepScorer.tsx`**:
- Remove `{ value: 'barrel', label: 'Barrel' }` from the hitting batted ball type options (~line 979)
- Note: "Best A-Swing" already exists as a swing decision; barrel as batted ball type is redundant

---

## Batch 3: Bunt Practice Category

### 3A. Bunt Practice Module

**New component: `src/components/practice/BuntRepFields.tsx`**:
A dedicated rep scoring form for bunt sessions with these fields:
- **Execution Score** (1-10 slider, existing pattern)
- **Pitch Type** (from sport config `pitchTypes`)
- **Pitch Location** (existing `PitchLocationGrid`)
- **ABS Guess** (existing `PitchLocationGrid`)
- **Contact Quality**: Hard, Soft, Perfect (SelectGrid)
- **Bunt Direction**: 3B Line, Toward 3B, SS, Pitcher, Catcher, 2B, Toward 1B, 1B Line, Foul 1B Side, Foul 3B Side, Foul Behind Catcher (SelectGrid)
- **Ball State**: Down in the Brown, Pop Up (SelectGrid)
- **Defense Result**: Got Down, Caught in the Air (SelectGrid)
- **Hit or Out**: Hit, Out (SelectGrid)
- **Bunt Type**: Base Hit, Sacrifice, Squeeze (SelectGrid)
- **Runner Location**: 1B (→ best result toward 1B), 2B (→ best toward 3B), 3B (→ best toward pitcher) (SelectGrid with context hints)
- **Spin Type**: Top Spin, Back Spin, Tail Spin, Cut Spin (SelectGrid)
- **Intent** + **Outcome** (SelectGrid pairs)

**Integration into `src/components/practice/RepScorer.tsx`**:
- Add `isBunt = module === 'bunting'` check
- When `isBunt`, render `<BuntRepFields>` instead of hitting/pitching/fielding fields
- Add `bunting` as a valid module in the session type selector

**Changes to session type options** (wherever session types are listed):
- Add `{ value: 'bunting', label: 'Bunt Practice' }` for both baseball and softball

---

## Batch 4: "Start Here" Button + Practice Hub Data

### 4A. Replace Tutorial with "Start Here"

**Changes to `src/components/TutorialButton.tsx`**:
- Rename to "Start Here" button
- On click, navigate to a guided onboarding flow (new component or dialog)

**New component: `src/components/StartHereGuide.tsx`**:
- Step-by-step walkthrough dialog showing:
  1. Set your sport (baseball/softball)
  2. Complete your profile
  3. Log your first practice session
  4. Check your Game Plan daily
  5. Track your progress in Analytics
- Each step links to the relevant page/action

### 4B. Recent Sessions: Show Scoring + Elite Inferences

**Changes to `src/components/practice/RecentSessionsList.tsx`**:
- In the expanded view, replace raw composite index keys with human-readable labels
- Add elite benchmark comparison: for each index, show whether it's above/below elite threshold
- Highlight session score prominently (effective_grade with grade label)
- Add "Key Takeaways" section that extracts insights from drill blocks (e.g., "Barrel rate: 40% — Above Average")

**Changes to `src/hooks/useRecentSessions.ts`**:
- Fetch additional fields needed for elite inference display (if not already fetched)

### 4C. Practice Hub → Analytics Engine Data Feed

This is largely already in place — `performance_sessions` data feeds into `useMPIScores` and the analytics engine. The fix is ensuring the Recent Sessions UI surfaces the right computed data rather than raw indexes.

---

## Summary of Files to Edit

| File | Changes |
|------|---------|
| `src/components/GamePlanCard.tsx` | Add Skip Day / Push Day buttons and handlers |
| `src/components/game-plan/GamePlanPushDayDialog.tsx` | **NEW** — Push Day dialog with 3 options |
| `src/hooks/useRescheduleEngine.ts` | **NEW** — Shared reschedule utility |
| `src/components/calendar/RestDayScheduler.tsx` | Use shared reschedule engine |
| `src/components/practice/RepScorer.tsx` | Softball slap, remove barrel, separate in_zone/hit_spot, bunt module |
| `src/components/practice/AdvancedRepFields.tsx` | Remove barrel for softball, add slap |
| `src/components/practice/BaserunningRepFields.tsx` | Add steal 3rd + steal home for softball |
| `src/components/practice/SessionConfigPanel.tsx` | Default 43ft for softball pitching |
| `src/components/practice/BuntRepFields.tsx` | **NEW** — Full bunt practice rep form |
| `src/components/practice/RecentSessionsList.tsx` | Show scoring, benchmarks, elite inferences |
| `src/components/TutorialButton.tsx` | Rename to "Start Here" |
| `src/components/StartHereGuide.tsx` | **NEW** — Guided onboarding flow |

