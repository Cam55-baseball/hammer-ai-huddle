## Why the picker doesn't show

The side selector *is* placed under "Enable Hammer Analysis" on `AnalyzeVideo.tsx` (lines 1132–1142), but it renders through `SideContextPicker`, which auto-hides unless the athlete is flagged switch-hitter / ambidextrous-thrower.

The flag lives on `athlete_mpi_settings.is_switch_hitter` / `is_ambidextrous_thrower`. Onboarding, however, writes handedness into `athlete_context.bats_hand` / `throws_hand` (values `R` / `L` / `S`) — it never mirrors "S" onto `athlete_mpi_settings`. So even after answering "Both / Switch" in onboarding, `shouldShowPicker` returns false and nothing appears on the Video Analysis screen.

Nothing about placement is wrong — the gating is what's broken.

## Fix

1. **`src/contexts/SideContext.tsx`** — additionally read `athlete_context.bats_hand` and `athlete_context.throws_hand` in the identity query. Compute:
   - `isSwitchHitter = mpi.is_switch_hitter || ctx.bats_hand === "S"`
   - `isAmbidextrousThrower = mpi.is_ambidextrous_thrower || ctx.throws_hand === "S"`
   
   This makes the onboarding answer the single source of truth without requiring a schema migration.

2. **`src/lib/hammer/context/acquisition.ts`** — inside `persistContextAnswer`, when `key === "bats_hand"` or `key === "throws_hand"`, also fire-and-forget an upsert onto `athlete_mpi_settings` mirroring the flag + primary side:
   - `bats_hand = "S"` → `{ is_switch_hitter: true, primary_batting_side: "S" }`
   - `bats_hand = "L" | "R"` → `{ is_switch_hitter: false, primary_batting_side: value }`
   - same shape for `throws_hand` → `is_ambidextrous_thrower` / `primary_throwing_hand`
   
   This keeps the mpi settings row consistent for every other consumer already reading it (`useSwitchHitterProfile`, panels, etc.).

3. **Verify** by rebuilding, opening Video Analysis on a switch/ambi test account, and confirming the "Filing side" panel appears directly beneath the Enable Hammer Analysis toggle, and stays hidden for single-side athletes.

## Out of scope

- No placement changes on `AnalyzeVideo.tsx` — the panel is already positioned correctly and only needs to be reachable.
- No schema migration; existing columns cover the mirror.
- No changes to non-side-aware surfaces.
