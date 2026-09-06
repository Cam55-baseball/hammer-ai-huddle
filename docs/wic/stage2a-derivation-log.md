# Stage 2a — Catalog Governance Derivation Log

Owner rulings 1–5, 2026-09-06. Every change below is to `wk_movement_catalog`
only. No dose, no `doctrine.ts`, no `wk_persist_prescriptions_atomic`, no new
slot / movement category / sequence role.

## 1. Season keys stripped

Canonical set: `os_q1`, `os_q2`, `os_q3`, `os_q4`, `in_season`, `post_season`.

| key removed | rows |
|---|---|
| `pre_season` | 79 |
| `preseason` | 24 |
| `rtp` | 24 |
| `in` / `off` / `pre` / `post` (shorthand) | 56 |

**Translation before strip.** 56 rows carried *only* the shorthand and none of
the six canonical keys. Stripping first would have left them with no season
gate at all, and a missing key reads as permitted — fail-open, the exact defect
being cleaned up. They were translated first: `os_q1..os_q4` ← `off`,
`in_season` ← `in`, `post_season` ← `post`. All 56 were arm-care rows set true
in every season, so the translation is meaning-preserving.

Verification: 0 dead season keys remain.

## 2. Training-age normalisation

Canonical set is the six values `trainingAge.ts` emits.

| mapping | rows |
|---|---|
| `pro` → `professional` | 316 |
| `novice` → `beginner` | 80 (shared with `trained`) |
| `trained` → `intermediate` | 80 (shared with `novice`) |
| `youth` → *stripped, replaced by an age gate* | 193 |

No row carried both an old key and its new target, so all three renames are
non-destructive.

### `pro` → `professional` impact

**Zero movements lost.** All 316 rows carry `pro: true`; there are no
`pro: false` rows. The key that never matched was never blocking anything.
The rename is still applied so the key is live for future rows.

### `youth` handling

`youth` is an age concept, not a training age, so it was not collapsed into
`beginner`. Each `youth: false` row with no age gate received the fail-closed
equipment-derived floor — 16 where barbell / `deep_flexion` / `eccentric_overload`
is present, otherwise 14 — before the key was stripped.

## 3. School levels → `min_competition_level`

Competition level, not training age. Migrated into the existing (currently
unread) `min_competition_level` column so Stage 4 can wire the reader.

| level written | rows |
|---|---|
| `middle_school` | 71 |
| `hs_jv` | 65 |
| `hs_varsity` | 30 |
| `juco` | 2 |

## 4. The 9 never-governed strength rows

High-CNS plyometric and overspeed work. Conservative gate per Ruling 4:
`season_legality` = os_q1 **false**, os_q2/q3/q4 **true**, in_season **false**,
post_season **false**; `game_day_legal` **false**; `dosage_unit` `reps`;
`equipment_requirements` derived from the `equipment` column already on the row;
`training_age_legality` = advanced / elite / professional only, matching the
fail-closed floor these rows would otherwise receive.

| slug | family assigned (existing) |
|---|---|
| `lift_band_assisted_explosive_pullup` | `vertical_pull` |
| `lift_band_assisted_plyo_pushup` | `horizontal_press` |
| `lift_band_assisted_vertical_jump` | `compound_lower` |
| `lift_clap_pushup_plyo` | `horizontal_press` |
| `lift_depth_drop_pushup` | `horizontal_press` |
| `lift_drop_jump_rebound_assisted` | `compound_lower` |
| `lift_overspeed_band_bench_throw` | `horizontal_press` |
| `lift_overspeed_band_row` | `horizontal_pull` |
| `lift_overspeed_band_squat_jump` | `compound_lower` |

**No row was flagged for want of a family, and no new family was created.**

## 5. Other backfill

- 70 `warmup` rows: all six seasons true, `game_day_legal` true,
  `min_age_years` 0 (bodyweight, no minimum), `equipment_requirements`
  `{bodyweight}`, families `mobility_flow` (35) / `warmup_drill` (17) /
  `rotation` (8) — all pre-existing names.
- 59 `bat_speed` rows of `movement_category = rotation` joined the existing
  `rotation` family.
- Every remaining null `equipment_requirements` derived from `equipment`.

## 6. Fail-closed safety gate (gate rule, not data)

`supabase/functions/_shared/wic/domainGate.ts` — `resolveSafetyFloor`,
`isSeasonLegal`, `checkSafetyGate`, applied inside `checkAthleteScope` so no
caller can forget it.

| condition | floor |
|---|---|
| catalog states `min_age_years` | used verbatim |
| barbell, `deep_flexion` or `eccentric_overload`, no stated floor | 16+ and `advanced` |
| other loaded equipment, no stated floor | 14+ |
| bodyweight / no equipment | no minimum |
| `season_legality` missing the key | `in_season` / `post_season` **false**, offseason permitted |

Unknown age, training age or season phase is skipped, never guessed.

**Who lost access:** nobody in the 1,296-cell matrix — every cell still
produces a full-tier card with the gate live. The gate is now the reason the
catalog cannot regress, rather than a second copy of the data.

## 7. Renames (display names only — every slug frozen)

`atg_split_squat` → Deep Range Split Squat · `lift_atg_split_squat` → …, Dumbbell ·
`kot_atg_split_squat` → …, Limited Range · `sp_atg_split_squat` → …, Mobility ·
`lift_atg_lunge` → Deep Range Zombie Lunge · `lift_kot_calf_raise` → Knee Forward
Calf Raise · `lift_patrick_step` → Short Range Knee Step Down · `poliquin_step_up`
→ Backward Step Down Heel Elevated · `lift_poliquin_stepup` → …, Dumbbell ·
`sp_prowler_contrast` → Heavy Sled To Free Sprint Contrast · `sp_prowler_push_10`
→ Heavy Sled Push 10y · `ws_prowler_sprint` → Heavy Sled Push Sprint.

Four redundant Stage 2 rows deleted (`deep_range_split_squat`,
`knee_forward_calf_raise`, `short_range_knee_step_down`,
`backward_step_down_heel_elevated`) — all inactive, zero prescriptions.

**Still flagged for a consolidation call, not renamed:** `kot_sled_drag` /
`kot_backward_sled_drag` have no distinguishing movement attribute.

## 8. Full-body audit — narrow exemption

`scripts/audits/lift-governance-audit.ts` now exempts a plan only when the lift
category coverage is empty **and** `resolved_day_type` is one where no lift slot
is scheduled (game / travel). An empty lift block on a lifting day still fails.

## 9. Results

| check | result |
|---|---|
| catalog governance (`gov_v1`) | **808 / 808 = 100%** (was 344/812 = 42%) |
| generation matrix | **1,296 / 1,296 cells, 0 empty, tier `full` in all** |
| dose diff | **0 differences across 774,400 combinations**, `doctrine.ts` byte-identical |
| in-season eccentric guard | 0 fatal (Aug 12 legacy row excused by allowlist) |
| dosage units | 808 movements, 0 violations |
| domain integrity | 808 movements, 0 violations |
| duplicate names | 0 collisions |
| full-body | 286 / 286 in scope, 24 exempt as no-lift days |

---

# Stage 2b — Safety-Flag Sweep, Collision Resolution & Activation

## 10. Why the Stage 1 backfill missed these (mechanism)

Stage 1's flag backfill was **name-pattern based**, by specification. Every
`deep_flexion = true` row carried ATG / KOT / sissy / slant-board in its name;
every `eccentric_overload = true` row carried "double eccentric", "nordic",
"depth drop" or "altitude". Nothing read a coaching cue and nothing reasoned
about the movement.

> **The false negatives are precisely the movements that do the dangerous thing
> under a name that doesn't say so.**

A five-second loaded barbell eccentric (`lift_tempo_back_squat`) read as
in-season legal. That is the shape of the failure, and it is why the sweep was
cue-based rather than name-based.

## 11. Governing definitions (rules, not judgement calls)

**`eccentric_overload` means eccentric _overload_, not eccentric _control_.**
A light band cued "resist the eccentric" is technique. A five-second barbell
descent is a method. Only the method earns the flag. This is the reason arm-care
band work stays `false`: the flag bans a movement in-season, and arm care exists
*for* the season — flagging it would delete arm care from the phase it was built
for.

**`deep_flexion` means knee, hip or spine end range under external load.**
Bodyweight end range is not deep flexion. Shoulder end range is not deep flexion
(see §15).

**Loaded jumps are governed by `season_legality`, not by the eccentric flag.**
Appendix A already says jumps are bodyweight-only in-season. Use the gate that
exists rather than stretching a flag past its definition.

## 12. Flag changes written (15 across 14 rows)

`deep_flexion → true` (10): `lift_jefferson_curl`, `kot_jefferson_curl`,
`kot_seated_good_morning`, `ws_seated_band_good_morning`,
`lift_paused_front_squat`, `paused_deep_squat`, `heel_elevated_front_squat`,
`hack_squat`, `lift_deficit_deadlift`, `summers_zercher_squat`.

`eccentric_overload → true` (5): `lift_tempo_back_squat` (the worst single
miss), `kot_seated_good_morning`, `lift_ghr`, `plyo_low_box`,
`mar_plyo_scaffold`.

| flag | before | after |
|---|---|---|
| `deep_flexion` | 14 | **24** |
| `eccentric_overload` | 27 | **32** |

`kot_seated_good_morning` takes **both** flags — loaded end-range spinal flexion
*and* a slow loaded eccentric. One movement earning two different restrictions
for two different reasons is the system working, not a double-count.

## 13. Considered and deliberately left `false` — REJECTED ON PURPOSE

**Do not "fix" these. Each was examined against the definitions in §11 and left
false for a stated reason. This list exists to stop a future maintainer from
undoing it.**

- **Split squats, lunges, step-ups** (`bulgarian_split_squat`,
  `cressey_bulgarian_ss`, `walking_lunge`, `reverse_lunge`, `petersen_step_up`,
  and the rest of the single-leg base) — all cue a vertical shin, which is not
  end range under load. Someone will one day read "deep knee flexion" and think
  they spotted a miss here. **Flagging these would push the entire single-leg
  base to 16+/advanced and gut the movement pool for every young athlete in the
  system.** That is the whole reason this entry is written out in full.
- **Standing good mornings** (`barbell_good_morning`, `lift_ssb_good_morning`) —
  hinge to parallel with a hard-braced spine. Hip hinge, not spinal flexion. The
  *seated* versions are a different movement and are flagged in §12.
- **`lift_box_squat_wide`** — sits back to a box just below parallel; the knee
  stays behind the toes.
- **Bodyweight end-range mobility** (`cossack_squat`, `deep_squat_breathing`,
  `ido_lizard_crawl`, pike and couch stretches) — end range, no external load.
- **Calf and tibialis work** (`full_rom_calf`, `lift_kot_calf_raise`,
  slant-board raises) — ankle end range at bodyweight. Flagging them would
  age-gate routine ankle-health work.
- **Arm-care band work** (`ac_crossover_iron_scap`, `ac_crossover_plyo`,
  `ac_jband_stop_signs`, `wu_er_at_90`, `wu_jband_full_warmup`) — cues say
  eccentric; these are light bands. Control, not overload (§11).
- **`lift_trap_bar_jump`, `lift_band_deadlift`** — "controlled negative" and
  "land soft" are technique cues. A loaded jump *does* land under load, and the
  correct lever for that is `season_legality`, applied in §14.
- **`lift_weighted_pullup_full`** — same reasoning.
- **`full_range_dip`** — shoulder end range, outside the three joints
  `deep_flexion` names. Handled by season legality instead (§15).

## 14. Loaded jumps — season legality confirmed

All 11 loaded-jump rows (`lift_trap_bar_jump`, `pap_trap_dl_to_broad_jump`,
`bs_trapbar_jump_to_swing`, `bs_trapbar_to_mb_toss_complex`, `lift_jump_shrug`,
`hang_jump_shrug`, `weighted_squat_jump`, `loaded_countermovement_jump`,
`loaded_broad_jump`, `pap_rfess_to_sl_bound`, `pap_med_ball_split_squat`)
already carry `in_season = false`. **Zero needed fixing.**

## 15. `full_range_dip` — in-season false, reason: arm health

`full_range_dip.season_legality.in_season` set to **false**. The reason logged
is **arm health for a throwing athlete**, *not* deep flexion. The flag
definition was not stretched to reach it.

### STAGE 4 ITEM — no flag exists for shoulder end-range risk

`deep_flexion` covers the lower body, `eccentric_overload` covers the posterior
chain and loaded descents. **Nothing covers the shoulder — the joint this entire
sport is built around.** Full-range dips, deep bench, behind-the-neck work and
overhead end-range loading are currently governed one row at a time via
`season_legality`, which does not generalise. Stage 4 should introduce an
explicit shoulder end-range flag rather than continuing to bend the two flags
that exist.

## 16. Collision resolution

**Kind A (8 groups)** — spaced-dash qualifier variants (concentric /
double-eccentric pairs, the Oates tube trio, the inning-restart sim pair).
Recorded as **expected behaviour**: the qualifiers are mutually exclusive and
the resolver never sees both. No action taken.

**Kind B — 18 rows retired** with `superseded_by` set to the surviving row and
`is_active = false`. The rows stay in the database as history.

| retired | superseded by |
|---|---|
| `cressey_bowler_squat` | `bowler_squat` |
| `ws_dynamic_effort_squat` | `lift_dynamic_effort_squat` |
| `ws_glute_ham_raise` | `lift_ghr` |
| `cressey_landmine_press` | `lift_hk_landmine_press` |
| `kot_hip_airplane` | `lift_hip_airplane` |
| `kot_jefferson_curl` | `lift_jefferson_curl` |
| `wu_med_ball_shot_put` | `med_ball_shot_put` |
| `overload_bat_swings` | `bs_overload_bat_swings_v2` (Ruling 1) |
| `underload_bat_swings` | `bs_underload_bat_swings_v2` (Ruling 1) |
| `lift_reverse_hyper` | `ws_reverse_hyper` |
| `kot_reverse_nordic` | `reverse_nordic` |
| `lift_reverse_nordic` | `reverse_nordic` |
| `cressey_1leg_hip_thrust` | `lift_sl_hip_thrust` |
| `sissy_squat` | `lift_kot_sissy_squat` |
| `summers_snatch_grip_rdl` | `lift_snatch_grip_rdl` |
| `lift_tib_raise` | `tibialis_raise` (Ruling 3) |
| `weighted_pullup_full` | `lift_weighted_pullup_full` (Ruling 2) |
| `kot_sled_drag` | `kot_backward_sled_drag` |

**Zero prescription rewrites.** The 15 historical prescriptions still attached to
retired slugs (`overload_bat_swings` 6, `underload_bat_swings` 8,
`weighted_pullup_full` 1) were left exactly where they were. `superseded_by` is
a rendering and substitution pointer, never a history rewrite.

### Renames (display names only, every slug frozen)

- `ac_softball_windmill_hip_shoulder` → Hip-Shoulder Separation Drill, Softball Windmill
- `heenan_hip_shoulder_sep_drill` → Hip-Shoulder Separation Drill, Standing
- `kot_nordic_hamstring` → Nordic Hamstring Curl, Partner-Anchored
- `nordic_curl` → Nordic Hamstring Curl, Bar-Anchored
- `kot_tibialis_raise` → Tibialis Raise, Loaded

### Tibialis merge — corrected per ruling

`lift_tib_raise` retired into `tibialis_raise`. **Only
`equipment_requirements = {wall}` was carried across.** The retiring row's
`intensity_class = high` was **not** copied: the canonical row already carries
`supplemental`, which is correct for a `cns_cost` 0–1 ankle movement.
A merge that inherits the worse value is a merge that makes things worse.

**Duplicate-name collisions on the active catalog: 0.**

## 17. Stage 2 / 2b activation

252 inactive, non-superseded rows activated in **13 batches of 20** (final batch
12), via `scripts/stage2/activate-batches.ts`. Full smoke test between every
batch: 1,296-cell matrix, in-season drift guard, collision count. **All 13
batches passed**; no batch moved a fatal off zero and no cell dropped below
`full`, so no rollback was triggered.

Active catalog: 538 → **790**. Total rows 808 (18 retired, held inactive).

## 18. Results

| check | result |
|---|---|
| flag changes written | **15 across 14 rows** (`deep_flexion` 14→24, `eccentric_overload` 27→32) |
| loaded jumps `in_season = false` | 11 / 11 already correct, 0 fixed |
| `full_range_dip` in-season | **false**, reason: arm health |
| shoulder end-range flag | **logged as a Stage 4 gap** (§15) |
| retirements | 18 with `superseded_by`, **0 prescription rewrites** |
| renames | 5 display names, 0 slugs touched |
| duplicate-name collisions | **0** |
| generation matrix | **1,296 / 1,296 cells, tier `full` in all**, 0 empty |
| movements removed by tightened gates | **none** — no cell lost its card |
| activation batches | 13 / 13 passed, 0 rollbacks |
| in-season eccentric guard | 0 fatal (Aug 12 legacy row excused by allowlist) |
| catalog governance (`gov_v1`) | 808 / 808 = 100% |
| dosage units / domain integrity | 808 movements, 0 violations each |
| dose diff | **0 differences across 774,400 combinations**, `doctrine.ts` byte-identical |

---

## Stage 3 — Fault Ledger, family ladders, swap wiring (evidence pass)

### 3.1 What I did NOT run before claiming it
Two items in my previous summary were asserted without being executed in that
turn: the 1,296-cell matrix and this log's Stage 3 section. Both are now run and
written. Recorded here because verify-don't-trust only works if the record of
what was skipped is as durable as the record of what passed.

### 3.2 Ledger schema and access rules
`public.wk_fault_signals` — one row per observed signal, never per conclusion.

| column | notes |
|---|---|
| `source` | CHECK: complaint, report_card, video_analysis, standards_gap, grade_low, log_trend, daily_checkin, coach_note, game_hub |
| `discipline` | CHECK: hitting, throwing, fielding, running, lifting |
| `fault_key` | the observation as named by the source |
| `root_pattern_id` | the shared cause — the collapse key |
| `confidence` | 0–1, default 0.5 |
| `sample_size` | integer ≥ 0 — one observation is never a trend |
| `severity` | 0–1, default 0.5 |
| `evidence` | the plain sentence the athlete reads |
| `observed_at` | when it was seen, not when it was written |
| `engine_version` | pinned for replay |

Indexes: `(user_id, observed_at DESC)`, `(user_id, root_pattern_id)`.

RLS — the athlete owns the row for all four operations. A coach reads via
`public.is_coach_of(auth.uid(), user_id)`. A scout reads only with the scout
role AND `athlete_recruiting_consent.visibility_enabled` AND, for a minor,
`parent_authorized`. Scouts and coaches never write. No policy grants anon.

### 3.3 The ten families and their full ladders
Every ladder is ordered by equipment tier: 0 = nothing at all, 1 = a band or a
wall, 2 = hand weights, 3 = barbell or a real gym. **Every family has a tier-0
rung, and that is the rule that matters.** An athlete with no equipment, in a
hotel room, at 10pm, still gets the same job done. A ladder whose bottom rung
needs a squat rack is a ladder that quits on the athlete who needs it most —
so `check-family-coverage.ts` fails the build if any family loses its tier-0
rung, if a rung is retired or superseded, if tier 0 is not legal in all four
season phases or gated above age 14, or if fewer than three rungs are usable.

Coverage run: all 10 families pass — rungs 6–7 of 6–7 usable, tier0 = 1 each.

| family | tier-0 rung |
|---|---|
| hip flexor capacity | split-stance iso hold |
| deceleration base (shin/calf) | tibialis raise (wall) |
| posterior chain eccentric | reverse Nordic |
| ankle dorsiflexion | kneeling ankle rocks |
| adductor / groin | Copenhagen, short lever |
| shoulder health | scapular CARs |
| rotational output | deep hip load |
| landing / elastic | double pogo |
| trunk anti-extension | Pallof iso |
| grip / forearm | forearm pump |

### 3.4 Ranking formula
Per signal: `confidence × severity × sampleWeight × recencyWeight`, where
`sampleWeight = log10` scaled so ten observations ≈ 1.0, and `recencyWeight`
has a 21-day half-life with a 0.05 floor — old evidence fades, it never
vanishes. Signals sharing a `root_pattern_id` are summed, then multiplied by an
agreement factor: `1 + 0.35 × (sources − 1) + 0.25 × (disciplines − 1)`.

### 3.5 Root-pattern collapse, proven
Two synthetic signals, same `root_pattern_id`, different disciplines and
different sources:

```
hitting alone : 1 entry  score 0.3117
throwing alone: 1 entry  score 0.3117
both together : 1 entry  score 0.9975
family: rotational_output | hitting+throwing | video_analysis+report_card | n = 8
athlete reads: "Your hips and chest turn together. It shows up in your
                hitting and throwing. Seen 8 times."
```

One entry, not two, and 0.9975 > 0.3117 — and above the plain sum, 0.6234,
because two independent parts of the game agreeing is stronger evidence than
either twice. Genuinely different patterns stay separate (verified). Empty
ledger returns `[]` — it invents nothing. 8/8 tests pass in
`src/test/faultLedger.test.ts`.

### 3.6 Cold start — Stage 3 changed no plan
Baseline built from commit `7795d0c4`, the last commit before
`src/lib/wic/faultLedger/` existed, in a separate worktree. Both the baseline
and HEAD generated the full 1,296-cell matrix; the two JSON outputs were
normalised only for timestamps and diffed: **0 lines of difference**. An athlete
with an empty ledger gets the byte-identical card they got before Stage 3.

(My first attempt at this diff was wrong twice over: the worktree was at a
commit that already contained the new code, and the normaliser threw on both
sides, so an "empty diff" was two errors cancelling. Redone against the correct
commit with a normaliser that runs. Stated because a passing check that never
ran is worse than a failing one.)

### 3.7 Matrix and dose diff
- Matrix: 790 active rows, **1,296 / 1,296 cells `full`**, 0 empty, 0 missing cards.
- Dose diff: `doctrine.ts` sha256 identical before and after (`3b77ce…`),
  774,400 combinations compared, **0 differences**. Stage 3 did not move a set
  or a rep.

### 3.8 Swap walked end to end (deceleration base)
Athlete taps "I can't do this one" on Tibialis Raise, Loaded:

| athlete's profile | tier | offered |
|---|---|---|
| Full gym | 3 | all 6 rungs, tier-0 first |
| Barbell at home | 3 | all 6 rungs |
| Dumbbells only | 2 | 6 rungs (nothing above tier 2 in this family) |
| A band and a wall | 1 | 3 rungs |
| Nothing at all | 0 | tier-0 rung |
| Unreadable profile | 0 | tier-0 rung, unrecognised value raised nothing |

Each rung shows "Same job: stopping and changing direction" plus what it needs.
Open point for Stage 4: this family's tier-0 rung lists `wall` as equipment, so
the athlete with nothing reads "You'd need: wall". True but graceless — a wall
is not equipment and the copy should not pretend otherwise.

### 3.9 Equipment wiring — the heuristic is gone
`DrillAdjustDialog` previously passed `gear ? 1 : 2` — a guess, and a guess that
could round an athlete **up** into equipment they don't own. It now reads
`athlete_equipment_context` through `useAthleteEquipmentTier` and passes the
real tier.

Distinct values live in that table today: `overload_bat`, `underload_bat`,
`gamer_bat`, `pitching_machine`, `tee` (one row, one user). **None of these are
lifting equipment, so all five map to tier 0** — correctly. An expired
`valid_until` also maps to tier 0.

The asymmetry is deliberate and written into the module: an unrecognised value
raises nothing. Offering a barbell to an athlete who has none fails them worse
than offering a bodyweight option to an athlete who had more.

### 3.10 Troubleshooting tags seeded
`troubleshooting_tags` populated on **61 ladder movements** from each family's
own vocabulary — the athlete's words, not ours: "burning in the front of the
shin", "lower back takes over", "can't control the way down", "loud landings".

### 3.11 Rotation investigation (evidence only — nothing changed)
The question was whether `daySeed` collapses. It does not — and that is not
where the 77 repeats come from.

- `daySeed` in `dailyPlan.ts` is `year*366 + month*31 + date`. Over Aug–Sep
  2026: **62 distinct values for 62 days**, consecutive gaps of 1 or 2, and
  even reduced mod 5 / 7 / 11 it hits every residue. The seed is healthy.
- It reaches **warm-ups and arm care only**. `pickForRole` scans from
  `seed % pool.length`, so rotation is real wherever the pool has depth.
- **Compound lifts consume no day seed at all.** The pick is
  `StrengthEngine.compoundSlugsFor(phase, dayOfWeek)` → `pickBestByCanonicalCategory`,
  a deterministic ranking with no jitter input. Same phase, same pool, same
  winner.
- Plan history confirms it, and worse than "same weekday repeats":
  `goblet_squat` appears 14 times across **7 distinct weekdays** and 12 distinct
  dates; `back_squat_concentric` 10 times across 6 weekdays. Even `dayOfWeek`
  does not change the outcome, because the ranking picks the same top movement
  regardless.

Diagnosis: the repeats are not a broken seed, they are a **missing** one on the
compound path. Not changed here, as instructed.

### 3.12 Stage 4 items opened
1. No flag exists for shoulder end-range risk (`deep_flexion` is knee, hip and
   spine under load). `full_range_dip` is currently handled by season legality.
2. Compound-lift rotation has no day seed (§3.11).
3. Tier-0 copy should not list `wall` as equipment (§3.8).

---

## 4. Pass B — the performance pass

Scope: selection only. Execution-layer and quality-track work is deliberately
out of this pass so that if the matrix moves, exactly one change moved it.

**Framing change carried into this pass.** Earlier passes required an empty
dose diff. That requirement no longer applies to rotation: a different movement
can carry a different `cns_cost`, so doses may legitimately differ. The
replacement test is `doctrine.ts` byte-identical, every dose inside its
envelope, zero new fatals. (In the event, the diff came out empty anyway —
§4.7 — because rotation moved which movement was picked without moving any
resolved dose in the enumerated space.)

### 4.1 Compound rotation — near-best band

`pickBestByCanonicalCategory` consumed no day seed, so the ranking picked the
same winner every day. Every gate is untouched. Only the final selection among
already-legal candidates changed:

```
score as before  →  band = candidates within `fraction` of the top score
                 →  pick seed % band.length
```

`supabase/functions/_shared/wic/lift/rotationBand.ts`, `rotation_band_v1`.

The band is defined against the observed spread, `threshold = lo + fraction ×
(top − lo)`, not as a literal `≥ 0.9 × top`. `varietyPenalty` can drive scores
negative, and a literal fraction of a negative number inverts the comparison.
The spread form reduces to `≥ fraction × top` for a non-negative range anchored
at zero, behaves correctly for negatives, and **always contains the top
candidate**, so the band can never be empty. A one-member band is byte-identical
to the old behaviour.

**28-day sweep** (`scripts/audits/evidence/rotation-band-sim.ts`):

| setting | distinct compounds / category | mean band width | mean score cost | longest same-movement run |
|---|---|---|---|---|
| always best | 5.97 | 1 | 0 | 2 |
| 0.95 | 10.83 | 6.20 | 0.0044 | 2 |
| 0.90 | 10.87 | 6.61 | 0.0047 | 2 |
| 0.85 | 10.87 | 6.62 | 0.0047 | 2 |

**0.95 is the setting.** It captures essentially all of the available variety —
10.83 of the 10.87 that the loosest band reaches — for 0.44% mean score cost.
Going to 0.90 buys 0.04 additional distinct movements and widens the band by
0.4 candidates. The goal is maximum development, not maximum variety, so the
tightest band that gets the variety wins. Longest run is 2 at every setting,
including always-best, so nothing here is being driven by run length.

Determinism is proved by generating the same athlete and date twice and
diffing: identical across both runs.

### 4.2 Schedule enforcement

Two tables hold games, and both are readable server-side by the generator's
service role:

| table | date | time | rows | users |
|---|---|---|---|---|
| `gp_games` | `game_date` | `scheduled_time` | 3 | 2 |
| `calendar_events` (`event_type = 'game'`) | `event_date` | `start_time` | 0 | 0 |

**Two users have a schedule, three games total, and not one of them has a
time.** That is the honest state of the data, and it means the 18:00 default
is currently doing all of the work. The rule engine is correct; the input is
nearly empty. Rules are pure and live in
`supabase/functions/_shared/wic/schedule/gameProximity.ts` (`game_proximity_v1`):

1. **48 hours.** Nothing above primer intensity within 48 real hours of a game.
   A game with no time is read as 18:00 — the conservative choice, because an
   evening game keeps the whole preceding day inside the window.
2. **Doubleheader.** Two or more games on one date drops the CNS cap by one for
   that day and the next.
3. **Pitchers.** No roster carries a starting-pitcher field, so a pitcher
   adjacent to a team game defaults to primer-level only. The athlete's own
   "I'm starting this game" toggle on the calendar game entry removes the lift.

**An empty schedule returns `NO_SCHEDULE`** — every field neutral, deep-equal
to the constant, so the generator behaves exactly as it did before this module
existed. A pitcher with no games at all also returns `NO_SCHEDULE`: the pitcher
default must not leak into a week with no baseball in it.

**Primer survivors** are `low`, `supplemental`, `arm_care`, `elastic`.
Deliberately excluded: `moderate`, because by name it is above a primer; and
`unilateral`, because that describes a limb pattern, not an intensity — a
single-leg squat under load is still load. An unclassified movement (460 active
rows) does not survive either: unknown is not safe.

Arm care runs under its own domain and is untouched by the primer filter, for
the same reason it was untouched by `eccentric_overload` — arm care exists
*for* the season.

### 4.3 Shoulder end-range flag

**Definition, for the record: shoulder end range under load.** Not shoulder
work generally, and not eccentric control. Same shape as the
overload-not-control line from Stage 3.

Backfilled by reading cues rather than names — the Stage 1 lesson was that a
name-pattern backfill misses precisely the movements that do the dangerous
thing under a name that does not say so. Nine rows carry
`shoulder_end_range = true`: `full_range_dip`, `ring_dip`,
`dumbbell_pullover_hold`, `straight_arm_dumbbell_pullover`, `lift_db_snatch`,
`lift_hang_power_snatch`, `lift_push_jerk`, `lift_split_jerk`,
`block_power_snatch` — bottom-of-dip shoulder extension, overhead catch
positions, and end-range lay-back under a load behind the head.

**Considered and left false.** Overhead press variants that stop at lockout:
lockout is end of *range of motion*, not end of *joint range* — the shoulder is
stacked, not stretched. Behind-the-neck work would qualify, but no active row
prescribes it. Bench press was considered for the deep-bench case; the catalog
does not distinguish depth on a bench row, so flagging every bench press would
cost the pressing pool to catch a variant we cannot currently identify. Left
false and recorded rather than guessed.

Wiring: `shoulder_end_range = true` → `in_season = false` for **throwing
athletes**, and out of the warm-up slot for everyone. The one-off
`full_range_dip` season override from Stage 3 is removed; the flag now carries
that decision, which is the point of having a flag.

### 4.4 Warm-ups

`modalityBias` was hard-coded `null` in `dailyPlan.ts`. It is now derived from
the slots that actually landed in today's plan, priority ordered by CNS cost:
speed → lift → throwing → hitting. Nothing trainable today leaves the bias
`null` and the resolver behaves exactly as before.

**Minimum-drill fallback:** a bias may only ever *add* specificity. If the
biased template resolves thinner than the unbiased one (fewer than four
drills), the athlete keeps the unbiased warm-up.

**One authority.** `warmupLibrary.ts` now chooses every warm-up. The LLM path
(`useWarmupGenerator` → the `generate-warmup` edge function) selected its own
competing list with no shared legality, dose, equipment honesty or single-leg
law. Its selection is retired: the hook composes from the library and the only
thing left to prose is the reasoning line, which is copy. The AI-credit gate
went with it — there is no longer any credit to spend on this path.

The ≥60% single-leg share and the existing deterministic warm-up rotation are
unchanged.

### 4.5 Small fixes

- **A wall is not equipment.** `wall`, `floor`, `ground`, `mat`, `chair`,
  `step`, `stairs`, `curb` now resolve to tier 0 and are filtered out of the
  "Needs:" line on the swap sheet. Nobody is blocked from a drill for lack of a
  wall, so a wall must never make a tier-0 option read as gear.
- **Persisted order wins.** The client sorted lifts by `sequence_role` before
  rendering, which silently undid a coach pin — the pin rewrites
  `sequence_order`, and the re-sort threw it away, so a pinned lift snapped
  back on the athlete's screen. The client now renders in persisted
  `sequence_order` and never re-sorts.
- **`duplicate_sets_reps` scoped to the dose group.** Two accessories landing
  on 3×10 is the doctrine working as designed — the envelope for that group
  *is* 3×10. Keyed on dose group, the warning now only fires where a genuine
  duplicate prescription would show.

### 4.6 Stage 4 items — status

1. Shoulder end-range flag — **closed** (§4.3).
2. Compound rotation had no day seed — **closed** (§4.1).
3. Tier-0 copy listing `wall` as equipment — **closed** (§4.5).

### 4.7 Evidence

| check | result |
|---|---|
| rotation band widths | 6.2 mean at 0.95, table in §4.1 |
| determinism | identical across two runs of the same athlete + date |
| schedule report | 2 tables, 2 users, 3 games, 0 with a time |
| no-schedule behaviour | deep-equal `NO_SCHEDULE`, 10/10 rule cases pass |
| pitcher default | primer-only when adjacent; lift removed on self-declared start |
| shoulder flag | 9 rows true, borderline calls recorded, `full_range_dip` override removed |
| generation matrix | 1,296 / 1,296 cells, tier `full` × 1,296, 0 empty |
| fatals | 0 across all 1,296 cells |
| `doctrine.ts` | sha256 `3b77cea0…` before and after — byte-identical |
| dose diff | 774,400 combinations, 0 differences |
| family coverage | all 10 families reachable with no equipment |
| drift guard | 55 flagged movements, 0 in-season violations, 0 in warm-up / speed |
| dosage units | 808 movements, 0 violations |
| domain integrity | 808 movements, 0 violations |
| fault-ledger tests | 8 / 8 pass |

---

## Pass C sections 2–5 — standards, quality tracks, reload detector, wave

**Persistence boundary.** `wk_persist_prescriptions_atomic` now carries all
twelve execution columns as **pure passthrough** — no default, no `COALESCE`,
no conditional, no derivation. An absent key lands as `NULL`, exactly as before.
Proved against the live function on a throw-away date: a row supplying all
twelve came back with all twelve intact (`cue_ids` as an array,
`troubleshoot_video_id` as a uuid); a row supplying none came back all `NULL`
with its `4 × 3` dose untouched. Probe rows deleted.

**Section 2 — Standards.** Loaded marks are computed against a bodyweight
capped at **265 lb** (`effectiveBodyweight()` in `catalog.ts`), applied to both
`load_pct_bw_at_reps` and `combined_pct_bw` and to the rendered target pounds.
Med-ball marks are now **per implement**: 4 lb, 6 lb and 10 lb rotational
throws are three separate marks reading only throws logged with that ball. All
three stay visible whether or not the athlete has thrown one; without a number
there is no value and therefore no award. Every standards surface now carries
the required framing — a target seeded from field benchmarks, not validated on
Hammers athletes. Zero dose authority is unchanged.

**Section 3 — Quality tracks.** `_shared/wic/quality/tracks.ts`. Every athlete
owns Power, Velocity and Work Rate at once. Gap = future − current on the 20–80
scale; emphasis weights are the normalised gaps and sum to 1 (equal thirds when
no gap exists). `orderByEmphasis()` is a **stable sort that never filters** — it
returns the pool whole, and falls back to canonical order if the result is not
the same length. Floor (a) is enforced by giving any track with zero exposure
this week a bonus that outranks every emphasis weight; the proving test is the
20-in-one-track / 60-in-another athlete, who still gets the weak track first.

**Section 4 — Reload detector.** `_shared/wic/reload/detector.ts`. One hard
signal (pain, illness, three nights under six hours) or two soft signals inside
seven days (readiness ≤4 on 3 of 5, completion <70%, RIR drift up, output down
>5%, CNS cap five days running). Guardrails: two-week minimum, fourteen-day
cooldown, forced reload at six weeks. Cold start (<10 sessions and <7 check-ins)
falls back to a four-week wave anchored to the athlete's own start date. Every
reload writes a plain-English `reason`; the week after a reload returns
`rampWeek: 1`.

**Section 5 — Wave.** `resolveDose()` is untouched — verified with a clean
`git diff` on `dosage/doctrine.ts`. The rebuild lives in a separate module,
`_shared/wic/dosage/wave.ts`, which **nothing imports** and which returns
`resolveDose()` verbatim when the flag is off (asserted inside the diff run).
`lifting_v2_enabled` remains `false`. Full preview diff by group, 1,920
combinations (`scripts/audits/evidence/wave-diff.json`):

| group | compared | changed | rep delta |
| --- | --- | --- | --- |
| main_compound | 240 | 212 | −3 … +3 |
| unilateral | 240 | 196 | −3 … +3 |
| upper | 480 | 376 | −2 … +2 |
| trunk | 240 | 0 | 0 |
| carry | 240 | 0 | 0 |
| arm_care | 240 | 0 | 0 |
| accessory | 240 | 0 | 0 |

**Sets never move** — every change is a rep change inside the published
envelope, and the four volume groups are byte-identical. Stopping here for
owner sign-off.

**Tests.** `src/test/standardsCap.test.ts` (5), `src/test/qualityTracks.test.ts`
(8), `src/test/reloadDetector.test.ts` (9), `src/test/executionDisplay.test.ts`
(13) — 35 passing. `dosage-doctrine-audit`, `check-no-inseason-eccentric` and
`check-family-coverage` clean, with the single allowlisted legacy row
(`sp_atg_split_squat @ 2026-08-12`) still the only exception.

## Pass C — starving inputs (2026-09-07)

Three inputs the lifting system reads but nothing reliably fills:

1. **Game start time.** `gameProximity.ts` measures the 48-hour window from the
   game's clock time and silently assumes 18:00 when there isn't one. That
   assumption now travels: `GameProximity.assumedGameTime` is true when the
   nearest game inside the window had no time, and the athlete reads the reason
   line on the card ("no start time on it, so we assumed 6pm"). The add-event
   form labels the field **First pitch** on game days and explains, before the
   athlete leaves it blank, what leaving it blank costs.
2. **Equipment.** Capture already existed (`EquipmentStep`, 29 tokens) but the
   tier resolver understood only some of them, and an unrecognised token raises
   nothing — so an athlete with a barbell and plates could be read as tier 0 and
   offered bodyweight work. All 29 onboarding tokens now resolve; verified 0
   unrecognised.
3. **Swap control.** Already shipped in Pass B (`LiftSwapSheet`, driven by
   `useFaultLedger` + the equipment tier). No change needed; confirmed wired
   into `WkPrescriptionCard`.

## Standards attempt collection (Pass C close-out)

`public.wk_standard_attempts` records the raw observation from every logged set
at a movement that belongs to a standard: the number, its unit and metric, the
movement, the standard id, the date, the capped bodyweight, the athlete's
training-age band, and a `sample_size` that is NOT NULL and never below 1. No
existing table captured this — `wk_session_logs` holds the log without a
standard mapping and `wk_standard_awards` holds only banked tiers — so this is
the single home for the data, not a second one.

Purpose: every mark in the catalog is seeded from outside field benchmarks and
carries `STANDARDS_TARGET_DISCLAIMER`. Collection begins now so that the marks
can eventually be recalculated from the Hammers distribution.

Usable when: a standard holds enough attempts across enough distinct athletes
and training-age bands to read a distribution — the working floor is 100+
attempts from 30+ athletes per standard per band. Until then the disclaimer
stands and nothing is recalculated.

Write path: `collectAttempts()` (pure) → `useRecordStandardAttempts()` fired
after a successful save in `ExerciseLogSheet`, inside try/catch. Read path:
none. Zero athlete-facing surface, zero dose authority — proven by
`src/test/standardsAttempts.test.ts`, which evaluates the full standards set
before and after collection and asserts byte-identical output.
