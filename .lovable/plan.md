## Problem

The Identity banner above the Game Plan uses tier color tokens where the text color and background gradient are the *same hue family* at low opacity. For the ELITE tier this produces light fuchsia text (`text-fuchsia-400`) sitting on a light fuchsia gradient (`from-fuchsia-600/20 to-violet-600/10`), which is unreadable. Other tiers (sky on sky, amber on amber, rose on rose, emerald on emerald) have the same structural issue — ELITE is just the worst.

## Fix

Update the tier color metadata in `src/hooks/useIdentityState.ts` so the **text tone** uses a high-contrast bright shade while the **background gradient** uses a darker, neutral-leaning base. Keep the colored ring as the tier accent.

### New `TIER_META` values

| Tier | Text tone (was → now) | Background gradient (was → now) |
|---|---|---|
| elite | `text-fuchsia-400` → `text-fuchsia-200` | `from-fuchsia-600/20 to-violet-600/10` → `from-fuchsia-950/60 to-violet-950/40` |
| locked_in | `text-emerald-400` → `text-emerald-200` | `from-emerald-600/20 to-teal-600/10` → `from-emerald-950/60 to-teal-950/40` |
| consistent | `text-sky-400` → `text-sky-200` | `from-sky-600/20 to-blue-600/10` → `from-sky-950/60 to-blue-950/40` |
| building | `text-amber-400` → `text-amber-200` | `from-amber-600/20 to-orange-600/10` → `from-amber-950/60 to-orange-950/40` |
| slipping | `text-rose-400` → `text-rose-200` | `from-rose-600/20 to-red-600/10` → `from-rose-950/60 to-red-950/40` |

This keeps the tier color identity (ring + subtle hue tint) but pushes text/background apart on the lightness axis so the label and consistency score are clearly legible against any theme.

No other files need to change — `IdentityBanner.tsx` consumes `tone`, `ring`, and `bg` from this hook.

## Files changed

- `src/hooks/useIdentityState.ts` — update `TIER_META` color tokens only.
