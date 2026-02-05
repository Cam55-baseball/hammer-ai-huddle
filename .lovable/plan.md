
## Diagnosis (what’s actually causing the 404)
- The error `{"code":"NOT_FOUND","message":"Requested function was not found"}` means the app is calling a backend function endpoint that **does not exist in the backend environment**.
- I verified from the codebase that there is **no** `supabase/functions/parse-food-text/` folder at all (it’s missing from `supabase/functions`), and there is **no** `parse-food-text` entry in `supabase/config.toml`.
- I also verified by directly calling the backend:
  - `POST /check-subscription` returns **200 OK** (so **check-subscription is deployed and working**).
  - `POST /parse-food-text` returns **404 NOT_FOUND** (so **parse-food-text is not deployed**).

**Conclusion:** the 404 you keep hitting is because the Smart Food Recognition feature (which should call `parse-food-text`) is trying to invoke a backend function that isn’t present/deployed.

---

## Goal
1. Eliminate the 404 immediately by actually adding the missing backend function (`parse-food-text`) so the endpoint exists.
2. Implement the “finest work” version of Smart Food Recognition:
   - Local food DB match first (fast + accurate).
   - AI fallback when no match.
   - Safe auto-fill (never overwrites fields the user already edited).
   - Clear “AI estimate” / confidence UI.
   - Never blank-screen even if AI is rate-limited/unavailable.

---

## Phase 1 — Fix the 404 at the source (create the missing backend function)
### 1) Add the backend function folder and entrypoint
Create:
- `supabase/functions/parse-food-text/index.ts`

Behavior:
- Accept JSON: `{ "text": string }`
- Require auth (consistent with the rest of your app)
- Return structured data:
  - `foods[]` (each item: name, quantity, unit, calories, protein_g, carbs_g, fats_g, confidence)
  - `totals` (calories, protein_g, carbs_g, fats_g)
  - `mealDescription` (optional)

Implementation details:
- Use Lovable AI Gateway from this function (server-side) with model `google/gemini-3-flash-preview`.
- Use **tool-calling** so the AI returns validated structured output (not “best-effort JSON”).
- Add robust error mapping:
  - `429` → return `{ error: "Rate limit…" }` with HTTP 429
  - `402` → return `{ error: "AI credits required…" }` with HTTP 402
  - Anything else → HTTP 500 with a safe error message
- Include full CORS headers (you already standardized these in other functions).

### 2) Register the function in backend config
Update:
- `supabase/config.toml`

Add:
- `[functions.parse-food-text]`
- `verify_jwt = true`

This aligns with how your other authenticated functions are configured and prevents accidental public access.

### 3) Verification steps (fast, deterministic)
After implementation:
- Call `POST /parse-food-text` with `{ "text": "2 eggs and toast" }`
- Confirm response is 200 and includes totals + foods.
- Confirm no 404 anywhere.

---

## Phase 2 — Implement the frontend smart lookup (local DB first, then AI)
### 4) Add a dedicated hook for this workflow
Create:
- `src/hooks/useSmartFoodLookup.ts`

Responsibilities:
1. Debounce user input (800–1000ms).
2. **Try local match first**:
   - Query `nutrition_food_database` using `ilike` on `name` and `brand`.
   - Choose best match via lightweight scoring (exact match, starts-with, token overlap).
   - If score is above a threshold → return “database” result and skip AI call.
3. If no good DB match → call:
   - `supabase.functions.invoke('parse-food-text', { body: { text } })`
4. Cache results in-memory (Map) to avoid repeated calls for the same text.
5. Never throw uncaught errors—always return `{ error }` and let UI decide.

Return shape example:
- `status: 'idle' | 'searching_db' | 'calling_ai' | 'ready' | 'error'`
- `result?: { totals, foods, source, confidenceSummary }`
- `error?: string`
- `trigger(text)` and `clear()`

### 5) Add “safe autofill” rules (prevents annoying overwrites)
Both dialogs will track “touched” state:
- If the user manually edits calories/protein/carbs/fats, we will NOT overwrite that field on subsequent auto-fill unless they press an explicit “Apply” button.
- This is critical to make the feature feel premium, not intrusive.

---

## Phase 3 — Wire Smart Food Recognition into the two logging UIs
### 6) Update Game Plan quick logger
Modify:
- `src/components/QuickNutritionLogDialog.tsx`

Changes:
- When `mealTitle` changes and length >= 3:
  - trigger `useSmartFoodLookup(mealTitle)`
- Show a small inline status row under the meal title:
  - “Searching…” (spinner)
  - “Matched food database” (badge)
  - “AI estimate • High/Medium/Low confidence”
  - “Auto-fill unavailable” (if 402/429/other)
- When result arrives:
  - If macros not touched → fill calories/protein/carbs/fats
  - Optionally show a small “What I recognized:” expandable list of foods
- If the backend ever returns 404/402/429:
  - show a toast and keep the form usable (no blank screen)

### 7) Update Nutrition Hub quick entry
Modify:
- `src/components/nutrition-hub/MealLoggingDialog.tsx` (Quick Entry tab)

Same behavior as above, plus one “pro” enhancement:
- If AI returns multiple foods, offer a one-click option:
  - “Use detailed breakdown” → switches to Detailed tab and pre-fills MealBuilder items
  - (This makes compound meals feel significantly more accurate and “premium.”)

---

## Phase 4 — Add translations (so UI doesn’t show raw keys)
Update:
- `src/i18n/locales/en.json` (and optionally mirror into other locales later)

Add keys for:
- Smart lookup placeholder/help text
- “Searching…”
- “AI estimate”
- “Matched in food database”
- “Apply”
- “Not what you expected?”

---

## QA checklist (end-to-end)
1. Open Nutrition Hub → Quick Entry:
   - Type “greek yogurt” → should match local DB when possible.
2. Type “2 eggs with toast”:
   - DB likely won’t match perfectly → AI fills totals + shows recognized items.
3. Manually edit protein, then type more text:
   - Protein should NOT get overwritten.
4. Save meal:
   - Confirms your existing React Query invalidation updates macro totals everywhere.
5. Force AI failure simulation:
   - If 429/402 happens, UI shows toast and remains usable (no blank screen).

---

## Rollback / safety
- All changes are additive (new function + new hook + UI enhancements).
- If anything unexpected occurs, we can temporarily disable auto-triggering and keep only a manual “Auto-fill” button while preserving the backend function.

---

## Files that will be created/modified
**Create**
- `supabase/functions/parse-food-text/index.ts`
- `src/hooks/useSmartFoodLookup.ts`

**Modify**
- `supabase/config.toml`
- `src/components/QuickNutritionLogDialog.tsx`
- `src/components/nutrition-hub/MealLoggingDialog.tsx`
- `src/i18n/locales/en.json`
