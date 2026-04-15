

# Add Pitch Movement Direction Selector

## Summary
Create a new `PitchMovementSelector` component — 4 directional arrows (Up/Down/Left/Right), max 2 selectable, always visible (never gated behind advanced mode). Store as a clean `directions` array. Integrate into hitting practice sessions (MicroLayerInput), game at-bat logging (GameAtBatLogger), and pitch-by-pitch scoring (PitchEntry).

## Data Model

Add to `MicroLayerData` in `useMicroLayerInput.ts`:
```typescript
pitch_movement?: {
  directions: ('up' | 'down' | 'left' | 'right')[];  // max 2
};
```

Add same field to `AtBat` interface in `GameAtBatLogger.tsx` and `PitchData` in `PitchEntry.tsx`.

## New Component: `src/components/micro-layer/PitchMovementSelector.tsx`

- 4 arrow buttons in a cross layout (up top, left/right middle, down bottom)
- Multi-select toggle, max 2 — when 2 are selected, remaining lock visually
- Selected arrows: filled color + slight scale increase
- 0 selected = "straight" (stored as empty array)
- Order-independent: `['down','right']` treated same as `['right','down']`
- Label: "Movement Direction (Optional)" with subtitle "Select up to 2"
- Props: `value: ('up'|'down'|'left'|'right')[]`, `onChange: (dirs) => void`

## Integration Points

### 1. `MicroLayerInput.tsx` — Hitting sessions
- Add `PitchMovementSelector` **outside** the `isAdvanced` gate — always visible when `sessionType === 'hitting'`
- Wire to `updateField('pitch_movement', { directions: v })`

### 2. `GameAtBatLogger.tsx` — Game at-bats
- Add below `CountSelector`, always visible (not gated by `isAdvanced`)
- Store in `AtBat.pitchMovement`

### 3. `PitchEntry.tsx` — Pitch-by-pitch scoring
- Add below pitch location grid, always visible when `advancedMode` or not
- Store in `PitchData.pitch_movement`

### 4. `useMicroLayerInput.ts` — Type update
- Add `pitch_movement?: { directions: ('up' | 'down' | 'left' | 'right')[] }` to `MicroLayerData`

## Files

| File | Action |
|------|--------|
| `src/components/micro-layer/PitchMovementSelector.tsx` | Create — arrow cross UI component |
| `src/hooks/useMicroLayerInput.ts` | Add `pitch_movement` to `MicroLayerData` |
| `src/components/micro-layer/MicroLayerInput.tsx` | Add selector for hitting, outside advanced gate |
| `src/components/splits/GameAtBatLogger.tsx` | Add selector, always visible |
| `src/components/game-scoring/PitchEntry.tsx` | Add selector, add to `PitchData` |

## Not Changed
- Scoring interpretation layer (hitter vs pitcher view mapping) — deferred to a follow-up once data collection is stable
- Movement intensity — deferred as noted in request

