
# How the four Hammers Today cards are personalized

No code changes proposed. This is a read-only explanation of what the `wk-generate-daily` engine actually consumes when it builds the **Speed**, **Bat Speed**, **Lifts**, and **Conditioning** cards.

## What the generator DOES use (linked E2E)

Pulled per-user on every generation:

- **Athlete context** (`athlete_context`) — discipline (baseball/softball, pitcher, two-way), training age, season phase, goals ranking across speed/power/throwing/hitting/fielding, sub-goals
- **Handedness & side** (`athlete_side_preferences`, `athlete_mpi_settings`) — throws L/R/both, hits L/R/switch; drives movement laterality and bat-speed sequencing
- **Profile** (`profiles`) — identity, level, age bracket
- **Active injuries** (`user_injury_progress` where status = acute/active) — filters contraindicated movements and auto-regresses to safer substitutions
- **Body goals** (`athlete_body_goals`) — weight/mass targets bias hypertrophy vs. power selection
- **Daily load & sleep** (`athlete_daily_log`) — sleep < 6h triggers CNS-reduction path; recent load caps volume
- **Schedule** (`gp_games`, calendar events) — game-day → short crossover session; off-day/practice-day → full 8-block template
- **Adaptation decision** (WIC engine) — primary adaptation (max strength, RFD, hypertrophy, etc.) resolved from season phase + day type + training age
- **Movement catalog** (`wk_movement_catalog`) — legality gates: season phase, CNS cost, category requirements, bat-speed sub-category, injury contraindications

## What the generator does NOT currently use

Collected in onboarding / elsewhere but not read by `wk-generate-daily`:

- Nutrition context (`vault_nutrition_goals`, `hydration_settings`, fueling window prefs from `FuelRecoveryStep`)
- Mental / career context (`MentalCareerStep` answers, mental funnel routine)
- Anthropometrics beyond weight goals (height, wingspan from `AnthropometricsStep`)
- Foundation / HIE snapshots (`hie_snapshots`, `foundation_*`)
- MPI scores (`mpi_scores`) — used elsewhere but not fed into the four cards
- Video analysis outcomes (`video_user_outcomes`, weakness scores)

## Bottom line

The four cards are **substantially personalized** — not random. Movement selection is deterministic against athlete goals, side, injuries, sleep, load, season, and game schedule. The gaps are around nutrition/mental/foundation signals, which are collected but not yet routed into the workout generator.

No files will be changed.
