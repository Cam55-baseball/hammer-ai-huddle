## Problem

In `IdentityCommandCard.tsx`, the "Today's Standard" body renders the tier label inline:

```
You're being held to the <span className={cn('font-black', tone)}>{label}</span> standard today.
```

`tone` comes from `useIdentityState` and is designed for the card's dark, tier-tinted gradient header (e.g. `text-amber-100`, `text-rose-100`, `text-fuchsia-100`). Inside the standard prompt the background is `bg-primary/5` (a very light red wash), so light tones like `text-amber-100` (BUILDING) are washed out and unreadable. Same issue would hit `LOCKED IN` (emerald-100), `CONSISTENT` (sky-100), `SLIPPING` (rose-100), `ELITE` (fuchsia-100) on any light/red background.

The big tier label in the header is fine because it sits on the tier's dark gradient — we should not change that.

## Fix

Add a second per-tier style — a **high-contrast chip** — to `useIdentityState` and use it any time the tier label is rendered on a non-tier (light, primary, or neutral) background.

### 1. `src/hooks/useIdentityState.ts`

Extend `TIER_META` with a `chip` field that pairs a saturated background, dark-mode-safe foreground, and matching border so the label stays readable on any surface (light red, white, card, etc.):

```text
elite      → bg-fuchsia-500/25  text-fuchsia-100  border-fuchsia-400/60
locked_in  → bg-emerald-500/25  text-emerald-100  border-emerald-400/60
consistent → bg-sky-500/25      text-sky-100      border-sky-400/60
building   → bg-amber-500/30    text-amber-50     border-amber-400/70
slipping   → bg-rose-500/30     text-rose-50      border-rose-400/70
```

Export it as `chip` from the hook (alongside `tone`, `ring`, `bg`, `label`).

### 2. `src/components/identity/IdentityCommandCard.tsx`

- Destructure `chip` from `useIdentityState`.
- Replace the inline `<span className={cn('font-black', tone)}>{label}</span>` (line 385) with a chip pill:

```tsx
<span className={cn(
  'inline-flex items-center px-1.5 py-0.5 rounded-md border text-[11px] font-black uppercase tracking-wider align-middle',
  chip,
)}>{label}</span>
```

- Audit other inline usages of `tone` in the file — header label (line 286) and the big consistency score (lines 302, 318) sit on the dark gradient/`bg-background/85` and stay unchanged.

### 3. Other call sites

`grep` for `useIdentityState` to confirm no other component renders `tone` over a light surface. If any do, swap to `chip` the same way.

## Out of scope

- No changes to engine logic, tier thresholds, or copy.
- No changes to `BehavioralPressureToast` (its tones already pair text + matching dark bg).
