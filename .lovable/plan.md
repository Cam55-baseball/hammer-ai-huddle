

# Update Contact Quality Options for Hitting Sessions

## Summary
Replace the current 6-option contact quality set (`miss`, `foul`, `jammed`, `end_cap`, `hard`, `barrel`) with the new standardized 6-option set across all hitting-specific locations. Game scoring (`PitchEntry.tsx`) uses a separate `hard/medium/soft` scale and is **not** touched.

## New options (in order)
| Value | Label | Tier | Grade Score |
|-------|-------|------|-------------|
| `barrel` | 🔥 Barrel | elite | 70 |
| `solid` | 💪 Solid | good | 60 |
| `flare_burner` | ✨ Flare/Burner | good | 55 |
| `misshit_clip` | 🔸 Miss-hit/Clip | neutral | 45 |
| `weak` | ⚠️ Weak | poor | 30 |
| `whiff` | ❌ Whiff | poor | 15 |

## Files to change

### 1. `src/components/practice/RepScorer.tsx` (lines 202-209)
Replace `contactOptions` array with the new 6 options and updated colors. Update grid from `grid-cols-5` → `grid-cols-3` (line 963) for better layout with 6 items.

### 2. `src/components/micro-layer/ContactQualitySelector.tsx` (lines 3-10)
Replace options array with matching new values/labels.

### 3. `src/hooks/useMicroLayerInput.ts` (line 6)
Update the `contact_quality` type union to: `'barrel' | 'solid' | 'flare_burner' | 'misshit_clip' | 'weak' | 'whiff'`

### 4. `src/pages/PracticeHub.tsx` (line 209)
Update `qualityMap` scoring to include new values:
```
{ barrel: 70, solid: 60, flare_burner: 55, misshit_clip: 45, weak: 30, whiff: 15 }
```

### 5. `supabase/functions/hie-analyze/index.ts` (line 88)
Add `'whiff'` to whiff detection: `r.contact_quality === 'miss' || r.contact_quality === 'whiff'`

### Not changed (correct scope)
- `PitchEntry.tsx` — game scoring uses separate `hard/medium/soft` scale
- `outcomeTags.ts` — separate batted ball outcome system, not contact quality
- No DB migration needed — stored as JSONB strings
- Historical data untouched — old values (`miss`, `foul`, `jammed`, `end_cap`, `hard`) will still display but won't match new options going forward

