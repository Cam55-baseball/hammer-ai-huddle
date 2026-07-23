Plan: Elite Team Game Plan inside the Game Hub

What we will change

1. Data model — attach opponent hitters to a game
   - Add a `opponent_hitter_dossier_ids` JSONB array column to `gp_games` with default `[]`.
   - No new table needed; existing `gp_pregame_plans.hitter_dossier_id` will store the generated plans per hitter.

2. Edge function `gp-pregame-plan` — role-aware game-plan schema
   - Keep the existing schema for `role="pitcher"` (personal hitting plan vs. this pitcher).
   - For `role="hitter"` (i.e., how the user pitches to this opponent hitter), return a new pitcher-centric schema that includes:
     - `team_game_plan`: `early_game`, `mid_game`, `late_game`, `key_adjustment`, `risk`, `why` — written in the exact style of the example ("offspeed early to allow fastballs to overpower this guy later…").
     - `pitching_plan`: primary sequence, putaway pitch, pitches to avoid, count plan, situational pitching notes.
     - `cues`, `in_game_triggers`, `mental_anchors`, `matchup_grade`, `confidence`, `rationale`.
   - Feed the dossier's spray tendency, chase zones, first-pitch swing %, and the user's direct pitching history vs. that hitter when available.

3. GameSheet Overview tab — opponent-hitter lineup builder
   - Add a multi-select row to attach/remove opponent hitter dossiers to the current game.
   - Persist changes to `gp_games.opponent_hitter_dossier_ids`.

4. ActivePlanCard — richer, two-sided plan surface
   - Keep the existing personal hitting plan vs. the probable pitcher at the top.
   - Add a new "Team pitching plan" section below it:
     - List each attached opponent hitter.
     - Show a one-tap "Generate plan" button if none exists.
     - Once generated, surface the `team_game_plan` narrative (early/mid/late strategy) and the top 3–4 cues.
     - Add thumbs-up / thumbs-down quick outcome buttons for each entry, feeding the same `gp_plan_outcomes` + `gp-update-priors` learning loop.
   - Empty state: prompt the user to tag a probable pitcher and/or opponent hitters.

5. Hooks
   - Extend `usePregamePlans` to already handle both roles (no change to its signature, but ensure role="hitter" reads/writes correctly).
   - Add a small `useGameOpponentHitters` mutation to update the lineup column on `gp_games`.

6. Verification
   - Run a type check and build to confirm no UI/TS regressions.
   - Deploy the updated edge function and test both `role="pitcher"` and `role="hitter"` plan generation.

What we will NOT do

- Build a full team/coach roster manager (this stays individual-athlete scoped).
- Add real-time pitch-by-pitch linking to opponent hitter IDs in this phase.
- Change the existing `gp_pregame_plans` schema for `role="pitcher"`; only the `role="hitter"` branch gets new fields.

The result: inside any game, the ActivePlanCard will read like a premium scouting report — both how the user should attack the opposing pitcher and how the user should pitch to each opponent hitter, with early/mid/late game strategy and quick outcome feedback.
