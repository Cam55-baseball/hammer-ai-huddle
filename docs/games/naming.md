# "Game plan" vs "Game ledger" — the two things that are not the same

Two unrelated systems in this app both used the phrase "game plan". This
document is the tiebreaker. Anything that contradicts it is drift.

## 1. Training Game Plan (`game_plan_*`)

- Tables: `game_plan_days`, `game_plan_task_schedule`, `game_plan_locked_days`,
  `game_plan_skipped_tasks`, `game_plan_week_overrides`, `game_plan_user_preferences`
- UI: `GamePlanCard`, `CoachScoutGamePlanCard`, Hammers Today
- Meaning: the athlete's **training** plan — the scheduled work for a day or week.
- It has nothing to do with baseball/softball games being played.

## 2. Game Performance Ledger (`gp_*`)

- Tables: `gp_games`, `gp_at_bats`, `gp_pitches`, `gp_defense_plays`,
  `gp_baserun_events`, `gp_subs`, `gp_pitcher_dossiers`, `gp_opponent_hitters`,
  `gp_pregame_plans`, `gp_reports`, …
- Views: `gp_v_*` — the deterministic aggregation layer (see `src/lib/games/reader.ts`)
- Access: **only** through `src/lib/games/ledger.ts` (`gp()`), enforced by
  `scripts/check-no-legacy-games.sh`
- UI: Game Hub (`/games`), Game Reports (`/games/reports`), Dossiers
- Meaning: what actually happened in a real game — at-bats, pitches, plays.

## Rules

1. Never name a new table, hook, or component with a bare `gamePlan`/`GamePlan`
   prefix unless it belongs to the **training** plan (#1).
2. Anything reading real game reps is prefixed `gp` / `Gp` / "ledger".
3. In user-facing copy, #1 is "training plan" or "your plan"; #2 is
   "game log", "game reports", or "Game Hub". Do not write "game plan" for #2.
4. `gp_pregame_plans` is the one legitimate exception — it is a **pregame
   plan for a specific game**, part of the ledger, never the training plan.

## Numbers rule (applies to #2 only)

Every number surfaced from the ledger:

- comes from a `gp_v_*` SQL view, never from an LLM;
- carries its own sample size `n`;
- is suppressed below `MIN_N` (10 reps; 5 for raw timing measures) with
  "not enough data yet";
- renders missing as missing. Never a zero, never a default, never interpolated.
