This is a data integrity issue, not a user onboarding issue. The lift certifier in the `wk-generate-daily` edge function requires canonical category values (e.g., `compound_lower`), but the `wk_movement_catalog.movement_category` column has been populated with philosophy/source labels (e.g., `westside`, `kot`, `posterior_chain`, `cressey_sp`). The engine correctly assigns roles like `compound_lower`, but the certifier ignores those roles and reads the corrupted catalog column, then rejects the plan as incomplete. The same pattern exists in smaller numbers across the other four movement domains.

This plan delivers a full fix: defensive code change, database cleanup, and a prevention constraint.

````text
┌──────────────────────────────────────────────────────────────┐
│  ROOT CAUSE                                                  │
│  wk_movement_catalog.movement_category is polluted with      │
│  source/philosophy labels instead of canonical categories.   │
│  Certifier reads the polluted column → fails publication.  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  FULL FIX                                                    │
│  1. Make certifiers trust the engine's sequence_role first.  │
│  2. Back-fill all catalog category columns to canonical.     │
│  3. Add a CHECK constraint to stop future corruption.        │
│  4. Deploy, regenerate, and verify E2E in the Today Plan.   │
└──────────────────────────────────────────────────────────────┘
````

## 1. Defensive code fix — certifiers use engine role as source of truth

Update the five session-builder certifiers so that the canonical category used for validation comes from the engine's `sequence_role` (or equivalent engine assignment), not the catalog column. The catalog column is only used as a fallback if it already contains a valid canonical value.

Files to edit:
- `supabase/functions/_shared/wic/lift/sessionBuilder.ts`
- `supabase/functions/_shared/wic/speed/sessionBuilder.ts`
- `supabase/functions/_shared/wic/batSpeed/sessionBuilder.ts`
- `supabase/functions/_shared/wic/conditioning/sessionBuilder.ts`
- `supabase/functions/_shared/wic/crossSport/sessionBuilder.ts`

For each builder:
- Import the `ALL_*` canonical list from the corresponding `movementCategories.ts` file.
- When building the `categorized` list for the `missingCategories` check, prefer `rx.sequence_role` (or the domain-specific role field) as the canonical category.
- If `sequence_role` is missing or not a valid canonical category, fall back to the catalog column only when it is a valid canonical category.
- Otherwise mark the category as `__unknown__` so the failure is still visible and auditable.
- Update the `stamps` category field to use the same resolved canonical category, and keep the raw catalog column as a display-only note in the `why_category` stamp if needed.

This immediately unblocks all users whose plans are failing today, regardless of whether the catalog data is cleaned up in step 2.

## 2. Database cleanup — canonicalize all category columns

The `wk_movement_catalog` column `source_philosophy` already stores the source/philosophy label, so `movement_category` can be safely overwritten with a canonical category. The same applies to the other domain-specific category columns.

Data state discovered:
- `movement_category`: 111 canonical, 225 non-canonical (philosophy labels like `westside`, `kot`, `posterior_chain`, `cressey_sp`, etc.).
- `speed_category`: mostly canonical; any outliers are remapped where needed.
- `bat_speed_category`: mostly canonical; any outliers are remapped.
- `conditioning_category`: a small number of `alactic_intervals` rows need to be aligned with the canonical `alactic_power` category.
- `cross_sport_category`: already canonical in the sample checked.

Cleanup actions:
- Update `wk_movement_catalog.movement_category` to canonical categories using a deterministic mapping derived from the `category`, `pattern`, `family`, `primary_adaptation`, `unilateral`, `rotational`, and `source_philosophy` columns.
- Update the other domain category columns with similar small, targeted mappings.
- Preserve the philosophy/source label in `source_philosophy` (it is already there).
- Run a post-update validation query to confirm every category column contains only canonical values.

Because this is a data update (not a schema change), it will be performed with the `insert` tool via UPDATE statements.

## 3. Prevention — add a database CHECK constraint

Add a CHECK constraint to `wk_movement_catalog` that rejects writes for non-canonical `movement_category` values. This prevents future seeding scripts or manual imports from corrupting the column again. The same constraint pattern is applied to the other domain-specific category columns.

This is a schema change, so it will be performed with the `supabase--migration` tool.

## 4. Deploy and verify E2E

- Deploy the updated `wk-generate-daily` edge function.
- Trigger the Hammers Today Plan for a test athlete (or the user themselves) and confirm all four cards (Warmup, Speed, Bat Speed, Lifts, Conditioning) generate without the "Plan couldn't publish" error.
- Inspect the edge function logs for `wk-generate-daily` to confirm no new `missing required categories` fatals appear.
- Verify the `WkPrescriptionCard` UI renders the actual movement rows instead of the red error message.
- If the user already has a stale/failed prescription, force a regeneration by calling the generator or by invalidating the day's cached prescription row.

## Outcome

- Users currently seeing the red "Plan couldn't publish" message will immediately get a valid workout plan.
- The underlying catalog data is cleaned up so the certifier can also read valid columns.
- Future data corruption is blocked at the database level.
- The Hammers Today Plan is restored to end-to-end reliability.