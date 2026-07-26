The issue: Hammers Today is still reaching a position-parsing path where a non-string value is treated like a string, producing `s.split is not a function`. I isolated the affected area to Hammers Today / Pitching position handling: `PitchingCard`, `pitcherProfile`, and the daily-plan position consumers.

Do I know what the issue is? Yes: position fields can arrive as strings, arrays, or object-shaped values, while some Hammers Today code still casts them as strings before passing them into pitching/throwing/defense logic. The fix needs to normalize those values once and use that safe normalization everywhere.

Plan:

1. Add one shared, no-throw position normalizer
   - Accept `unknown` values: strings, arrays, nested arrays, null/undefined, and common object shapes like `{ value }`, `{ label }`, `{ position }`, `{ code }`.
   - Return clean position tokens only.
   - Avoid direct unsafe `.split(/[,;/]/)` in the pitching path entirely.

2. Harden the pitching visibility gate
   - Update `shouldShowPitchingCard` and `isPitcherPosition` to use the shared normalizer.
   - Remove the remaining raw split expression from `pitcherProfile.ts` so this exact crash expression cannot be emitted from the current bundle.

3. Harden all Hammers Today position consumers
   - Update `PitchingCard.tsx` to read raw `position_primary` / `position_secondary` as `unknown`, not `string`.
   - Update `dailyPlan.ts` so EASS throwing, defense drills, roadmap throwing ladder, and secondary-position blending all use normalized tokens instead of string casts.
   - Update related normalizers (`normalizePosition`, `normalizeDefensePosition`, and pitcher checks used by skill/throwing ladders if needed) to no-op safely on non-string inputs.

4. Add regression coverage
   - Add tests covering the exact failing shapes: `secondary_position` as `['2B','SS']`, object-shaped position values, nulls, and normal strings like `P,SS`.
   - Add a Hammers Today plan-build regression proving the plan and Pitching card visibility do not throw for malformed athlete context.

5. Verify E2E signal
   - Run targeted tests for the new normalizer and Hammers Today plan build.
   - Search the repo again for unsafe `split(/[,;/]/)` and position string casts in Hammers Today.
   - Load Hammers Today in the browser and confirm no ErrorBoundary panel appears.

After this is approved and implemented, the code path that produced `s.split is not a function` will be removed and covered by tests for all current user data shapes.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>