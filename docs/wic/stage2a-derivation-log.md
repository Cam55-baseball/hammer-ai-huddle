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
