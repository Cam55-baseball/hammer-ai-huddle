# Identity Card — Calm Runtime Refinement

Pure presentation pass on `src/components/identity/IdentityCommandCard.tsx` and the tier tokens in `src/hooks/useIdentityState.ts`. No data, hook, ASB event, or runtime-logic changes. Trust/lineage signals stay intact; only their visual weight changes.

## Diagnosis (what is causing the muddy/dark look today)

1. **Stacked dark overlay on every theme.** The card renders `bg-card` then layers an absolute `bg-gradient-to-br from-slate-900 via-slate-950 to-black` at `opacity-60` over it (line 253). That overlay is applied in **every** tier and ignores light mode, producing the tinted/muddy surface.
2. **Neon glow shadows + colored ring** (`shadow-[0_0_60px_-12px_...]`, `ring-fuchsia-500/40`, etc.) push it toward gamer/crypto aesthetic.
3. **Chip palette `bg-white/5 text-slate-100 border-white/10`** is invisible on a calm surface and only "works" because of the dark overlay.
4. **Low-contrast text:** `text-foreground/70`, `/80`, `/85` used for headers, helper copy, score label.
5. **Inconsistent chip surfaces:** `bg-background/30`, `/40`, `/60`, `/90` mixed across header, streak chips, day-budget chip.
6. **Pressure-event tones** (`bg-rose-500/10 text-rose-200`) are saturated dashboard chips; on a clean surface they read as heavy.
7. **Score badge** uses tier `chip` token so the consistency number competes with the tier label instead of being the calm anchor.

## Target aesthetic

Elite sports-medicine / Apple-clarity: one solid surface, one thin tier accent, neutral chips, color used only as small dots/text, generous spacing, single vertical scan.

## Changes

### A. `src/hooks/useIdentityState.ts` — calmer tier tokens
- Remove `DARK_SURFACE` gradient. Set `bg: ''` for every tier (no overlay).
- Remove `glow` neon shadow strings; set `glow: ''`.
- Soften `ring` to `ring-border` for all tiers (neutral) — tier color moves to a single 3px left accent bar + the score color.
- Replace `chip` with a single neutral token: `bg-muted/60 text-foreground border-border` (works in light + dark).
- Keep `accent` (used for the left bar) and `scoreText` (the only saturated color on the card) per tier.
- `pill` keeps tier color but with reduced saturation: `bg-{tier}-500/10 text-{tier}-600 dark:text-{tier}-300 border-{tier}-500/25`.

### B. `IdentityCommandCard.tsx` — surface, hierarchy, chips

**Container (lines 246-256)**
- Drop `border-2` → `border`, drop `shadow-lg` → `shadow-sm`.
- Remove the absolute `bg-gradient-to-br ... opacity-60` overlay entirely.
- Replace the top color accent bar with a **left** 3px tier accent: `<div class="absolute inset-y-0 left-0 w-[3px] {accent}" />`. Single tier signal, no surface tint.
- Surface stays `bg-card text-card-foreground`.

**Header / hierarchy (lines 257-339)**
- Eyebrow ("Identity"): `text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold` (drop `font-black`, drop `/70`).
- Tier label: keep large, use `tone: text-foreground` (not white-only) so it inherits theme; tier color is signaled by left bar + score color, not by label.
- "✓ Confirmed" pill: neutralize to `bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25`.
- Score block: drop the tier-colored `chip` background. Use a clean stacked layout: large `tabular-nums text-foreground` number colored by `scoreText` (only one saturated element), with `text-[10px] text-muted-foreground` "Consistency" label below. No box around it.
- Hover state: `hover:bg-muted/40` instead of `hover:bg-background/30`.
- Chevron: `text-muted-foreground` (drop `/80`).
- Alert dot ring color: `ring-card` (was `ring-background`).

**Streak chips (lines 342-356)**
- Single chip recipe used everywhere: `inline-flex items-center gap-1.5 h-6 rounded-full border border-border bg-muted/50 px-2.5 text-[11px] font-medium text-foreground`.
- Icons keep tier-neutral semantic color (`text-orange-500`, `text-emerald-500`, `text-rose-500`) at `h-3 w-3`; numbers `tabular-nums`; label `text-muted-foreground`.
- `nnMiss > 0` chip: same recipe but `bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300`.

**Today's Standard section (lines 365-401)**
- Confirmed state: same chip recipe, `border-emerald-500/25 bg-emerald-500/5`, `text-emerald-700 dark:text-emerald-300`, slightly more padding (`px-3 py-3`).
- Unconfirmed state: `border-border bg-muted/40` (drop primary tint), copy uses `text-foreground` (drop `/85`), inline tier pill uses new neutral chip token.

**Day Intent (lines 403-449)**
- DayButton outline state: keep shadcn outline. Active variants stay tinted but at reduced intensity (use `/90` instead of solid).
- Explanation copy: `text-sm text-muted-foreground` (was `text-xs text-foreground/85`).
- Rest-budget chip: same shared chip recipe; over-budget variant uses the rose chip recipe above.

**Active Alerts (lines 451-514)**
- Replace per-type heavy tones with a single calm recipe + tier-color accent: `rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground` plus a `w-[3px]` left bar colored from `toneFor` (only the bar is colored; surface stays neutral).
- Icon color carries the type semantic (rose / amber / sky / emerald / fuchsia at 500 weight).
- Action button: shadcn `variant="secondary" size="sm"` (drop the custom `bg-white/15` which depended on the dark overlay).
- Dismiss button: `text-muted-foreground hover:bg-muted` (drop `hover:bg-white/10`).
- "All clear" row: shared chip recipe with emerald accent.

**Section headers (528-556)**
- `text-[10px] tracking-[0.18em] font-semibold text-muted-foreground` (drop `font-black`); info button `text-muted-foreground` (drop `/60`).

### C. Spacing & rhythm
- Collapsed header padding: `px-4 py-3.5 sm:px-5`.
- Expanded panel padding: `px-4 sm:px-5 pb-5 pt-2 space-y-5`.
- Divider: `border-t border-border` (drop `/40` so it's visible but quiet).
- Streak-chip row: `mt-3 gap-2` for better thumb spacing.

### D. Trust / lineage preservation
- All confidence, lineage, replay, engine_version surfaces inside the card remain in their current positions and behavior. Only chip backgrounds, borders and text weights change; no element is removed or relocated.
- TrustFooter component itself is not touched (it isn't rendered inside this card; the in-card trust signals are the `tier` label, `score`, `streak chips`, `Day Intent`, `Active Alerts`, and "Confirmed" state).

## Before / After rationale

| Concern | Before | After |
|---|---|---|
| Surface | `bg-card` + slate-900→black gradient @ 60% opacity | Solid `bg-card`, no overlay |
| Tier signal | Colored ring + neon glow + gradient + colored top bar | Single 3px left accent bar + colored score number |
| Chip palette | `bg-white/5 border-white/10` (depends on dark overlay) | `bg-muted/50 border-border` (theme-safe) |
| Text contrast | `text-foreground/70`–`/85` everywhere | `text-foreground` + `text-muted-foreground`, no opacity |
| Alerts | Saturated colored cards per type | Neutral surface + colored left bar + colored icon |
| Score | Tier-colored box competing with label | Single colored number, no box |
| Shadows | `shadow-lg` + neon `shadow-[0_0_60px...]` | `shadow-sm` |
| Borders | `border-2` + colored ring | `border` neutral |

## Mobile-first notes (375–414 px)
- Eyebrow row + tier label + day chip wrap cleanly because chip heights normalize to `h-6` (no more 2-line wraps).
- Score moves to its own row on mobile (already the case); now larger type + no box = clearer scan.
- DayButton grid keeps 3 columns at `h-10`; tap target ≥40 px.
- Alert row stacks `flex-col` below `sm`; action button is `w-full sm:w-auto` so it's thumb-friendly.
- All chips/buttons clear 32–40 px min height.

## Accessibility
- Body text rises to full `text-foreground` (passes AA against `bg-card` in both themes).
- Muted text uses semantic `text-muted-foreground` (already AA in the design system).
- Tier color is reinforced by position (left bar) + score color + tier pill; never color-only.
- Icon-only dismiss buttons retain `aria-label="Dismiss"`.
- Info popovers, `aria-expanded` on the toggle, alert `role="status"` all preserved.

## Out of scope
- No changes to `useIdentityState` query, snapshot shape, or behavioral-event hooks.
- No changes to ASB event emission, day-state mutations, or quick-action execution.
- No changes to `IdentityBanner.tsx` (unused on `/dashboard`; left alone).
- No new components, no new dependencies.

## Verification
- Visit `/dashboard` on mobile (375px) and desktop: card surface is clean `bg-card`, single thin tier bar on left, score uses tier-color text only, all chips read as one calm row, all alerts share a single neutral recipe.
- Toggle each tier (elite / locked_in / consistent / building / slipping) via devtools to confirm only the left bar + score color change; surface and chips stay identical.
- Light and dark theme: text contrast remains crisp because we dropped `/70`–`/85` opacities and the dark overlay.
- Pressure events (`nn_miss`, `streak_risk`, etc.): each row keeps its semantic color through the left bar + icon, not the background.
