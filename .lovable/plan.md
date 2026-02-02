

# Performance Test Bilateral Metrics for Switch Hitters & Both-Handed Throwers

## Overview

Update the Performance Tests to handle switch hitters and both-handed throwers by dynamically showing bilateral inputs for specific metrics based on handedness selection.

---

## Changes Required

### 1. Rename Exit Velocity to Tee Exit Velocity

**Current:** "Exit Velocity"
**New:** "Tee Exit Velocity"

The metric key `exit_velocity` will be renamed to `tee_exit_velocity` throughout the codebase to match the naming convention of `max_tee_distance`.

---

### 2. Switch Hitter Bilateral Metrics (Batting Side = "B")

When a user selects "Switch" for batting side in the **Hitting** module, the following metrics become bilateral:

| Single Metric | Becomes |
|---------------|---------|
| Tee Exit Velocity | Left Side: Tee Exit Velocity + Right Side: Tee Exit Velocity |
| Max Tee Distance | Left Side: Max Tee Distance + Right Side: Max Tee Distance |

**New metric keys:**
- `tee_exit_velocity_left` / `tee_exit_velocity_right`
- `max_tee_distance_left` / `max_tee_distance_right`

---

### 3. Both-Handed Thrower Bilateral Metrics (Throwing Hand = "B")

When a user selects "Both" for throwing hand:

**For Pitching module:**
| Single Metric | Becomes |
|---------------|---------|
| Long Toss Distance | Left Hand: Long Toss Distance + Right Hand: Long Toss Distance |
| Velocity | Left Hand: Velocity + Right Hand: Velocity |

**For Throwing module:**
| Single Metric | Becomes |
|---------------|---------|
| Long Toss Distance | Left Hand: Long Toss Distance + Right Hand: Long Toss Distance |

**New metric keys:**
- `long_toss_distance_left` / `long_toss_distance_right`
- `velocity_left` / `velocity_right`

---

## Technical Implementation

### File 1: `src/components/vault/VaultPerformanceTestCard.tsx`

**Changes:**

1. **Rename `exit_velocity` to `tee_exit_velocity`** in `TEST_TYPES_BY_SPORT` arrays (lines 40-88)

2. **Update `TEST_METRICS` config** (lines 116-137) to include new bilateral metric definitions:
   ```typescript
   tee_exit_velocity: { unit: 'mph', higher_better: true },
   tee_exit_velocity_left: { unit: 'mph', higher_better: true },
   tee_exit_velocity_right: { unit: 'mph', higher_better: true },
   max_tee_distance_left: { unit: 'ft', higher_better: true },
   max_tee_distance_right: { unit: 'ft', higher_better: true },
   long_toss_distance_left: { unit: 'ft', higher_better: true },
   long_toss_distance_right: { unit: 'ft', higher_better: true },
   velocity_left: { unit: 'mph', higher_better: true },
   velocity_right: { unit: 'mph', higher_better: true },
   ```

3. **Add new bilateral groups for handedness** (after line 144):
   ```typescript
   // Batting side bilateral groups (for switch hitters)
   const SWITCH_HITTER_BILATERAL_GROUPS: Record<string, [string, string]> = {
     tee_exit_velocity: ['tee_exit_velocity_left', 'tee_exit_velocity_right'],
     max_tee_distance: ['max_tee_distance_left', 'max_tee_distance_right'],
   };
   
   // Throwing hand bilateral groups (for both-handed throwers)
   const BOTH_HANDS_THROWING_GROUPS: Record<string, [string, string]> = {
     long_toss_distance: ['long_toss_distance_left', 'long_toss_distance_right'],
     velocity: ['velocity_left', 'velocity_right'],
   };
   ```

4. **Add dynamic metric computation** based on handedness state:
   ```typescript
   // Compute which metrics need bilateral UI based on handedness
   const switchHitterMetrics = battingSide === 'B' && selectedModule === 'hitting' 
     ? Object.keys(SWITCH_HITTER_BILATERAL_GROUPS) 
     : [];
   
   const bothHandsMetrics = throwingHand === 'B' && (selectedModule === 'pitching' || selectedModule === 'throwing')
     ? Object.keys(BOTH_HANDS_THROWING_GROUPS).filter(m => 
         selectedModule === 'pitching' || m === 'long_toss_distance'
       )
     : [];
   ```

5. **Render handedness bilateral groups** similar to existing jump bilateral groups (lines 377-415):
   - For switch hitters: Show "Left Side" / "Right Side" labels
   - For both-handed throwers: Show "Left Hand" / "Right Hand" labels
   - Filter these metrics from `regularMetrics` when bilateral mode is active

6. **Update history display** to show bilateral metrics with proper labels

---

### File 2: `src/i18n/locales/en.json` (and other locale files)

**Add new translation keys** in the `vault.performance.metrics` section:

```json
"tee_exit_velocity": "Tee Exit Velocity",
"tee_exit_velocity_left": "Tee Exit Velocity (L)",
"tee_exit_velocity_right": "Tee Exit Velocity (R)",
"max_tee_distance_left": "Max Tee Distance (L)",
"max_tee_distance_right": "Max Tee Distance (R)",
"long_toss_distance_left": "Long Toss Distance (L)",
"long_toss_distance_right": "Long Toss Distance (R)",
"velocity_left": "Velocity (L)",
"velocity_right": "Velocity (R)"
```

**Add new labels** for the bilateral UI sections:

```json
"leftSide": "Left Side",
"rightSide": "Right Side",
"leftHand": "Left Hand",
"rightHand": "Right Hand"
```

---

## UI Layout Examples

### Switch Hitter - Hitting Module

```text
┌─────────────────────────────────────────┐
│ Tee Exit Velocity (mph)                 │
│ ┌─────────────┬─────────────┐           │
│ │ Left Side   │ Right Side  │           │
│ │ [____]      │ [____]      │           │
│ └─────────────┴─────────────┘           │
├─────────────────────────────────────────┤
│ Max Tee Distance (ft)                   │
│ ┌─────────────┬─────────────┐           │
│ │ Left Side   │ Right Side  │           │
│ │ [____]      │ [____]      │           │
│ └─────────────┴─────────────┘           │
└─────────────────────────────────────────┘
```

### Both-Handed Thrower - Pitching Module

```text
┌─────────────────────────────────────────┐
│ Long Toss Distance (ft)                 │
│ ┌─────────────┬─────────────┐           │
│ │ Left Hand   │ Right Hand  │           │
│ │ [____]      │ [____]      │           │
│ └─────────────┴─────────────┘           │
├─────────────────────────────────────────┤
│ Velocity (mph)                          │
│ ┌─────────────┬─────────────┐           │
│ │ Left Hand   │ Right Hand  │           │
│ │ [____]      │ [____]      │           │
│ └─────────────┴─────────────┘           │
└─────────────────────────────────────────┘
```

---

## Data Flow

1. User selects handedness (throwing hand / batting side)
2. Component dynamically computes which metrics need bilateral input
3. Regular metrics filtered to exclude those with bilateral overrides
4. Bilateral metrics rendered in grouped format with Left/Right inputs
5. On save, all bilateral values stored with `_left` / `_right` suffixes
6. History display shows bilateral values with proper labels

---

## Files to Update

| File | Changes |
|------|---------|
| `src/components/vault/VaultPerformanceTestCard.tsx` | Rename metric, add bilateral groups, dynamic rendering logic |
| `src/i18n/locales/en.json` | Add new metric translation keys |
| `src/i18n/locales/es.json` | Add new metric translation keys |
| `src/i18n/locales/fr.json` | Add new metric translation keys |
| `src/i18n/locales/ja.json` | Add new metric translation keys |
| `src/i18n/locales/ko.json` | Add new metric translation keys |
| `src/i18n/locales/nl.json` | Add new metric translation keys |
| `src/i18n/locales/zh.json` | Add new metric translation keys |

---

## Expected Outcome

1. Exit velocity renamed to "Tee Exit Velocity" to match max tee distance naming
2. Switch hitters see bilateral inputs for tee exit velocity and max tee distance
3. Both-handed throwers see bilateral inputs for long toss distance (pitching & throwing) and velocity (pitching only)
4. All data properly stored and displayed in history with correct labels

