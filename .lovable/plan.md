## Goal
Expand the Lifts / Strength library the same way we just did for Bat Speed, so the Hammers Today "Lifts" card can serve every subscription — from a 12U beginner through pro — with programming pulled from the historically best strength-development systems (throwing harder, hitting harder, running faster).

The current catalog has strong rotational coverage (77 movements) but only ~40 movements across all lift roles (squat 13, hinge 11, pull 7, press 6+1, unilateral/carry/accessory ~15). That is why athletes feel the lifts are thin and repeat too often. This plan roughly triples the lift pool with historically proven, elite-grade movements and wires them into the existing strength engine so each subscription tier gets appropriate programming automatically.

## What ships

### 1. Seed ~90 new elite lift movements into `wk_movement_catalog`

Structured across 6 doctrine buckets, each tagged with `family`, `movement_category`, `season_legality` (per WIC quarter), and `training_age_legality` (beginner → pro) so the engine can filter safely. Each row includes `cue`, `why_prescribed`, `source_philosophy`, `evidence_note`, `equipment_requirements`, `cns_cost`, `default_sets/reps`, `intensity_class`, `game_day_legal`, `pap_compatible`, `bat_compatible`, `throw_compatible`, `sprint_compatible`.

**A. Max Strength Foundation (~15) — Westside / Prilepin / Sheiko**
Box squat variations, safety-bar squats, floor press, chain/band deadlift, block pulls, tempo back squat, paused front squat, safety-bar good morning, Anderson squat, RDL cluster sets, deficit deadlift, snatch-grip RDL. Progressed by ME (max effort) / DE (dynamic effort) waves. In-season legality tightly gated.

**B. Triple-Extension Power (~15) — Olympic Lifting / Cal Dietz Triphasic**
Hang power clean, hang power snatch, clean pull, snatch pull, jump shrug, high-pull, push jerk, split jerk, dumbbell snatch, KB clean & press, contrast trap-bar jump, French contrast lower complex, box jump to depth drop, med-ball scoop throw for height, triphasic tempo squat. Elite tiers only; beginners get the KB/DB regressions.

**C. Posterior-Chain & Hip Power (~15) — Cressey / Boyle / Louie Simmons**
Barbell hip thrust, single-leg hip thrust, back-extension iso hold, reverse hyper, glute-ham raise, Nordic curl (eccentric only for entry), banded pull-through, single-leg RDL, staggered-stance RDL, kettlebell swing (Russian + American), heavy sled march, single-leg 45° hyper, banded good morning, hip airplane, copenhagen adductor plank. Direct transfer to sprint speed, throwing velocity, and rotational power.

**D. Knees Over Toes / Structural Bulletproofing (~15) — Ben Patrick / Kelly Starrett**
ATG split squat, sled backward drag, Poliquin step-up, Peterson step-up, VMO leg extension, tibialis raise, KOT calf raise, Nordic hamstring, reverse Nordic, ATG lunge, hip-flexor iso, elephant walk, patrick step, jefferson curl (loaded spinal), couch stretch loaded. Universally legal — the durability layer under everything else.

**E. Upper Body Elite Push/Pull (~15) — Cressey Sports Performance / Driveline**
Landmine press, half-kneeling landmine press, single-arm DB bench, Swiss bar bench, floor press, weighted push-up (chains), 1-arm cable row, chest-supported T-bar row, meadows row, batwing row, weighted pull-up full ROM, ring row, face pull, band pull-apart, external-rotation cable at 90°, prone Y/T/W, bottoms-up KB press. Shoulder-preservation prioritized: horizontal pulling volume ≥ pressing volume.

**F. Carries / Anti-Rotation / Trunk (~15) — StrongFirst / DNS / FMS**
Farmer's carry, suitcase carry, waiter's overhead carry, mixed carry, front-rack carry, Zercher carry, weighted Turkish get-up, half-kneel pallof iso, RFESS pallof, standing anti-rotation press, cable chop cluster, cable lift cluster, dragon flag progression, hollow body pull-through, side plank leg lift, dead-bug band press, McGill big-3 loaded, ab-wheel rollout. Foundation layer for every athlete.

Beginner-friendly regressions (bodyweight / DB / band versions) are seeded alongside barbell/chain variants so the training-age gate always has something to give a 12U or a novice adult.

### 2. Upgrade the Strength Engine (`supabase/functions/_shared/wic/engines/strength.ts`)

- Expand each role slug list (`compoundSlugsFor`, `unilateralSlugs`, `upperPushSlugs`, `upperPullSlugs`, `carrySlugs`, `ARM_CARE_SLUGS`, `TRUNK_PRIMER_SLUGS`, `TRUNK_FINISHER_SLUGS`) to include the new slugs with correct season/training-age ordering.
- Add a **weekly rotation bucket** (M/W/F pattern) so a hitter never sees the same squat twice in a week even if season/phase filters allow it.
- Add **training-tier preference** — beginners preferred toward KB/DB/bodyweight; hs_varsity+ preferred toward barbell/chain/PAP; pro tier eligible for French contrast lower complex, tempo squat, snatch pulls.
- Add an **ME/DE Westside-style wave** for `os_q1`/`os_q2` phases: alternate max-effort day (heavy compound) vs dynamic-effort day (speed squat/DE bench). Encoded as a helper `westsideWaveFor(dayOfWeek, phase)`.
- Preserve `game_day_legal` and `in_season` filtering — nothing heavy on game day; in-season stays with tempo/single-leg/carry emphasis.

### 3. Certifier / template metadata

Verify each new slug satisfies the certifier's required tags for its role (family, `movement_category`, at least one of `power_emphasis|speed_emphasis|elastic_emphasis` where relevant, `wic_metadata_complete=true`). The bat-speed seed followed this pattern successfully.

### 4. Library viewer update

Add a **Lifts** tab (or expand the existing category filter) in `src/pages/owner/WorkoutLibraryViewer.tsx` that groups the ~130 total lift movements by the 6 doctrine buckets above with source philosophy visible per row, so you can inspect and QA what's in the library.

### 5. Athlete-facing copy

No new fields needed on `WkLiftsCard` — the seeded `cue` and `why_prescribed` are already athlete-safe (no CNS/phase jargon), consistent with the sanitization pass we did on `WkPrescriptionCard.tsx`. Just confirm on a Preview render that the new slugs display cleanly.

## What stays the same
- No schema migration (all columns already exist on `wk_movement_catalog`).
- No changes to `wk-generate-daily/index.ts` beyond the engine slug lists it already consumes.
- No changes to the athlete-facing card component contracts.
- Season / training-age gates remain the single source of truth for who sees what.

## Verification
- Run `SELECT family, COUNT(*)` on `wk_movement_catalog` and confirm each family expands as expected (target: squat ≥ 22, hinge ≥ 22, push ≥ 15, pull ≥ 15, carry ≥ 10, accessory ≥ 20).
- Force-generate a daily plan for a `youth beginner in_season` athlete and a `pro os_q1` athlete — confirm both get complete, non-repeating lifts blocks with appropriate movements.
- Confirm `wic_metadata_complete=true` on every new row.

## Technical details
- Data insert goes through `supabase--insert` (data op, existing schema).
- Engine changes are TypeScript edits to `supabase/functions/_shared/wic/engines/strength.ts`; deploys with the next edge function build.
- Preferred-slug ordering pattern mirrors the recently updated `batSpeed.ts`.
