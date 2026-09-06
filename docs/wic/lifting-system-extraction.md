# Lifting System — Exhaustive Current-State Extraction

Extraction only. Nothing in this document is a proposal. Every statement is
either quoted from code/data or explicitly marked **NOT IMPLEMENTED**.

Date of extraction: 2026-09-06.
Primary generator: `supabase/functions/wk-generate-daily/index.ts` (~3,150 lines).
Shared authorities: `supabase/functions/_shared/wic/**`.
Client mirrors: `src/lib/wic/**`, `src/lib/hammer/prescription/**`.

> **Critical structural fact, stated once up front.** There are **two
> independent generators** in this repo. The `wk-*` pipeline
> (`wk-generate-daily` + `_shared/wic/**` + `wk_*` tables) produces lifts,
> speed, bat speed, conditioning and cross-sport. The
> `src/lib/hammer/prescription/**` pipeline (client-side) produces the
> **warm-up**. They do not share a dose authority, a legality layer, or a CNS
> budget. Section 3 covers this in full.

---

## 1. Rep scheme resolution — where every number comes from

### 1.1 The single dose authority

`supabase/functions/_shared/wic/dosage/doctrine.ts` → `resolveDose()`.
Pure, deterministic, no I/O. It returns **only `sets` and `reps`**:

```ts
// doctrine.ts:206-215 (shape)
{ sets, reps, group, phase, envelope, band, notes, doctrine_version }
```

There is **no `tempo`, `load_pct`, `duration_seconds`, `distance_feet` or
`total_reps` anywhere on `ResolvedDose`.**

Call site comment, `wk-generate-daily/index.ts:1057-1061`:

> `doctrine.resolveDose` is the ONLY authority for a set/rep number. Catalog
> defaults and call-site hints are never trusted for rep-dosed movements; they
> survive only as the safety ceiling (`capSets/capReps`) and as the dose for
> total-dose units (seconds / feet / innings).

### 1.2 Phase normalisation

`doctrine.ts:41-59`. Six canonical phases: `os_q1 os_q2 os_q3 os_q4 in_season
post_season`. Aliases: `off_season|offseason → os_q1`, `preseason|pre_season →
os_q4`, `inseason → in_season`, `postseason → post_season`, **`rtp →
post_season`**. Unknown input starting with `in_season` → `in_season`;
everything else falls back to `os_q1`.

### 1.3 Dose groups and the role → group map

Seven groups (`doctrine.ts:24-31`): `main_compound unilateral upper trunk carry
arm_care accessory`.

`ROLE_GROUP` (`doctrine.ts:123-141`) verbatim:

| sequence_role | dose group |
|---|---|
| compound_lower, compound_upper, posterior_chain | main_compound |
| unilateral_lower, unilateral_push, unilateral_pull, single_leg | unilateral |
| upper_push, upper_pull | upper |
| trunk_primer, trunk_finisher, core, rotation, anti_rotation | trunk |
| carry_antirotation, carry | carry |
| arm_care | arm_care |

Unmapped roles fall through `doseGroupFor()` (`doctrine.ts:143-153`) which
sniffs the movement **category** string for `arm_care`, `carry`,
`trunk`/`core`, `unilateral`, exact `compound`, else `accessory`.

### 1.4 The full 6 × 7 matrix (verbatim, `doctrine.ts:66-121`)

`[minSets, maxSets] × [minReps, maxReps]`, plus declared intent.

| phase | main_compound | unilateral | upper | trunk | carry | arm_care | accessory |
|---|---|---|---|---|---|---|---|
| os_q1 (accumulate) | 4-5 × 4-6 | 3-4 × 6-8 | 3-4 × 6-8 | 2-3 × 8-12 | 2-3 × 8-10 | 2-3 × 10-15 | 2-3 × 8-12 |
| os_q2 (intensify) | 4-6 × 2-3 | 3-4 × 4-6 | 3-5 × 3-5 | 2-3 × 8-10 | 2-3 × 8-10 | 2-3 × 10-15 | 2-3 × 6-8 |
| os_q3 (express) | 3-5 × 2-3 | 3-3 × 4-5 | 3-4 × 3-5 | 2-3 × 6-10 | 2-3 × 6-8 | 2-3 × 10-12 | 2-3 × 6-8 |
| os_q4 (peak) | 3-4 × 1-3 | 2-3 × 3-5 | 3-3 × 3-4 | 2-2 × 6-8 | 2-2 × 6-8 | 2-3 × 10-12 | 2-2 × 6-8 |
| in_season (maintain) | 2-3 × 2-3 | 1-2 × 3-6 | 2-2 × 3-5 | 1-2 × 6-8 | 1-2 × 6-8 | 2-2 × 8-12 (durability) | 1-2 × 6-8 |
| post_season (decompress) | 2-3 × 5-8 | 2-2 × 6-8 | 2-3 × 6-8 | 1-2 × 8-10 | 1-2 × 8-10 | 2-2 × 10-12 (durability) | 2-2 × 8-10 |

### 1.5 The resolution order (exact)

1. **Envelope lookup** — `DOSE_MATRIX[phase][group]`.
2. **Training-age position** `t` — bands `beginner <1yr, developing <3,
   intermediate <6, advanced <10, elite ≥10` (`doctrine.ts:161-179`) mapped to
   `BAND_POSITION = { beginner 0, developing 0.25, intermediate 0.5, advanced
   0.75, elite 1 }`.
3. **Week-in-block wave** — `WEEK_POSITION_DELTA = { 1: -0.15, 2: 0, 3: +0.15,
   4: -1 }` (`doctrine.ts:182`), added to `t`; week 4 or `isDeloadWeek` forces
   `t = 0` (envelope floor).
4. **Interpolation** — `pick(range, t) = round(lo + (hi - lo) * clamp01(t))`.
5. **CNS clamp** — `if (cnsClamped) sets = max(envelope.sets[0], sets - 1)`
   (`doctrine.ts:246-250`). Never below the envelope floor.
6. **Hard safety cap** — `sets = min(sets, capSets)`, `reps = min(reps,
   capReps)` (`doctrine.ts:253-260`). Applied **last**; can only reduce.
7. **Minimum effective dose** — `sets = max(1, sets); reps = max(1, reps)`
   (`doctrine.ts:263-264`).

### 1.6 The two-pass problem (real, and load-bearing)

The first `resolveDose()` call at `index.ts:1064-1074` passes
`weekInBlock: null` — the 28-day history is not read yet. The dose is then
**re-resolved** in a post-pass at `index.ts:1666-1690` with the real
`progression.weekInBlock` and `progression.isDeloadWeek`; `rx.sets`/`rx.reps`
are overwritten in place, and the change is recorded as
`why_payload.dose_doctrine.wave_applied = { from: "4×5", to: "3×5" }` and, on a
deload, `why_payload.deload_applied = { from, to, reason: "Week 4 deload —
envelope floor, quality held." }`. Any post-wave row outside its envelope is
stamped `dose_doctrine.envelope_violation = true`.

### 1.7 Tempo and load_pct — **NOT generated**

`index.ts:1147-1148`, verbatim:

```ts
tempo: overrides.tempo ?? s.movement.default_tempo,
load_pct: overrides.load_pct ?? s.movement.default_load_pct,
```

No call site in the generator ever sets `overrides.tempo` or
`overrides.load_pct`. So both fields are **static pass-through of
`wk_movement_catalog` columns**. Live data confirms how thin that is:

| catalog column | populated / 556 rows |
|---|---|
| `default_sets` | 556 |
| `default_reps` | 458 |
| `dosage_unit` | 547 |
| `default_tempo` | **134** |
| `default_load_pct` | **15** |

And in `wk_prescriptions` (614 rows): 132 rows carry a tempo, 28 carry a
load_pct. **Tempo and load prescription is effectively not implemented.**

### 1.8 dosage_unit / total_reps / duration_seconds / distance_feet

"Unit routing", `index.ts:1105-1121`. Only `reps`/`rep` is rep-dosed
(`doctrine.ts:157-160`). For anything else, the number that would have been
`reps` is rerouted by unit string and `reps` is nulled:

- `seconds|sec|second` → `duration_seconds`
- `feet|ft|yards|yds` → `distance_feet`
- anything else (e.g. `innings`) → `total_reps`

Safety net, `index.ts:1124-1141`: a row that would ship as 1×1 with no other
dose is backfilled to `duration_seconds: 120, dosage_unit: "seconds"` when its
category contains `mobility|warmup|activation|recovery|functional_patterning`
or its slug starts with `frc_`.

### 1.9 Persistence

`index.ts:2776-2804` maps the rows and calls
`admin.rpc("wk_persist_prescriptions_atomic", …)`. The RPC
(`supabase/migrations/20260723180456_*.sql:42-60`) performs **no derivation** —
it `NULLIF`/casts the JSON it is handed and inserts. There is no database-side
dose logic.

### 1.10 What the live data actually looks like (614 rows)

| slot | sequence_role | unit | n | sets | reps |
|---|---|---|---|---|---|
| lift | compound_lower | reps | 37 | 1-3 | 2-3 |
| lift | unilateral_lower | reps | 42 | 1-3 | 3-6 |
| lift | upper_push | reps | 42 | 1-3 | 3-6 |
| lift | upper_pull | reps | 42 | 1-3 | 3-6 |
| lift | trunk_primer | reps | 42 | 1-2 | 6-8 |
| lift | trunk_finisher | reps | 20 | 1-2 | 6-8 |
| lift | rotation | reps | 20 | 1-2 | 6-8 |
| lift | carry_antirotation | reps | 42 | 1-2 | 6-8 |
| lift | arm_care | reps | 42 | 1-2 | 8-12 |
| speed | speed | feet | 34 | 2-3 | — |
| bat_speed | bat_speed | reps | 107 | 1-2 | 5-8 |
| conditioning | conditioning | innings | 18 | 1 | — |
| cross_sport | cross_sport | seconds | 42 | 2 | — |
| supplemental | (null) | (null) | 6 | 3 | 6-8 |

Note the legacy tail: ~30 rows carry a NULL `sequence_role` or NULL
`dosage_unit` — pre-doctrine rows.

---

## 2. Slot and sequence structure

### 2.1 Valid slots

`_shared/wic/ordering.ts:4-12` (mirrored at `src/lib/wic/ordering.ts:5-13`):

`warmup | cross_sport | speed | bat_speed | lift | supplemental | conditioning
| recovery`

### 2.2 Valid sequence_roles

`ordering.ts:14-27`: `arm_care | trunk_primer | compound_lower |
unilateral_lower | upper_push | upper_pull | carry_antirotation |
trunk_finisher | supplemental | speed | bat_speed | conditioning |
cross_sport`.

Live data also contains `rotation` (20 rows), which is **not** in the declared
`CanonicalRole` union but *is* mapped in `ROLE_GROUP` → `trunk`.

### 2.3 Canonical order

`SLOT_ORDER` is **derived from the card registry**, not hardcoded
(`ordering.ts:35-39`, from `_shared/wic/cardRegistry.ts:39-48`). Registry order
yields:

`warmup → speed → bat_speed → lift → supplemental → conditioning →
cross_sport`

`recovery` is declared in the slot union but its registry card has `slots: []`,
so it is **absent from the derived order** and sorts to the tail bucket.

Lift role order (`ordering.ts:41-51`):

`arm_care → trunk_primer → compound_lower → unilateral_lower → upper_push →
upper_pull → carry_antirotation → trunk_finisher → supplemental`

### 2.4 sequence_order assignment

`canonicalSortKey` returns `[slotIndex, roleIndex, sequence_order,
movement_slug]` (`ordering.ts:66-87`). Two cross-sport placements override the
slot index: `why_payload.placement === "early_activation"` pulls to the
cross-sport position; `"offseason_back_end"` pushes past every slot.

`assignSequenceOrder` (`ordering.ts:147-175`): coach-pinned rows
(`why_payload.manual_order === true` with a numeric `sequence_order`) claim
their index first, with collision shift to the next free index; everything else
is `sortCanonical`-ed into the remaining slots. Result is monotonic `0..n-1`,
guarded at publish by `index.ts:2161-2166` → fatal `sequence_order_gap`.

The client mirror `src/lib/wic/ordering.ts` is deliberately partial: it has
`SLOT_ORDER`, `LIFT_ROLE_ORDER`, `canonicalSortKey`, `sortCanonical` — but
**not** the manual-pin logic, which is server-only.

### 2.5 What governs each slot

| slot | authority |
|---|---|
| warmup | *client* `warmupLibrary.ts` (see §3) — WIC only reserves the slot |
| speed | `engines/speed.ts`, cadence from `wk_periodization_blocks.speed_cadence_hours` (96/48/48/72/72/96) |
| bat_speed | `engines/batSpeed.ts` + `batSpeed/movementCategories.ts` |
| lift | `engines/strength.ts` selects, `lift/sessionBuilder.ts::certifyLift` certifies |
| supplemental | no dedicated engine; rows pushed with role `supplemental` |
| conditioning | `engines/conditioning.ts` |
| cross_sport | `engines/crossSport.ts`, cadence `wk_periodization_blocks.cross_sport_cadence` |
| recovery | recovery logic embedded in `wk-generate-daily` |

---

## 3. Warm-ups

**The WIC pipeline does not generate warm-ups.** There is no
`_shared/wic/engines/warmup.ts`. `cardRegistry.ts:40` reserves the card
(`responsibility: "Movement preparation only"`), and `dayStructure.ts:6-9`
fixes `movement_prep` and `warmup` as the first two entries of the day — that
is the entire WIC-side involvement.

The real warm-up generator is **client-side**:
`src/lib/hammer/prescription/warmupLibrary.ts` (787 lines, `buildWarmup()`),
called from `src/lib/hammer/prescription/dailyPlan.ts:344-354`. It is
documented in `docs/wic/fast-twitch-warmup-v1.md`.

**What it varies by, today:** season phase, game day, practice day, travel day,
recovery day, readiness, injury regions, equipment, training-age lifecycle. Drill
choice rotates on a deterministic `daySeed` (`warmupLibrary.ts:683-687`) and
enforces the ≥60% single-leg share law (`SINGLE_LEG_MIN_SHARE`,
`warmupLibrary.ts:701-733`).

**What it does NOT vary by:** the lifts that follow. `WarmupContext` supports
`modalityBias: "speed" | "lift" | "throwing" | "hitting"`
(`warmupLibrary.ts:36-47`) and `resolveWarmupContext` implements
`speed_day/lift_day/throwing_day/hitting_day` templates — but the only
production call site passes `modalityBias: null` (`dailyPlan.ts:328-335`). So
those four templates are **unreachable in shipped code**. Reachable contexts
today: `game_day, recovery_day, travel_day, offseason_extended,
in_season_practice, in_season_default, default`.

A **third** warm-up path exists: `supabase/functions/generate-warmup/index.ts`,
an LLM-driven warm-up gated on subscription entitlement (lines 44-97), taking
context/equipment/venue from the client. It shares nothing with the other two.

---

## 4. Compound styles — **display only**

`wk_periodization_blocks.compound_style`, typed at `index.ts:201` as
`"double_eccentric" | "eccentric" | "concentric"`. Live values:

| phase | compound_style |
|---|---|
| os_q1 | double_eccentric |
| os_q2 | eccentric |
| os_q3 | concentric |
| os_q4 | eccentric |
| in_season | concentric |
| post_season | concentric |

**The only read in the entire generator** is `index.ts:1305`:

```ts
push("lift", "compound_lower", compound, {},
  `${block.display_name}: ${block.compound_style.replace("_"," ")} lower-body primer — …`);
```

That is string interpolation into the rationale. There is **no tempo mapping,
no load mapping, and no movement-pool filter** derived from `compound_style`
anywhere. Movement selection is `StrengthEngine.compoundSlugsFor(phase,
dayOfWeek)` (`engines/strength.ts:39`), independent of style.

So: **concentric / eccentric / double_eccentric currently have no mechanical
definition in this system.** They are labels.

---

## 5. Supplemental styles — **dead data**

`wk_periodization_blocks.supplemental_style`, typed at `index.ts:202` as
`"kot" | "functional_patterning" | "mixed"`. Live values: in_season
`functional_patterning`, os_q1 `kot`, os_q2 `kot`, os_q3
`functional_patterning`, os_q4 `functional_patterning`, post_season `mixed`.

A full-file grep for `block.supplemental_style` returns **zero matches**. It is
never read. **NOT IMPLEMENTED.**

What *looks* like style routing but is not:

- `domainGate.ts:44` `kot: "lift"`; `:64` `functional_patterning: "warmup"` —
  a category→domain table, not a style switch.
- `engines/strength.ts:133,148,151` hardcode `kot_atg_split_squat`,
  `lift_kot_sissy_squat`, `kot_lunge` into day-of-week slug pools.
- `index.ts:1130-1133` treats a `functional_patterning` category or an `frc_`
  slug as time-based for the duration fallback.
- `index.ts:3124` a hardcoded in-season pick list
  `["lateral_db_step_up","kot_lunge","sl_deadlift_fat_grips"]`.

---

## 6. CNS budget

**Cap source:** `wk_periodization_blocks.cns_unit_cap` (`DEFAULT 3`). Live:
in_season 2, os_q1 4, os_q2 4, os_q3 3, os_q4 3, post_season 2.

**Cost source:** `wk_movement_catalog.cns_cost INTEGER NOT NULL DEFAULT 1 --
0..3`. Live catalog (556 rows, all populated), max observed 4:

| category | rows | cns_cost range |
|---|---|---|
| mobility | 150 | 0-4 |
| rotation | 121 | 0-4 |
| arm_care | 82 | 0-3 |
| compound_lower | 57 | 1-4 |
| posterior_chain | 30 | 0-3 |
| single_leg | 28 | 1-3 |
| compound_upper_push | 23 | 0-3 |
| compound_upper_pull | 20 | 0-3 |
| jump_landing | 19 | 1-3 |
| carry | 17 | 1-3 |
| core | 6 | 0-1 |
| foot_ankle | 3 | 0 |

**Cap modulation** (`index.ts:540-589`), each floored at 1 and logged with a
plain-English reason:

- sleep < 6 h → −1
- CNS readiness ≤ 4 → −1
- recent acknowledgement (`learning_loop`) → −1
- heavy practice day and not a game day → −1
- travel day and not a game day → −1

**Spend and clamp** (`index.ts:1015-1034`):

```ts
const clamped = !isTotalDose && (cnsUsed + s.movement.cns_cost) > cnsCap;
cnsUsed += clamped ? Math.max(0, cnsCap - cnsUsed) : s.movement.cns_cost;
```

Total-dose movements (seconds/feet/innings) are exempt. `clamped` flows into
`resolveDose({ cnsClamped })` → one set off, never below the envelope floor,
and is persisted on the row as `cns_clamped`, echoed to the client
(`index.ts:1673`, session-level at `:2326`) and named in the why-copy
(`why_volume … today's CNS cap (${cnsCap})`, `index.ts:1090`).

**Ledger** (`index.ts:2907-2911`): upsert to `wk_cns_ledger` on
`(user_id, ledger_date)` with `units_spent`, `units_cap`, `breakdown` (cards
produced). 50 rows live. **It is write-only** — no read of `wk_cns_ledger`
exists anywhere in `supabase/` or `src/`. Nothing consumes yesterday's spend.

**`recovery_cost` / `recovery_demand` / `recovery_window_hours`** exist as
catalog columns; grep of `wk-generate-daily/index.ts` finds
`recovery_window_hours` only in the row **type declaration** (line 194) and
never in logic. The only enforced re-exposure rule is a hardcoded 72-hour
non-repeat for compound lifts (`index.ts:792-793`). **The per-movement recovery
window is NOT IMPLEMENTED.**

---

## 7. Progression, deload and "re-test"

`_shared/wic/progression/progressionState.ts` — pure, "performs NO I/O and has
NO side effects" (header, `:1-10`).

**Block/week are pure calendar maths** (`:343-440`):

```ts
const WAVE_ANCHOR_ISO = "2024-01-01";
const weekIndex  = floor(daysSinceAnchor / 7);
const blockIndex = floor(weekIndex / 4);
const weekSlot   = weekIndex % 4;
const blockPhase = BLOCK_PHASES[weekSlot]; // accumulate, intensify, peak, deload
isDeloadWeek = blockPhase === "deload";
```

So "Block 35" = days since 2024-01-01 ÷ 28, floored, +1. Every block is exactly
four calendar weeks and **week 4 is always the deload**, regardless of the
athlete's history, adherence, RPE or fatigue. There is **no mechanism to
trigger an early deload** from performance data.

**Phase factors** (`:222-229`): accumulate `{volume 1.0, intent 0.85}`,
intensify `{1.1, 0.95}`, peak `{1.0, 1.15}`, deload `{0.6, 0.8}`. `scaleSets()`
(`:654-659`) applies the volume factor. Note this coexists with the doctrine's
own week wave (§1.5 step 3) — the doctrine's `weekInBlock` re-pass is the
authority for lift rows; `scaleSets` is the older lever.

**The label** "Block 35 · Week 4 · Deload + re-test" is
`blockLabel()` (`:560-562`) + `PHASE_LABEL.deload = "Week 4 · deload +
re-test"` (`:553-558`), rendered by
`src/components/hammer/WkProgressionNote.tsx:33-38,55-59`.

**Re-test is a label, not a protocol.** Exactly one item per domain is flagged
(`index.ts:1648` `isTestItem = testItemByDomain.get(domain) === rx.movement_slug`),
and that flag is applied in a **post-selection annotation pass** — it sets
`wp.test_day`, `wp.test_metric`, `wp.test_metric_label` (`index.ts:1709-1729`)
and nothing else. It does not change exercise choice, dose, or the next block's
targets. The card copy asks the athlete to "log your {metric}" and compares to
prior best (`progressionState.ts:589-608`). **Auto-adjustment of the next block
from a re-test result is NOT IMPLEMENTED.**

Unrelated third implementation of the same idea, not wired to any of the above:
`src/data/ironBambinoProgram.ts:649-654` (`DELOAD_VOLUME_MODIFIER = 0.6`) and
`src/data/unicornProgram.ts:203-215`.

---

## 8. Every hard rule and guardrail

**Layer A — pre-selection filters** (`wk-generate-daily/index.ts:754-800` and
`_shared/wic/legality/preSelection.ts`). The mirror exists because "a movement
could therefore be picked legally and then rejected fatally"
(`preSelection.ts:5-16`).

| rule | where |
|---|---|
| min chronological age (`min_age_years`) — applied only when the age is actually known | `index.ts:779-784` |
| min training age (numeric) | `index.ts:761` |
| training-age legality map (`training_age_legality[class] !== false`) | `preSelection.ts:46-55` |
| single-slot category budget (compound_lower / upper_push / upper_pull ≤ 1; bat_speed elastic_rotation / overload / underload ≤ 1) | `preSelection.ts:70-77` |
| 72-hour compound non-repeat (hardcoded constant) | `index.ts:792-793` |
| skip log — unfilled requirements degrade to warn, never silent | `preSelection.ts` (`createSkipLog`) |
| sport scope (`sport_scope`) | `domainGate.ts:197-202`, `armCare/picker.ts:77` |
| position scope (`position_scope`) | `domainGate.ts:212-228`, `armCare/picker.ts:81-95` |
| domain ownership — only the owning engine may author a movement | `domainGate.ts:163-184` |

**Layer B — certification** (`_shared/wic/validator.ts`, `lift/sessionBuilder.ts`).
A `fatal` blocks publication of the whole plan.

| code | severity | where |
|---|---|---|
| duplicate_slug | fatal | validator.ts:74 |
| duplicate_name | fatal | validator.ts:79-80 |
| duplicate_sets_reps | warn | validator.ts:87 |
| dose_outside_envelope | fatal | validator.ts:103-110 / doctrine.ts:279-292 |
| game_day_forbidden_slot | fatal | validator.ts:53-60, 115-122 |
| missing_role (full-body) | warn | validator.ts:45-51, 127-133 |
| unregistered_slot, ordering_violation | fatal | validator.ts:143-161 |
| responsibility_violation (card hosting another card's slot) | fatal | validator.ts:167-179 |
| sequence_order_gap | fatal | index.ts:2161-2166 |
| session_shape_below_floor | warn | validator.ts:214-221 |
| re_exposure_window_violation | warn | validator.ts:197-204 |
| progression_lineage_missing | warn | validator.ts:206-212 |
| lift_governance_missing (no `movement_category` / `gov_v1`) | fatal | sessionBuilder.ts:132-146 |
| lift_illegal_season (`season_legality[phase] === false`) | fatal | sessionBuilder.ts:151-158 |
| lift_illegal_training_age | fatal | sessionBuilder.ts:159-166 |
| lift_illegal_equipment | warn | sessionBuilder.ts:168-181 |
| lift_unresolved_substitution | fatal | sessionBuilder.ts:193-199 |
| lift_not_full_body + lift_missing_compound_lower / _upper_push / _upper_pull / _core / _rotational_demand | fatal | sessionBuilder.ts:230-247 |
| lift_duplicate_category | fatal | sessionBuilder.ts:251-265 |

Return-to-play is structural, not a code: `lift/templates.ts:15,113,141`
resolves `full_body_return_to_play` when `input.isReturnToPlay`.

**Layer C — CI drift guards** (outside the request path, wired into
`scripts/preflight.sh`).

| guard | script |
|---|---|
| dosage doctrine grid (quarters distinguishable, in-envelope, ≥ MED, wk4 < wk3, training age moves the dose, no hardcoded set/rep literals) | `scripts/audits/dosage-doctrine-audit.ts` |
| skill-day ceiling ≤ 6/wk, pitchers never hit 6 | `scripts/check-skill-frequency-ceiling.ts:62-81` |
| in-season eccentric ban (Nordic / Copenhagen / ATG / depth-drop) and ATG barred from warm-up & speed slots | `scripts/check-no-inseason-eccentric.ts:20-92` |
| dosage-unit integrity (no seconds stored in `default_reps`) | `scripts/check-dosage-units.ts:53-72` |
| domain integrity (category→domain, tag conflicts, forbidden keywords) | `scripts/check-domain-integrity.ts` + `domainGate.ts:244-328` |
| catalog metadata gaps, legacy generator versions | `scripts/audits/wic-audit.ts` |
| lift governance coverage ≥ 95%, duplicate/full-body rates | `scripts/audits/lift-governance-audit.ts` |

**Priority order the whole system claims to obey** (`src/lib/wic/constitution.ts:6-23`):
`athlete_safety → recovery_state → medical_restrictions → schedule_context →
seasonal_phase → cns_readiness → development_objective → position_demands →
training_age → movement_quality → strength_deficiencies → speed_deficiencies →
bat_speed_deficiencies → throwing_hitting_workload → available_equipment →
available_time`.

**Declared but NOT enforced** (searched and confirmed absent from generator and
validator logic):

- `min_competition_level` — declared `index.ts:167`, collected in onboarding,
  never compared against the athlete's level.
- `recovery_window_hours` — declared `index.ts:194`, only read by the audit
  script as a completeness check.
- `recovery_cost` / `recovery_demand` — catalog columns, never read.
- The single safety cap still alive engine-side is
  `IN_SEASON_DEEP_FLEXION_CAP` (2×5) in `engines/strength.ts`, handed to the
  doctrine as `capSets`/`capReps` (`index.ts:1325`). A cap may only reduce.

---

## 9. The standards layer

**Current state: fully built in code, zero awards recorded.**
`wk_standard_awards` is empty (0 rows).

Five families (`src/lib/hammer/standards/catalog.ts:60-111`): **Joint Armor**,
**Posterior Armor**, **Relative Strength**, **Rotational Power**, **Arm Speed
Base**. Tiers `standard | elite | world_class`, labelled "Standard", "Elite",
"World Class".

14 standard definitions, 12 with catalog movements attached, 2 outcome-only
(`slugs: []`):

| id | metric | standard | elite | world class |
|---|---|---|---|---|
| ja_split_squat | %BW/hand × 5 | 15 | 25 | 40 |
| ja_patrick_step | reps | 15 | 25 | 40 |
| ja_tib_raise | reps | 15 | 25 | 40 |
| ja_sissy_squat | reps (never load) | 10 | 20 | 30 |
| ja_backward_sled | %BW | 30 | 50 | 75 |
| ja_calf_raise | %BW × 10 | 15 | 25 | 40 |
| pa_nordic | reps | 5 | 10 | 15 |
| pa_jefferson_curl | %BW × 10 | 10 | 25 | 40 |
| pa_rdl | %BW × 10 | 60 | 100 | 140 |
| pa_seated_good_morning | %BW × 5 | 25 | 50 | 75 |
| rs_trap_bar_pull | %BW × 1 | 175 | 225 | 275 |
| rs_squat | %BW × 1 | 125 | 175 | 225 |
| rs_press | %BW × 1 | 90 | 125 | 150 |
| rs_combined_ladder | squat+pull+press %BW | 400 | 500 | 600 |
| rp_shot_put | ft | 30 | 42 | 55 |
| rp_bat_speed | mph (outcome only) | 65 | 75 | 85 |
| as_throw_velocity | mph (outcome only) | 80 | 90 | 100 |
| as_power_base | broad jump ft | 8 | 9.5 | 10.5 |

Safety floors (`weight-room-standards-v1.md:30-33`): chronological floor 14
minimum; loaded spinal and heavy-barbell marks open at 16 **and** `advanced`
training age; bodyweight ladders open to everyone at 14+.

**The zero-dose-authority rule, verbatim** (`docs/wic/weight-room-standards-v1.md`):

> "Standards v1 adds that endpoint — and nothing else. It is a measurement and
> recognition layer sitting *on top of* the prescription engine. It cannot
> write a set, a rep, or a pound."

> "**Zero dose authority.** No standard, tier, or near-miss changes a set, rep,
> load, or session order. The dosage doctrine remains the single authority.
> Standards are rendered as *targets*, always labelled as such."

> "No gating: an unmet standard never withholds an exercise or a progression."

> "Awards are written on save from `ExerciseLogSheet`, inside a `try/catch` — a
> standards failure can never block a log from saving."

---

## 10. Extension points — file by file

| to add… | edit | notes |
|---|---|---|
| a new movement | `wk_movement_catalog` row | must carry `movement_category`, `governance_version = "gov_v1"`, `season_legality`, `training_age_legality`, `equipment_requirements`, `sport_scope`, `position_scope`, `game_day_legal`, `min_age_years`, `dosage_unit`, `substitution_family`, `cns_cost` — or `lift_governance_missing` is fatal |
| a new movement **category** | `_shared/wic/lift/movementCategories.ts` (`MovementCategory` union) + `_shared/wic/domainGate.ts` `CATEGORY_TO_DOMAIN` | per-engine equivalents exist under `armCare/`, `batSpeed/`, `conditioning/`, `crossSport/`, `recovery/`, `speed/` |
| a new **rep scheme / envelope** | `_shared/wic/dosage/doctrine.ts` `DOSE_MATRIX` (`:66-121`) | `isWithinEnvelope` is what the validator calls, so the gate follows automatically |
| a new **dose group** | same file: `DoseGroup` (`:24-31`), `ROLE_GROUP` (`:123-141`), `doseGroupFor` (`:143-153`) | |
| a new **sequence_role** | `_shared/wic/ordering.ts` `CanonicalRole` + `LIFT_ROLE_ORDER`, mirror in `src/lib/wic/ordering.ts`, and `ROLE_GROUP` in doctrine.ts | forgetting the doctrine map silently downgrades the role to `accessory` |
| a new **slot / card** | `_shared/wic/cardRegistry.ts` — SLOT_ORDER derives from it | mirror `src/lib/wic/cardRegistry.ts` |
| a new **lift template** | `_shared/wic/lift/templates.ts` (`LIFT_TEMPLATES`, `resolveLiftTemplate`) | `requiredCategories` becomes a fatal gate |
| a new **standard** | `src/lib/hammer/standards/catalog.ts` `STANDARDS[]` | evaluator `evaluate.ts`, UI `StandardTargetLine.tsx` / `StandardsBoard.tsx`, persistence `wk_standard_awards` |
| a new **warm-up rule** | `src/lib/hammer/prescription/warmupLibrary.ts` + composition in `dailyPlan.ts:313-465`; tests `__tests__/warmupTwitch.test.ts` | **not** a WIC file |
| a new **hard guardrail** | `_shared/wic/validator.ts` (plan-level) or `lift/sessionBuilder.ts` (lift-level), mirrored in `legality/preSelection.ts` if it can affect selection | mirroring is mandatory, else the generator proposes what the certifier kills |
| a new **CI drift guard** | `scripts/check-*.ts` or `scripts/audits/*.ts`, wired into `scripts/preflight.sh` | |
| a **safety cap** | engine-side constant passed as `dose_cap: { sets, reps }` through `push()` overrides | e.g. `IN_SEASON_DEEP_FLEXION_CAP` in `engines/strength.ts`; caps only reduce |

**Do not touch to extend:** `doctrine.ts` resolution *order* (steps 1-7 in
§1.5) and `wk_persist_prescriptions_atomic` (it must stay computation-free).

---

## Appendix — honest gaps found during extraction

1. `tempo` and `load_pct` are not prescribed; they are catalog pass-through,
   populated on 134/556 and 15/556 catalog rows respectively.
2. `compound_style` affects only a sentence of copy.
3. `supplemental_style` is read by nothing.
4. Warm-ups cannot vary by the session that follows them (`modalityBias:
   null`), despite the doc describing four modality templates.
5. `wk_cns_ledger` is write-only; no cross-day CNS carryover exists.
6. `recovery_window_hours`, `recovery_cost`, `recovery_demand` and
   `min_competition_level` are declared and unread.
7. Deload is a fixed calendar week-4, anchored to 2024-01-01, not autoregulated.
8. "Re-test" changes no exercise, no dose, and feeds nothing forward.
9. `wk_standard_awards` is empty — the standards layer has never awarded.
10. Three separate deload implementations and three separate warm-up
    implementations coexist.
