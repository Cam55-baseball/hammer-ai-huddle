

## Final Invariant Pass — Truthful Completion States

### Single migration, no frontend changes

### Changes

**1. `all_checked()` helper** — strict, mirrors `has_any_checked()` style:
```sql
CREATE OR REPLACE FUNCTION public.all_checked(cb jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT cb IS NOT NULL
    AND jsonb_typeof(cb) = 'object'
    AND jsonb_object_length(cb) > 0
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_each(cb) kv
      WHERE jsonb_typeof(kv.value) != 'boolean'
         OR (kv.value)::text::boolean IS NOT TRUE
    )
$$;
```
Note: requires non-empty object — empty `{}` cannot be "all checked". Strict boolean typeof guard matches `has_any_checked` policy (no string drift).

**2. `derive_completion_state()` updates**
- Normalize null at top: `IF NEW.performance_data IS NULL THEN NEW.performance_data := '{}'::jsonb; END IF;`
- `completed_at := NOW()` guarantee already present — keep as-is (reaffirmed).
- No other behavior changes.

**3. `validate_completion_intent()` adds check_all integrity**
```sql
IF NEW.completion_state = 'completed'
   AND NEW.completion_method = 'check_all'
   AND NOT public.all_checked(NEW.performance_data->'checkboxStates') THEN
  RAISE EXCEPTION 'check_all requires all checkboxes to be true';
END IF;
```
Placed after existing illegal-transition check.

### Item 4 (reopened_at) — Skipped

Adding a column requires schema change + frontend wiring + backfill considerations. The plan says "optional"; current `completion_state` transitions are already auditable via `updated_at` + `completion_method`. Will add only if explicitly requested as a separate task.

### Files

| File | Change |
|------|--------|
| `supabase/migrations/<new>.sql` | Add `all_checked()` helper; rewrite `derive_completion_state()` to normalize null `performance_data`; rewrite `validate_completion_intent()` to enforce `check_all` ⇒ all true |

### Invariants added
- ✅ `performance_data` never NULL inside trigger logic
- ✅ `check_all` completion requires every checkbox to be a `true` boolean
- ✅ Empty `{}` checkboxStates cannot satisfy `check_all`
- ✅ `completed_at` non-null guarantee preserved

