

# Add Master Label to Compact InlineTimer

## Change

**File: `src/components/royal-timing/InlineTimer.tsx`** (line 30-33)

Add a short label before the timer value in compact mode. Use the existing `label` prop but abbreviate it — show a tiny `"M"` or the first letter to save space, styled as a small muted text.

Insert before the timer span:
```tsx
<span className="text-[9px] font-medium text-muted-foreground shrink-0">{label}</span>
```

This adds the "Master" (or whatever label is passed) text back into the compact row without breaking the single-line layout.

| File | Change |
|------|--------|
| `src/components/royal-timing/InlineTimer.tsx` | Add label text before timer value in compact mode |

