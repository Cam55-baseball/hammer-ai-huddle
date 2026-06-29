## Goal

Complete the 7-Phase Game Performance rebuild on top of the already-shipped `gp_*` ledger and Phase 1–2 shell. Every new surface reads/writes only `gp_*` tables, is autosave-on-blur, save-and-exit safe, switch-side aware, and survives chunk reloads. No drift back to the legacy `games` table.

## Phase 3 — Pitch-by-Pitch logger (the one Phase 3 piece still missing)

New `src/components/games/PitchLogger.tsx` and `useGamePitches.ts`:

- Tabs inside the logger: **As Pitcher** vs **As Hitter** — writes to `gp_pitches` with `perspective` = `pitcher` or `hitter`.
- Per-pitch row: inning, pitch #, type, velo, location (9-zone grid + ball/off-plate), result (ball/called/swinging/foul/in-play), count before, arm slot, throws (L/R), batter handedness, opponent hitter name link, notes.
- When `perspective='hitter'`, autofills `at_bat_id` with the currently-active at-bat (last open AB on the same inning) and updates the parent at-bat aggregates (`pitch_velo`, `pitch_type`, `pitch_location`) on the final pitch of the PA.
- Add `<TabsTrigger value="pitches">` to `GameSheet.tsx` between At-Bats and Defense.
- 9-zone visual: small SVG strike-zone grid, taps set `location.zone` (1–9) + optional `out_zone` (HL/HR/LL/LR/Up/Down). Lives in `src/components/games/StrikeZoneGrid.tsx` so Phase 4 reuses it.

## Phase 4 — Opponent Dossiers + Strike-Zone Planner

New page `/games/dossiers` (lazy route from `Games.tsx` "Pitcher dossiers" tile):

- `src/pages/Dossiers.tsx`: list with search, sport filter, "last faced" sort. Two sub-tabs: **Pitchers** (`gp_pitcher_dossiers`) and **Hitters** (`gp_opponent_hitters`).
- `src/components/games/PitcherDossierDrawer.tsx`: edit throws, arm slot, repertoire (chip list with usage% sliders), tendencies (0-0 first-pitch %, put-away pitch, behind-in-count tendency), pregame/postgame notes, strike-zone plan.
- `src/components/games/StrikeZonePlanner.tsx`: same 9-zone grid; each zone can be marked **attack / avoid / take** with a color, plus per-zone pitch-type preference. Saved to `gp_pitcher_dossiers.strike_zone_plan` jsonb.
- Post-game overlay: when a `gp_pitches.opponent_hitter_name` matches and `perspective='hitter'`, render dots on the same grid (filled by `result`) so the athlete sees plan-vs-actual.
- `src/components/games/HitterDossierDrawer.tsx`: bats, tendencies (chases high/low, pull/oppo, first-pitch swing %), notes.
- Dossier picker integrated into `AtBatLogger` (opponent pitcher dropdown writes `opponent_pitcher_id` foreign-soft-link) and `PitchLogger` (opponent hitter name autocomplete).

## Phase 5 — AI Multimodal Document/Photo ingest

Edge function `supabase/functions/gp-ingest-document/index.ts`:

- Accepts `{ game_id, file_url, file_mime, source }`. Sources: `trackman`, `gamechanger`, `rapsodo`, `scorebook_photo`, `box_score`, `other`.
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with the file as `image_url` (jpg/png) or `file` block (pdf/csv) — MIME derived from upload, never hardcoded.
- Strict Zod-shaped `Output.object` schema: `{ events: Array<{ kind: 'at_bat'|'pitch'|'defense'|'baserun'; inning; payload: {...} }> }`. Schema is small and flat (Gemini-state-limit safe).
- Writes raw text + parsed JSON to `gp_documents`, sets `parse_status='parsed'|'failed'`.
- Returns parsed events; client reviews and confirms per-inning before inserting into the right `gp_*` table.
- New `src/components/games/DocumentIngestTab.tsx` (new tab in `GameSheet`): upload widget → signed URL → invoke function → grouped-by-inning approval list with per-event "Insert / Skip / Edit". 429/402 errors surfaced verbatim per gateway rules; no auto-retry.

Storage: create `gp_documents` bucket (private) via migration; signed URLs valid 1h passed to the function.

## Phase 6 — Report Builder

New `src/pages/GameReports.tsx` linked from the "Reports" tile in `Games.tsx`:

- **Hitter heat map**: pulls `gp_pitches` (perspective='hitter') + `gp_at_bats.pitch_location`. SVG 9-zone, color = batting avg / xwOBA-lite (hits ÷ swings-in-play). Filters: side (L/R via SideContext), pitch type, count, last N games.
- **Spray chart**: `gp_at_bats.exit_direction` → polar plot on a diamond. Colored by `contact_quality`. Filters same as above.
- **Pitch arsenal report** (perspective='pitcher'): velo distribution, usage %, whiff %, called-strike % per zone — re-uses StrikeZoneGrid.
- **Defense splits**: by position, by play_type, errors trend.
- **Baserunning splits**: SB% by lead steps, by pitcher arm side, by pitch type.
- Each chart has an "Ask Hammer" button that posts the underlying aggregate to `hammer-chat` for plain-English interpretation (reuses existing `useHammerChat`).

All aggregates in `src/lib/games/reports/*.ts` so they are unit-testable and stay drift-proof from the UI.

## Phase 7 — App-wide integration

- **HammerDailyPlan**: `src/lib/hammer/prescription/dailyPlan.ts` gets a new `applyGameLedgerSignals(plan, ledger)` step that reads the last 7d from `gp_at_bats` / `gp_pitches` / `gp_defense_plays` and surfaces a "From your last game" block (e.g. "0-for-3 vs CB low-and-away → 10 min CB recognition drill").
- **useGameDayContext**: extend `recentGames` to also count `gp_at_bats` for fatigue/density (a 4-AB DH counts heavier than a 1-AB pinch hit).
- **Roadmap**: `src/hooks/useRoadmapProgress.ts` — new milestone signals fed by ledger aggregates (e.g. "10 quality ABs vs LHP", "5 successful steals").
- **Progress Dashboard**: add `GameLedgerPanel.tsx` under `src/components/progress/panels/`, plus 2 correlation variables in `topicVariables.ts` (e.g. `gp_avg_exit_velo`, `gp_pop_time`). Surfaces in the existing `TopicButtonGrid`.
- **Calendar**: confirm `useCalendar.ts` (already migrated to `gp_games`) renders the new game-type/colors; add a small badge when a game has logged ABs/pitches.

## Drift-proof guards

- Repo-wide grep gate: add `scripts/check-no-legacy-games.sh` that fails CI if any non-types file references `from('games')` / `from("games")` / `opponent_name`. Document it in `docs/games-rebuild.md`.
- All new hooks use `(supabase as any).from('gp_*')` consistently and route writes through a single `src/lib/games/ledger.ts` adapter so a future rename only touches one file.
- Every new lazy route wrapped in `lazyWithRetry` to survive stale-chunk reloads.
- Storage bucket + edge function deployed via migration; `LOVABLE_API_KEY` confirmed via `fetch_secrets` before the function ships.

## Technical details

```text
gp_games ──┬── gp_at_bats ── gp_pitches (perspective=hitter, at_bat_id FK-soft)
           ├── gp_pitches  (perspective=pitcher, at_bat_id NULL)
           ├── gp_defense_plays
           ├── gp_baserun_events
           ├── gp_subs
           └── gp_documents ── parsed_events[] → fan-out into the tables above

gp_pitcher_dossiers  ◄── gp_at_bats.opponent_pitcher_id
gp_opponent_hitters  ◄── gp_pitches.opponent_hitter_name (text match, not FK)
```

New files (high level):
- `src/components/games/PitchLogger.tsx`, `StrikeZoneGrid.tsx`, `StrikeZonePlanner.tsx`, `PitcherDossierDrawer.tsx`, `HitterDossierDrawer.tsx`, `DocumentIngestTab.tsx`
- `src/pages/Dossiers.tsx`, `src/pages/GameReports.tsx`
- `src/hooks/useGamePitches.ts`, `useGameDossiers.ts`, `useGameReports.ts`
- `src/lib/games/ledger.ts`, `src/lib/games/reports/{heatmap,spray,arsenal,defense,baserun}.ts`
- `supabase/functions/gp-ingest-document/index.ts` + storage bucket migration
- `src/components/progress/panels/GameLedgerPanel.tsx`

## Out of scope (deferred, not silently dropped)

- Live "in-stadium" mode with offline queue (already covered loosely by autosave; full offline-first sync deferred).
- Coach-shared dossiers (RLS scaffold added but no UI this round).

## Acceptance — done means all true

1. Every Phase 3–7 surface above loads, writes, and re-reads without a console error.
2. `rg "from\\(['\"]games['\"]\\)" src/` returns zero matches (excluding `types.ts`).
3. Creating a game → logging 1 AB + 1 pitch + 1 defense + 1 steal + uploading a scorebook photo → seeing the AB in the heat map and a "From your last game" line in the Hammer plan, all in one session.
4. Stale-chunk reload on any new route recovers via `lazyWithRetry`.
