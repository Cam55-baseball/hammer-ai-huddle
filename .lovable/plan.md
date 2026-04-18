

## Plan — Final Client-Side Micronutrient Enforcement Layer

### Goal
No hydration log can ever be persisted with missing required micros for its category. Goat milk → zinc always > 0.

### 1. Create client mirror of category rules
New file `src/utils/hydrationCategoryRules.ts` — a TS port of `supabase/functions/_shared/hydrationCategoryRules.ts` (same `Category` map, `REQUIRED_MICROS`, `FALLBACK_MINIMUMS`, `inferCategory`, `isComplete`, `applyFallbacks`). Edge module stays the source of truth for server; this is its client twin so the browser can enforce too.

(Can't import edge `_shared` files into the React app — different Deno/Node module resolution, different `HydrationMicroKey` source. Mirror is the clean fix.)

### 2. Enforce inside `buildLogPayload` (the universal funnel)
Add a `liquidType` + `customLabel` arg. Before sanitize/mirror/multiply:

```ts
const category = inferCategory(customLabel || liquidType, liquidType);
const check = isComplete(category, perOzMicros || {});
let finalMicros = perOzMicros || {};
let incomplete = nutritionIncomplete;
if (!check.ok) {
  console.warn(`[hydration] fallback applied → category=${category} missing=[${check.missing.join(',')}]`);
  finalMicros = applyFallbacks(category, finalMicros as HydrationMicros);
  incomplete = true;          // flag honestly
}
// then existing mirror/multiply pipeline using finalMicros
```

This single insertion catches **all three paths** (AI, preset, last-resort) since they all funnel through here.

### 3. Self-heal preset DB rows
In `useHydration.ts` preset path, **after** `buildLogPayload` runs, compare returned `micros` (totals) against the original `bev.micros_per_oz`. If we had to apply fallbacks (detect by re-running `isComplete` on `bev.micros_per_oz`), persist the corrected per-oz back:

```ts
const cat = inferCategory(bev.display_name, liquidType);
const orig = isComplete(cat, bev.micros_per_oz || {});
if (!orig.ok) {
  const healed = applyFallbacks(cat, bev.micros_per_oz || {} as HydrationMicros);
  await supabase.from('hydration_beverage_database')
    .update({ micros_per_oz: healed }).eq('id', bev.id);
  console.log(`[hydration] self-healed preset "${bev.display_name}" missing=[${orig.missing.join(',')}]`);
}
```

DB gradually heals as users log drinks.

### 4. Keep edge-function enforcement (already in place)
No changes there — defense in depth: AI returns good data ideally → client validates again → fallbacks guarantee compliance.

### 5. Pass `liquidType` / `customLabel` through call sites
`buildLogPayload({ ..., liquidType, customLabel })` — only one caller (`addWater`), trivial wiring.

### Files to change

| File | Change |
|---|---|
| `src/utils/hydrationCategoryRules.ts` (new) | Client port of category map, `inferCategory`, `isComplete`, `applyFallbacks` |
| `src/hooks/useHydration.ts` | Enforce inside `buildLogPayload`; self-heal preset DB row when original fails validation |

### Out of scope
- One-shot backfill of existing bad `hydration_beverage_database` rows (lazy heal covers it)
- Recomputing already-logged `hydration_logs` rows (user can re-log goat milk to see zinc)
- UI changes — server returns better data, existing badges already cover incomplete state

