# Final E2E Closure — Pregame Plan reachable from the live game flow

Two surgical edits unlock the entire elite plan engine in real-world usage. Everything backing it (V2 schema, situational matrix, count grid, learning loop, AB swing analyzer, dossier ingest) is already shipped — but users can't reach it because the GameSheet never asks "who's pitching?" and the in-game card has no way to bootstrap a plan inline.

## What changes

### 1. Probable-pitcher picker on Game Overview
File: `src/components/games/GameSheet.tsx` (`OverviewPanel`)

- Add `usePitcherDossiers(game.sport)` lookup.
- Render a "Probable pitcher today" `Select` above the Positions row:
  - Options = the user's pitcher dossiers for this sport, newest-faced first.
  - "— None —" entry to clear.
  - Footer "+ New scouting profile…" that opens the existing pitcher dossier creation flow (Scouting Profiles route) with sport pre-filled.
- On change → `onPatch({ probable_pitcher_dossier_id: value || null })`.
- When set, show a chip beneath: "Plan + per-AB defaults use {pitcher.name}" with a small "Open profile" link.

Why it correlates: this single field unlocks `ActivePlanCard` (Live + Overview tabs), `AtBatLogger`'s per-AB default pitcher, every per-pitch zone aggregation in `gp-pregame-plan`, and the learning loop's archetype priors.

### 2. One-tap "Generate plan now" inside ActivePlanCard
File: `src/components/games/ActivePlanCard.tsx`

- When `pitcherId` is set but no plan exists, render a primary `Button` "Generate elite plan" that calls `usePregamePlans({ role: "pitcher", dossierId: pitcherId }).generate.mutate({ sport: game.sport, gameId })` with spinner + disabled state.
- Surface `generate.error?.message` inline if it fails (covers 402/429 from the AI gateway clearly).
- Keep the "Open dossier" hint as a small secondary link.
- On success, the existing `["active-plan", ...]` query invalidates and the full plan UI hydrates in place.

### 3. Cross-correlation verification (read-only)

Verify and adjust if any wire is loose — all of these already exist; this step confirms the field flows end-to-end:

- `AtBatLogger` → reads `probable_pitcher_dossier_id` for default `opponent_pitcher_id` and snapshots `pitcher_archetype_snapshot` so historical lookups stay stable.
- `gp-pregame-plan` edge fn → pulls direct AB history, direct pitch heatmap, archetype-history fallback, global zone tendencies, velo-band splits, planner priors, recent form, user context — already wired.
- `useLogPlanOutcome` → fires `gp-update-priors` (EWMA-decayed) after every thumb up/down on cues and situational entries.
- `gp-analyze-ab-swing` → per-AB swing video analysis is reachable from `AbSwingPanel` inside each AB row; receives `dossierId` so the analysis is pitcher-aware.
- `PregamePlanPanel` → already renders all 7 tabs (My attack, Get me out, Counts, Situations, Sequencing, Edges, Cues) from the V2 schema.

If any of those reads are missing the new `probable_pitcher_dossier_id` (e.g. `AbSwingPanel` not passing `dossierId`), they get a one-line fix in the same turn so every signal correlates.

## Technical notes

- No schema changes. `gp_games.probable_pitcher_dossier_id` column + FK already exist.
- No edge function changes. V2 prompt and learning loop are already deployed.
- No new components. Two existing files get focused edits; verification step may add one or two `prop`-pass fixes.
- Sport split is already enforced inside `gp-pregame-plan` (baseball vs softball pitch families + rise/drop zone language).

## Out of scope

- Refactoring the 7-tab plan view.
- Adding new dossier types or sensors.
- Any change to the migration files or RLS.
