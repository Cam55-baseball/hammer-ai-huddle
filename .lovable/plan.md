## Goal

Flip the Identity box (and its toast + Daily Standard Check children) to **pastel tier-tinted backgrounds with very dark text**. Keep the multi-color tier identity (rose / amber / sky / emerald / fuchsia) but use the lightest pastel as the surface and the darkest shade (`-900`) for all text. Zero light text anywhere.

## Files to change (presentation only)

### 1. `src/hooks/useIdentityState.ts` — `TIER_META`
Switch every tier from dark gradient + light text to pastel gradient + dark text:

| Tier | bg (gradient) | tone (text) | ring | chip |
|---|---|---|---|---|
| elite | `from-fuchsia-100 to-violet-100` | `text-fuchsia-900` | `ring-fuchsia-400` | `bg-fuchsia-200 text-fuchsia-900 border-fuchsia-400` |
| locked_in | `from-emerald-100 to-teal-100` | `text-emerald-900` | `ring-emerald-400` | `bg-emerald-200 text-emerald-900 border-emerald-400` |
| consistent | `from-sky-100 to-blue-100` | `text-sky-900` | `ring-sky-400` | `bg-sky-200 text-sky-900 border-sky-400` |
| building | `from-amber-100 to-orange-100` | `text-amber-900` | `ring-amber-400` | `bg-amber-200 text-amber-900 border-amber-400` |
| slipping | `from-rose-100 to-red-100` | `text-rose-900` | `ring-rose-400` | `bg-rose-200 text-rose-900 border-rose-400` |

### 2. `src/components/identity/IdentityBanner.tsx`
- "Identity" eyebrow + "Consistency" caption: `text-white/80` → `text-foreground/70` (resolves to dark on the pastel surface).
- Streak chips ("Xd perf", "Xd active"): `bg-black/40 text-white` → tier-aware dark text on a slightly stronger pastel pill: `bg-white/70 text-foreground border border-foreground/10`. Icon colors stay vivid (`text-orange-600`, `text-emerald-700`).
- NN miss chip: `bg-rose-500/40 text-rose-50` → `bg-rose-200 text-rose-900 border-rose-400`.
- Tier label and consistency score keep `tone` from TIER_META, which is now `text-*-900` (dark).

### 3. `src/components/identity/DailyStandardCheck.tsx`
Already token-driven (`bg-card text-foreground` + `text-primary`). Verify it stays dark on light. No change unless the dashboard renders it on a tinted surface — confirm during QA. If `text-primary` is too light in current theme, swap the tier accent to `text-foreground` and rely on the bold border for color identity.

### 4. `src/components/identity/BehavioralPressureToast.tsx`
Replace every `text-*-50` / `text-*-100` / `text-*-200` with `text-*-900`, and bump backgrounds to the matching `*-100` pastel:

- nn_miss: `border-rose-400 bg-rose-100 text-rose-900`
- streak_risk / consistency_drop: `border-amber-400 bg-amber-100 text-amber-900`
- rest_overuse: `border-orange-400 bg-orange-100 text-orange-900`
- consistency_recover: `border-emerald-400 bg-emerald-100 text-emerald-900`
- coaching_insight: `border-sky-400 bg-sky-100 text-sky-900`
- identity_tier_change (up): emerald-100/900; (down): rose-100/900

Action button (`Zap` button): `bg-foreground text-background` → keep (dark button on pastel reads great).
Dismiss `X` button: `text-current/70 hover:text-current` → `text-foreground/60 hover:text-foreground`.

Drop the `dark:text-*-50` overrides from the previous pass — we are no longer using light text under any theme.

## Out of scope
- No logic, no data, no engine, no tokens added.
- No other dashboard cards touched.

## Acceptance
- All text inside the Identity card, streak chips, NN miss chip, behavioral toast, and Daily Standard Check uses a `-900` (or `text-foreground`) color on a pastel tier-tinted surface.
- Tier identity is still obvious at a glance via background + border + chip color.
- No `text-white`, `text-*-50`, `text-*-100`, `text-*-200` remain in any of the four files above.
