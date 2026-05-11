## Vision

Make the Identity card the **single most visually striking, instantly readable** element on the dashboard. Treat it like a premium athlete badge — think Apple Fitness ring + Nike training club + a championship trophy plate. Every value must be legible in under 200ms.

## Design Principles

1. **Dark canvas, bright signal** — Solid deep slate base (`#0B1120`-class) with a single tier-colored accent stripe and glow. Stop fighting with light gradients + black text.
2. **Typographic hierarchy you can read across the room** — Massive consistency score as the hero numeral, tier label as the eyebrow badge, supporting chips small but high-contrast.
3. **One color per tier, used with restraint** — Tier color shows up as: left accent bar, ring glow, score numeral, and tier pill. Everything else is neutral white/slate.
4. **Depth through layering** — Subtle inner highlight, soft outer glow matching tier, hairline border. No flat candy gradient.
5. **Black text rule retired** — Reason it failed: pastel backgrounds + black text reads like a sticky note, not a hero. Replacement keeps contrast WCAG AAA via dark surface + white text, tier color used only for accents.

## New Layout (same footprint, dramatic upgrade)

```text
┌──────────────────────────────────────────────────────┐
│ ▎ IDENTITY                              CONSISTENCY  │
│ ▎                                                    │
│ ▎  LOCKED IN              [tier pill]      87        │
│ ▎  ─────────────                            ──       │
│ ▎  [🔥 12d perf] [🛡 8d active] [● 1 NN/7d]          │
│ ▎                                                    │
│ ▎  [ Take rest day ]                                 │
└──────────────────────────────────────────────────────┘
```

- **Surface**: `bg-slate-950` with `bg-gradient-to-br from-slate-900 via-slate-950 to-black`. Tier color injected as a 4px left accent bar + a soft `shadow-[0_0_40px_-10px_<tier>]` outer glow + 1px inner ring at tier hue.
- **Tier label**: Display weight 900, tracking-tight, **white** with tier-colored underline accent, plus a small uppercase tier pill (e.g. `bg-emerald-500/15 text-emerald-300 border-emerald-500/40`) showing the same word in 10px caps for redundancy.
- **Score**: 56–64px, `font-black tabular-nums`, **tier-colored** (`text-emerald-300`, etc.) with a faint matching glow. Caption "CONSISTENCY" is `text-slate-400` 10px tracking-widest.
- **Eyebrow "IDENTITY"**: 10px, `text-slate-500`, tracking-[0.3em].
- **Chips**: `bg-white/5 text-slate-100 border border-white/10`. Icons in tier-neutral but meaningful colors (flame `text-orange-400`, shield `text-emerald-400`, NN dot `text-rose-400`). Hover: `bg-white/10`.
- **Rest button**: keep functionality; restyle to ghost-on-dark (`bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10`).

## Tier Color System (accents only)

| Tier | Accent | Score color | Glow |
|---|---|---|---|
| elite | fuchsia-400 | text-fuchsia-300 | fuchsia-500/30 |
| locked_in | emerald-400 | text-emerald-300 | emerald-500/30 |
| consistent | sky-400 | text-sky-300 | sky-500/30 |
| building | amber-400 | text-amber-300 | amber-500/30 |
| slipping | rose-400 | text-rose-300 | rose-500/30 |

## Pressure Toast & Daily Standard Check

Match the new dark aesthetic so the stack reads as one cohesive system:

- **Toast**: `bg-slate-900/90 border-l-4 border-l-<tone> border border-white/10 text-slate-100`. Icon in tone color. Action button: tier-accent solid (`bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold`). Dismiss `X`: `text-slate-400 hover:text-white`.
- **Daily Standard Check**: same dark surface, primary-bordered left bar, white text, "Confirm" button uses tier accent.

## Subtle Motion (delight, not noise)

- Score fades+counts up on mount (one-time, 600ms ease-out).
- Outer glow pulses very slowly (4s) at low opacity — only when tier is `elite` or `locked_in` to reward the top tiers.
- Tier pill has a faint shimmer sweep once on tier change.

## Files to Change (presentation only)

1. **`src/hooks/useIdentityState.ts`** — Replace `TIER_META`. New fields: `accent` (border/glow color class set), `scoreText` (text color), `pill` (pill bg+text+border). Drop the `bg` gradient + `chip` fields, replace with new tokens. Background becomes a fixed dark gradient handled in the component.
2. **`src/components/identity/IdentityBanner.tsx`** — Restructure to: left accent bar, eyebrow row, tier label + pill, hero score on the right, chips row, rest button. Apply new dark surface, glow, ring, count-up animation on score.
3. **`src/components/identity/BehavioralPressureToast.tsx`** — Swap all 7 tone classes from `bg-*-500/15 text-black` to `bg-slate-900/90 border-l-4 border-l-<tone>-400 border-white/10 text-slate-100`. Action button → tier-solid; dismiss → slate.
4. **`src/components/identity/DailyStandardCheck.tsx`** — Dark surface, white text, primary left bar, confirm button uses `bg-primary text-primary-foreground`.

## Out of Scope

- No engine, data, query, or DB changes.
- No new design tokens in `index.css` (using existing Tailwind palette consistently).
- Other dashboard widgets untouched.
- No layout/footprint change — same vertical space.

## Acceptance

- Identity card reads as the premium hero of the dashboard at a glance.
- Every text element passes WCAG AAA against its background (white/slate on near-black).
- Tier identity instantly recognizable via accent bar + score color + pill, without relying on candy backgrounds.
- Toast and Daily Standard Check visually belong to the same family.
- Works identically in light and dark mode (card is intentionally dark in both — it's a hero surface).
