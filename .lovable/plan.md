

# Fix Pitch Movement Data Bugs — 6 Critical Issues

## Summary
Fix the sorted-key mismatch bug, decouple raw movement from semantic meaning, track insertion order for replace-oldest UX, stop storing derived profiles (derive on read), add explicit `'straight'` state, and restore visual constraint signaling.

## Changes

### 1. Fix PROFILE_MAP key mismatch — `pitchMovementProfile.ts`

`.sort()` produces alphabetical order: `['up','right']` → `['right','up']` → `"right_up"`.

Current map has `'up_right'` which never matches. Fix all keys to sorted order:

```typescript
const PROFILE_MAP = {
  'down_right': 'arm_side_sink',     // d < r ✅
  'down_left': 'glove_side_run',     // d < l ✅
  'right_up': 'ride_arm_side',       // r < u ✅ (was 'up_right')
  'left_up': 'cut_ride',             // l < u ✅
  'down': 'vertical_drop',
  'up': 'rise',
  'left': 'glove_side',
  'right': 'arm_side',
};
```

### 2. Return `'straight'` for empty — `pitchMovementProfile.ts`

Change `if (dirs.length === 0) return undefined` → `return 'straight'`. Distinguishes "no movement" from "not captured".

### 3. Decouple raw key from semantic meaning — `pitchMovementProfile.ts`

Rename `deriveMovementProfile` → keep it but make it return the **raw normalized key** (e.g. `'down_right'`), not the semantic label. The semantic interpretation belongs in a future `interpretMovement(key, context)` layer that accounts for handedness.

New approach:
- `deriveMovementKey(dirs)` → returns `'down_right'` or `'straight'` (raw, context-free)
- Remove the PROFILE_MAP entirely from this function — it's premature
- Keep `PROFILE_MAP` as a separate export for display/analytics use only (not stored)

### 4. Stop storing `pitch_movement_profile` — all save points

Remove `pitch_movement_profile` from stored data in:
- `GameAtBatLogger.tsx` — remove from `handleAdd`
- `PitchEntry.tsx` — remove from `handleSubmit`
- `MicroLayerInput.tsx` — remove from `commitRep` if it's being set there

Keep `pitch_movement_profile` in TypeScript interfaces for now (backward compat with old data), but stop writing new values. Derive on read instead.

### 5. Track insertion order in PitchMovementSelector — `PitchMovementSelector.tsx`

Add internal `insertionOrder` ref to track which direction was added first vs second. Normalization happens only on the `onChange` output, not internally.

```typescript
const orderRef = useRef<Direction[]>([]);

const toggle = (dir) => {
  if (selected) {
    orderRef.current = orderRef.current.filter(d => d !== dir);
    next = value.filter(d => d !== dir);
  } else if (value.length < 2) {
    orderRef.current = [...orderRef.current, dir];
    next = [...value, dir];
  } else {
    // Replace oldest (index 0 in orderRef)
    const oldest = orderRef.current[0];
    orderRef.current = [orderRef.current[1], dir];
    next = value.filter(d => d !== oldest).concat(dir);
  }
  onChange(normalizeDirections(next));
};
```

### 6. Restore visual constraint signaling — `PitchMovementSelector.tsx`

When 2 arrows are selected, unselected arrows get `opacity-40` styling to signal the replace behavior. Not disabled — still clickable (replace-oldest), but visually dimmed.

## Files

| File | Changes |
|------|--------|
| `src/lib/pitchMovementProfile.ts` | Fix keys to sorted order, return `'straight'` for empty, export raw key function |
| `src/components/micro-layer/PitchMovementSelector.tsx` | Track insertion order via ref, add opacity signaling |
| `src/components/splits/GameAtBatLogger.tsx` | Remove `pitch_movement_profile` from save |
| `src/components/game-scoring/PitchEntry.tsx` | Remove `pitch_movement_profile` from save |
| `src/components/micro-layer/MicroLayerInput.tsx` | Remove `pitch_movement_profile` from save if present |

