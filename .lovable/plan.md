## Problem

The big consistency score in the identity card sits in a `bg-background/85` pill (near-white in light tints) but is colored with `tone` (e.g. `text-amber-100` for BUILDING, `text-rose-100` for SLIPPING). Light-100 text on a near-white pill is unreadable — same root cause as the tier label fix.

Two render sites in `src/components/identity/IdentityCommandCard.tsx`:
- Mobile score pill: lines ~298-308
- Desktop score pill: lines ~314-324

Both use:
```tsx
<div className={cn('rounded-lg bg-background/85 ring-1 ring-border px-2.5 py-1 text-3xl font-black tabular-nums leading-none', tone)}>
  {score}
</div>
```

## Fix

Replace the `bg-background/85 ring-border` + `tone` combo with the existing per-tier `chip` class (already added in the previous fix). The chip provides a saturated tier-tinted background, matching border, and high-contrast foreground that stays readable in both light and dark surroundings.

### Edit `src/components/identity/IdentityCommandCard.tsx`

For both score pills (mobile + desktop), swap:

```tsx
'rounded-lg bg-background/85 ring-1 ring-border px-2.5 py-1',
'text-3xl font-black tabular-nums leading-none',
tone,
```

to:

```tsx
'rounded-lg border px-2.5 py-1',
'text-3xl font-black tabular-nums leading-none',
chip,
```

`chip` is already destructured from `useIdentityState()` (added in the prior fix), so no hook changes are needed.

## Out of scope

- No changes to engine, scoring math, or label copy.
- The header tier label on the dark gradient remains unchanged (already readable).
