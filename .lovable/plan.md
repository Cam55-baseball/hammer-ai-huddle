

# Show Zone Labels Inside Pitch Location Grid Squares

## Problem
Zone labels (e.g., "Up-In", "Mid-Away") only appear on hover via tooltips. The user wants them visible inside each square, and they must flip correctly with hitter side — which the existing `mirrorCol` logic already handles.

## Fix — `src/components/micro-layer/PitchLocationGrid.tsx`

Update the button element (line 57-68) to render the label text inside each square:

```tsx
<button
  type="button"
  onClick={() => onSelect({ row, col })}
  className={cn(
    'h-12 w-12 rounded-sm border transition-all text-[7px] leading-tight font-medium flex items-center justify-center text-center',
    // ... existing color classes unchanged
  )}
>
  {label}
</button>
```

Key changes:
- Add `{label}` as button children (currently self-closing `/>`)
- Increase cell size from `h-9 w-9` to `h-12 w-12` to fit text
- Add `flex items-center justify-center text-center` and `text-[7px] leading-tight` for readability
- Keep tooltips as-is for accessibility

One file changed. Labels already mirror correctly via the existing `mirrorCol` + `getLabel` logic — no logic changes needed.

