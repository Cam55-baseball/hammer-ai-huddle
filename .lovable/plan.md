

## Plan — Reliable Structured AI Liquid Analysis → Hydration Score Pipeline

### Goal
Any logged drink (preset or freeform) must yield structured macros + micros + hydration profile, deterministically, with strict JSON shape, with safe fallbacks, never blocking the log.

---

### 1. Lock the AI output to a strict tool schema

Two edge functions handle drink analysis:
- `analyze-hydration-text` — freeform user input ("16oz iced latte with oat milk")
- `analyze-hydration-beverage` — name-only lookup for preset enrichment

Both will use a **single shared tool schema** (function calling, not freeform JSON) returning per-oz values:

```
hydration_macros_per_oz: { water_g, sodium_mg, potassium_mg, magnesium_mg,
                           calcium_mg, sugar_g, glucose_g, fructose_g,
                           total_carbs_g, osmolality_estimate }
micros_per_oz:           { 13-key panel — vit A/C/D/E/K, B6, B12, folate,
                           Ca, Fe, Mg, K, Zn }
confidence:              0..1
```

Why per-oz: lets us multiply by serving size client-side and reuse the same row for any oz. `analyze-hydration-text` additionally returns `amount_oz` it parsed.

`tool_choice` is forced to this function — model literally cannot return prose. If the call fails parse/validate, we retry once with a stricter user message, then fallback (see §3).

### 2. Sanitize + clamp every numeric field
Server-side after the AI call:
- coerce to `Number`, `NaN → 0`
- clamp to physiologically plausible per-oz caps (e.g. sugar ≤ 12 g/oz, sodium ≤ 200 mg/oz, vit C ≤ 100 mg/oz, etc.)
- mirror `magnesium_mg` / `potassium_mg` / `calcium_mg` between `hydration_macros_per_oz` and `micros_per_oz` so scoring + UI both see the same numbers
- enforce zero-veto: dairy/juice/smoothie/etc. with all-zero micros triggers strict retry (already in place — keep)

### 3. Fallback chain (logging never blocks)

```text
[user logs drink]
      │
      ▼
preset hit?  ── yes ──▶ use beverage row's macros + micros (lazy AI enrich if micros NULL)
      │ no
      ▼
analyze-hydration-text  ── ok ──▶ structured data + confidence
      │ fails / confidence<0.7
      ▼
fuzzy match name vs hydration_beverage_database (ILIKE + alias map)
      │ no match
      ▼
store log with water_g = oz * 29.57 (assume mostly water),
          ai_estimated=true, nutrition_incomplete=true, confidence=0
```

Result: every log gets persisted with whatever data we have, flagged honestly.

### 4. Database changes (`hydration_logs`)

Add columns (all nullable, default 0/false where sensible):
- `water_g`, `sodium_mg`, `potassium_mg`, `magnesium_mg`, `calcium_mg` (numeric)
- `sugar_g`, `glucose_g`, `fructose_g`, `total_carbs_g` (numeric)
- `osmolality_estimate` (numeric)
- `ai_estimated` (bool, default false)
- `nutrition_incomplete` (bool, default false)
- `confidence` (numeric, 0..1)
- keep existing `micros` (jsonb, totals for the serving) and `hydration_profile` (jsonb)

Existing logs untouched (legacy nullable columns).

### 5. `useHydration.ts` — single insert pipeline

Refactor the insert path so both preset and AI flows funnel through one `buildLogPayload({ source, perOzMacros, perOzMicros, oz, confidence })` helper that:
1. multiplies per-oz × oz → top-level macro columns + `micros` jsonb
2. calls `computeHydrationProfile()` with the resulting macros → stores `hydration_profile`
3. sets `ai_estimated`, `nutrition_incomplete`, `confidence` flags
4. inserts in one round trip

This kills the current divergence between preset path and AI path.

### 6. UI

`HydrationLogCard.tsx`:
- show hydration score badge (already exists for some paths — make universal)
- expandable "Nutrition" row with micro chips + macro line
- if `ai_estimated`: small "Estimated" pill
- if `nutrition_incomplete`: amber "Partial data" pill

`HydrationQualityBreakdown.tsx`:
- micros aggregation already in place — just ensure it now reads the new top-level columns as fallback when `micros` jsonb is missing (legacy logs)

### 7. Files to change

| File | Change |
|---|---|
| Migration | Add 12 columns to `hydration_logs` (macros + flags + confidence) |
| `supabase/functions/analyze-hydration-text/index.ts` | Shared strict tool schema, clamp + sanitize, confidence, retry-on-invalid |
| `supabase/functions/analyze-hydration-beverage/index.ts` | Use same shared schema (returns macros too, not just micros) |
| `src/hooks/useHydration.ts` | New `buildLogPayload` helper, fuzzy fallback, confidence-gated retry, persist flags |
| `src/utils/hydrationMicros.ts` | Add macro multiply + clamp helpers (or new `hydrationMacros.ts`) |
| `src/components/nutrition-hub/HydrationLogCard.tsx` | "Estimated" / "Partial data" badges, expandable nutrition row |
| `src/components/nutrition-hub/HydrationQualityBreakdown.tsx` | Read fallback from new top-level columns for legacy logs |

### 8. Out of scope (v1)
- Backfill of legacy logs (they keep showing whatever they have)
- Branded-drink barcode lookup (future)
- Per-log "re-analyze" button (future, easy add once flags exist)

