

# Fix Pitch Movement Selector — Final 5 Issues

## Summary
Fix orderRef desync bug, stop normalizing in UI layer, always store movement (including "straight"), store normalized key alongside directions, and properly deprecate old function name.

## Changes

### 1. Sync orderRef with value — `PitchMovementSelector.tsx`
Add `useEffect` to sync `orderRef.current = value` whenever `value` changes externally (load, reset). Remove `normalizeDirections` call from `onChange` — emit raw order, normalize only at storage.

### 2. Stop normalizing inside UI toggle — `PitchMovementSelector.tsx`
Change `onChange(normalizeDirections(next))` → `onChange(next)`. The UI layer preserves insertion order. Normalization moves to save points.

### 3. Always store movement with key — all save points
Replace conditional `if (pitchMovement.length > 0)` with always-store pattern:

```typescript
import { normalizeDirections, deriveMovementKey } from '@/lib/pitchMovementProfile';

const normalized = normalizeDirections(pitchMovement);
ab.pitch_movement = {
  directions: normalized,
  key: deriveMovementKey(pitchMovement),
};
```

Update `pitch_movement` type across all interfaces to:
```typescript
pitch_movement?: {
  directions: ('up' | 'down' | 'left' | 'right')[];
  key: string; // 'straight' | 'down_right' | etc.
}
```

### 4. Clean up `pitchMovementProfile.ts`
- Mark `deriveMovementProfile` with `@deprecated` JSDoc
- Keep `deriveMovementKey` as the canonical function

### 5. Update type in `useMicroLayerInput.ts`
Add `key: string` to `pitch_movement` type definition.

## Files

| File | Changes |
|------|--------|
| `src/components/micro-layer/PitchMovementSelector.tsx` | Add useEffect sync, remove normalize from onChange |
| `src/lib/pitchMovementProfile.ts` | Add @deprecated to old function |
| `src/hooks/useMicroLayerInput.ts` | Update pitch_movement type to include key |
| `src/components/splits/GameAtBatLogger.tsx` | Always store with normalized dirs + key |
| `src/components/game-scoring/PitchEntry.tsx` | Always store with normalized dirs + key |
| `src/components/micro-layer/MicroLayerInput.tsx` | No change needed (already delegates to useMicroLayerInput which stores raw) |

