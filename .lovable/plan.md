# Fix the Identity card "tint/shadow" readability issue

## Root cause

Two layers are washing out the card:

1. **`animate-[pulse_4s_ease-in-out_infinite]`** is applied to the entire card wrapper for `elite` and `locked_in` tiers (in `IdentityBanner.tsx`). Tailwind's `pulse` keyframes animate **opacity from 1 → 0.5 → 1**, so the whole card — text, score, chips — fades to 50% every 4 seconds. That's the "tint/shadow" the user sees.
2. A full-card **`bg-gradient-to-b from-white/5 to-transparent`** highlight overlay sits on top of the content, adding a milky film over the upper half.

Combined with the dark slate gradient, the score and label visibly dim and become hard to read.

## Fix

### `src/components/identity/IdentityBanner.tsx`
- **Remove** `pulse && 'animate-[pulse_4s_ease-in-out_infinite]'` from the card wrapper. The card content must never animate opacity.
- **Remove** the `<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />` overlay so nothing sits between the eye and the text.
- Keep the tier left accent bar and the outer glow shadow — those are decorative and don't touch readability.
- If we still want a subtle "alive" feel for elite/locked_in, restrict it to the **outer glow only** via a custom keyframe that animates `box-shadow` intensity (not opacity), or just drop the pulse entirely. Recommendation: drop it — the glow + accent bar are enough signal.

### `src/hooks/useIdentityState.ts`
- Set `pulse: false` for all tiers (the field becomes unused but keeps the API stable; can be removed in a later pass).
- Bump score text from `text-fuchsia-300` / `-emerald-300` / etc. to the **400** shade for stronger contrast against the near-black surface (e.g. `text-fuchsia-400`, `text-emerald-400`, `text-sky-400`, `text-amber-400`, `text-rose-400`). The drop-shadow stays.

## Out of scope
- No changes to engine, data, layout, or footprint.
- `BehavioralPressureToast` and `DailyStandardCheck` already render correctly — not touched.
- The "You're offline" banner the session replay showed is unrelated; it's the PWA offline notice, not the Identity card.

## Files to edit
- `src/components/identity/IdentityBanner.tsx`
- `src/hooks/useIdentityState.ts`
