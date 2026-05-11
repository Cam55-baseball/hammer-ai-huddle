## Goal

Make the Identity box on the dashboard (and the toast + Daily Standard Check that sit under it) readable in both light and dark mode. Today the tier text uses very light shades (`text-rose-100`, `text-amber-100`, etc.) and the children sit on light tinted backgrounds (`bg-primary/5`, `bg-white/15`), so light-on-light is unreadable.

## Files to change (presentation only)

1. `src/hooks/useIdentityState.ts` — `TIER_META`
   - Strengthen the gradient backgrounds so they stay dark in both themes (drop `/60` and `/40` opacity, use solid dark stops like `from-rose-900 to-red-950`, etc.) OR pair each tier with darker text tokens for light mode using `dark:` variants.
   - Provide a second `toneOnLight` (e.g. `text-rose-900`) and update consumers, OR just commit to a dark gradient card and keep `text-*-50` for max contrast (WCAG AA against the dark gradient).
   - Tighten ring/border to `ring-2` for clearer separation from page bg.

2. `src/components/identity/IdentityBanner.tsx`
   - Bump tier label and consistency score to `text-*-50` (already adjusted via TIER_META).
   - Change the chip pills (`bg-background/80 text-foreground`) to `bg-black/40 text-white` so streak chips read on the dark gradient.
   - Increase the "Identity" eyebrow and "Consistency" caption from `text-foreground/80` to `text-white/90`.

3. `src/components/identity/DailyStandardCheck.tsx`
   - Replace `bg-primary/5` + tier `tone` text with a high-contrast surface: `bg-card border-2 border-primary text-foreground`, and render the tier label in `text-primary font-black` (token-driven, not the light tier shade).
   - Ensure the Confirm button uses `variant="default"` with `text-primary-foreground` (already correct) and the dismiss ghost button gets `text-muted-foreground hover:text-foreground`.

4. `src/components/identity/BehavioralPressureToast.tsx`
   - The current tones (e.g. `bg-rose-500/10 text-rose-200`) wash out in light mode. Switch to dual-tone classes: `bg-rose-500/15 text-rose-900 dark:text-rose-100`, repeated per event type.
   - Action button: replace `bg-white/15 text-current` with `bg-foreground text-background` so it always pops.
   - Dismiss `X` button: `text-current` → `text-foreground/70 hover:text-foreground`.

## Out of scope

- No logic, data, engine, or DB changes.
- No new tokens added to `index.css` / `tailwind.config.ts` unless a tier color genuinely has no Tailwind equivalent (none expected here).
- Other dashboard widgets are untouched.

## Acceptance

- In both light and dark mode, the tier label, consistency score, streak chips, "Operating at … standard?" row, and any pressure toast all meet a clearly readable contrast against their own background.
- No layout shift; only color/opacity/weight changes.
