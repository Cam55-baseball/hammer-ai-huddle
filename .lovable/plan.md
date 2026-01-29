

# Fix Plan: Bilateral Metrics Expansion & Peripheral Vision Drill Bug

## Overview

This plan addresses two distinct issues:
1. **Vault Performance Tests**: Extend bilateral (left/right leg) entries to 'SL Lateral Broad Jump' and 'SL Vertical Jump'
2. **Peripheral Vision Drill**: Fix the bug where dots stop appearing if the user misses the first target or restarts

---

## Issue 1: Bilateral Metrics Expansion

### Current State
- `sl_broad_jump` is already split into `sl_broad_jump_left` and `sl_broad_jump_right`
- `sl_lateral_broad_jump` and `sl_vert_jump` remain as single metrics

### Solution

**File: `src/components/vault/VaultPerformanceTestCard.tsx`**

1. Update `TEST_TYPES_BY_SPORT` to replace single metrics with bilateral variants:
   - `sl_lateral_broad_jump` → `sl_lateral_broad_jump_left`, `sl_lateral_broad_jump_right`
   - `sl_vert_jump` → `sl_vert_jump_left`, `sl_vert_jump_right`

2. Update `TEST_METRICS` configuration to include new bilateral entries

3. Expand the bilateral metrics detection logic to group all three jump types

4. Add grouped UI rendering for all three bilateral metric pairs

**Translation files** (8 files): Add new metric translations for the bilateral variants

---

## Issue 2: Peripheral Vision Drill Bug

### Root Cause Analysis

The bug is in the `useEffect` that schedules targets (lines 56-63):

```text
useEffect(() => {
  if (isComplete || attempts >= totalAttempts || isPaused) return;

  const delay = Math.random() * (intervalMax - intervalMin) + intervalMin;
  const timer = setTimeout(showTarget, delay);

  return () => clearTimeout(timer);
}, [attempts, showTarget, isComplete, ...]);  // ← Problem: depends on `attempts`
```

**The Problem:**
- The effect depends on `attempts` to trigger re-runs
- When a target appears but the user **misses it** (doesn't click), `attempts` never increments
- Since `attempts` stays the same, the effect doesn't re-run, and no new target is scheduled
- Same issue on restart: if `attempts` resets to 0 but was already 0, no change detected

### Solution

Add a `roundCounter` state that increments every time a target disappears (whether hit or missed). This ensures the effect always re-runs after each target cycle:

```text
const [roundCounter, setRoundCounter] = useState(0);

// In showTarget callback - after target auto-hides:
setTimeout(() => {
  setShowingTarget(false);
  setActiveDirection(null);
  setRoundCounter(prev => prev + 1);  // Always increment to trigger next target
}, targetDuration);

// Update the useEffect dependency:
useEffect(() => {
  if (isComplete || attempts >= totalAttempts || isPaused) return;
  // ...schedule next target
}, [roundCounter, showTarget, isComplete, ...]);  // Now depends on roundCounter
```

Also fix click handler to not double-increment by removing the roundCounter increment there (since auto-hide already handles it, or use a different approach).

---

## Files to Modify

### Vault Performance Tests
1. **`src/components/vault/VaultPerformanceTestCard.tsx`**
   - Update `TEST_TYPES_BY_SPORT` with bilateral variants
   - Update `TEST_METRICS` with new entries
   - Expand bilateral metrics grouping logic
   - Add UI rendering for new grouped metrics

2. **Translation files** (8 files):
   - `src/i18n/locales/en.json`
   - `src/i18n/locales/es.json`
   - `src/i18n/locales/fr.json`
   - `src/i18n/locales/de.json`
   - `src/i18n/locales/ja.json`
   - `src/i18n/locales/zh.json`
   - `src/i18n/locales/ko.json`
   - `src/i18n/locales/nl.json`

### Peripheral Vision Fix
3. **`src/components/tex-vision/drills/PeripheralVisionDrill.tsx`**
   - Add `roundCounter` state
   - Update `showTarget` to increment counter when target auto-hides
   - Update `useEffect` dependency to use `roundCounter` instead of `attempts`
   - Ensure click handler properly manages state without double-incrementing

---

## Technical Details

### Vault Metric Updates

```text
// TEST_TYPES_BY_SPORT updates (example for baseball.hitting):
hitting: [
  'ten_yard_dash',
  'exit_velocity',
  'max_tee_distance',
  'sl_broad_jump_left',
  'sl_broad_jump_right',
  'sl_lateral_broad_jump_left',   // NEW
  'sl_lateral_broad_jump_right',  // NEW
  'mb_situp_throw',
  'seated_chest_pass'
],

// TEST_METRICS additions:
sl_lateral_broad_jump_left: { unit: 'in', higher_better: true },
sl_lateral_broad_jump_right: { unit: 'in', higher_better: true },
sl_vert_jump_left: { unit: 'in', higher_better: true },
sl_vert_jump_right: { unit: 'in', higher_better: true },
```

### Bilateral Metrics Detection

```text
// Define all bilateral metric groups
const BILATERAL_METRIC_GROUPS = {
  sl_broad_jump: ['sl_broad_jump_left', 'sl_broad_jump_right'],
  sl_lateral_broad_jump: ['sl_lateral_broad_jump_left', 'sl_lateral_broad_jump_right'],
  sl_vert_jump: ['sl_vert_jump_left', 'sl_vert_jump_right'],
};

// Filter metrics for grouped vs regular rendering
const allBilateralMetrics = Object.values(BILATERAL_METRIC_GROUPS).flat();
const regularMetrics = metrics.filter(m => !allBilateralMetrics.includes(m));
```

### Peripheral Vision Fix Detail

```text
// Add new state
const [roundCounter, setRoundCounter] = useState(0);

// Update showTarget callback
const showTarget = useCallback(() => {
  if (isComplete || attempts >= totalAttempts) return;

  const directions: Direction[] = ['left', 'right', 'up', 'down'];
  const direction = directions[Math.floor(Math.random() * directions.length)];
  
  setActiveDirection(direction);
  setShowingTarget(true);
  setTargetStartTime(Date.now());

  // Auto-hide after duration AND trigger next round
  setTimeout(() => {
    setShowingTarget(false);
    setActiveDirection(null);
    setRoundCounter(prev => prev + 1);  // CRITICAL: Always increment
  }, targetDuration);
}, [isComplete, attempts, totalAttempts, targetDuration]);

// Update effect to depend on roundCounter
useEffect(() => {
  if (isComplete || attempts >= totalAttempts || isPaused) return;

  const delay = Math.random() * (intervalMax - intervalMin) + intervalMin;
  const timer = setTimeout(showTarget, delay);

  return () => clearTimeout(timer);
}, [roundCounter, showTarget, isComplete, totalAttempts, intervalMin, intervalMax, isPaused]);
// Note: Changed from [attempts, ...] to [roundCounter, ...]
```

---

## Expected Outcome

After implementation:

1. **Vault Performance Tests**: Athletes will see separate Left/Right input fields for:
   - SL Broad Jump (already done)
   - SL Lateral Broad Jump (new)
   - SL Vertical Jump (new)

2. **Peripheral Vision Drill**: 
   - Targets will continue appearing even if previous target was missed
   - Restart will properly reset and begin spawning targets again
   - Full drill flow works E2E without getting stuck

