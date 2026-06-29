## Problem

Competition level is collected in at least 4 places, each from a **different hardcoded list**, and none of them gives full youth-to-pro coverage in a sport-aware way:

| Surface | Source | Gaps |
|---|---|---|
| Onboarding (`knowledgeGaps.ts` → `competition_level`) | Inline list, sport-agnostic | No U-ages, no JV, no summer leagues, no MiLB tiers (Low-A/High-A/AA/AAA), no softball-specific (AUSL/NPF/WPF/Olympic), no Little League |
| Hammers Daily → "Tell Hammer" (`TellHammerDialog.tsx`) | `QUICK_LEVELS` (6 items) | Skips youth entirely — starts at HS junior |
| Game Setup (`GameSetupForm.tsx`) | `competitionCategories` from canonical `competitionLevels.ts` | Canonical, but softball list is missing youth U-ages and Little League |
| Practice → Game opponent (`GameSessionFields.tsx`) | Inline `opponentLevels` (5 items) | Rec/Travel/HS/College/Pro only — no U-ages, no JV/Varsity split, no MiLB, no AUSL |
| Game scoring → League distance (`leagueDistances.ts`) | Separate keys (8u/10u/12u/13u/14u/hs/college/pro) | Different key namespace from competition level — never reconciled |

Result: an athlete answering "Little League" in onboarding can't pick the same thing in Tell Hammer or when logging a game, and the youth side is silently dropped on multiple surfaces.

## Plan

### 1. Single source of truth: `src/data/competitionLevelCatalog.ts` (new)

Build a sport-aware catalog that **extends** the existing `baseball/competitionLevels.ts` and `softball/competitionLevels.ts` so weighting math is unchanged, but adds the missing youth rungs and exposes one helper every surface calls.

- Baseball additions: `8u`, `10u`, `12u`, `13u`, `14u`, `middle_school`, `hs_freshman` (separate from JV), `hs_jv`, `hs_varsity` already exists.
- Softball additions: `little_league`, `8u`, `10u`, `12u`, `14u`, `middle_school`, `hs_freshman`, plus confirm `ausl`, `npf`, `wpf`, `olympic` are present (they are).
- Add a `youth_age_band` field (e.g. `8u`/`10u`/...) so we can map to `leagueDistances` keys without a separate list.

Export:
```ts
getCompetitionLevels(sport): GroupedLevels // youth → middle/HS → college → summer → pro
getCompetitionLevelByKey(sport, key)
levelToLeagueDistanceKey(sport, key)   // bridges to mound/base distances
```

### 2. Reusable picker: `src/components/shared/CompetitionLevelPicker.tsx` (new)

A single grouped, sport-aware picker (chip grid with Youth / Middle / High School / College / Summer / Pro categories, "MLB" or "AUSL" highlighted at the top of Pro). Two variants:
- `mode="full"` — every level (used in onboarding, Game Setup, Manage Profile).
- `mode="quick"` — collapsed by category with "More…" expansion (used in Tell Hammer, Game Session Fields).

### 3. Wire every surface to the picker

- **Onboarding** (`knowledgeGaps.ts`): replace the inline `options` for `competition_level` with a `renderer: "competition_level_picker"` hook and update `OnboardingKnowledgeGap.tsx` to render the shared picker when that renderer is set. Pulls `sport_primary` from the envelope so the right list shows.
- **Tell Hammer** (`TellHammerDialog.tsx`): delete `QUICK_LEVELS`, drop in `<CompetitionLevelPicker mode="quick" sport={sport} />`.
- **Practice → Game opponent** (`GameSessionFields.tsx`): delete inline `opponentLevels`, use `<CompetitionLevelPicker mode="quick" />` for `opponentLevel`.
- **Game Setup** (`GameSetupForm.tsx`): already uses canonical levels — switch to the shared picker for consistent UI and so new youth rungs appear automatically. Keep the existing distance auto-fill: when a youth band is picked, look up `leagueDistances` via `levelToLeagueDistanceKey`.
- **Profile/Manage current level** (anywhere `competition_level` is edited later): same picker.

### 4. Persistence & upgrades stay on the existing key

All surfaces continue to write the same `competition_level` envelope key via `persistContextAnswer(..., "competition_level", ...)`. Because we are extending — not renaming — the canonical level catalog, the weighting engine (`competitionWeighting.ts`), envelope readers, and ASB lineage keep working unchanged. New youth keys get sensible `competition_weight_multiplier` / `league_difficulty_index` values continuing the existing ladder (e.g. `8u` ≈ 0.30, `10u` ≈ 0.35, `12u` ≈ 0.40, `14u` ≈ 0.50, `middle_school` ≈ 0.60).

### 5. Smoke test

Add a tiny unit test that asserts: for each sport, every onboarding/Tell Hammer/Game Setup/Game Session option key resolves through `getCompetitionLevelByKey` (catches future drift).

## Out of scope

- No DB migration — `competition_level` is a free-text envelope value today and stays that way.
- Weighting numbers for existing levels are not touched (founder MLB = 2.10 mandate respected).
- No change to `leagueDistances` keys — only a new mapping helper to bridge them.

## Files touched

- New: `src/data/competitionLevelCatalog.ts`, `src/components/shared/CompetitionLevelPicker.tsx`, test file
- Edit: `src/data/baseball/competitionLevels.ts`, `src/data/softball/competitionLevels.ts` (add youth rungs)
- Edit: `src/lib/hammer/onboarding/knowledgeGaps.ts` + the renderer that consumes it
- Edit: `src/components/hammer/TellHammerDialog.tsx`
- Edit: `src/components/practice/GameSessionFields.tsx`
- Edit: `src/components/game-scoring/GameSetupForm.tsx`
