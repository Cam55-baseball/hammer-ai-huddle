#  Elite Movement Library Expansion — Ido Portal, Heenan, KOT, Marinovich, Westside, Summers, Cressey, Driveline

## Goal

Kill the "same boring workout" complaint by roughly doubling the exercise catalog (currently ~106 movements) with ~80 elite, professionally-sourced additions, each tagged to the right philosophy, engine, and season Quarter. Then give you an in-app viewer that shows the entire library sliced by Quarter so you can audit what athletes will actually see.

## Scope

### 1. Seed ~80 new movements into `wk_movement_catalog`

Each row gets: `slug`, `name`, `category`, `source_philosophy`, `cue`, `why_prescribed`, `primary_adaptation`, `equipment`, `phase_allow`, `season_eligibility`, `season_legality` (jsonb per-quarter map), `training_age_legality`, `cns_cost`, `recovery_window_hours`, `pap_classification`, `movement_velocity`, `game_day_legal`, `practice_day_legal`, `substitution_family`, `duplicate_group`, `wic_metadata_complete=true`, `governance_version='wic_v1'`. Rough distribution:


| Philosophy                               | Count | Engines / Categories                                                                                                  | Primary Quarter windows              |
| ---------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Knees Over Toes (Patrick)**            | 12    | KOT, unilateral_lower, arm_care (elbow/shoulder tilts), mobility                                                      | Q1–Q2 build, all-quarter maintenance |
| **Cressey Sports Performance**           | 12    | arm_care, unilateral_lower, unilateral_push/pull, compound, mobility                                                  | Q1–Q4 + in-season maintenance        |
| **Driveline (hitting + throwing)**       | 10    | bat_speed (plyo ball / bat-weight ladders), arm_care (weighted-ball J-bands, plyo shoulder), throwing prep            | Q2–Q4 + game-day primers             |
| **Westside Barbell (Simmons)**           | 10    | compound (max-effort, dynamic-effort, box squat, board press), speed_lab (band-resisted sled), conditioning (prowler) | Q1–Q2 max strength, Q3 dynamic       |
| **Ido Portal**                           | 8     | movement_prep / mobility / cross_sport (locomotion, hanging series, scapular pulls, squat sit, floreio flow)          | All quarters (movement literacy)     |
| **Josh Heenan (APT / rotational power)** | 8     | functional_patterning, bat_speed, trunk (anti-extension, hip-shoulder separation)                                     | Q2–Q4                                |
| **Marinovich (multi-plane athleticism)** | 8     | speed_lab, cross_sport (agility ladders, plyo scaffolding, sand work)                                                 | Q1 GPP, Q4 sharpening                |
| **Summers Method (Cressey / Summers)**   | 6     | supplemental (posterior chain, structural balance), compound assistance                                               | Q1–Q2                                |
| **Blended / PAP contrast bridges**       | ~6    | bat_speed, speed_lab, power (pair overload↔underload from new inventory)                                              | Q3–Q4, game-day primers              |


Every movement will:

- Include a plain-English `cue` and a `why_prescribed` that names the philosophy and the adaptation it drives.
- Populate `season_legality` per Quarter (`os_q1`, `os_q2`, `os_q3`, `os_q4`, `in_season`, `post_season`) so `wk-generate-daily` can select correctly.
- Set `training_age_legality` so entry-level athletes get regressions and advanced athletes unlock the heavy Westside/Driveline overload work.
- Attach `substitution_family` + `duplicate_group` so the validator can rotate variety and avoid repeats.

### 2. In-app Library Viewer (new admin page)

New route `/owner/workouts/library` (owner + build-access gated, matches existing owner tools):

- Tabs across the top: **Q1 · Q2 · Q3 · Q4 · In-Season · Post-Season · Game-Day**.
- Inside each tab, group by engine (Movement Prep, Warm-up, Sprint, Bat Speed, Power, Strength, Conditioning, Recovery, Mobility, Arm Care, Cross-Sport).
- Each row shows: name, philosophy badge, cue, sets/reps defaults, training-age gate, equipment icons, and a "why" popover.
- Count pills at the top (`Q1: 148 movements`, etc.) so you can see coverage at a glance.
- Read-only — pulls straight from `wk_movement_catalog`.

### 3. Verification

- Run the WIC audit script (`scripts/audits/wic-audit.ts`) to confirm every new row has complete metadata.
- Regenerate one athlete's Today plan and confirm the new movements start rotating in (variety uplift).

## Out of scope

- No engine logic changes — this is catalog + a read-only viewer only. Selection rules in `wk-generate-daily` already honor `season_legality` / `training_age_legality` / `substitution_family`, so new movements plug in automatically.
- No changes to Today-plan card UI.
- No pricing/tier changes.

## Technical details

- Delivered as **one migration** that inserts ~80 rows into `wk_movement_catalog` (ON CONFLICT DO NOTHING on `slug`).
- New page: `src/pages/owner/WorkoutLibraryViewer.tsx`, hook `src/hooks/useWorkoutCatalog.ts`, wired into the existing owner router alongside `/owner/iq/alignments`.
- Uses existing `@/integrations/supabase/client` — no new dependencies, no schema changes.