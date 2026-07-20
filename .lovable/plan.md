
## Problem

The current level picker (baseball + softball) mixes three unrelated concepts into one flat chip grid: **playing tier** (Rec, JV, D1), **age group** (6U…14U), and **events** (WBC, Olympic, Collegiate Olympic, Showcase / Perfect Game). It also duplicates redundant rungs (HS Freshman + HS JV) and has no way to capture where the athlete actually competes — which is critical because travel players routinely play out-of-state in more competitive circuits.

## Redesign — one question, three clean inputs

The onboarding step keeps the same slot but renders three coordinated fields:

### 1. Playing tier (single select, cleaned up)

Only real levels of play, no ages, no events, no duplicates.

- **Youth / Amateur:** Recreational · Little League · Middle School · **Travel Ball** · High School JV · High School Varsity
- **Collegiate:** JUCO · NAIA · D3 · D2 · D1
- **College Summer Ball:** College Summer Ball · Cape Cod League *(baseball only)*
- **Professional (baseball):** Academy · Foreign League · Winter Ball · Independent Pro · Rookie · Low-A · High-A · AA · AAA · MLB
- **Professional (softball):** Independent Pro · International Pro · WPF · NPF · AUSL

Removed from the tier list: `hs_freshman` (redundant with JV), `showcase_perfect_game` / `showcase_pgf`, `collegiate_olympic`, `wbc`, `olympic`, `world_championship`, and the standalone `6u`…`18u_gold` chips. These move to fields #2 or #3.

### 2. Age group sub-picker (conditional)

Renders only when tier = **Travel Ball**, **Little League**, **Middle School**, or **Recreational**:

`6U · 7U · 8U · 9U · 10U · 11U · 12U · 13U · 14U · 15U · 16U · 17U · 18U`

Softball adds: `16U · 18U Gold` variants as separate tags. Persisted as `competition_age_group`.

### 3. Where do you play? (state + travel indicator)

Two lightweight inputs shown for every tier below college:

- **Home state** — US state dropdown (+ "Outside US" option, with free-text country).
- **Play state** — same dropdown, defaults to home state. If different, we tag the athlete as an out-of-state / travel-circuit competitor, which raises the competition-weight interpretation (playing PG events in Georgia while living in Ohio is a real signal).

Collegiate + Pro athletes only see a single "Team location" state field (informational, no weighting change).

### 4. Notable events (separate multi-select, optional)

A small follow-up chip group shown after tier is picked, clearly labeled **"Events you've competed in"** — not a level:

`Showcase / Perfect Game · PGF · Collegiate Olympic · WBC · Olympic · World Championship`

Persisted as `competition_events[]`. Kept out of the level weighting math; used later by scouting/recruiting surfaces.

## Data + weighting

`baseballCompetitionLevels` / `softballCompetitionLevels` are trimmed to the tier list in #1. The removed keys are moved into two new catalogs:

- `src/data/baseball/ageGroups.ts` + `src/data/softball/ageGroups.ts` — age-group keys with their existing multipliers.
- `src/data/competitionEvents.ts` — event keys (WBC, Olympic, showcases) with `event_prestige_index` but no `competition_weight_multiplier`.

`getCompetitionWeight()` in `src/data/competitionWeighting.ts` is extended to accept `{ level, ageGroup, playState, homeState }` and compose the final multiplier: `tier × age_group_factor × out_of_state_bonus`. Existing callers keep working (age group + state default to undefined → factor 1.0, identical to today's number).

## UI

`src/components/shared/CompetitionLevelPicker.tsx` becomes a small composite:

```
[ Tier grid — grouped by category ]
[ Age group chips ]           ← only when tier ∈ youth pre-HS
[ Home state ▾ ] [ Play state ▾ ]  ← below college
[ + Notable events (optional) ]
```

Same component is reused by `HammerOnboardingChat.tsx`, `TellHammerDialog.tsx`, `SessionConfigPanel.tsx`, and Game Setup — one source, every surface stays in sync.

## Persistence

`src/lib/hammer/onboarding/knowledgeGaps.ts` — the `competition_level` gap becomes a composite gap that writes:

- `competition_level` (existing)
- `competition_age_group` (new)
- `competition_home_state` (new)
- `competition_play_state` (new)
- `competition_events` (new, array)

All five fields land in `athlete_context` via the existing `acquisition.ts` writer path; the four new columns are added in one migration with matching GRANTs.

## Files touched

- `src/data/baseball/competitionLevels.ts`, `src/data/softball/competitionLevels.ts` — trimmed
- `src/data/baseball/ageGroups.ts`, `src/data/softball/ageGroups.ts` — new
- `src/data/competitionEvents.ts` — new
- `src/data/competitionWeighting.ts` — extended weighting fn
- `src/components/shared/CompetitionLevelPicker.tsx` — composite UI
- `src/lib/hammer/onboarding/knowledgeGaps.ts` — composite gap definition
- `src/lib/hammer/context/athleteContext.ts` — hydrate new fields
- `src/lib/hammer/context/acquisition.ts` — persist new fields
- Migration: add `competition_age_group`, `competition_home_state`, `competition_play_state`, `competition_events` to `athlete_context`

## Result

The question stops looking like a dumping ground. A 12-year-old on a Nationals travel team traveling from Ohio to Georgia for PG events answers **Travel Ball → 12U → Home: OH, Play: GA → Events: Perfect Game** — four clean signals instead of one confused chip. WBC/Olympic no longer masquerade as career levels. HS Freshman stops competing with JV. Credibility restored.
