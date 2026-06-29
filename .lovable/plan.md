
# Game Performance System — Complete Rebuild

A full replacement of personal game logging. Built to drive the roadmap, daily plan, dashboards, and AI coaching — not just record stats. Baseball + softball, switch-hitter/thrower aware, side-tagged everywhere.

## Guiding principles

- **One canonical event ledger.** Every at-bat, pitch, defensive play, baserunning event, and substitution is a typed row tied to `(game, inning, half, side, position)`. No more parallel schemas.
- **Text-first + button-fast.** Every input has a structured form AND a free-text box. Save & Exit anywhere; resume later.
- **AI as accelerator, not gatekeeper.** Trackman / GameChanger / Rapsodo / photos parse into draft events; user confirms per inning.
- **Position-open.** A game is not locked to one position. Switch positions mid-game, log DH, pinch-hit, pinch-run, late-relief, defensive replacement.
- **Switch hitter / switch thrower aware.** Every offensive + defensive event carries a `side` field, feeding the existing `SideContext` differential.
- **Opponent memory.** Every pitcher / opponent named once becomes a reusable dossier surfaced next time you face them.
- **Drives the app.** Game data feeds Hammer daily plan, roadmap weaknesses, dashboards, and AI feedback — not a dead-end log.

## Visual direction

Game Day = the most polished surface in the app. Dark glassy field-themed background, semantic tokens only, large tap targets, sticky inning rail, tabbed events bar (At-Bat / Pitch / Defense / Baserun / Sub), animated diamond mini-map showing current state, framer-motion transitions between events. Trackman-quality dataviz for heat maps and spray.

---

## Phase 1 — Hard wipe + new schema (foundation)

Migration drops `games`, `game_plays`, `game_opponents` and any dependent triggers/views. Creates the new ledger:

- `gp_games` — date, sport, opponent_team, home/away, venue, weather, score, lineup_slot, my_positions[], status, philosophy_pre, philosophy_post, philosophy_verdict (`keep`/`tweak`/`can`).
- `gp_innings` — game_id, number, half (`top`/`bot`), my_role (`offense`/`defense`/`bench`).
- `gp_at_bats` — game_id, inning, batting_side L/R, position_played, opponent_pitcher_id, count_final, result enum, contact_quality, exit_direction, pitch_location grid, pitch_type, pitch_movement, runners_on, outs, lop, ribi, h1_time (sec), notes, ai_summary.
- `gp_pitches` — at_bat_id, pitch_no, type, velo, location grid, result, pitcher_arm_slot, batter_handedness (mirror logger for pitcher's outing).
- `gp_defense_plays` — game_id, inning, position, play_type (catalogue mirrors practice hub), shift (`L/R/extreme_L/extreme_R/in/back/no_shift`), result, error_flag, time_to_first (sec), notes.
- `gp_baserun_events` — game_id, inning, base_from, base_to, event_type (`steal`/`dirtball_read`/`pickoff`/`advance`/`caught`), lead_steps, pitcher_arm_side, pitcher_time_to_home, catcher_pop_time, pitch_type_ran_on, success, notes.
- `gp_subs` — game_id, inning, type (`pinch_hit`/`pinch_run`/`def_replace`/`relief`), in/out position.
- `gp_pitcher_dossiers` — name, team, sport, throws L/R, arm_slot, repertoire, tendencies, notes_pregame, notes_postgame, strike_zone_plan_grid (json: 5×5 tap squares with intent), last_faced.
- `gp_opponent_hitters` — for the pitcher mirror (hitter lineup tracker).
- `gp_documents` — uploaded Trackman/GameChanger/Rapsodo/photo, parse_status, parsed_events_json, attached_inning.

All tables: `user_id`, RLS scoped to `auth.uid()`, GRANTs to `authenticated`/`service_role`, `updated_at` triggers. Side feeds existing `SideContext` aggregations.

## Phase 2 — Game Shell + At-Bat Logger (V1 visible UX)

- New top-level **Games** route + nav entry (sport-themed). List, calendar, search.
- "Did you play today?" button in Hammer Daily Plan on scheduled game days → opens the same Game Sheet.
- Game Sheet layout:
  - Header: opponent, date, my position(s) chips (add/swap mid-game), philosophy pre/post.
  - Inning rail (sticky 1–9+) with offense/defense indicator.
  - Event bar: **At-Bat · Pitch · Defense · Baserun · Sub · Notes**.
  - At-Bat drawer reuses practice-hub micro layer (`PitchLocationGrid`, `CountSelector`, `ContactQualitySelector`, `ExitDirectionSelector`, `PitchMovementSelector`) + new fields: position played, batting side, RBI, LOB, H1 time, opponent pitcher (dropdown of dossiers, "Add new" inline), free-text notes with AI summary on save.
  - "New pitcher entered" inline action creates/updates dossier and tags subsequent ABs.
- Save & Exit at every level (autosave to draft).

## Phase 3 — Pitch-by-pitch + Defense + Baserun + Sub loggers

- Pitch-by-pitch sheet for hitter's AB and pitcher's outing (lineup tracker on the mound).
- Defense logger mirrors practice hub catalogue + shift selector + position-open switching.
- Baserun logger: lead steps, pitcher time-to-home, catcher pop, arm side, pitch type ran on, success — all surfaced as quick chips.
- Sub logger handles pinch-hit/run, late relief, defensive replacement.

## Phase 4 — Opponent Pitcher Dossier system

- Persistent `gp_pitcher_dossiers`. Surface card on any AB when that pitcher is selected.
- Pre-game tap-grid strike-zone plan (5×5 squares, multi-tap with intent labels). Save & resume post-game with results overlay.
- Arm slot picker (over-top / high-3/4 / 3/4 / low-3/4 / sidearm / submarine) + repertoire chips.
- Searchable by name, team, throws, arm slot, pitch type.

## Phase 5 — Document & photo AI ingest

- Edge function `ingest-game-doc` (Gemini 2.5 Pro multimodal): accepts Trackman CSV, GameChanger export, Rapsodo CSV, or photo of scorebook/report.
- Returns structured draft events with confidence; UI shows per-event cards user assigns to inning + edits + saves.
- Attaches original file to `gp_documents` for audit.

## Phase 6 — Report Builder

- Per-role reports (Hitter / Pitcher / Defender / Baserunner) with side filter:
  - Heat maps (pitch location seen, contact location), spray charts, sequencing trees ("what's thrown to me in 0-2"), result-by-pitch-type, result-by-arm-slot, vs L/R pitching, situational LOB/RISP.
  - Strengths / weaknesses ranked by sample-size-adjusted confidence (uses existing confidence/missingness lineage).
- Search across games: opponent, date, inning, pitcher, pitch type, result, position, side.

## Phase 7 — Cross-app integration (Hammer + Roadmap + Dashboards + AI)

- Game-day weaknesses feed `dailyPlan.ts` modulation (e.g., 0-2 K-rate spike → next-day plate-discipline block).
- Roadmap goal progress receives game-derived signals tagged by category + side.
- Progress Dashboard adds Game tiles (correlations engine ingests `gp_*`).
- Ask Hammer gets `gp_*` context for game-specific Q&A.
- Side differential pipeline auto-aggregates from new tables.

---

## Technical notes

- **Stack:** existing React/Vite/Tailwind/shadcn + framer-motion. Reuses `SideContext`, `useSportConfig`, `protectedEditing`, `lazyWithRetry`.
- **AI:** Lovable AI Gateway, `google/gemini-2.5-pro` for multimodal doc parse, `google/gemini-3-flash-preview` for AI summaries/notes.
- **Files added (high level):** `src/pages/Games.tsx`, `src/pages/GameSheet.tsx`, `src/components/games/*` (AtBatDrawer, PitchByPitchDrawer, DefenseDrawer, BaserunDrawer, SubDrawer, PitcherDossierCard, StrikeZonePlanner, InningRail, EventBar, DocImportDialog, GameSearch), `src/hooks/useGameSheet.ts` (autosave), `src/lib/games/*` (event normalizers, side router, weakness emitter), `src/lib/reports/*` (heat/spray/sequence builders), `supabase/functions/ingest-game-doc/index.ts`.
- **Files deleted:** `src/components/game-scoring/GameSummaryView.tsx`, `src/components/splits/GameAtBatLogger.tsx`, `src/hooks/useGamePlays.ts`, related old hooks.
- **Migration is destructive.** Confirmed by user — no backup.

## Order of shipping

1. Migration + types (Phase 1)
2. Game Shell + At-Bat (Phase 2) → usable end-to-end immediately
3. Pitch / Defense / Baserun / Sub (Phase 3)
4. Pitcher Dossiers + Strike-zone planner (Phase 4)
5. Doc/photo AI ingest (Phase 5)
6. Report Builder (Phase 6)
7. Hammer + Roadmap + Dashboard wiring (Phase 7)

Each phase is a single approve-and-go batch; after Phase 1's migration approval, the rest is straight code.
