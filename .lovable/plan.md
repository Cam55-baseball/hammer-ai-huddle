

## Plan — Fix Missing Micronutrients on Logged Drinks (e.g. Goat Milk)

### Problem
User logged goat milk and the Hydration Quality block shows "No micronutrients logged from drinks today." Goat milk is rich in Ca, P, K, Mg, Zn, Se, B2, B12, A — none surfaced.

### Root cause hypothesis
Two paths feed `hydration_logs.micros`:
1. **Preset path** — uses `hydration_beverage_database.micros_per_oz`. Only ~8 drinks were seeded; goat milk almost certainly has NULL → log.micros = all zeros.
2. **AI ("Other") path** — `analyze-hydration-text` returns `micros_per_oz` and `useHydration` multiplies it. This path likely worked for goat milk only if user typed it in "Other"; if they tapped a "Milk" preset variant, no micros.

Need to confirm via DB which path was used and whether `micros` on the row is null/zeros.

### Fix — Lazy AI enrichment for ANY beverage missing micros (the (b) path deferred in v1)

When inserting a hydration log:
1. If preset beverage row has `micros_per_oz` populated → use it (current behavior).
2. If preset beverage row has NULL/empty `micros_per_oz` → call new edge function `analyze-hydration-beverage` with the beverage name, get `micros_per_oz`, **persist back to `hydration_beverage_database`** (cached forever), then multiply × oz for the log.
3. AI/Other path stays as-is (already returns micros).

This guarantees every drink gets micros on first log, and subsequent logs reuse the cached values (one AI call per unique beverage, ever).

### Strengthen the AI prompt
Update both `analyze-hydration-text` and the new `analyze-hydration-beverage` system prompts:
- Explicit USDA reference cues with examples covering edge cases:
  - **Goat milk**: high Ca (~33mg/oz), Mg (~4mg/oz), K (~62mg/oz), Zn (~0.1mg/oz), Se (not in our 13 keys — skip), B2, B12, A, D-fortified.
  - **Cow milk, OJ, coconut water, kombucha, kefir, almond/oat/soy milk, bone broth, sports drinks, energy drinks, beer, wine, smoothies.**
- Mandate: every dairy/plant-milk MUST populate Ca, K, Mg; every citrus juice MUST populate Vit C, folate, K; every fortified milk MUST populate Vit D + B12.
- Forbid all-zeros for non-water, non-black-coffee, non-plain-tea drinks.
- Add validator in edge function: if input is dairy/juice/milk-alternative and ALL micros = 0, retry once with stricter prompt; if still zero, log warning and return best-guess minimums.

### Backfill switch (optional, scoped)
Add a one-time admin-callable refresh: re-run AI on every `hydration_beverage_database` row where `micros_per_oz` IS NULL OR is all zeros. Out of scope unless user asks — lazy path will heal organically.

### Files to change
| File | Change |
|---|---|
| `supabase/functions/analyze-hydration-text/index.ts` | Stronger system prompt with category-specific micro mandates + zero-veto retry |
| `supabase/functions/analyze-hydration-beverage/index.ts` (new) | Name-only beverage → `micros_per_oz` for preset enrichment |
| `src/hooks/useHydration.ts` | When preset has no micros, call enrichment fn, persist to beverage DB, then store on log |
| `supabase/config.toml` | Register new edge function |

### Diagnostic before coding
Once switched to default mode I'll first query the DB:
- The user's most recent `hydration_logs` row (confirm `micros` is null/zeros and which `beverage_id`).
- That `hydration_beverage_database` row's `micros_per_oz`.

This confirms which path failed and whether enrichment alone fixes it without re-prompt tuning.

### Out of scope
- Adding selenium (Se) to the 13-key schema — would cascade through food micros, scoring, UI. Note in caption that "Se not currently tracked."
- Backfilling user's already-logged goat milk row (they can re-log to see micros, or we add a one-time recompute pass if requested).

