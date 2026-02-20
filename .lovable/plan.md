
# Vibrant Styling for Adult Wellness Tracking Card

## What's Wrong

The Adult Wellness Tracking card currently uses a plain `Card` component with:
- `border border-border/50` — barely visible border
- `text-muted-foreground` for the title — washed out
- `bg-muted/20` for info banners — near-invisible
- Inactive buttons use `bg-background border-border text-muted-foreground` — no contrast

Surrounding vault sections (Daily Check-In, 6-Week Tracking, 12-Week Tracking) all use the bold pattern:
- `rounded-xl border-2 border-[color]/20 bg-gradient-to-br from-[color]/5 to-background`
- Coloured icon in a pill/chip header
- Coloured sub-labels and borders

## Solution

Restyle `PhysioAdultTrackingSection.tsx` to match the vault's design language. A **violet/purple** gradient is chosen because it is distinct from the emerald (daily check-in), amber (12-week), and primary (6-week) colours already used by adjacent sections.

### Card Container
```
rounded-xl border-2 border-violet-500/25 bg-gradient-to-br from-violet-500/8 to-background
```
(No longer using the generic `<Card>` wrapper — replaced with a styled `div` like neighbouring sections)

### Section Header
- Violet icon pill: `bg-violet-500/15` background with a `Heart` or `Shield` icon in `text-violet-400`
- Title: `font-bold text-lg` (not muted)
- Subtitle: `text-sm text-muted-foreground`

### TapSelector — inactive chips
```
bg-violet-500/5 border-violet-500/20 text-foreground hover:border-violet-500/50
```
Active chips keep `bg-primary text-primary-foreground border-primary`.

### StarSelector — inactive dots
```
bg-violet-500/5 border-violet-500/30 text-foreground hover:border-violet-400
```

### Info banners (contraceptive note, disclaimer)
```
bg-violet-500/10 border border-violet-500/20
```
Icon and text in `text-violet-300` / `text-violet-200` — readable.

### Female-specific cycle buttons
- Period Active (active): keep `bg-rose-500/20 border-rose-500/40 text-rose-400`
- Period Active (inactive): `bg-violet-500/5 border-violet-500/20 text-foreground`

### Male wellness buttons
- Feeling Consistent (active): keep `bg-emerald-500/20 border-emerald-500/40 text-emerald-400`
- Off Day (active): keep `bg-amber-500/20 border-amber-500/40 text-amber-400`
- Both (inactive): `bg-violet-500/5 border-violet-500/20 text-foreground`

### Section labels
- "Cycle Phase", "Cycle Day", "Energy Level" labels: `text-sm font-semibold text-foreground` (not muted)

## File Changed

**`src/components/physio/PhysioAdultTrackingSection.tsx`** — full restyle, no logic changes. Imports `Heart` from `lucide-react` for the section header icon.

## Technical Notes

- No database changes, no hook changes, no edge function changes — purely visual
- The `<Card>` wrapper is replaced with a plain `<div>` styled to match vault section containers
- Logic (save handlers, conditionals for male/female/contraceptive) is untouched
- The violet/purple palette was chosen to be distinct from emerald, amber, and the app's primary colour used by all adjacent vault sections
