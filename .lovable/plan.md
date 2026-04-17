

## Plan — Stricter Hydration Scoring + Resettable "Other" Search

### Issue 1: Scoring too lenient
Root beer (8oz, 28g sugar, 28mg Na) currently scores 59 ("Moderate"). Breakdown:
- water% ≈ 88 → contributes 52.8 (weight 0.6)
- electrolyte_score: Na (28/110)*100=25 *0.5=12.5; K=0; Mg=0 → ~13 → contributes 3.9 (weight 0.3)
- sugar_score: 28g/8oz > 26g threshold → 0 → contributes 0 (weight 0.1)
- Total ≈ 57 → "Moderate"

Problem: water% dominates (60%), so even sugary soda with no electrolytes still passes "Moderate" floor (50). Sugar weight is only 10% and the cap of 26g/8oz means anything ≥26g penalizes equally. Real hydration science: high sugar (>10g/8oz) actively impairs absorption (osmolality > blood plasma).

**Fix — recalibrate `hydrationScoring.ts`:**
1. **Reweight**: water 0.5, electrolytes 0.3, sugar 0.2 (double sugar's voice).
2. **Sugar curve tightened**: ≤2g/8oz=100, 5g=80, 10g=50, 15g=20, ≥20g=0 (was linear to 26g). Real soda/juice should land 0–15.
3. **Sugar veto**: if sugar ≥15g/8oz, cap final score at 45 (forces "Low" tier regardless of water%). Sugary drinks are net dehydrating relative to plain water.
4. **Tier thresholds nudged stricter**: optimal ≥85, high ≥72, moderate ≥55, low <55. Pushes borderline cases down.
5. **Insight**: when veto triggers, prepend "High sugar load impairs hydration absorption" so the score change is explainable.

Result: root beer → water 88·0.5=44 + electrolyte 13·0.3=3.9 + sugar 0·0.2=0 ≈ 48 → veto cap 45 → **"Low"**. Plain water stays 95+. Gatorade stays in "High". Coffee/tea stay "High/Optimal".

### Issue 2: "Other" search not resettable
In `QuickLogActions.tsx`, after AI analysis returns a preview, clearing the input doesn't reset state — user is stuck on the preview/back-only flow.

**Fix:**
- Watch the text input: when it becomes empty (or user edits it after a preview was shown), clear `analysis` state and return UI to the input/analyze step.
- Also: when analysis preview is showing, edits to the input should invalidate the preview (so they can refine "matcha latte" → "matcha latte with oat milk" and re-analyze without going back).

### Files to change
| File | Change |
|---|---|
| `src/utils/hydrationScoring.ts` | New weights, stricter sugar curve, sugar veto, tier thresholds, veto insight fragment |
| `src/components/nutrition-hub/QuickLogActions.tsx` | Reset analysis when input cleared/edited |

### Out of scope
- Re-scoring historical logs (new scoring applies to new logs going forward; legacy `hydration_profile` JSON stays as-is)
- Osmolality math (still scaffolded for future)

