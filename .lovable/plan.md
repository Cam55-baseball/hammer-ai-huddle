## Plan: Cross-sport warmup integration & bilateral side prescriptions

### Goal
Make the Hammers Today plan behave correctly for two athlete scenarios:
1. **In-season cross-sport training** belongs at the *front* of the day, integrated into the warm-up card, not as a back-end conditioning card.
2. **Switch hitters** and **ambidextrous throwers** must train **both sides** during their hitting/throwing blocks unless an injury or explicit reason forces single-side work.

### Current state (verified from codebase)
- **Cross-sport scheduling** is generated in `supabase/functions/wk-generate-daily/index.ts`:
  - Game days: `cross_sport` slot is placed early as a low-CNS activation (rendered inside the Speed/Conditioning area).
  - Off-season: `cross_sport` is appended at the back end (`offseason_back_end` placement).
  - **In-season, non-game days: no `cross_sport` block is generated at all.**
  - UI grouping in `src/hooks/useWkDailyPrescriptions.ts` sends `cross_sport` to either the `speedCard` or `conditioningCard`, never to the Warm-up card.
- **Hitting block** in `src/lib/hammer/prescription/dailyPlan.ts` (`case "hitting"`) is purely side-agnostic; it prescribes the same tee/front-toss/BP set regardless of batting side.
- **Side-bias rider** (`applySideBias`) only appends a single extra activation set for the weaker side; it does not change the core drill set to train both sides.
- **Throwing block** is built via EASS (`buildEassPrescription` in `src/lib/hammer/prescription/eassLibrary.ts`). It is also side-agnostic; no L/R switching or ambidextrous logic exists today.
- Identity flags (`is_switch_hitter`, `is_ambidextrous_thrower`, `primary_batting_side`, `primary_throwing_hand`) are already available on `athlete_mpi_settings` and mirrored in `projectEnvelope`/`HammerAthleteContext`.

### Proposed implementation

#### 1. In-season cross-sport → warmup integration

Backend (`supabase/functions/wk-generate-daily/index.ts`)
- Extend the `cross_sport` generation branch so that **any in-season day** (not just game days) produces a `cross_sport` prescription with a new `placement: "warmup_integration"`.
- Keep the drill pool the same low-CNS / WOST / fast-object pool used for game-day activation.
- Keep off-season behavior unchanged: `placement: "offseason_back_end"`.
- Add a clear `why` string explaining that the cross-sport drill is placed at the front of the day because the athlete is in-season.

Frontend (`src/hooks/useWkDailyPrescriptions.ts`)
- Add a new grouped bucket `warmupAddons` that captures `cross_sport` items whose `placement === "warmup_integration"`.
- Keep existing `speedCard` and `conditioningCard` buckets intact for backward compatibility.

Frontend (`src/components/hammer/HammerDailyPlan.tsx`)
- Render the `warmupAddons` items **inside** the Warm-up card at the top, visually grouped as a short, in-season neural prep / cross-sport micro-block.
- Keep the warm-up card's own generated content first; append the cross-sport addons as a "finish the warm-up with this" subsection.

#### 2. Switch hitters hit both sides

Frontend (`src/lib/hammer/prescription/dailyPlan.ts`)
- In the `hitting` builder, read `proj.isSwitchHitter` and `proj.primaryBattingSide` from the projected athlete context.
- If `isSwitchHitter === true`:
  - Duplicate the core drill set so the athlete sees both a left-side and right-side version (e.g., "Tee work — barrel path (L)" and "Tee work — barrel path (R)").
  - Adjust dosage for in-season so total volume stays reasonable (e.g., split the existing swing count across both sides).
  - Add an explicit cue: "Switch hitter — work both sides today. If one side is sore or protected, skip it and tell Hammer."
- If `isSwitchHitter === false`, keep the single-side prescription unchanged.
- Preserve the existing side-bias rider so a measured L/R asymmetry still adds the extra activation set for the weaker side.

#### 3. Ambidextrous throwers throw both sides

Frontend (`src/lib/hammer/prescription/dailyPlan.ts` → `throwing` builder)
- Read `proj.isAmbidextrousThrower` and `proj.primaryThrowingHand`.
- If `isAmbidextrousThrower === true`:
  - Mark the throwing block as bilateral.
  - Add a clear instruction set: the athlete performs the EASS band-prep and fast-object/underload work with the dominant arm first, then repeats the same neural prep and a short, light catch-play set with the non-dominant arm.
  - Do **not** double high-intent work (pulldowns, overload, long-toss) on the non-dominant side; keep max-intent work dominant-side only to preserve arm health.
  - Add a cue: "Ambidextrous thrower — mirror the neural prep on both sides; max-intent work stays on the dominant arm today."
- If `isAmbidextrousThrower === false`, keep the standard EASS prescription.
- Safety gates (injury, arm soreness, game day) remain supreme; bilateral work is skipped or reduced on a protected arm.

### Verification steps
- After edits, run `supabase functions build` or the Edge-Function smoke test for `wk-generate-daily` to confirm the new `placement` value is emitted correctly and does not break the ordering certifier.
- Run a TypeScript typecheck (`tsgo` or `tsc --noEmit`) to confirm `warmupAddons` is consumed correctly in `HammerDailyPlan.tsx` and no `cross_sport` types are broken.
- Build a test plan in `HammerDailyPlan.tsx` for a mock athlete with `is_switch_hitter: true` and `is_ambidextrous_thrower: true` to confirm both sides appear in the hitting and throwing blocks.
- Confirm the off-season `cross_sport` block still renders at the back end (in the Conditioning card) with unchanged ordering.

### Out of scope
- No new tables or migrations are required; the identity flags and `athlete_mpi_settings` already exist.
- No backend changes to the EASS engine itself (eassLibrary.ts) — only the daily plan builder's wrapper will branch for ambidextrous throwers.
- No changes to the side-bias math or localStorage cache; the existing `applySideBias` rider remains as-is.

### Files that will be edited
- `supabase/functions/wk-generate-daily/index.ts` — cross-sport placement logic
- `src/hooks/useWkDailyPrescriptions.ts` — new `warmupAddons` bucket
- `src/components/hammer/HammerDailyPlan.tsx` — render warmup addons inside the Warm-up card
- `src/lib/hammer/prescription/dailyPlan.ts` — switch-hitter hitting block and ambidextrous throwing block