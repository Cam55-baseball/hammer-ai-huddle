## Root cause

The switch-hitter split lives in `splitLateralityBlocks` (`src/lib/hammer/prescription/dailyPlan.ts:1495`) and gates purely on the acquisition context values:

```
const bats = ctx.get<string>("bats_hand")?.value;   // must equal "S"
const throws = ctx.get<string>("throws_hand")?.value; // must equal "S"
```

But `SideContext` (`src/contexts/SideContext.tsx:66`) treats a user as a switch hitter when **either** `athlete_mpi_settings.is_switch_hitter` is true **or** `bats === "S"`. Athletes who onboarded with a primary side ("R") and later flipped the switch-hitter flag through the identity picker end up with `bats_hand === "R"` in `athlete_context` but `is_switch_hitter === true` in `athlete_mpi_settings`. The prescription splitter never sees the flag, so hitting stays single-card. Same shape for ambidextrous throwers.

Bat Speed already renders two cards because `HammerDailyPlan` gates that on `useSideContext().isSwitchHitter` — which reads the mpi flag directly. So Bat Speed and actual Hitting disagree.

Separately, `<HeaderSidePickers />` still renders in the Hammers Today header (`HammerDailyPlan.tsx:363`) and the user wants it gone from that surface.

## Plan

**1. Trust the mpi flag inside the prescription engine**

- Extend `buildHammerDailyPlan` to accept an optional `identityOverride: { isSwitchHitter?: boolean; isAmbidextrousThrower?: boolean }`.
- Update `splitLateralityBlocks` to compute:
  - `isSwitchHitter = identityOverride?.isSwitchHitter ?? (bats === "S")`
  - `isAmbi = identityOverride?.isAmbidextrousThrower ?? (throws === "S")`
- Thread the override from `useWkDailyPrescriptions` (which already calls `buildHammerDailyPlan`) using `useSideContext()` so the client hook and the splitter share one truth.
- If `useWkDailyPrescriptions` runs outside the SideContext provider, read `athlete_mpi_settings.is_switch_hitter / is_ambidextrous_thrower` in the same query that assembles the plan context and pass those booleans in.

**2. Preserve full-volume hitting split**

`cloneSide` already emits full-volume L + R for hitting and dominant + non-dominant (0.5×, prep-only filter) for throwing. No change needed once the gate opens correctly.

**3. Remove the header side pickers from Hammers Today**

Delete the `<HeaderSidePickers />` render at `HammerDailyPlan.tsx:363` and drop the now-unused `HeaderSidePickers` function + `useSideContext` picker wiring in that file. Switch/ambi athletes will see the L/R distinction only through the duplicated cards and the per-card side badges already implemented. Side selection for uploads/report card continues to live where it belongs — inside those surfaces — not on the daily plan header.

**4. Verify E2E**

- Typecheck.
- Confirm a switch-hitter fixture (mpi `is_switch_hitter=true`, `bats_hand="R"`) renders: two Hitting blocks (L + R, full volume), two Bat Speed cards (already working), no header picker.
- Confirm an ambi-thrower fixture (mpi `is_ambidextrous_thrower=true`, `throws_hand="R"`) renders: dominant-arm throwing block + non-dominant prep-only block, no header picker.
- Confirm a non-switch, non-ambi athlete sees exactly one Hitting card, one Bat Speed card, one Throwing card, and no picker.

### Technical notes

- Files touched: `src/lib/hammer/prescription/dailyPlan.ts`, `src/hooks/useWkDailyPrescriptions.ts`, `src/components/hammer/HammerDailyPlan.tsx`. No DB migration — the mpi flag column already exists and is populated.
- No changes to `useHammerDailyTasks` / `hammer_daily_task_completions` — the composite `(task_id, side)` unique key already handles independent L/R completion state.
- Prescription-engine identity precedence stays: explicit mpi flag > `bats_hand`/`throws_hand` value. This mirrors `SideContext` so the two surfaces cannot drift.