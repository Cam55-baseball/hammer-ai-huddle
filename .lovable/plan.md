

# Phase 1 UX Data Optimization — Practice Session Input Adjustments

## 1. Remove Tee from Live ABs Hitting Sources

**File:** `src/components/practice/RepSourceSelector.tsx` (line 170)

Remove `'tee'` and `'soft_toss'` from `VALID_HITTING_SOURCES.live_abs`. These are stationary/mechanical drills that don't belong in a live at-bat context.

```
live_abs: ['machine_bp', 'front_toss', 'flip', 'coach_pitch', 'live_bp', 'regular_bp'],
```

## 2. Restore Live BP & Regular BP in Lesson Hitting Sessions

**File:** `src/components/practice/RepSourceSelector.tsx` (line 169)

Add `'live_bp'` and `'regular_bp'` to `VALID_HITTING_SOURCES.lesson`:

```
lesson: ['tee', 'soft_toss', 'front_toss', 'flip', 'coach_pitch', 'machine_bp', 'live_bp', 'regular_bp'],
```

## 3. Add Additional Batted Ball Types to Fielding

**File:** `src/components/practice/RepScorer.tsx` (lines 182-188)

Add `slow_roller`, `one_hopper`, and `chopper` to `playTypeOptions`:

```typescript
const playTypeOptions = [
  { value: 'ground_ball', label: 'Ground Ball' },
  { value: 'fly_ball', label: 'Fly Ball' },
  { value: 'line_drive', label: 'Line Drive' },
  { value: 'bunt', label: 'Bunt' },
  { value: 'pop_up', label: 'Pop Up' },
  { value: 'slow_roller', label: 'Slow Roller' },
  { value: 'one_hopper', label: 'One Hopper' },
  { value: 'chopper', label: 'Chopper' },
];
```

Also update the hitting `Batted Ball Type` options in RepScorer (lines 904-908) and AdvancedRepFields (lines 204-210) to include `one_hopper` alongside the existing `slow_roller` and `chopper`.

## 4. Adjust Route Efficiency Scale

**File:** `src/components/practice/RepScorer.tsx` (lines 1294-1298)

Change from `routine / plus / elite` to `poor / average / elite`:

```typescript
options={[
  { value: 'poor', label: '❌ Poor' },
  { value: 'average', label: '🟡 Average' },
  { value: 'elite', label: '👑 Elite' },
]}
```

Update the `ScoredRep` type (line 84) accordingly:
```typescript
route_efficiency?: 'poor' | 'average' | 'elite';
```

## 5. Add Batted Ball Exit Velocity Classification to Fielding

The existing `hit_type_hardness` field (lines 1257-1268, labeled "Hit Type") already captures Soft/Average/Hard — this IS the batted ball exit velocity classification. The fix is to **rename the label** from "Hit Type" to "Exit Velocity" for clarity.

**File:** `src/components/practice/RepScorer.tsx` (line 1259)

Change label from `"Hit Type"` to `"Exit Velocity"`.

This field already exists on the `ScoredRep` interface as `hit_type_hardness` with values `'soft' | 'average' | 'hard'` — no new field needed, just a label rename for data clarity.

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `RepSourceSelector.tsx` | Remove tee from live_abs; add live_bp/regular_bp to lesson |
| `RepScorer.tsx` | Add 3 batted ball types to fielding; update route efficiency scale; rename "Hit Type" label; add one_hopper to hitting batted ball options |
| `AdvancedRepFields.tsx` | Add one_hopper to hitting batted ball options |
| `useMicroLayerInput.ts` | Update batted_ball_type type to include new values |
| `usePerformanceSession.ts` | Update batted_ball_type type to include new values |

No database changes needed — all fields store as strings in existing JSONB columns. No new fields created. All data flows through the existing PIE pipeline via `drill_blocks` and `micro_layer_data`.

