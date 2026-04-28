# Move "Quick Add" up to the Game Plan header

## What

Place the existing "Quick Add" favorites button inline with the new Standard Awareness Header at the very top of the Game Plan card — right next to the "Tap the flame…" primer (and next to the "STANDARD NOT MET / X/Y done today" line in the normal state). The two existing Quick Add buttons further down inside the customizable-activities section stay as-is for now (they're contextual to that section); the new top-of-card placement is the fast path users want after reading their Identity card.

## Files

- `src/components/GamePlanCard.tsx`

## Changes

1. **Extend `StandardAwarenessHeader` props** with `showQuickAdd: boolean` and `onQuickAdd: () => void`. Render a compact pill-style button inline on the right side of the header, vertically centered with the title row:
   - Yellow palette to match the existing Quick Add styling (`border-yellow-500/50 bg-yellow-500/10 text-yellow-400`)
   - `Star` icon (filled) + "Quick Add" label, 11px black uppercase tracking-wider
   - 28px tall pill so it fits cleanly beside both the rose "STANDARD NOT MET" header and the neutral "No Non-Negotiables set" primer
   - Hidden entirely when `showQuickAdd` is false (i.e. user has no favorites yet)

2. **Wrap both header layouts** (the no-NN primer and the normal status banner) in a `flex items-start justify-between gap-3` row so the Quick Add pill sits flush to the right edge of the card without disrupting the existing left-side text stack.

3. **At the call site (~line 1567)**, pass:
   - `showQuickAdd={favorites.length > 0}`
   - `onQuickAdd={() => setFavoritesDrawerOpen(true)}`

   Both `favorites` and `setFavoritesDrawerOpen` are already in scope.

## Out of scope

- No change to the `QuickAddFavoritesDrawer` itself.
- The lower in-section Quick Add buttons stay; removing them is a separate decision.
- No new translation keys — uses literal "Quick Add" to match the new header copy style.
