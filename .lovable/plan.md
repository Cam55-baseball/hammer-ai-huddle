
# Darken the Violet/Purple Color Scheme

## What's Changing

Every violet reference in `PhysioAdultTrackingSection.tsx` is currently anchored to `violet-500`. Stepping up to `violet-700` (two full steps darker on Tailwind's 100–900 scale) makes the gradient, borders, icon pill, info banners, and inactive buttons all visibly richer and deeper without changing any logic.

## Color Mapping

| Element | Current | New |
|---|---|---|
| Card border | `border-violet-500/25` | `border-violet-700/40` |
| Card gradient | `from-violet-500/8` | `from-violet-700/20` |
| Icon pill background | `bg-violet-500/15` | `bg-violet-700/30` |
| Icon color | `text-violet-400` | `text-violet-300` |
| Info banner background | `bg-violet-500/10` | `bg-violet-700/25` |
| Info banner border | `border-violet-500/20` | `border-violet-700/35` |
| Info banner icon | `text-violet-300` | `text-violet-200` |
| Info banner text | `text-violet-200` | `text-violet-100` |
| TapSelector inactive bg | `bg-violet-500/5` | `bg-violet-700/15` |
| TapSelector inactive border | `border-violet-500/20` | `border-violet-700/40` |
| TapSelector inactive hover | `hover:border-violet-500/50` | `hover:border-violet-700/70` |
| StarSelector inactive bg | `bg-violet-500/5` | `bg-violet-700/15` |
| StarSelector inactive border | `border-violet-500/30` | `border-violet-700/45` |
| StarSelector inactive hover | `hover:border-violet-400` | `hover:border-violet-300` |
| Cycle day input border | `border-violet-500/30` | `border-violet-700/45` |
| Cycle day input bg | `bg-violet-500/5` | `bg-violet-700/15` |
| Cycle day input focus | `focus:border-violet-400` | `focus:border-violet-300` |
| Period Active inactive bg | `bg-violet-500/5` | `bg-violet-700/15` |
| Period Active inactive border | `border-violet-500/20` | `border-violet-700/40` |
| Wellness buttons inactive bg | `bg-violet-500/5` | `bg-violet-700/15` |
| Wellness buttons inactive border | `border-violet-500/20` | `border-violet-700/40` |

## File Changed

**`src/components/physio/PhysioAdultTrackingSection.tsx`** — color token substitutions only, zero logic changes.

## Technical Notes

- Only one file is touched — purely cosmetic
- Active states (primary, rose, emerald, amber) are unchanged
- Opacity values are slightly increased alongside the darker base color to ensure the darker hue reads clearly on both light and dark backgrounds
