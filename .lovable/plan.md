

# Add PitchMovementSelector to Practice Hub Rep Input

## Root Cause
`PitchMovementSelector` exists in `MicroLayerInput`, `GameAtBatLogger`, and `PitchEntry` — but Practice Hub uses **`src/components/practice/RepScorer.tsx`** for live rep input, which never imports it.

## Target File
`src/components/practice/RepScorer.tsx` — uses `module === 'hitting'` / `module === 'pitching'` (`isHitting` / `isPitching` flags already on lines 277-278).

## Changes

### 1. Imports (top of file, after line 9)
```tsx
import { PitchMovementSelector } from '@/components/micro-layer/PitchMovementSelector';
import { normalizeDirections, deriveMovementKey, type MovementKey } from '@/lib/pitchMovementProfile';
```

### 2. Extend `ScoredRep` interface
Add field (keep type identical to other usages):
```tsx
pitch_movement?: { directions: ('up' | 'down' | 'left' | 'right')[]; key: MovementKey };
```
Do NOT add `pitch_movement_profile` (per spec).

### 3. Render the selector — ALWAYS visible for hitting + pitching
Place a single block placed once outside any `mode === 'advanced'`, `isInPlay`, or other gating, just before the closing of the rep form (after the hitting/pitching field blocks but inside the main form). Condition: `(isHitting || isPitching)` only.

```tsx
{(isHitting || isPitching) && (
  <div>
    <PitchMovementSelector
      value={current.pitch_movement?.directions ?? []}
      onChange={(v) =>
        updateField('pitch_movement', {
          directions: normalizeDirections(v),
          key: deriveMovementKey(v),
        })
      }
    />
  </div>
)}
```

Best insertion point: right after the pitching `PitchLocationGrid` block (around line ~1248) but pulled out as a shared block placed after both hitting (`isHitting`) and pitching (`isPitching`) sections close — i.e. after line ~1250 (end of pitching `<>` fragment) and before the bunting/throwing/etc. blocks. This guarantees a single render path for both modules, no duplication.

### 4. Ensure rep persistence in `commitRep` (around line 401-425)
The spread `...current` already includes `pitch_movement`. Add a default so every committed rep includes it explicitly (`'straight'` when none picked):

```tsx
...((isHitting || isPitching) && {
  pitch_movement: current.pitch_movement ?? {
    directions: [],
    key: deriveMovementKey([]), // 'straight'
  },
}),
```

### 5. Reset behavior
The current reset preserves `execution_score`. No change needed — `pitch_movement` resets to `undefined` per rep, which is correct.

## What I Will NOT Touch
- `MicroLayerInput`, `PitchEntry`, `GameAtBatLogger` — already correct.
- Inline sort/join logic — `deriveMovementKey()` is the only path used.
- No `pitch_movement_profile` field reintroduced.

## Verification Plan (after implementation)
1. Open `/practice` → start hitting session → confirm Movement Direction selector renders in rep form (Quick mode, not gated by Advanced).
2. Switch module to pitching → confirm same.
3. Switch to fielding/bunting/throwing/baserunning → confirm selector does NOT render.
4. Log a rep with a direction selected → confirm `pitch_movement.directions` and `pitch_movement.key` saved.
5. Log a rep with no direction → confirm `pitch_movement.key === 'straight'` is persisted.

## Files

| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | Import selector + helpers, extend `ScoredRep`, render block gated by `(isHitting \|\| isPitching)` only, default `pitch_movement` on commit |

