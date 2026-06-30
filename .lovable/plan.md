## Final E2E Closure — Elite Pregame Plan, fully reachable & cross-correlated

The engine (V2 schema, situational matrix, count grid, archetype priors, AB swing analyzer, dossier ingest, learning loop) is shipped. This plan closes every remaining gap so a user can go from "who's pitching today?" → elite plan → live cues → per-AB tagging → swing analysis → priors update without ever leaving the game flow.

### 1. Probable-pitcher picker on Game Overview
`src/components/games/GameSheet.tsx` (`OverviewPanel`)
- Add `usePitcherDossiers(game.sport)` lookup.
- "Probable pitcher today" `Select` above Positions row; "— None —" clears; footer link "+ New scouting profile…" routes to Scouting Profiles with sport pre-filled.
- On change → `onPatch({ probable_pitcher_dossier_id: value || null })`.
- When set, show chip "Plan + per-AB defaults use {pitcher.name}" with small "Open profile" link.

### 2. One-tap "Generate elite plan" inside ActivePlanCard
`src/components/games/ActivePlanCard.tsx`
- When `pitcherId` set but no plan exists, render primary `Button` → `usePregamePlans({role:"pitcher", dossierId:pitcherId}).generate.mutate({ sport, gameId })`.
- Spinner + disabled state; surface `generate.error?.message` (covers 402/429 from AI gateway clearly).
- Keep "Open dossier" as secondary link. On success the existing `["active-plan", ...]` query invalidates and the full plan UI hydrates.

### 3. Cross-correlation verification & one-line fixes
Confirm every signal flows end-to-end; patch any loose prop in the same turn:
- `AtBatLogger` reads `probable_pitcher_dossier_id` as default `opponent_pitcher_id` and snapshots `pitcher_archetype_snapshot` so historical lookups stay stable.
- `AbSwingPanel` already receives `dossierId` — verify caller in `AtBatLogger` passes the AB's pitcher (fallback to game's probable pitcher).
- `gp-pregame-plan` edge fn — already pulls direct AB history, direct pitch heatmap, archetype fallback, global zone tendencies, velo-band splits, priors, recent form, user context. No change.
- `useLogPlanOutcome` → `gp-update-priors` (EWMA) fires after every thumb up/down on cues + situational entries.
- `PregamePlanPanel` already renders all 7 V2 tabs.

### 4. Quick reachability polish
- `GameSheet` Live tab: ensure `ActivePlanCard` mounts even when no AB is open yet (it does — verify).
- Add a one-line empty-state hint on the Scouting Profiles list: "Tag a pitcher on a game to unlock the elite plan."

### Technical notes
- No schema changes. `gp_games.probable_pitcher_dossier_id` + FK already exist.
- No edge function changes. V2 prompt + learning loop already deployed.
- Sport split already enforced inside `gp-pregame-plan` (baseball vs softball pitch families + rise/drop zone language).

### Out of scope
Refactoring the 7-tab plan view, new dossier types/sensors, migration/RLS changes.