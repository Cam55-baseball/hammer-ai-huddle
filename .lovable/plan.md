

## Plan — Category-Based Micronutrient Completeness Validation

### Goal
Stop silent zeros (e.g. goat milk reporting `zinc = 0`) by validating that AI returns realistic values for **category-required** micros, not just "any non-zero".

### 1. Shared category rules module
Create `supabase/functions/_shared/hydrationCategoryRules.ts` (used by both edge functions):

```ts
type Category = 'dairy' | 'plant_milk' | 'citrus_juice' | 'coconut_water'
              | 'sports_drink' | 'energy_drink' | 'coffee' | 'tea'
              | 'soda' | 'kombucha' | 'kefir' | 'broth' | 'water' | 'other';

REQUIRED_MICROS: Record<Category, MicroKey[]>
FALLBACK_MINIMUMS: Record<Category, Partial<Micros>>  // e.g. dairy zinc_mg=0.1
ZERO_ALLOWED: Set<Category> = {'water','coffee','tea'}

inferCategory(name, hint?): Category   // regex on name + provided category
isComplete(category, micros): { ok, missing[] }
applyFallbacks(category, micros): Micros
```

Reference values per category (per fl oz, USDA-based):

| Category | Required micros | Fallback minimums |
|---|---|---|
| Dairy (cow/goat/sheep) | Ca, K, Mg, **Zn** | Ca=15, K=18, Mg=1.4, Zn=0.1 |
| Plant milk (almond/oat/soy/coconut) | Ca, vit D, B12 | Ca=14, D=0.3, B12=0.15 |
| Citrus juice | vit C, folate, K | C=10, folate=9, K=24 |
| Coconut water | K, Mg | K=75, Mg=7.5 |
| Sports drink | Na (macro), K | K=4 |
| Energy drink | B6, B12 | B6=0.5, B12=0.7 |
| Kombucha/Kefir | B12 | B12=0.06 |
| Broth | Na (macro), K | K=10 |

### 2. Edge function pipeline change

Both `analyze-hydration-text` and `analyze-hydration-beverage` get the same flow:

```text
callAI() → sanitize() → category = inferCategory(name, hint)
                       │
                       ▼
              isComplete(category, micros)?
                ├─ yes → return
                └─ no  → log "validation failed: missing [zinc_mg] for goat milk — retrying"
                          callAI(strict=true, missingList)
                          re-validate
                          ├─ yes → return
                          └─ no  → log "fallback applied for goat milk"
                                   applyFallbacks() → return
```

Strict retry user message includes the **specific missing keys** so the model knows what to fix:
> "Previous response was missing required micronutrients for dairy: [zinc_mg]. Goat milk contains ~0.1 mg/oz zinc per USDA. Return realistic non-zero values for ALL required keys."

Replace today's blunt `isAllZeroMicros` check with `isComplete(category, micros)`.

### 3. Fallback application rules
`applyFallbacks` only fills keys that are still 0 — never overwrites AI-supplied non-zero values. Mirrors Ca/K/Mg between macros and micros after applying.

### 4. Logging
Console logs at each gate (already standard — extend):
- `[analyze-hydration-{text|beverage}] category=dairy validation FAIL missing=[zinc_mg] — retrying strict`
- `[analyze-hydration-{text|beverage}] category=dairy validation FAIL after retry — applying fallback minimums`
- `[analyze-hydration-{text|beverage}] category=dairy OK conf=0.9`

### 5. Files to change

| File | Change |
|---|---|
| `supabase/functions/_shared/hydrationCategoryRules.ts` (new) | Category map, required keys, fallback minimums, `inferCategory`, `isComplete`, `applyFallbacks` |
| `supabase/functions/analyze-hydration-beverage/index.ts` | Replace `isAllZeroMicros` gate with category-aware validation; use shared module; pass missing keys into strict retry |
| `supabase/functions/analyze-hydration-text/index.ts` | Same category-aware validation pass after sanitize |
| `supabase/functions/analyze-hydration-text/index.ts` system prompt | Add explicit zinc line for dairy (~0.1 mg/oz) so first-pass usually succeeds |

### 6. Out of scope
- Re-validating already-cached `hydration_beverage_database` rows (lazy: next time they're queried with missing required micros, the enrichment path will re-run — covered by existing logic in `useHydration`).
- Optional: a one-shot admin "re-enrich all preset rows" script — defer unless requested.
- Touching client UI — server returns better data, UI unchanged.

