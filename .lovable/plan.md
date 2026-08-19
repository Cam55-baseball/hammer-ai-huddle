# Fix: "2×45 is outside the in_season dosage envelope" — time-dosed movements judged as lifts

## What the error actually is

`Couch Stretch (Loaded)` is a **45-second loaded hold**, not a 45-rep lift. Its catalog row says:

```text
slug: lift_couch_stretch_loaded
dosage_unit: seconds
default_sets: 2
default_reps: 45          <-- the 45 seconds, stored in the reps column
default_duration_seconds: NULL
movement_category: compound_lower
```

The generator correctly recognises a seconds-dosed movement and skips the dosage
doctrine for it — but it still copies `default_reps` straight onto the row, so the
prescription ships as `sets: 2, reps: 45`. The validator then sees a `lift` row with
non-null sets/reps and runs the envelope check, which only understands reps. In-season
`compound_lower` allows 2-3 reps, so 45 is a **fatal** `dose_outside_envelope` and the
whole day refuses to publish. Because one fatal blocks the entire generation, every card
(Speed, Bat Speed, Lifts, Conditioning) shows the same message.

This is not a one-off row. Across the movement catalog:

- 33 `seconds` rows — all 33 carry a `default_reps` value
- 60 `feet` rows — 60 carry `default_reps`
- 2 `innings`, 2 `runs`, 1 `each` — all carry `default_reps`

So 98 movements are one selection away from producing the identical crash.

## The fix

### 1. Validator becomes unit-aware (stops the outage)

The envelope check only applies to rep-dosed rows. A prescription carrying
`dosage_unit` of seconds / feet / innings / runs / each, or any of
`duration_seconds` / `distance_feet` / `total_reps`, is a total-dose row and is exempt.
`dosage_unit` is added to the validator's prescription input so it can tell the
difference. Real rep-dosed breaches stay fatal.

### 2. Generator stops writing seconds into the reps column

In the `push()` builder, when a movement is total-dosed the catalog `default_reps`
is routed to the correct field instead of `reps`:

```text
seconds        -> duration_seconds
feet           -> distance_feet
innings / runs / each / contacts -> total_reps
```

and `reps` is left null. Result: the card reads "45 sec hold", not "2×45".

### 3. Repair the catalog (one migration)

For every row whose `dosage_unit` is not `reps`: backfill the correct dose column
from `default_reps` when that column is empty, then null out `default_reps`. This
makes the data honest at the source so no future code path can misread it.

### 4. Failure blast radius

Today a single fatal in any engine blanks all four cards with an unrelated message.
The failure notice will attribute a fatal to the engine that produced the offending
row, so a lift-side problem no longer tells a Bat Speed card that a couch stretch
failed.

### 5. Drift guards so this cannot come back

- New check in `scripts/preflight.sh`: fail CI if any catalog row has a non-`reps`
  `dosage_unit` together with a non-null `default_reps`.
- Extend the dosage doctrine audit with unit-awareness cases (a seconds/feet/innings
  row must pass validation regardless of its numeric dose).

## Technical notes

- `supabase/functions/_shared/wic/validator.ts` — unit-aware envelope gate, new
  `dosage_unit` field on the prescription input type.
- `supabase/functions/wk-generate-daily/index.ts` — total-dose routing in `push()`;
  per-engine attribution of fatal validator issues.
- One migration against `wk_movement_catalog` (backfill + null-out, no deletes).
- New `scripts/check-dosage-units.ts`, wired into `scripts/preflight.sh`; added cases
  in `scripts/audits/dosage-doctrine-audit.ts`.
- Redeploy `wk-generate-daily` and verify a live in-season generation publishes clean.
