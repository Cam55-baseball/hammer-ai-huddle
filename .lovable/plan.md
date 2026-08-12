# Categorical Integrity: No Drill Ever Appears in the Wrong Card

## What I found

You are right, and it is a data error — not an interpretation problem.

One movement in the catalog is a **pitching drill filed as a bat-speed drill**:

| slug | name | category | arm_care_category | why_prescribed |
|---|---|---|---|---|
| `plyo_ball_pitching` | Plyo-Ball Pitching Variants | **bat_speed** | throwing_day | "Arm care + velocity work. Eccentric arm capacity." |

Its own description says arm care and throwing velocity. It was seeded into `category = 'bat_speed'`, so the bat-speed engine treats it as rotational-power work and can prescribe it inside a Bat Speed card. Its equipment list is also wrong (`med_ball, bat` — it needs plyo balls). The correct home is the throwing/arm-care pool, where the same family already lives properly as `dl_plyo_pivot_pickoff` and `dl_plyo_reverse_throw` under `category = 'driveline'`.

Note one row that is **not** a mistake and should stay: `bs_plyo_ball_wall_rebounds` — a 1–2 lb plyo ball rebounded off a wall *from a hitting posture*. That is a genuine low-load rotational hitting drill (Driveline hitting methodology), not a throwing drill. Its name is what makes it read wrong on the card, so it gets renamed and re-cued rather than moved.

## Why the gate let it through

`supabase/functions/_shared/wic/engines/batSpeed.ts` builds its candidate pool with:

```text
category === "bat_speed"  OR  bat_speed_category != null
```

That is an **OR**, so any row carrying a `bat_speed_category` tag joins the bat-speed pool regardless of what discipline it actually belongs to. Two trunk movements (`heavy_russian_twist`, `trap_bar_trunk_twist`) enter the same way — those are defensible as rotational strength, but the door they walk through is the same door the pitching drill used.

There is also no gate on **discipline**. Sport is filtered at query time (`sport_scope = both OR = athlete's sport`) but nearly every row is `both`, and nothing checks that a pitcher-only drill stays out of a position player's card, or that a hitting-module subscriber never sees throwing-module content.

## The fix

### 1. Move the mislabelled drill
Reassign `plyo_ball_pitching` to the throwing/arm-care domain, clear its `bat_speed_category`, correct its equipment to plyo balls, and rewrite its cue so it reads as a throwing-velocity drill. It leaves the bat-speed pool permanently.

### 2. Rename and re-cue the legitimate one
`bs_plyo_ball_wall_rebounds` becomes clearly a hitting drill by name and by cue — the posture, the intent, and the fact that the light ball is a rotational implement, not a throwing implement. Its "why prescribed" states plainly that this is rotational elastic work for the swing, not arm work.

### 3. Close the OR loophole — a hard domain gate
Introduce a single shared module, `supabase/functions/_shared/wic/domainGate.ts`, that owns the one rule for every engine:

- Each movement declares exactly **one owning domain** (`bat_speed`, `speed`, `lift`, `conditioning`, `throwing`, `arm_care`, `recovery`, `warmup`, `cross_sport`).
- Secondary tags like `bat_speed_category` become **contribution tags**, admissible only when the owning domain is on that engine's explicit allow-list. The bat-speed engine will accept `bat_speed` and `trunk` — never `arm_care` or `throwing`.
- Every engine (bat speed, speed, strength, conditioning, cross-sport, arm care) routes its pool through this gate instead of writing its own filter.

### 4. Sport and subscription specialization on every card
Extend the same gate to reject a movement when:
- its `sport_scope` conflicts with the athlete's sport (already partly done — this makes it a hard gate rather than a query hint), and
- its owning domain is outside the athlete's active module subscription, and
- it is discipline-restricted (pitcher-only, catcher-only) and the athlete does not hold that role.

This means a softball athlete never receives a baseball-only implement, and a hitting-only subscriber never sees a throwing prescription.

### 5. Make a repeat impossible — a build-time guard
Add `scripts/check-domain-integrity.ts`, run in preflight alongside the existing WIC guards. It fails the build when:
- a movement carries a contribution tag for a domain that does not allow its owning domain,
- a movement's name, cue or `why_prescribed` contains discipline keywords that contradict its owning domain (a `bat_speed` row mentioning bullpen, mound, pitching, long toss, pulldown, arm care — the exact signature that caught this one),
- a row has no owning domain, or equipment that contradicts its domain.

Running it now would have failed on `plyo_ball_pitching`, which is the point.

### 6. Verify against the full catalog
Sweep all 24 categories with the new rules and report every violation found, so this audit covers the whole library rather than the one card you spotted.

## Technical notes

- Data corrections ship as a migration against `wk_movement_catalog` (category, `bat_speed_category`, `arm_care_category`, equipment, name, cue, `why_prescribed`). No schema change is required; the owning-domain concept maps onto the existing `category` column, with `movement_category` reserved as-is.
- `domainGate.ts` is pure data-in/data-out so plans stay deterministically replayable; it authors no truth and only narrows candidate pools.
- Engine call sites to update: `engines/batSpeed.ts` (line ~212), `engines/speed.ts`, `engines/strength.ts`, `engines/conditioning.ts`, `engines/crossSport.ts`, `armCare/picker.ts`.
- The generator already loads the catalog with a sport filter in `wk-generate-daily/index.ts` (line 360); the gate becomes the authoritative second pass so a mis-scoped row cannot survive even if the query is loosened later.
- Existing plans already generated are unaffected historically; the next daily generation picks up the corrected pool.
