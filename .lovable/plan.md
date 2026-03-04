

# Add Emojis to Fielding Rep Answer Choices

## Change — `src/components/practice/RepScorer.tsx`

Update the three `SelectGrid` option arrays (lines 1014-1047):

**Route Efficiency** (line 1014-1017):
```tsx
{ value: 'routine', label: '✅ Routine' },
{ value: 'plus', label: '🔥 Plus' },
{ value: 'elite', label: '👑 Elite' },
```

**Play Probability** (line 1027-1030):
```tsx
{ value: 'routine', label: '✅ Routine' },
{ value: 'plus', label: '🔥 Plus' },
{ value: 'elite', label: '👑 Elite' },
```

**Receiving Quality** (line 1040-1043):
```tsx
{ value: 'poor', label: '❌ Poor' },
{ value: 'average', label: '✅ Average' },
{ value: 'elite', label: '👑 Elite' },
```

One file, label-only changes.

