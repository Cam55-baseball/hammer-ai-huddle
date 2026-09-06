# Hammers Today — Lifting Enhancement Spec v4 (APPROVED)

## 0. Governing law — performance first

The weight room is a tool to raise on-field performance. It is not the product. We are not building weight-room monsters. Every rule below is downstream of that sentence.

**L0.1 — Hammer's Today always produces a card.** Never an error with nothing to show, for any user, any category, any reason. This outranks every other rule in this document, including every rule below.

**L0.2 — A lift never degrades the next skill session.** If a prescription would compromise tomorrow's throwing, hitting or game, it is reduced, not shipped.

**L0.3 — In-season load ceilings.** On top of the existing `cns_unit_cap = 2`:
- Maximum 2 lift sessions per training week in-season.
- Never on a game day (already enforced by `GAME_DAY_ALLOWED_SLOTS`).
- Never inside 48 hours of a game for anything above primer intensity.
- Pitchers: no lift slot the day before or the day of a scheduled start.
- Lift slot capped at 6 movements and a 30-minute duration budget in-season.
- **No novelty in-season.** A movement may only be prescribed in-season if the athlete has already performed it in a prior phase. New movements are learned in the offseason, never during competition.
- **Never to failure in-season.** RIR floor of 3. No open-ended "+" endings, no "till failure", no density targets — those are offseason tools only.
- No `eccentric_overload` and no `deep_flexion` movements (CI-enforced).

**L0.4 — Skill work wins the tiebreak.** On a heavy practice or throwing day, lift volume drops before skill volume does. The existing CNS cap modulation (−1 on heavy practice, −1 on travel) stays and is treated as a floor, not a ceiling.

**L0.5 — Pain or soreness flags reduce, never remove.** A flagged athlete gets movement prep + arm care + mobility. The card still ships.

**L0.6 — Standards never chase load.** Zero dose authority stands. In-season the standards board frames every mark as an off-season target so nobody grinds toward a number during the year.

**L0.7 — Output is the outcome metric.** If measured on-field output (bat speed, throwing velocity, sprint times) declines while lift volume climbs, that is a soft reload trigger. Performance decline outranks weight-room progress.

## 1. Dose authority

`resolveDose()` in `_shared/wic/dosage/doctrine.ts` is the only thing that produces a set or rep number. Its resolution order is fixed. `wk_persist_prescriptions_atomic` stays computation-free.

Two declared exceptions, both Stage 6 only: the week wave is rebuilt, and deload timing becomes autoregulated. Every other change in this spec is data or display.

## 2. Bug register

| ID | Severity | Bug | Fix | Stage |
|---|---|---|---|---|
| BUG-1 | Critical | `normalizeName()` in `validator.ts` strips everything from the first hyphen and all parentheses. "Single-Leg Calf Raise" and "Single-Arm Cable Row" both become `single` → `duplicate_name` → fatal → no plan. | Only strip a dash with whitespace both sides. Stop stripping parentheses. | 1 |
| BUG-2 | Critical | 17 fatal codes each block publication of the whole plan. No fallback exists. Violates L0.1. | Safe Plan ladder (§3). | 1 |
| BUG-3 | High | `rotation` is a live `sequence_role` on 20 rows but is absent from `CanonicalRole` and `LIFT_ROLE_ORDER`. No canonical position. | Add after `trunk_primer`, mirror client-side. | 1 |
| BUG-4 | High | `movement_prep` and `recovery` are in `GAME_DAY_ALLOWED_SLOTS` but may not resolve via `slotToCardType()` → `unregistered_slot` fatal on a game day. | Verify and register, or stop emitting. | 1 |
| BUG-5 | High | Double deload: `doctrine.ts` forces `t=0` in week 4 AND `progressionState.scaleSets()` applies a 0.6 volume factor. | Retire `scaleSets()` as a dose lever. | 6 |
| BUG-6 | High | Deload anchored to `2024-01-01` mod 4. Every athlete deloads the same week; a new signup can deload on day one. | Replaced by the Reload Detector. | 6 |
| BUG-7 | High | Dose resolved twice; the wave can push a row outside its envelope, which the validator turns into a fatal. | Re-clamp to envelope immediately after the wave, before validation. | 6 |
| BUG-8 | Medium | ~30 prescription rows with NULL `sequence_role` or NULL `dosage_unit`. Null unit is treated as rep-dosed → envelope math on a row with no envelope. | Backfill, then NOT NULL. | 2 |
| BUG-9 | Medium | `src/lib/wic/ordering.ts` lacks the server-only coach-pin logic; client and server can order a day differently. | Client renders from persisted `sequence_order`, never re-sorts. | 4 |
| BUG-10 | Medium | Three warm-up systems (client library, WIC slot, `generate-warmup` LLM function) with no shared dose or legality authority. | `warmupLibrary.ts` is the single authority; the LLM function is retired or demoted to copy only. | 4 |
| BUG-11 | Medium | `wk_cns_ledger` is write-only; nothing reads yesterday's spend. | Becomes an input to the Reload Detector. | 6 |
| BUG-12 | Medium | `check-no-inseason-eccentric.ts` matches exercise names as strings; Stage 2 renames would blind it. | Guard reads the new `deep_flexion` / `eccentric_overload` flags. | 1 |
| BUG-13 | Medium | Declared and unread: `tempo`, `load_pct`, `compound_style`, `supplemental_style`, `recovery_window_hours`, `recovery_cost`, `recovery_demand`, `min_competition_level`. | Employ `tempo`, `compound_style`, `supplemental_style`, `recovery_window_hours`, `min_competition_level`. Delete `recovery_cost` and `recovery_demand`. | 2/4/6 |
| BUG-14 | Low | `duplicate_sets_reps` warns constantly by design; real warnings drown. | Scope to dose group, or retire. | 4 |

## 3. The Safe Plan ladder (BUG-2)

On certification failure, never drop the plan. Step down in order:

1. Log every fatal to `wk_generation_diagnostics` in full. Nothing swallowed.
2. Drop the offending rows, re-validate. Most fatals are row-scoped.
3. Reduce to a legal core: movement prep, arm care, trunk, mobility. All time-dosed, so envelope math does not apply.
4. Safe Session — hardcoded, no catalog lookup, bodyweight, equipment-free, legal at age 14 in every phase.
5. The card always renders. Copy: "We couldn't build your full session today. Here's a session that keeps you moving." Plus a tap-to-report control.

## 4. Stage plan

**Stage 1 — Stop the bleeding.** BUG-1, 2, 3, 4, 12. Safety flags. Feature flag. Audit baseline. Data-availability report. No new content.

**Stage 2 — Catalog.** ~200 movements from Appendix A, inserted `is_active = false`, audited, activated in batches of 20. Athlete-facing renames (Appendix D). Frequency caps via `recovery_window_hours`. BUG-8.

**Stage 3 — Fault Ledger and symptom-to-fix families.** New table `wk_fault_signals`: `source` (complaint / report_card / video_analysis / standards_gap / grade_low / log_trend / daily_checkin / coach_note / game_hub), `fault_key`, `root_pattern_id`, `discipline`, `confidence`, `sample_size` (never null), `evidence`, `observed_at`. Signals sharing a `root_pattern_id` across disciplines collapse into one entry with a cross-discipline weight multiplier — this implements the existing standing rule that one fault across two disciplines is one root pattern, not two findings. Ranking: `severity × confidence × recency_decay × cross_discipline_multiplier`. Top three root patterns drive corrective selection, "Watch this next", and the roadmap page.

Ten seed families, each mapping a root pattern to 3–6 interchangeable exercises across equipment tiers: First-Step Capacity, Deceleration Base, Posterior Braking, Ankle & Depth, Back-Leg Block, Arm Health, Rotational Output, Landing & Elastic, Trunk Transfer, Grip & Forearm.

Hard rule: **every family contains at least one tier-0 member** — bodyweight, no equipment, legal at 14, legal in every phase. New CI guard `check-family-coverage.ts` fails the build otherwise. Equipment ladder is a fixed list: none → bands → dumbbells → barbell → full gym.

Cold start: an empty ledger falls back to position + phase defaults, which is today's behaviour. The ledger can only add priority. It can never remove a movement or empty a slot.

Second tag dimension: every exercise carries a troubleshooting tag ("what goes wrong with this") beside its training tag.

**Stage 4 — Execution layer.** New nullable columns on `wk_prescriptions`, all read only by the renderer inside try/catch, all rendering nothing on a null or unknown value: `intent_tag`, `execution_note`, `per_side`, `asymmetry_rule`, `open_ended`, `set_range_max`, `density_target_seconds`, `rir_low`, `rir_high`, `cue_ids[]`, `troubleshoot_video_id`, `intensity_mode`.

`set_range_max` and `density_target_seconds` are permitted on supplemental / warm-up / recovery slots only, never on a lift compound row. `open_ended`, `density_target_seconds` and RIR below 3 are forbidden in-season (L0.3).

Warm-ups: pass a real `modalityBias` from `dailyPlan.ts` instead of `null`, making the four existing templates reachable; add a `full` / `short` time budget; add the ordered foot-upward mobility flow. Fall back to today's `null` behaviour if a template returns fewer than the minimum drills. The ≥60% single-leg share law and the deterministic `daySeed` rotation are unchanged. BUG-9, 10, 14.

**Stage 5 — Three quality tracks and standards.** Every athlete owns all three tracks at once: Power, Velocity, Work Rate. No athlete is assigned a type. Each track carries a current grade and a future grade on the existing 20-80 scale. Onboarding questions plus measured data compute a gap per track; the largest gap gets the most weight in the **ordering** of an already-legal candidate pool.

Two hard floors: (a) every track gets at least one exposure per training week, so no quality ever falls to zero; (b) emphasis re-orders a list and never filters one — a sort cannot empty a pool, so it cannot produce a missing card. If a re-order yields nothing, fall through to canonical order.

Standards: add Appendix C marks to the five existing families. No new families. Store % of bodyweight, render pounds from the athlete's most recent logged bodyweight. Bodyweight above 265 lb is calculated at 265 lb. Med ball marks are entered per implement weight, always visible, entry optional, no award without a number. Every mark carries `internalProvenance` and is labelled a target seeded from field benchmarks, not validated on Hammers athletes.

**Stage 6 — Reload Detector and wave.** Replaces the calendar deload entirely.

Inputs: daily check-in (sleep, CNS readiness, soreness, pain flags), session completion rate, RIR drift at the same load, measured on-field output trend, missed sessions, `wk_cns_ledger` spend history, practice and game density.

Triggers — one hard signal, or two soft signals inside seven days:
- Hard: pain flag; illness; three nights under six hours' sleep.
- Soft: readiness ≤4 on three of the last five days; completion under 70% for a week; RIR drifting up at the same load; measured on-field output down more than 5% from the athlete's own recent best (L0.7); CNS cap hit every day for five days.

Guardrails: minimum two weeks of training before a reload can trigger; no more than one reload per fourteen days; forced reload at six weeks if nothing has fired. Cold start (fewer than 10 logged sessions and fewer than 7 check-ins): fall back to a four-week wave anchored to the athlete's own program start date.

Return ramp is explicit: week one back at the envelope's lower half, week two at normal position.

Transparency: every reload writes a `reload_reason` in plain English, rendered on the card. Example: "This week is a reload. Your readiness has been 4 or below on 3 of the last 5 days, and you're leaving more reps in the tank at the same weight than two weeks ago. Volume drops, quality holds. You ramp back next week." Never a silent change.

Wave rebuild: split the interpolation position. `setPosition` behaves as today. `repPosition = 1 − setPosition` for `main_compound`, `unilateral` and `upper` — reps descend toward the envelope floor as sets hold or climb, matching how a real strength block behaves. Volume groups (`trunk`, `carry`, `arm_care`, `accessory`) keep today's behaviour. Because `pick()` always returns inside `[lo, hi]`, results stay inside the envelope and no new fatal path is created. BUG-5, 6, 7, 11.

Also Stage 6: `compound_style` → tempo (`double_eccentric` = 4-2-1-0, `eccentric` = 3-1-1-0, `concentric` = 2-0-1-0). `supplemental_style` → pool filter (`kot` = deep-knee/tibialis/calf pool, `functional_patterning` = movement-flow pool, `mixed` = both).

## 5. Phase map

- **os_q1** (cap 4, KOT): high-rep tissue work 25–100 reps, deep-range split squat family, backward sled, full foot-upward mobility flow, box squat, dead-stop trap bar, extensive med ball. Out: depth drops, altitude landings, max-intent jumps.
- **os_q2** (cap 4): loaded unilateral, heavier carries, rotational med ball, loaded jumps 2×/wk, resisted accelerations, Olympic derivatives from blocks, first hurdle and split-squat jumps, loaded Jefferson curl and RDL. Out: 180° cuts, high tempo-run volume.
- **os_q3** (cap 3, FP): depth drop to broad jump, altitude landings, continuous hurdle jumps, rotational decel toss, seated jumps, assisted and band-release accelerations, sprint-decel-sprint, 180° cut, build-ups, intensive med ball. Out: new heavy barbell max work.
- **os_q4** (cap 3): CMJ, shot-put throw, low-volume seated jumps, high intent low volume, short warm-up. Out: anything novel.
- **in_season** (cap 2): concentric primers, arm care, isometric holds, wall sits, short mobility flow, light carries, band pull-aparts, all under the L0.3 ceilings. Out: Nordic family, Copenhagen, deep-flexion split squat, depth drops, accentuated-eccentric jumps.
- **post_season** (cap 2): foot-upward mobility sequence as the headline, high-rep tissue work, dead hang, sled walks, nerve glides, full stretch flow. Out: all loaded spinal work.

Loaded barbell spinal work (back squat, deadlift, good morning, loaded Jefferson curl, Olympic derivatives) opens at age 16 and `advanced` training age. Bodyweight ladders open at 14. Everything else follows the existing `training_age_legality` map.

## 6. Acceptance evidence — required every stage

1. Generation matrix: 6 phases × 5 training-age bands × 3 equipment levels × 3 ages × 4 day types = 1,080 runs. A card produced in 100% of cells.
2. Zero fatals from `lift-governance-audit`, `dosage-doctrine-audit`, `check-no-inseason-eccentric`, `check-dosage-units`, `check-domain-integrity`, `check-family-coverage`.
3. Dose diff, same athlete and date, flag off, before vs after — empty for Stages 1–5. Stage 6 ships a full diff for owner sign-off.
4. A real phone-width screenshot of a generated card.
5. Rollback rehearsed: flag off, regenerate, card still appears.
6. Subscription gating re-verified: no plan without a purchased prescription; no player-only activities on scout or coach accounts.

Stage-specific: Stage 1 adds the fatal-injection test (all 17 codes). Stage 2 adds the in-season ceiling test (L0.3 proven across a full simulated in-season week). Stage 3 adds tier-0 family coverage and a cold-start test. Stage 5 adds the weak-track exposure test (an athlete at 20 in one track and 60 in another still gets a weekly exposure in the weak track). Stage 6 adds a synthetic-data reload with the plain-English reason rendered, plus the cold-start path.

## Appendix A — Movements to add

Naming law from BUG-1: no two movements may differ only by a parenthetical or by text after a dash. Every name must be unique on its own words, checked with the corrected `normalizeName` before insert. Check each against the existing 556 rows by name, slug and substitution family; skip duplicates. Every row must carry `movement_category`, `governance_version = "gov_v1"`, `season_legality`, `training_age_legality`, `equipment_requirements`, `sport_scope`, `position_scope`, `game_day_legal`, `min_age_years`, `dosage_unit`, `substitution_family`, `cns_cost`, `deep_flexion`, `eccentric_overload`. No new movement categories.

**compound_lower, reps, age 16+, advanced:** Belt Squat · Back Squat · Front Squat · Heel Elevated Front Squat · Paused Deep Squat · Hack Squat · Hex Bar Deadlift · Conventional Deadlift · Barbell Good Morning

**compound_lower, starting strength, 72h window, age 16+, advanced:** Box Squat · Pin Squat Concentric Only · Dead Stop Trap Bar Deadlift · Block Pull Deadlift · Hang Power Clean · Block Power Clean · Block Power Snatch · Clean Pull From Blocks · Mid Thigh Pull

**single_leg, reps, per side:** Bulgarian Split Squat · Front Foot Elevated Reverse Lunge · Walking Lunge · Dumbbell Lateral Lunge · Barbell Lateral Lunge · Cossack Squat · Slider Reverse Lunge · Step Up · Backward Step Down Heel Elevated · Petersen Step Up · Short Range Knee Step Down · Contralateral Step Up · Single Leg Wall Sit (seconds) · Wall Sit (seconds) · Deep Range Split Squat [deep_flexion]

**posterior_chain, reps:** Reverse Nordic Curl [eccentric_overload] · Physioball Leg Curl · Slideboard Leg Curl · Glute Ham Raise · Single Leg Back Extension · Forty Five Degree Back Extension · Seated Good Morning · Slant Board Jefferson Curl (16+) · Dumbbell Split Stance RDL · Dumbbell RDL To Row · Band Pull Through · Barbell Hip Thrust

**foot_ankle, reps, cns_cost 0, legal every phase:** Tibialis Raise · Seated Tibialis Raise · FHL Calf Raise · Knee Forward Calf Raise · Straight Leg Calf Raise · Seated Calf Raise · Single Leg Calf Raise Off Block · Slant Board Calf Raise · Kneeling Ankle Rocks · Toe Walk · Heel Walk

**compound_upper_push, reps:** Dumbbell Bench Press · Single Arm Dumbbell Bench Press · Alternating Dumbbell Bench Press · Incline Dumbbell Press · Incline Barbell Bench Press · Landmine Press · Landmine Push Press · Split Stance Landmine Push Press · Half Kneeling Landmine Press · Dumbbell Push Press · Full Range Dumbbell Shoulder Press · Seated Alternating Shoulder Press · Dumbbell Squat To Press · Deficit Push Up · Ring Push Up · Banded Push Up · Yoga Push Up · Full Range Dip · Ring Dip · Plate Press

**compound_upper_pull, reps:** Pull Up · Chin Up · Wide Grip Pull Up · Weighted Pull Up · Isometric Hold Pull Up · Feet Elevated Inverted Row · Ring Row · Bent Over Barbell Row · Chest Supported Row · Seated Cable Row · Single Arm Cable Row · Half Kneeling Cable High Row · Half Kneeling Lat Pulldown · One Arm Cable Pulldown · Bird Dog Row · Hang High Pull · Power High Pull · Hang Jump Shrug · Straight Arm Dumbbell Pullover · Dumbbell Pullover Hold (seconds) · Band Pull Apart · Trap Three Raise · Prone Y T W Raise · Prone Weighted Reverse Fly

**arm_care, reps, legal every phase, cns_cost 0–1:** Side Lying External Rotation · Half Kneeling Band External Rotation · Dowel Assisted Ninety Ninety Stretch · Prone Horizontal Abduction · Powell Raise · Reverse Powell Raise · Scapular CARs · Banded Wall Slide · Serratus Wall Slide · Sleeper Stretch · Assisted Shoulder Flexion · Wall Finger Crawl · Zottman Curl · Incline Dumbbell Hammer Curl · Over Bench Wrist Curl · Reverse Wrist Curl · Forearm Pronation Supination · Radial Deviation · Ulnar Deviation · Wrist Roller · Plate Pinch · Neck Flexion · Neck Extension · Prone Neck Bridge (seconds) · Front Neck Bridge (seconds)

**core, reps unless noted:** Kneeling Ab Rollout · Standing Ab Rollout · Body Saw · Tall Plank Shoulder Tap · Bird Dog · V Up · Weighted Dead Bug · Banded Dead Bug · Russian Twist · Landmine Straight Leg Sit Up · Landmine Overhead Rotation · Bench Supported Side Bend · Weighted Crunch · Dumbbell Crunch · Cross Body Crunch · Straight Leg Sit Up · Dolphin Plank (seconds) · Four Way Plank (seconds) · Plank With Reach (seconds) · Plank Drag Through · Off Bench Oblique · Resisted Dead Bug · L Sit (seconds, 3 levels) · Hanging Knee Raise · Hanging Knees To Elbows · Garhammer Raise · Low Cable Hip Flexor Pull In · Strap Loaded Hip Flexor Raise

**carry, feet or seconds:** Suitcase Carry · Offset Farmer Carry · Trap Bar Carry · Overhead Carry

**jump_landing, reps, in-season bodyweight only:** Countermovement Jump · Hurdle Jump · Continuous Hurdle Jump · Single Leg Mini Hurdle Jump · Split Squat Jump · Alternating Split Jump · Hurdle Pogo · Weighted Squat Jump · Altitude Landing [eccentric_overload] · Depth Drop To Broad Jump [eccentric_overload] · Accentuated Eccentric Box Jump [eccentric_overload] · Accentuated Eccentric Single Leg Box Jump [eccentric_overload] · Loaded Countermovement Jump (72h) · Loaded Broad Jump (72h) · Trap Bar Jump (72h) · Seated Vertical Jump (96h) · Seated Box Jump (96h) · Seated Broad Jump (96h) · Single Leg Seated Jump (96h) · Non Countermovement Squat Jump (96h)

**rotation, reps or total_reps, 48h window:** Medicine Ball Chest Pass · Kneeling Medicine Ball Chest Pass · Seated Chest Pass · Medicine Ball Overhead Throw · Medicine Ball Supine Throw · Medicine Ball Sit Up Throw · Medicine Ball Shot Put Throw · Medicine Ball Side Toss · Medicine Ball Scoop Toss · Medicine Ball Slam · Medicine Ball Hip Toss · Medicine Ball Push Toss · Medicine Ball Rotational Deceleration Toss · Split Stance Overhead Jump Toss · Wide Stance Cable Rotation · Cable High Low Rotation · Half Kneeling Cable Lift · Half Kneeling Cable Chop

Extensive med ball sessions (50–100 low-intensity throws) ship as `dosage_unit: "total_reps"` with `intensity_mode: extensive`, which the validator already exempts from envelope math. Intensive sessions (10–20 high-intensity throws) stay rep-dosed with `intensity_mode: intensive`.

**speed slot, distance_feet:** Sled Push · Backward Sled Drag · Sled March · Heavy Sled Explosive Start · Resisted Acceleration · Band Resisted Acceleration · Band Assisted Acceleration · Band Release Start · Half Kneeling Start · Push Up Start · Falling Start · Sprint To Backpedal · Sprint Decelerate Sprint · One Eighty Cut Sprint · Backpedal · Lateral Shuffle · Build Up Sprint · Tempo Run Hundred Meter · Straight Leg Bound · Hamstring Kick · Rudimentary Skip

**mobility, seconds unless noted, cns_cost 0, legal every phase — foot-upward flow, keep this order:** Plantar Fascia Release · Tibialis Stretch · Single Leg Calf Stretch · Elephant Walk (reps) · Single Leg Pike Stretch · Double Leg Pike Stretch · Ninety Ninety Hip Stretch · Half Kneeling Hip Flexor Stretch · Couch Stretch · Frog Rock · Tailors Pose · Butcher Block Stretch · T Stretch · Cobra Stretch · Dead Hang

**mobility, warm-up drills:** Lateral Leg Swing · Forward Backward Leg Swing · Arm Circle · Reverse Arm Circle · Trunk Twist · Hip Circle · Squat Toe Touch · Frankenstein Walk · Iron Cross · Scorpion · Leg Cradle · Lunge With Elbow Tuck Rotation · Lateral Lunge Switch · All Fours T Spine Rotation · Roll Back To Reach Through · Cat Cow · Hurdle Step Over · Lateral Hurdle Step Over · Hurdle Over Under · Hurdle Rhythm Walk

**mobility, stretch and release:** Standing Pancake · Long Lunge · Standing Groin Stretch · Incline Pigeon Pose · Weighted Pigeon Pose · Weighted Butterfly Stretch · Elevated Pigeon Stretch · Bretzel Stretch · Thread The Needle · Childs Pose · Doorway Pec Stretch · Kneeling Achilles Stretch · Wall Ankle Mobilization · Overhead Wall Slide · Lat Foam Roll · Thoracic Foam Roll · Teres Ball Release · Median Nerve Glide · Ulnar Nerve Glide · Brachial Plexus Glide · Slant Board Calf Stretch · Slant Board Hamstring Stretch · Table Slide · Towel Sleeper Stretch · Mini Band Clamshell · Lateral Band Walk · Monster Walk · Seated Hip CARs

## Appendix B — Rejected, do not add

Proprietary or undecodable, rejected outright: motigators · drop ins · single leg drop ins · elevated drop ins · traveling drop ins · high knee drop ins · weighted drop ins · drop in calf raisers · GOATA calf raisers · bow and corner wall flow · weighted bow iso · back chain iso slide · Ls · child rockers · child flys · child rocker good mornings · rocker good mornings · access squat · two foot · front side pulls · back side pulls · iso scap circles · scap smashes · super man circles · shin walks · lateral in and out · MonkeyFoot · HASD · Kelly snatch · Prowler

Blocked pending an owner definition, do not add: 3 Way Raise · 3 Way Curl · 3 Way Tricep · Slide Lunge · Forearm Side Climbers · Body Bow Tension Stretch · Serratus 90 To Overhead Stretch · Backhand Spring · Plyo Ball Throws Routine · Curl Up Pull Up Let Down Bicep To Ear · Weighted Deep Psoas · Floor Med Ball Hug Pick Up · 90 Degree Sit Up · Reverse 90 Degree Sit Up · Low Core Ab Roll Out · Single Arm Med Ball Pass On Butt · Elbow To Knee Holds · Gorilla Slams · Plank Toe Touch With Fist Reach · Cross Banded Sit Ups · Band Resisted Hip Pull With Opposite Upper Pull · Spinal Waves · Pelvis Rotations · Eye Glass Stretch · Correa Internal Rotation Test · Cupping Work · Wall Palm Reach · Sidewinder

## Appendix C — Standards to add (Stage 5)

Joint Armor: Backward step down 6 inch box, %BW × 20 — 50 / 80 / 100. Single leg calf raise off block, reps per side — 15 / 20 / 25. L sit, 20 seconds at L1 / L2 / L3.
Posterior Armor: Reverse Nordic, reps — 5 / 8 / 12. Single leg back extension, %BW × 20 — 0 / 15 / 25.
Relative Strength: Bench press, %BW × 1 — 120 / 140 / 150. Weighted chin up, added %BW × 1 — 30 / 50 / 65. Farmer carry 30s, %BW — 170 / 200 / 225.
Rotational Power: Med ball supine throw 4 lb, mph — 30 / 34 / 37. Med ball shot put throw 4 lb, mph — 30 / 33 / 36. Kneeling chest pass 8 lb, feet — 26 / 31 / 36.
Arm Speed Base: Overhead throw 4 lb, mph — 32 / 35 / 38. Countermovement jump, inches — 20 / 24 / 28. 10m acceleration, seconds — 1.85 / 1.75 / 1.65. Reactive strength index — 1.5 / 2.0 / 2.5.

Three L4 destinations, all visible to every athlete, none assigned:
- Power: back squat >2.25× BW, trap bar >2.75× BW, bench >1.5× BW, hang power clean >1.25× BW, CMJ >45 cm
- Velocity: RSI 2.5+, 10m 1.55–1.60s, max velocity 9.5–11 m/s, CMJ 55 cm+, broad jump 300 cm+
- Work Rate: maximal aerobic speed >4.4, trap bar >2.25× BW, bench >1.25× BW, back squat 2× BW, CMJ >55 cm

## Appendix D — Athlete-facing renames (Stage 2)

Athlete-facing copy never names another coach, company or program. Internal slugs stay unchanged so nothing breaks; only display names change. ATG split squat → Deep Range Split Squat. KOT calf raise → Knee Forward Calf Raise. ROKP → Backward Sled Drag. Patrick step / step-up → Short Range Knee Step Down. Poliquin step-up → Backward Step Down Heel Elevated. MonkeyFoot hip flexor → Strap Loaded Hip Flexor Raise. Prowler explode → Heavy Sled Explosive Start.

Renaming is only safe after BUG-12 is fixed, because the in-season eccentric guard currently matches these names as strings.
