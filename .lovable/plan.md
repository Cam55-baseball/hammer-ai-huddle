# Fix: "Template full_body_strength requires compound_upper_pull"

## What I verified (not assumed)

The error is not an onboarding gap and not a missing exercise. The catalog is healthy — 18 rows carry `movement_category = compound_upper_pull`, all `wic_metadata_complete = true`, all season-legal, most needing no equipment.

The real cause is in `wk-generate-daily/index.ts`, in the `adaptationsCompatible()` gate every candidate movement must pass (line ~432). It compares the day's adaptation against the movement's `primary_adaptation` using a fixed map. Rows whose label is not a value inside that map are rejected.

The live catalog's labels do not match the map:

```text
strength                        91 rows   <- not in the map at all
rotational_force                62 rows   <- not in the map
arm_care                        56 rows   <- not in the map
rotational_power / _strength     4 rows   <- not in the map
bat_speed / elastic_rotation     9 rows   <- not in the map
pelvic_speed / pelvic_separation 2 rows   <- not in the map
```

That is roughly 40% of the catalog permanently ineligible on every day, for every athlete.

For upper pull specifically: 11 of the 18 pull rows are labelled `strength` (dead everywhere). The remaining 7 are `max_strength` or `muscle_capacity`, which the map excludes on `power_transfer`, `game_readiness`, and `recovery_only` days. On those days **zero** pull movements survive the filter, the full-body guardrail at line 2353 finds nothing to insert, and the certifier fatals with exactly the message users are seeing. The same starvation explains the intermittent speed / bat speed / conditioning failures.

## The fix

### 1. Canonicalize adaptation labels

Add an alias table so catalog shorthand resolves to the canonical adaptation before comparison: `strength` and `rotational_strength` to `max_strength`; `rotational_force`, `rotational_power`, `elastic_rotation`, `pelvic_separation` to `power_transfer`; `pelvic_speed` and `speed` to `speed_development`; `bat_speed` to `bat_speed_development`.

### 2. Fail open, never starve

An unrecognized label on either side returns compatible instead of rejecting. A labeling gap must never be able to empty a mandatory slot. Support-class work (`arm_care`, `recovery_only`, `movement_literacy`) is compatible with every day type since it is never the primary stimulus.

### 3. Widen two over-tight day rows

`power_transfer` and `strength_to_power` days currently exclude `max_strength` and `muscle_capacity` movements entirely, which is what strands the pull slot. Both admit them — a heavy row on a power day is standard practice and is already volume-bounded by the dosage doctrine.

### 4. Last-resort guardrail

`ensureFullBodyLift` gets a relaxed picker that ignores only the adaptation gate (never season legality, injury contraindication, training age, or the domain/scope gates) when a template-mandatory category would otherwise stay empty. Applied to the five mandatory categories: compound lower, upper push, upper pull, core, rotation. The inserted row's "why" states it was placed to complete the template.

### 5. Drift guard

New CI check asserting every distinct `primary_adaptation` value present in `wk_movement_catalog` is either canonical or has an alias, so a future seed with a new label fails the build instead of silently killing movements.

## Technical notes

- Edited: `supabase/functions/wk-generate-daily/index.ts` (adaptation canonicalization at ~line 432, `eligible()` relaxed variant, `ensureFullBodyLift` fallbacks at ~line 2265-2358).
- New: `scripts/check-adaptation-labels.ts`, wired into `scripts/preflight.sh`.
- No migration required — the fix is label tolerance in the engine, not a catalog rewrite. Optionally a follow-up migration can normalize the 91 `strength` rows to `max_strength` for cleanliness.
- Determinism preserved: aliasing is a pure lookup, and the relaxed picker walks the same ordered slug pools.
