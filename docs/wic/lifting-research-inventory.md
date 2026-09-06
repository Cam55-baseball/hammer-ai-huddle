# Lifting Research Inventory (internal only)

Status: collection in progress. The owner is still sending batches. No plan approved yet. Nothing here has been implemented.

Provenance rule: internal reference only. Athlete-facing copy never names an outside coach, company, organization or program, per docs/wic/weight-room-standards-v1.md. Extract principles, never reproduce source sheets or names.

## Our current system (verified from the database)

wk_periodization_blocks, 6 phases:
| phase | compound_style | sets | reps | supplemental | cns_cap | speed cadence | cross-sport |
| os_q1 Strength & Capacity | double_eccentric | 3-5 | 3-5 | kot | 4 | 48h | post_practice_daily |
| os_q2 Power Build | double_eccentric | 3-5 | 2-5 | kot | 4 | 48h | post_practice_daily |
| os_q3 Elastic Transfer | eccentric | 2-5 | 2-4 | functional_patterning | 3 | 72h | post_practice_daily |
| os_q4 Sport Sharpen | eccentric | 2-4 | 2-4 | functional_patterning | 3 | 72h | post_practice_daily |
| in_season Strength Primer | concentric | 2-3 | 2-3 | functional_patterning | 2 | 96h | daily |
| post_season Decompress | concentric | 2-3 | 3-5 | mixed | 2 | 96h | daily |

wk_standard_awards exists and is EMPTY. Five families defined in weight-room-standards-v1.md: Joint Armor, Posterior Armor, Relative Strength, Rotational Power, Arm Speed Base. Tiers: Standard, Elite, World Class. Loaded marks stored as % of bodyweight. Zero dose authority — no standard may change a set, rep, load or session order.

## Batch 1 — Level ladders and power testing

Four-level ladder, with level 4 branching by archetype (power / velocity / work-rate). Almost entirely bodyweight multipliers.
- L1 Emerging: goblet squat 30kg x10, push-ups 20, inverted row x10, hip hinge technique, dead-bug 10/leg, resting HR under 60, broad jump 190cm with perfect landing.
- L2 Top 10%: squat 1.6xBW, bench 1.2xBW, chin-up 0.3xBW, trap-bar 1.9xBW, farmers carry 1.7xBW/30s, MAS 4.12, broad jump 240cm, 30m 4.4s, neck flexion 20kg x20, BB lateral lunge 0.4xBW 6/side, nordic hip hinge 3x10, SL calf raises off block 15/side, kneeling rollouts 3x10.
- L3 Elite: squat 1.8xBW, bench 1.4xBW, chin-up 0.5xBW, trap-bar 2.4xBW, farmers 2xBW/30s, MAS 4.4-4.8, broad jump 250cm+, 10m accel under 1.75s, max velocity over 9m/s, RSI over 2, prone neck bridge 30s, lateral lunge 0.6xBW 6/side, full nordic x1+, SL calf raises 20/side, standing rollout x3.
- L4 Power: back squat 2.25xBW, trap-bar 2.75xBW, bench 1.5xBW, hang power clean 1.25xBW, CMJ over 45cm. Optional: front neck bridge 30s+, 10m under 1.7, MAS 3.9-4.3.
- L4 Velocity: RSI 2.5+, 10m 1.55-1.6s, max velocity 9.5-11m/s, CMJ 55cm+, broad jump 300cm+. Optional: trap-bar 2.5xBW, squat 2xBW, full nordic 3+, MAS 4.1-4.4.
- L4 Work Rate: MAS over 4.4, Wingate over 800W, resting HR, trap-bar 2.25xBW, bench 1.25xBW, squat 2xBW, CMJ over 55cm.
- Note: over 120kg bodyweight, aim for the standard of a 120kg individual.

Power test battery: vertical jump (D1 baseball average 24 inches), med ball sit-up throw (measured from centre of chest at top of sit-up), seated chest pass.

Med ball velocity by implement weight (rotational power, tracked beside bat speed and throwing velocity):
- MB supine throw, below-avg / average / elite: 2lb 34/37/41 mph; 3lb 32/35/39; 4lb 30/34/37; 5lb 28/32/35; 6lb 26/30/33.
- Shotput throw elite: 6lb 32; 5lb 33-34; 4lb 35-36; 3lb 37-38; 2lb 40+. Lighter implements better represent throwing velocity.
- Kneeling chest pass elite distance: 12lb 26ft; 10lb 31ft; 8lb 36ft; 6lb 41ft; 4lb 46ft+.
- Standing overhead throw elite: 6lb 34mph; 5lb 36; 4lb 38; 3lb 40; 2lb 42+.
- Rotational med ball throws produce the greatest velocities; best hitters score high on rotational movements.

Types of strength (rep and load mapping):
- Max strength: 1-5 reps at 80-100% 1RM, maximal recruitment.
- Max power: 1-3 reps at 40-60% 1RM, late-stage rate of force.
- Max velocity: 1-3 reps at plus or minus 10% bodyweight, early-stage rate of force.

## Batch 2 — Professional block programming

Session architecture, consistent across days:
Movement prep -> explosive / MB work -> Block I -> Block II -> Block III (sometimes IV).
Each block is a TRIPLET, not a list: primary strength lift + mobility/corrective + power/plyo. Example Block I: Squat or Hex Dead + 90/90 shoulder ER with band + weighted squat jump at 50% bodyweight.

Rep scheme mechanics:
- Warm-up sets printed but greyed (1x5, 1x3), then each working set gets its own row and its own recorded weight — ascending load per set, not flat sets.
- Reps descend across weeks: 3 reps in Wk1-2 dropping to 2 in Wk3-4.
- Blacked-out cells mean skip that set that week — volume drops as intensity climbs.
- "Green means 50% of last weight" — explicit in-block deload marker.
- Blocks run 4 or 5 weeks.

Intent tags carried per exercise (change execution without changing sets/reps):
"Intent is speed, move lighter weight fast"; "Hold 5s at the bottom for first rep only"; "Hold 5s at the top for first rep only"; "50% bodyweight"; "25% bodyweight"; "Add weight"; "No weight if needed"; per side / per arm / per leg / each way; "Last set 50% of 3rd set".

Load selection without a 1RM (two systems):
- Velocity based. Squat mean velocity, 1st rep to last rep: very heavy 0.5-0.4; heavy 0.6-0.5; moderate-heavy 0.7-0.6; moderate 0.9-0.8; moderate-light 1.0-0.9; light 1.1-1.0; very light 1.2-1.1. Hex dead peak velocity: very heavy 0.8-0.7; heavy 0.9-0.8; moderate-heavy 1.0-0.9; moderate 1.2-1.1; moderate-light 1.3-1.2; light 1.4-1.3; very light 1.5-1.4.
- RIR based, reps-left by scheme (DeWeese, Williams, Haske, Stone 2010). At 5x10 very heavy = 2-3 reps left, ranging to very light 8-9. At 5x5 very heavy = 1-2. At 4x2 very heavy = 1-1, moderate 3-3, light 5-5. The mapping differs per scheme — this is the most usable autoregulation model for us since we do not test 1RM and most athletes have no velocity device.

Warm-up variants (three, plus one standalone):
- Weight room, 9 steps: bike/rower/treadmill 5' moderate; lateral leg swings 1x5/side; fwd-bwd leg swings 1x5/side; arm circles fwd and bwd 1x10 each; trunk twists 1x5/side; hip circles 1x5 each direction; squat toe touch 1x10; CMJ 1x2 at 50% then 1x2 at 75%; proceed to force platform.
- Pitcher full, 18 movements: jog+backpedal 1x90'+90'; lateral shuffle 1x45'+45'; high knee carioca 1x45'+45'; front-to-back leg swings 1x5/side; side-to-side leg swings 1x5/side; alternating overhead reach 1x10/side; backward arm circles small to big 1x10; trunk twists 1x5/side; hip rotations 1x5/side; squat toe touch 1x5/side; all-fours t-spine rotation 1x5/side; iron cross 1x5; scorpion 1x5; roll back to reach through 1x5; lunge elbow tuck + rotation 1x45'; lateral lunge switch 1x45'; leg cradle 1x45'; frankenstein walk 1x45'. Optional foam roll top to bottom: upper back/lats, lower back, glutes cross leg, TFL/IT band, hamstrings/gastrocs — 10 sweeps + 10 count hold on hot spot + 10 more sweeps. Then running series: ham kicks 1x20', straight leg bounds 1x20', a-skips 1x20', build-ups 60-90% 2x60', walk back between drills.
- Pitcher shortened, 12: jog 1x2 poles; backward arm circles 1x10; trunk twists hands behind head 1x5/side; squat toe touch 1x5/side; lunge elbow tuck + rotation 1x45'; lateral lunge switch 1x45'; leg cradle 1x45'; frankenstein walk 1x45'; rudimentary skips 1x20'; ham kicks 1x20'; a-skips 1x20'; build-ups 2x60'. Starred items hold position for a 3-count.
- Hurdle mobility: both legs over each hurdle x2 each lead leg; step over every other hurdle x2; hurdle rhythm over 2 back 1 x1; lateral step over x2; over-under x2.

Mobility sequence, 15 positions ordered foot upward with hold times: plantar fascia 0:38; tibialis 0:37; single leg calf 0:56; elephant walk 0:59; single leg pike 1:02; double leg pike 0:47; piriformis or 90/90 2:18; hip flexor 1:25; couch 1:19; frog / frog rock 0:51; tailors pose 0:48; butcher block 1:18; t-stretch 1:01; cobra 1:09; dead hang 0:34.

Block objectives statement (5-week block): introduce higher loads to basic movement patterns preparing for greater intensities; introduce single plyometric movements potentiated by isometric holds, increasing strength in all ranges of motion; progress acceleration mechanics with resisted sprints before exposure to higher velocities.

Exercises observed across the packets (for catalog gap-checking): squat or hex dead, back squat, belt squat, front foot elevated reverse lunge, barbell reverse lunge, bulgarian squat, split squat, walking lunges, lateral lunge, step up, RDL, DB split stance RDL, DB RDL to row, nordic leg curl (AEL, band-assisted, weighted), glute ham raise, slideboard or physioball leg curl, hip thrust patterns, trap bar carry, farmer carry / hold / offset carry, suitcase hold, DB bench press, alternating DB bench, single arm DB bench, bench press, DB push press, push press, landmine push press, split stance landmine push press, DB overhead press, seated alternating shoulder press, DB squat to press, pull up (weighted, wide grip, chin up, with iso), lat pulldown, half kneel pulldown, half kneel cable high row, bent over row, DB row, seated row, chest supported row, single arm cable row, cable rotation (wide stance, high/low, bulgarian squat with rotation), pallof press hold, side plank with powell raise, sidelying shoulder external rotation, 90/90 shoulder ER with band, chest supported A's, seated hip CARs, seated t-spine, QHF stretch with t-spine, kneeling PVC lat stretch, bretzel stretch, elevated pigeon stretch, band hamstring stretch, mini band clamshell, kneeling ankle rocks, sidelying t-spine, ab rollout, rollout or bodysaw, tall plank shoulder taps, resisted dead bug, plate pinch, half kneel cable lift, sidewinder, physioball stick slaps, off bench oblique, weighted squat jump, weighted split squat jump, miometric weighted squat jump, box jump, AEL box jump, AEL single leg box jump, hurdle jump, continuous hurdle jumps, single leg mini hurdle jumps, alternating split jumps, depth hurdle jump, depth drop, depth drop to broad jump 12in box, depth drop to MB push toss 12in box, altitude landings, pogo jumps, hurdle pogos, MB push toss, MB push press toss, MB overhead toss heavy, MB hip toss, MB side toss, MB scoop toss, MB slam, MB toss for height, MB rotational decel toss, split stance overhead jump toss, med ball chest pass, KB swing, KB goblet squat, hang high pull, power high pull, hang jump shrugs, olympic clamshells, contra lateral step up, band pull through, lat band walk, powell raise, I's Y's T's, cat-cows.

## Batch 3 — Speed / energy system grid and flow-circuit model

Weekly speed and ESD grid. Volume is the dose; every item carries an intensity tag (M, MH, H, VH) that waves independently per exercise per week.
- Mon and Wed (power/accel): MB chest pass jump 3x3; MB chest pass chase 2-3x10m; sled pull 2x15m + 2x20m. Daily totals across 5 weeks: 90m, 100m, 100m, 100m, 70m.
- Tue (tempo): 8x100m then 10x100m, 11x100m, 10x100m, 6x100m at 18 seconds per rep with 1 minute rest, plus mobility program. Totals 800m, 1000m, 1100m, 1000m, 600m.
- Thu: cardio of choice 20 minutes, "equipment based but if not available jog/walk", plus mobility program. Final week swaps to core circuit: 2x10 bird dogs, 2x30" plank with reaches, 2x30" side plank each side, 2x15 v-ups.
- Fri (change of direction): sprint to back pedal 5m cones 2x10m; sprint-decel-sprint (sprint 5m, stop, sprint 5m to final cone) 1x2-3x10m with 1 min rest; sprint to 180 degree cut 5-5, 1x1-2x10m each way. Totals 80m, 90m, 90m, 90m, 70m.
- Sat empty. Week 5 is a deload on every day.

Flow-circuit model — a THIRD dosage model, different from both barbell and speed work.
- Numbered movement library with category prefixes: warm-up 001-020, cardio 202-213, core 301-304, lower body 401-429, upper body 501-520.
- Two clusters per day. Cluster 1 is prep/mobility, cluster 2 is the work. Each cluster labelled "3-5 sets" (sometimes 3, sometimes 5) — the athlete chooses within the range. No load prescribed at all.
- Dose units vary per movement: reps (10, 12, 20, 30, 40, 50), time (30 sec, 45 sec, 1 min, each side / each direction), or "till fail" / "till failure", or holds ("20 for 2 sec holds", "10 for 3 sec hold").
- Week shape: 5 training days, Day 3 rest, Day 6 conditioning (3-5 mile run/walk/jog OR 10x20-yard sprints). Day 1 lower, Day 2 upper, Day 4 lower/cardio/core, Day 5 mixed core and upper.
- Distinct movement vocabulary to preserve: drop ins, single leg drop ins, elevated drop ins, traveling drop ins, high knee drop ins, weighted drop ins, drop in calf raises, bow and corner wall flow, weighted bow iso, back chain iso slide, motigators, Ls, child rockers, child rocker flys, child rocker good mornings, access squat, goblet squat, hinges, jump lunges, single leg wall sit, wall sit, lateral banded walks, box step ups, two foot, lateral in and out ladder or line drill, a-skips, butt kicks, super mans, super man circles, side bends, weighted side bends, front side pulls, back side pulls, arm circles, reverse arm circles, iso scap circles, scap smashes, plate press, crossover push ups, alternating dumbbell press, shoulder mobility, cross crunches, penguin crunches, russian twist, quad stretch, hip stretch, hamstring stretch, lunge stretch, lateral lunge, calf raisers, flys.

## The structural decision this raises

Three incompatible dosage models are now on the table:
1. Barbell block — sets x reps x load, with tempo and intent tags.
2. Speed grid — weekly distance totals with subjective intensity codes, waving per exercise.
3. Flow circuit — set ranges, time or high reps or to-failure, no load.

Our engine has one doctrine: sets, reps, tempo, load_pct. wk_prescriptions already carries dosage_unit, total_reps, duration_seconds and distance_feet, so the columns partly exist, but the generator and validator assume the barbell model. Making all three first-class is the largest decision in the eventual plan.

## Status

Batches received: 3. More expected. No plan written or approved. Do not implement anything from this file without the owner's explicit approval.
