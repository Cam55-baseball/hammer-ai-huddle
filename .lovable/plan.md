# Fix ABS Guess + Pitch Location Logic for Hitting

## Problem

The ABS Guess grid is showing for ALL rep sources including Tee, which makes no sense — there's no pitch to guess on a tee. The correct flow:

- **Tee**: Show only the TeeDepthGrid and pitch location ( no ABS guess)
- **All other hitting rep sources**: Show " Pitch Location" grid first, then show "ABS Guess" grid after the real location is logged

Currently, a single `PitchLocationGrid` labeled "ABS Guess" appears unconditionally at line 882, which is wrong.

## Fix — File: `src/components/practice/RepScorer.tsx`

### Replace lines 882–893 (the unconditional ABS Guess block)

Replace with conditional logic:

```typescript
{/* For non-tee hitting sources: Real Pitch Location → then ABS Guess */}
{!isTee && (
  <div className="space-y-3">
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">Pitch Location</Label>
      <PitchLocationGrid
        value={current.pitch_location}
        onSelect={v => updateField('pitch_location', v)}
        batterSide={effectiveBatterSide}
        sport={sport as 'baseball' | 'softball'}
      />
    </div>
    {current.pitch_location && (
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">ABS Guess (Optional)</Label>
        <PitchLocationGrid
          value={current.abs_guess}
          onSelect={v => updateField('abs_guess', v)}
          batterSide={effectiveBatterSide}
          sport={sport as 'baseball' | 'softball'}
        />
      </div>
    )}
  </div>
)}
```

Key changes:

1. Wrapped in `{!isTee && ...}` — tee reps only get TeeDepthGrid
2. First grid is "Pitch Location" (the real location) — always shown for non-tee
3. Second grid is "ABS Guess (Optional)" — only appears after pitch location is selected
4. ABS Guess writes to `abs_guess` field (not `pitch_location`) to keep them separate

One file, one block replaced.