

# Fix unverified_foods Insert — Column Name Mismatch

## Bug (CONFIRMED)
Lines 214-228 in `useMealVaultSync.ts` use wrong column names, causing **every insert to silently fail**:

| Code uses | Table expects |
|-----------|---------------|
| `food_name` | `name` |
| `micros` (JSON blob) | 13 individual columns (`vitamin_a_mcg`, etc.) |
| `submitted_by` | doesn't exist |
| missing | `calories_per_serving`, `protein_g`, `carbs_g`, `fats_g`, `confidence_level` |

## Fix — `src/hooks/useMealVaultSync.ts` (lines 214-228)

Replace the staging block with correct column mapping:

```typescript
try {
  const aiItems = meals.items.filter(i => i.source === 'ai' && i.micros && Object.keys(i.micros).length > 0);
  if (aiItems.length > 0) {
    const unverifiedInserts = aiItems.map(item => ({
      name: item.name,
      calories_per_serving: item.calories || null,
      protein_g: item.protein || null,
      carbs_g: item.carbs || null,
      fats_g: item.fats || null,
      serving_size: (item as any).servingSize || '1 serving',
      confidence_level: item.confidence || 'medium',
      source: 'ai',
      vitamin_a_mcg: item.micros?.vitamin_a_mcg ?? null,
      vitamin_c_mg: item.micros?.vitamin_c_mg ?? null,
      vitamin_d_mcg: item.micros?.vitamin_d_mcg ?? null,
      vitamin_e_mg: item.micros?.vitamin_e_mg ?? null,
      vitamin_k_mcg: item.micros?.vitamin_k_mcg ?? null,
      vitamin_b6_mg: item.micros?.vitamin_b6_mg ?? null,
      vitamin_b12_mcg: item.micros?.vitamin_b12_mcg ?? null,
      folate_mcg: item.micros?.folate_mcg ?? null,
      calcium_mg: item.micros?.calcium_mg ?? null,
      iron_mg: item.micros?.iron_mg ?? null,
      magnesium_mg: item.micros?.magnesium_mg ?? null,
      potassium_mg: item.micros?.potassium_mg ?? null,
      zinc_mg: item.micros?.zinc_mg ?? null,
    }));
    await supabase.from('unverified_foods').insert(unverifiedInserts as any);
  }
} catch (e) {
  console.warn('Unverified foods staging failed (non-blocking):', e);
}
```

## One file changed
| File | Change |
|------|--------|
| `src/hooks/useMealVaultSync.ts` | Fix column mapping in unverified_foods insert (lines 214-228) |

## After deploy — verification queries
```sql
SELECT name, vitamin_c_mg, iron_mg, source FROM unverified_foods ORDER BY created_at DESC LIMIT 1;
SELECT data_source, micros FROM vault_nutrition_logs ORDER BY created_at DESC LIMIT 1;
```

