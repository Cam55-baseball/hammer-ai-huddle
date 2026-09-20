# Step 10 — dose diff (TI-0a-2, item 4)

Every catalog row whose **effective dose** changed. "Before" is the pre-change
state captured in `step10-revert.sql` (the revert restores exactly these values);
"after" is the live catalog, read back from `wk_movement_catalog`.

Rows that only moved to `dosage_unit='feet'` + `default_distance_feet=60`
(the 44 sprint rows that already ran as 60 ft) are unchanged in effective dose —
the unit simply now says what the row always did. They are listed at the end.

## A. Effective dose changed (15 rows)

| slug | before (unit · sets × reps/time/dist) | after | what changed |
|---|---|---|---|
| sp_copenhagen_plank | feet · 3 × 60 ft | seconds · 3 × 30 s | wrong unit — it is a 30-second hold, not a sprint; also moved speed_lab → strength |
| sp_nordic_hamstring | feet · 3 × 60 ft | reps · 3 × 5 | dose read out of the old name ("3×5"); speed_lab → strength |
| sp_sl_rdl_iso | feet · 3 × 60 ft | seconds · 3 × 20 s each side | 20-second isometric; speed_lab → strength |
| sp_tibialis_raise | feet · 3 × 60 ft | reps · 3 × 20 | speed_lab → kot |
| sp_hurdle_hop_series | feet · 3 × 60 ft | reps · 4 × 5 | dose read out of the old name |
| sp_pogo_double | feet · 3 × 60 ft | reps · 1 × 20 | dose read out of the old name |
| sp_pogo_single | feet · 3 × 60 ft | reps · 1 × 10 | dose read out of the old name |
| sp_altitude_drop | feet · 3 × 60 ft | reps · 3 sets | a drop is a contact count, not a distance |
| sp_box_jump_to_sprint | feet · 3 × 60 ft | reps · 3 sets | contact-counted |
| sp_continuous_broad | feet · 3 × 60 ft | reps · 3 sets | contact-counted |
| sp_tuck_to_sprint | feet · 3 × 60 ft | reps · 3 sets | contact-counted |
| sp_medball_scoop_sprint | feet · 3 × 60 ft | reps · 3 sets | contact-counted |
| sp_wall_drive_iso | feet · 3 × 60 ft | seconds · 3 sets | isometric hold |
| sp_wall_iso_to_sprint | feet · 3 × 60 ft | seconds · 3 sets | isometric hold into a sprint |
| lift_rdl_cluster | reps · 5 × 2, name "RDL Cluster (5×2 @ 30s)" | reps · 5 × 2, name "RDL Cluster" | dose unchanged; the 30-second rest moved out of the name into the staff cue (F7) |

No row's load, set count or rep count was raised. Every change either corrects
the unit to what the movement actually is, or moves text out of a name.

## B. Unit label only — effective dose unchanged (44 sprint rows)

`dosage_unit='feet'`, `default_distance_feet=60`, 3 sets — same 60-foot runs as
before, now stated in the row instead of implied. `sp_wicket_maxvelo` was left
alone (`runs` / 40 ft).

## C. Names with doses stripped (F7)

12 names lost an embedded dose (e.g. "Copenhagen Plank 3×30s" → "Copenhagen
Plank"). The dose now lives in the dose fields; the athlete card reads it from
there, so what the athlete sees is unchanged.
