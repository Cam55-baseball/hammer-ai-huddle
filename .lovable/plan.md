# Make "subs available" a real swap control on the Lifts card

## What it does today

Nothing. On the Lifts card, "· subs available" is static text rendered by the shared card footer (`CardMeta`), driven by a boolean flag in the card registry. It is not a button and has no click handler anywhere.

The data behind it, however, is real: the generator already resolves a full substitution ladder per lift movement and stores it on each prescription row under `why_payload.lift_governance.substitution_ladder`, with reasons like equipment unavailable, facility unavailable, injury restriction, time restriction, and coach override. The prescription table also already has `substituted_from_slug` and `substitution_reason` columns. So the intelligence exists and is simply not exposed.

## What to build

Turn it into a working per-movement swap.

1. Remove the inert "subs available" text from the shared footer.
2. Add a small "Swap" action on each lift movement row in the Lifts card (only when that row's ladder has at least one option).
3. Tapping Swap opens a sheet listing the ladder options grouped by reason:
   - No equipment / no rack
   - Not at the facility
   - Something hurts
   - Short on time
   - Coach override
   Each option shows the replacement movement name, its dose after swap, and a one-line "why this is a legal swap" from the stored governance data.
4. Choosing an option updates that prescription row in place: new movement, `substituted_from_slug` set to the original, `substitution_reason` set to the chosen reason, dose carried over per the ladder's dosage rule. The card refreshes and shows a "Swapped from X" chip with an Undo affordance that restores the original row.
5. If a row has no legal ladder option (or the athlete is on a restricted day), the Swap action is hidden rather than shown-but-dead.

## Scope guards

- Lifts card only for this pass. Speed, Bat Speed, Conditioning, Recovery, Arm Care and Cross-Sport builders also emit ladders; they can adopt the same control in a follow-up once this one is proven.
- No changes to the generator, validator, or dosage doctrine. Swaps stay inside the ladder the backend already certified, so a swap can never produce a prescription the validator would have rejected.
- No parallel storage: the swap writes to the existing prescription row and its existing substitution columns.

## Technical notes

- UI: new `LiftSwapSheet.tsx` under `src/components/hammer/`, invoked from the movement rows in `WkLiftsCard.tsx`; drop the `substitutionAvailable` line from `CardMeta.tsx`.
- Data: read `why_payload.lift_governance.substitution_ladder` off the `WkRx` row; extend the `why_payload` type in `useWkDailyPrescriptions.ts` to include `lift_governance`.
- Write: a new `useLiftSubstitution` mutation hook updating `wk_daily_prescriptions` (movement_slug, movement_name, dose fields, `substituted_from_slug`, `substitution_reason`), then invalidating the daily-prescription query.
- Before wiring the write, confirm the athlete-scoped update policy and grants on `wk_daily_prescriptions` permit an owner update of these columns; if they don't, add the policy in the same change.
- Undo restores from `substituted_from_slug` by re-resolving the original catalog row.

## Verification

- Swap each ladder reason on a live lift row, confirm the row persists across a refresh and that the card still validates.
- Confirm a row with an empty ladder shows no Swap action.
- Confirm Undo returns the exact original movement and dose.
