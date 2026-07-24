## Plan

1. **Split hitting before the awaiting-input gate**
   - Update the laterality splitter so switch hitters get two Hitting cards even when the hitting block is currently `awaiting-input` for equipment.
   - Keep suppressed blocks unsplit, but allow `ready` and `awaiting-input` hitting/throwing blocks to become side-specific.
   - Result: the current screenshot state becomes two cards: `Hitting — Left-handed — Waiting On Equipment` and `Hitting — Right-handed — Waiting On Equipment`, each with its own side badge and Answer Hammer path.

2. **Make side identity impossible to miss**
   - Use the same switch/ambidextrous identity source everywhere Hammers Today builds the plan.
   - Preserve fallback checks from handedness values (`bats_hand === "S"`, `throws_hand === "S"`) so older onboarding data still works.

3. **Separate card-level completion by side**
   - Pass `block.side` into `BlockCompletionControls`.
   - Store local Done/Skip engagement with side-specific keys like `hitting:L`, `hitting:R`, `throwing:L`, `throwing:R`, so completing/skipping one side does not mark the other side.
   - Bulk checklist sync will also include the side so each drill checkbox remains independent.

4. **Clean remaining picker-era UI**
   - Remove the unused `HeaderSidePickers` component code.
   - Update/remove `BlockSideBadge` so it no longer shows the old single selected `R`/`L` picker state on side-split cards. The actual side badge from the duplicated prescription becomes the only source of truth.

5. **Ambidextrous thrower coverage**
   - Apply the same side-card behavior to throwing: dominant and non-dominant cards can be logged independently.
   - Keep non-dominant throwing safety logic intact: light prep/catch-only filtering and reduced dosage.

6. **Verify**
   - Typecheck after changes.
   - Confirm the plan-building path produces two Hitting cards for switch hitters, including when equipment is missing.
   - Confirm completion keys/checklist task rows are side-aware for both switch hitters and ambidextrous throwers.