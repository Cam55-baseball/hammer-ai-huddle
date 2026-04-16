

# Tighten Pitch Movement — Final Polish

## Summary
Three focused fixes: eliminate duplicate key logic, add strong `MovementKey` type, and use `deriveMovementKey` as single source of truth everywhere.

## Changes

### 1. Add `MovementKey` type — `pitchMovementProfile.ts`
```typescript
export type MovementKey =
  | 'straight' | 'up' | 'down' | 'left' | 'right'
  | 'down_left' | 'down_right' | 'left_up' | 'right_up';
```
Update `deriveMovementKey` return type to `MovementKey`. Update `PROFILE_MAP` to `Record<MovementKey, string>`.

### 2. Fix duplicate key logic — `MicroLayerInput.tsx`
Line 47 has inline `v.length ? [...v].sort().join('_') : 'straight'` — replace with:
```typescript
import { deriveMovementKey } from '@/lib/pitchMovementProfile';
// ...
onChange={v => updateField('pitch_movement', { directions: v, key: deriveMovementKey(v) })}
```

### 3. Update interfaces to use `MovementKey` — 3 files
Replace `key: string` with `key: MovementKey` in:
- `useMicroLayerInput.ts` — `MicroLayerData.pitch_movement`
- `PitchEntry.tsx` — `PitchData.pitch_movement`
- `GameAtBatLogger.tsx` — `AtBat.pitch_movement`

## Files

| File | Change |
|------|--------|
| `src/lib/pitchMovementProfile.ts` | Add `MovementKey` type, update return type |
| `src/components/micro-layer/MicroLayerInput.tsx` | Replace inline key logic with `deriveMovementKey` |
| `src/hooks/useMicroLayerInput.ts` | Use `MovementKey` in type |
| `src/components/game-scoring/PitchEntry.tsx` | Use `MovementKey` in type |
| `src/components/splits/GameAtBatLogger.tsx` | Use `MovementKey` in type |

