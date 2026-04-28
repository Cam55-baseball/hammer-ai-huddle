## Goal
Make text in the Identity banner (above the Game Plan) easier to read by darkening / strengthening the text colors against its dark gradient background.

## Current issue
In `src/hooks/useIdentityState.ts`, each tier uses very light pastel-200 text on a dark `*-950` gradient — but several pieces inside `src/components/identity/IdentityBanner.tsx` still use low-contrast classes:

- "Identity" eyebrow and "Consistency" caption use `text-muted-foreground` (washed out).
- Streak chips use `bg-background/60` with default foreground (low contrast on the tinted gradient).
- Tier label + score use `tone` colors set to `*-200` (e.g. `text-amber-200`, `text-sky-200`) — readable but a bit thin at small weights.

## Changes

### 1. `src/hooks/useIdentityState.ts`
Bump tier `tone` from `*-200` → `*-100` for stronger contrast on the dark gradient:
- elite: `text-fuchsia-100`
- locked_in: `text-emerald-100`
- consistent: `text-sky-100`
- building: `text-amber-100`
- slipping: `text-rose-100`

### 2. `src/components/identity/IdentityBanner.tsx`
- Change "Identity" eyebrow from `text-muted-foreground` → `text-foreground/80`.
- Change "Consistency" caption from `text-muted-foreground` → `text-foreground/80`.
- Streak chips: replace `bg-background/60` with `bg-background/80 text-foreground` so the "5d perf" / "3d active" labels are crisp.
- Keep the rose "NN miss" chip but bump text to `text-rose-300` for readability.

No structural / behavior changes — purely contrast tweaks.

## Files touched
- `src/hooks/useIdentityState.ts`
- `src/components/identity/IdentityBanner.tsx`
