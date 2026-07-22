
## Goal

Bring the speed library to the same elite depth we just achieved for lifts. Today only **28 movements** are tagged for speed work — too thin to keep athletes progressing across 4 offseason quarters, in-season maintenance, and game-day primers. Users report weak start times, slow base-stealing, and stalled top-speed gains. We will expand to **~90 movements** drawn from the top track-and-field / speed-development canon and wire them into the existing `wk-generate-daily` engine automatically.

## Scope (only speed — no other cards touched)

### 1. Seed ~60 new movements into `wk_movement_catalog`

All tagged with `primary_adaptation`, `speed_category`, `speed_adaptation`, `movement_velocity`, `pap_classification`, `season_legality`, `training_age_legality`, `game_day_legal`, `practice_day_legal`, `transfer_group`, and `substitution_family` so the existing Speed Engine picks them up with zero code changes.

Philosophy sources (matches the Olympic + pro speed canon the user asked for):

- **Charlie Francis / Short-to-Long** — accel ladders 10→30→40y, tempo runs, EMS-style recovery runs
- **Loren Seagrave / ALTIS** — wicket runs, A-skips/B-skips/dribble series, Mach drills, prime-times
- **Dan Pfaff (multi-Olympic medalist coach)** — hill sprints (short/steep + long/moderate), sled contrasts 10–30% BW
- **Tony Holler "Feed the Cats"** — fly 10s, fly 20s, timed shutdowns, weekly PR tracking
- **Cal Dietz Triphasic** — eccentric-isometric-concentric single-leg jumps, altitude landings
- **Ken Clark / Peter Weyand** — mass-specific force pogos, single-leg hops for ground-force
- **Frans Bosch** — attractor-based coordination drills, isometric hip lock, split-stance switches
- **Adarian Barr / Feed the Cats stealing** — false-step vs. drop-step start comparisons, first-3-step timing
- **Driveline Baseball baserunning** — lead-off jumps, primary/secondary lead reactive starts, dive-back
- **Marinovich / reactive** — light/color/audio cue starts, mirror sprints
- **Knees Over Toes** — tibialis raises, backwards sled drags, ATG split squats for sprint durability
- **Softball-specific slap starts, crow-hop lead-offs, 43ft reactive breaks** (Sue Enquist / Michele Smith canon)
- **Elite baseball-specific** — pickoff jumps at 90ft, first-to-third reads, tag-up burst, home-to-1B timed splits (LHH + RHH)

Coverage targets (adds shown, existing in parens):

- **Acceleration / starts:** +14 (currently 4) → wicket ladders, 10y/20y/30y flys with countdown, resisted hill 10s, band-resisted starts, 3-point vs. 2-point vs. sport-specific stance starts, false-step audit, first-3-step contact drill, med-ball scoop-and-sprint, sled march 20–30% BW, Pfaff short hill, prowler push 10y
- **Top speed / max velocity:** +10 (currently 3) → wicket max-velo, fly 20s, fly 30s, fly 40s w/ shutdown, ins-and-outs, tempo build 60y, downhill 2–3° overspeed, upright-mechanics dribble→fly, Holler "record-day" fly 10, tempo 100s @ 75%
- **Base-stealing / sport-transfer:** +10 (currently 5) → primary-lead jump start, secondary-lead crossover, delayed steal read, dive-back explosive return, home-to-1B timed (LHH slap variant), 1B-to-3B on ball-in-dirt read, tag-up burst from 3B, softball 43ft primary lead break, catcher pop-time reactive break, first-move audit
- **Plyometric / elastic ground contacts:** +10 (currently 2) → altitude drops, single-leg bounds (alt+same), skater bounds for distance, hurdle hop series, tuck-jump-to-sprint, pogo series (double/single), continuous broad jumps, mini-band pogo, box-jump-to-sprint, depth-drop-to-fly-10
- **Resisted / overspeed contrast:** +6 (currently 2) → heavy sled 30% BW (accel only), light sled 10%, band-resisted start w/ release, tow-assisted fly, downhill assisted, wall-drive iso→sprint contrast pair
- **Mobility / durability for sprinting:** +6 (currently 3) → tibialis raises, ATG split squat, backwards sled drag, hamstring Nordic w/ sprint transfer, adductor copenhagen for groin resilience, single-leg RDL iso
- **Reactive / decision-based:** +4 (currently 3) → 2-color audio-cue start, mirror sprint 5-5-10, ball-drop reaction, coach-signal crossover start

### 2. Movement selection guardrails (already exist, we just populate them correctly)

- `season_legality` maps every movement to Q1/Q2/Q3/Q4/In-Season/Post-Season windows using Charlie Francis short-to-long progression (heavy resisted early, pure fly work late)
- `training_age_legality` — beginners get wickets/A-skips/tempo; advanced/pro get overspeed, altitude drops, heavy sled contrasts, timed fly 30s
- `game_day_legal = true` only for CNS-safe primers (fly 10, 2-3 reactive starts, wicket walk-through)
- `pap_classification` populated so the engine correctly pairs a `heavy` sled or hill with a `light` fly for contrast (mirrors what we did for bat speed)
- `substitution_family` populated so equipment / environment gaps auto-swap (e.g., no sled → hill; no hill → resisted band; no space → in-place pogo)

### 3. Verify the existing engine surfaces the new library

`supabase/functions/_shared/wic/engines/speed.ts` already selects by `speed_category`, `speed_adaptation`, `pap_classification`, `training_age_legality`, `season_legality`, and `game_day_legal`. No engine code change required — the new tags flow through automatically. Confirm this with a post-seed test by re-running `wk-generate-daily` for a sample beginner user and a sample pro user and diffing the returned speed card.

### 4. Wire the new library into the existing viewer

`/owner/workouts/library` (built last turn) already reads the catalog; the new movements will show up automatically under the Speed engine tab, philosophy badges intact.

### 5. Export a categorized library report

Write `/mnt/documents/hammers-speed-library.md` listing every speed movement grouped by category (Accel / Top Speed / Base Stealing / Plyo / Resisted / Overspeed / Reactive / Durability), showing which quarter and training age each is legal for. Same format as the lift export.

## Out of scope

- No lift, bat-speed, conditioning, warm-up, or recovery library changes
- No engine logic changes — only catalog seeding and metadata
- No UI changes to `WkSpeedCard`, `HammerDailyPlan`, or the viewer
- No changes to the constitution / doctrine / validator

## Technical detail

- Insertion happens via one migration adding rows to `wk_movement_catalog`. All new rows include full metadata (pattern, adaptation, joint stress, recovery cost, volume cost, bias, duplicate_group, recovery_window_hours, and the speed-specific columns listed above).
- Each movement includes `notes` / `coach_cues` / `common_mistakes` / `success_markers` in the same structured markdown shape the lift expansion used, so `WkPrescriptionCard`'s "Why this movement" dropdown renders cleanly.
- Post-migration verification: `SELECT speed_category, count(*) FROM wk_movement_catalog GROUP BY 1` should show every category ≥10 (except overspeed which is intentionally selective).
