## Goal

All text on the Identity card (and its child rows: pressure toast, daily standard check) renders **black at all times** in both light and dark mode. Background gradients and chip colors stay colorful — only text/icon foreground changes.

## Files to change (presentation only)

### 1. `src/hooks/useIdentityState.ts` — `TIER_META`
- Lighten gradients so black text reads cleanly (current `from-fuchsia-900 to-violet-950` is too dark for black). Switch each tier to a mid-tone colorful gradient:
  - elite: `from-fuchsia-300 to-violet-400`
  - locked_in: `from-emerald-300 to-teal-400`
  - consistent: `from-sky-300 to-blue-400`
  - building: `from-amber-300 to-orange-400`
  - slipping: `from-rose-300 to-red-400`
- Set every `tone` to `text-black` (was `text-fuchsia-50`, etc.).
- Update `chip` to `bg-white/70 text-black border-black/20` per tier.
- Keep `ring-*-400/70` rings as tier identity.

### 2. `src/components/identity/IdentityBanner.tsx`
- Eyebrow ("Identity") and caption ("Consistency"): `text-white/80` → `text-black/70`.
- Streak chip pills: `bg-black/40 text-white` → `bg-white/70 text-black`; icon colors shift to darker variants (`text-orange-700`, `text-emerald-700`).
- NN miss chip: `bg-white/70 text-black border-black/30` with `text-rose-700` icon.
- Score and tier label inherit `tone` (now `text-black`).

### 3. `src/components/identity/DailyStandardCheck.tsx`
- Force `text-black` explicitly on the row and the `{label}` span (override tier tone so it never depends on theme).
- Dismiss `X`: `text-black/60 hover:text-black`.
- Keep `CheckCircle2` `text-primary`.

### 4. `src/components/identity/BehavioralPressureToast.tsx`
- For all 7 event tones, replace `text-rose-900 dark:text-rose-50` (and equivalents) with `text-black` while keeping the colored `bg-*-500/15` and `border-*-500/60`.
- Action button: switch to `bg-black text-white hover:bg-black/90` for guaranteed contrast.
- Dismiss `X`: `text-black/70 hover:text-black hover:bg-black/10`.

## Out of scope

- No logic, data, engine, or DB changes.
- No new design tokens.
- Other dashboard widgets untouched.
- Black text persists in dark mode by explicit user requirement; lightened gradients ensure legibility.

## Acceptance

- Every text element inside the Identity banner, streak chips, NN-miss chip, Daily Standard Check row, and Pressure Toast renders solid black in both light and dark mode.
- Backgrounds remain visibly colorful (tier gradient + colored toast tints).
- No layout shift.
