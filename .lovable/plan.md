

# Phase 1 Integrity Lockdown -- Integration Wiring Plan

## Status Update

One item from the original list is already resolved:
- **Coach Grade Immutability Trigger**: CONFIRMED ATTACHED. Three triggers exist on `coach_grade_overrides` (`prevent_override_update`, `prevent_override_delete`, `prevent_coach_override_modification`). No action needed.

The remaining 6 gaps are confirmed and addressed below.

---

## Task 1: Wire Confidence Weight into Nightly MPI

**File:** `supabase/functions/nightly-mpi-process/index.ts`

**Current state:** Lines 216-221 apply flat `competitiveBoost` per verified stat profile, ignoring `confidence_weight` column.

**Change:** When iterating verified profiles (line 217), read `confidence_weight` (defaults to 100) and scale the boost:

```text
// Line 219 currently:
if (boost) verifiedBoostTotal += boost.competitiveBoost;

// Change to:
if (boost) {
  const weight = (vp.confidence_weight ?? 100) / 100;
  verifiedBoostTotal += boost.competitiveBoost * weight;
}
```

Also update the verified profiles query (line 144) to include `confidence_weight`:
```text
.select('*')  // already selects all columns, so confidence_weight is included
```

**Complexity:** Low (3 lines changed in edge function)

---

## Task 2: Wire Consistency Dampening + Injury Hold into Nightly MPI

**File:** `supabase/functions/nightly-mpi-process/index.ts`

**Current state:** `consistencyIndex.ts` exists with full logic but the nightly process never calls it. Injury hold status is stored in `athlete_daily_log` but never checked.

**Changes (inside the athlete loop, after line 260, before finalScore calculation):**

1. Query `athlete_daily_log` for each athlete (last 30 days)
2. Calculate consistency inline (the edge function runs in Deno, cannot import from `src/`):
   - Count missed days in last 7 and 14 days
   - Check if any recent entry has `injury_mode = true`
3. Apply dampening multiplier to `adjusted` score before finalScore
4. If injury hold is active: skip MPI upsert entirely (freeze -- no growth or decline)

```text
// After integrity score calculation, before finalScore:
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
const { data: dailyLogs } = await supabase.from('athlete_daily_log')
  .select('entry_date, day_status, injury_mode')
  .eq('user_id', uid)
  .gte('entry_date', thirtyDaysAgo);

let dampingMultiplier = 1.0;
let injuryHoldActive = false;
if (dailyLogs && dailyLogs.length > 0) {
  // Check injury hold
  injuryHoldActive = dailyLogs.some(l => l.injury_mode === true &&
    l.entry_date >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);

  // Count missed in last 7 and 14 days
  const now = Date.now();
  let missed7 = 0, missed14 = 0;
  for (const log of dailyLogs) {
    const logDate = new Date(log.entry_date).getTime();
    const daysAgo = (now - logDate) / 86400000;
    if (log.day_status === 'missed') {
      if (daysAgo <= 7) missed7++;
      if (daysAgo <= 14) missed14++;
    }
  }
  if (missed14 >= 4) dampingMultiplier = 0.85;
  else if (missed7 >= 2) dampingMultiplier = 0.95;

  // Calculate consistency score
  const injuryDays = dailyLogs.filter(l => l.injury_mode).length;
  const loggedDays = dailyLogs.filter(l => l.day_status !== 'missed').length;
  const consistencyScore = loggedDays / Math.max(1, 30 - injuryDays) * 100;
  if (consistencyScore >= 80) dampingMultiplier = 1.0; // recovery lift
}

if (injuryHoldActive) continue; // Freeze MPI -- skip this athlete

const finalScore = adjusted * (integrityScore / 100) * dampingMultiplier;
```

This replaces the existing `const finalScore = adjusted * (integrityScore / 100);` at line 261.

**Complexity:** Medium (20 lines added to edge function, replaces 1 line)

---

## Task 3: Build Advanced Logging UI

**Files:**
- New: `src/components/practice/AdvancedRepFields.tsx`
- Modified: `src/components/practice/RepScorer.tsx`
- Modified: `src/pages/PracticeHub.tsx`

**Current state:** RepScorer captures only pitch_location, contact_quality, exit_direction (hitting) or pitch_type, location, result (pitching). DrillBlock interface has 20+ micro fields defined but no UI exposes them.

**Changes:**

### A. New `AdvancedRepFields.tsx` component
Collapsible panel that renders additional fields based on module:

**Hitting fields:**
- `in_zone` toggle (boolean -- "Was this pitch in the zone?")
- `batted_ball_type` selector (Ground / Line / Fly / Barrel)
- `spin_direction` selector (Topspin / Backspin / Sidespin)
- `swing_intent` selector (Mechanical / Game Intent / Situational / HR Derby)
- `execution_score` slider (1-10)

**Machine BP specific (shown when drill_type === 'machine_bp'):**
- `machine_velocity_band` selector (40-50 / 50-60 / 60-70 / 70-80 / 80+)
- `bp_distance_ft` number input

**Pitching fields:**
- `velocity_band` selector
- `spin_efficiency_pct` slider (0-100)
- `pitch_command_grade` slider (20-80)
- `in_zone` toggle

**Fielding fields:**
- `throw_included` toggle
- `footwork_grade` slider (20-80)
- `exchange_time_band` selector (Fast / Average / Slow)
- `throw_accuracy` slider (20-80)
- `throw_spin_quality` selector (Carry / Tail / Cut / Neutral)

### B. Modify RepScorer.tsx
- Add `[Advanced]` toggle button below the main rep input
- When toggled, render `AdvancedRepFields` inline
- Merge advanced field values into `ScoredRep` before commit
- Expand `ScoredRep` interface with all micro fields

### C. Smart Defaults (Last-Session Memory)
- On session save, store last-used values per drill_type in localStorage
- On new session, pre-fill from stored values
- Key format: `lastSession_${module}_${drillType}`

### D. Machine BP distance input
- When drill type is `machine_bp`, show velocity band + distance input at top of RepScorer

**Complexity:** High (new component + modifications to RepScorer + localStorage integration)

---

## Task 4: Heat Map Completion

**File:** `supabase/functions/nightly-mpi-process/index.ts` (lines 381-472)

**Current state:**
- Lines 392-394: Hardcoded 3x3 grids `[[0,0,0],[0,0,0],[0,0,0]]`
- Lines 407-408: Clamps coordinates to `Math.min(2, Math.max(0, ...))` -- destroys 5x5 data
- Only 3 map types computed: `pitch_location`, `swing_chase`, `barrel_zone`
- No practice vs game separation

**Changes:**

### A. Dynamic grid size
- Detect max coordinate from data to determine grid size (3 or 5)
- Initialize grids dynamically: `Array.from({length: gridSize}, () => Array(gridSize).fill(0))`
- Remove `Math.min(2, ...)` clamp -- use `Math.min(gridSize-1, ...)`
- Store `grid_size` alongside grid_data for downstream consumers

### B. Practice vs Game separation
- Add `session_type` to the session query (already selected)
- Run aggregation twice: once filtered to practice types, once to game types
- Store with `context_filter: 'practice'` and `context_filter: 'game'` (existing column)
- Keep `context_filter: 'all'` as combined

### C. Add 5 missing map types
After the existing 3 maps, add computation for:

1. **`throw_accuracy`**: From fielding reps with `throw_accuracy` grade, bin by location
2. **`error_location`**: From fielding reps with result 'error', bin by play position zone
3. **`command_heat`**: From pitching reps, zones where pitch landed vs intended
4. **`miss_tendency`**: From pitching reps, zones where misses cluster
5. **`whiff_zone`**: From hitting reps where `contact_quality === 'miss'`, bin by pitch location

### D. Blind zone influence on roadmap
- After computing blind zones, query `roadmap_milestones` for zone-awareness requirements
- If blind zones detected in critical areas, adjust roadmap recommendation weighting
- Store blind zone data in `heat_map_snapshots.blind_zones` (already exists)

**Complexity:** High (rewrite heat map section of nightly process, ~80 lines)

---

## Task 5: Rest Engine Completion

**Files:**
- New: `src/components/calendar/RestDayScheduler.tsx`
- Modified: `supabase/functions/nightly-mpi-process/index.ts`
- Modified: `src/hooks/useDailyLog.ts`
- New: `src/components/dashboard/DualStreakDisplay.tsx`

### A. Auto-write CNS load to daily log
**File:** `src/hooks/usePerformanceSession.ts`

After saving a session successfully (line 109), also upsert into `athlete_daily_log`:
```text
await supabase.from('athlete_daily_log').upsert({
  user_id: user.id,
  entry_date: data.session_date,
  day_status: data.session_type === 'game' ? 'game_only' : 'full_training',
  game_logged: ['game', 'live_scrimmage'].includes(data.session_type),
  cns_load_actual: calculateSessionCNS(data.drill_blocks),
}, { onConflict: 'user_id,entry_date' });
```

### B. Overload detection
**File:** `src/hooks/useDailyLog.ts`

Add query to check:
- Sessions logged today (if 5+, flag `volume_spike`)
- Last 14 daily logs -- if all `full_training` or `game_only` with no recovery, flag `overload_risk`

Surface flags as toast warnings when user saves a session.

### C. Push Schedule Logic
**File:** New `src/components/calendar/RestDayScheduler.tsx`

Dialog shown when user marks a day as rest that had planned activities:
- Detect planned activities for that day (from calendar events)
- Detect mandatory events (coach-scheduled, games) -- these cannot move
- Present options:
  - "Move to next open day" -- find nearest day without conflicts
  - "Push everything forward 1 day" -- shift non-mandatory items
  - "Drop this session" -- remove from schedule
- On confirm, update calendar events and recalculate CNS for affected days

### D. Retroactive MPI recalculation trigger
When a user logs/edits an entry for a past date (within 7 days), call `calculate-session` edge function to reprocess affected data. Add a check in `useDailyLog.upsert`:

```text
if (entry.entry_date < today) {
  // Trigger recalculation for retroactive entry
  await supabase.functions.invoke('calculate-session', {
    body: { retroactive: true, date: entry.entry_date }
  });
}
```

### E. Dual Streak Display
**File:** New `src/components/dashboard/DualStreakDisplay.tsx`

Small card component showing:
- Performance Streak (flame icon + count)
- Discipline Streak (check icon + count)

Query `athlete_daily_log` and use `computeStreaks()` from `consistencyIndex.ts`. Display on dashboard and PracticeHub.

**Complexity:** High (new components + session save integration + schedule logic)

---

## Task 6: Redeploy Edge Function

After all changes to `nightly-mpi-process/index.ts`, redeploy the edge function.

---

## Execution Order

| Step | Task | Dependencies | Est. Lines Changed |
|------|------|-------------|-------------------|
| 1 | Confidence weight wiring | None | ~5 |
| 2 | Consistency dampening + injury hold | None | ~25 |
| 3 | Heat map grid fix + new types | None | ~80 |
| 4 | CNS auto-write to daily log | None | ~15 |
| 5 | Advanced logging UI | None | ~200 (new file) |
| 6 | Overload detection | Task 4 | ~30 |
| 7 | Push schedule logic | None | ~150 (new file) |
| 8 | Dual streak display | None | ~60 (new file) |
| 9 | Retroactive recalc trigger | Task 2 | ~10 |
| 10 | Deploy edge function | Tasks 1-3 | Deploy only |

Steps 1-4 can be done in parallel (all independent).
Steps 5-8 can be done in parallel.
Step 9 depends on step 2.
Step 10 is final.

