

# Execute Data Integrity Migration + Pipeline Fixes

## Database State (PROVEN)
- **156 rows**: `micros = '{}'` with `data_confidence = 'medium'` — CORRUPTED
- **0 rows** in `unverified_foods` — pipeline never writes here
- All 156 rows have `data_source = 'ai'`

## Step 1: Database Migration (requires approval)

```sql
-- Fix 1: Convert empty object micros to null
UPDATE vault_nutrition_logs
SET micros = null
WHERE micros::text = '{}';

-- Fix 2: Force low confidence on null-micros rows
UPDATE vault_nutrition_logs
SET data_confidence = 'low'
WHERE micros IS NULL;
```

Expected: 156 rows updated in each statement.

## Step 2: Code Guard in `useMealVaultSync.ts`

Prevent future `{}` micros from being stored. Before the insert, add:

```typescript
// Guard: empty micros object → null
const finalMicros = (microsComplete && hasMicrosData) ? aggregatedMicros : null;
const finalConfidence = finalMicros ? dataConfidence : 'low';
```

Use `finalMicros` and `finalConfidence` in the insert instead of the inline expressions.

## Step 3: Unverified Foods Pipeline in `useMealVaultSync.ts`

After the vault insert succeeds, add a non-blocking side-effect:

```typescript
// Stage AI-sourced items in unverified_foods for review
try {
  const aiItems = meals.items.filter(i => i.source === 'ai' && i.micros);
  if (aiItems.length > 0) {
    const unverifiedInserts = aiItems.map(item => ({
      food_name: item.name,
      micros: item.micros,
      serving_size: item.servingSize || '1 serving',
      source: 'ai',
      submitted_by: user.id,
    }));
    await supabase.from('unverified_foods').insert(unverifiedInserts);
  }
} catch (e) {
  console.warn('Unverified foods staging failed (non-blocking):', e);
}
```

## Step 4: Post-Migration Verification Queries

```sql
-- Must return 0
SELECT COUNT(*) FROM vault_nutrition_logs WHERE micros::text = '{}';

-- Must return 0
SELECT COUNT(*) FROM vault_nutrition_logs WHERE micros IS NULL AND data_confidence != 'low';

-- Sample corrected rows
SELECT micros, data_confidence, meal_title FROM vault_nutrition_logs WHERE data_confidence = 'low' LIMIT 3;
```

## Files Changed

| File | Change |
|------|--------|
| DB migration | Clean 156 corrupted rows |
| `src/hooks/useMealVaultSync.ts` | Add `{}` → `null` guard, force `low` confidence on null micros, add unverified_foods staging |

## Execution Order
1. Run migration (fix existing data)
2. Apply code guards (prevent future corruption)
3. Run verification queries (prove fix)

