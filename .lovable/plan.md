# Fix Price Input in Bundle & Program Builder

## Problem
- The price field is prefilled with `'49'` (Bundle) and `'99'` (Program). This looks like "a number that won't erase" — it reappears any time the page reloads, and overlaps visually with the `$` prefix.
- The `$` symbol sits at `left-3` while the input only has `pl-7` padding, so on small viewports (402px) typed digits visually collide with the `$`.
- Native number-input spinner arrows further crowd the field on mobile.

## Fix

**`src/pages/owner/BundleBuilder.tsx`** and **`src/pages/owner/ProgramBuilder.tsx`**:

1. Start price state empty: `useState<string>('')` instead of `'49'` / `'99'`.
2. Increase input left padding from `pl-7` to `pl-8` so digits clear the `$`.
3. Switch from `type="number"` to `type="text"` with `inputMode="decimal"` and a digit/decimal regex filter on change. This kills the spinner overlap and the stuck-default-value feel, while still showing the numeric keypad on mobile.
4. Keep the same `priceValid` check (`>= 0.5`) and the `canSave` gate. Save button stays disabled until a valid price is entered — so the user is forced to set it before sharing.
5. Placeholder stays as `49.00` / `99.00` (greyed hint only — disappears on type).

No other files touched. No DB or schema changes.

## Result
- Field opens empty with a faint `49.00` / `99.00` placeholder.
- `$` no longer overlaps typed digits.
- No spinner arrows.
- Save remains gated on a valid price ≥ $0.50.
