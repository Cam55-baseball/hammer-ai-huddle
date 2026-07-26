## Fix: "s.split is not a function" on Hammers Today

**Root cause (confirmed)**
`src/lib/hammer/pitching/pitcherProfile.ts:113` calls `secondaryPositions.split(...)`. The type says `string | null | undefined`, but the caller in `PitchingCard.tsx` pulls the value from athlete context, where it can arrive as an array (e.g. `["2B","SS"]`) or another non-string shape. The truthy check on line 112 passes, `.split` doesn't exist on arrays, and the ErrorBoundary catches the throw.

**Changes**

1. `src/lib/hammer/pitching/pitcherProfile.ts`
   - Widen `shouldShowPitchingCard`'s `primaryPosition` and `secondaryPositions` params to `unknown`.
   - Add an internal `coerceToPositionList(value: unknown): string[]` helper that:
     - returns `[]` for null/undefined/other
     - for arrays: filters to strings, trims
     - for strings: splits on `/[,;/]/`, trims, drops empties
   - Use it for both primary and secondary; run `isPitcherPosition` over the resulting list.
   - Also harden `isPitcherPosition` to accept `unknown` and no-op on non-strings.

2. `src/components/hammer/PitchingCard.tsx`
   - No behavior change; just pass the raw context values through (already does). Confirm no `.split` calls on context values elsewhere in the card.

**Verification**
- Rebuild, reload Hammers Today for the affected user; card renders instead of ErrorBoundary.
- `rg "\.split\(" src/lib/hammer/pitching src/components/hammer/PitchingCard.tsx` to confirm no other unsafe splits.
- Existing `recoveryClamp.test.ts` still passes.

Scope is limited to the pitching-card visibility gate — additive, replay-safe, no schema or data changes.
