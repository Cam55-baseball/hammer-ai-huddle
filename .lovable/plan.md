

Looking at the request: add a deterministic Insight Engine layer between aggregation and the AI narrative in the recap pipeline. Let me check current state first.

Need to inspect: `supabase/functions/generate-vault-recap/index.ts` to understand current aggregation shape and where to inject the new layer.

## Plan

# Add Deterministic Insight Engine Layer to 6-Week Recap

## Architecture
```text
Raw Logs → Aggregates (existing) → InsightEngine (NEW) → AI Narrative (explain only)
```

The AI stops inferring and only verbalizes insights the engine has already computed and ranked.

## Changes — `supabase/functions/generate-vault-recap/index.ts`

### 1. Define `Insight` type + helpers (top of file)
```typescript
type InsightType = 'progression' | 'consistency' | 'volume' | 'imbalance' | 'intensity';
interface Insight {
  type: InsightType;
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  direction?: 'positive' | 'negative' | 'neutral';
  metric?: { current: number; previous?: number; change?: number; unit?: string };
}
```

### 2. Compute time-windowed metrics (after existing aggregation block)
Split the 6-week window into firstHalf (weeks 1–3) and secondHalf (weeks 4–6) using already-collected workouts + custom activities. Build:
- `weeklyVolume: number[6]` — sum of `total_weight_lifted` + `customVolumeLbs` per week
- `weeklyStrengthSessions: number[6]` — count from `strengthSessionDates` per week
- `exerciseDistribution: Record<string, number>` — sum of volume per normalized exercise name
- `firstHalfVolume`, `secondHalfVolume`, `avgSessionVolume`, `sessionsPerWeekStdDev`

### 3. `runInsightEngine(metrics)` function — 5 detectors

**A. Progression**
```typescript
if (firstHalfVolume > 0) {
  const change = (secondHalfVolume - firstHalfVolume) / firstHalfVolume;
  if (Math.abs(change) >= 0.1) {
    push({
      type: 'progression',
      direction: change > 0 ? 'positive' : 'negative',
      impact: Math.abs(change) > 0.2 ? 'high' : 'medium',
      confidence: strengthSessionDates.size >= 6 ? 'high' : 'medium',
      metric: { current: secondHalfVolume, previous: firstHalfVolume, change: Math.round(change * 100), unit: '%' },
      title: change > 0 ? 'Strength Progress Increased' : 'Strength Volume Declined',
      description: `Lifting volume ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(change * 100))}% in the second half.`,
    });
  }
}
```

**B. Consistency** — compute std-dev of sessions per week; low variance + sessions > 0 → positive, high variance with gaps → negative.

**C. Volume Load** — total volume vs baseline (e.g. > 30k lbs = high, < 5k lbs with sessions > 0 = low).

**D. Imbalance** — if any single normalized exercise > 50% of total exercise volume, flag negative impact.

**E. Intensity** — if `customTopWeightLbs >= 200` or program max weight ≥ 200 → positive intensity signal.

### 4. Rank + filter
```typescript
const ranked = insights
  .filter(i => i.confidence !== 'low')
  .sort((a, b) => {
    const score = (i: Insight) => 
      ({ high: 3, medium: 2, low: 1 }[i.impact]) * 2 + ({ high: 3, medium: 2, low: 1 }[i.confidence]);
    return score(b) - score(a);
  })
  .slice(0, 5);
```

### 5. Pass insights to AI prompt
Add a new section to the prompt:
```
COMPUTED INSIGHTS (SOURCE OF TRUTH — DO NOT INFER, ONLY EXPLAIN):
${JSON.stringify(rankedInsights, null, 2)}

INSTRUCTIONS:
- Convert these insights to natural, athlete-facing language
- Do NOT calculate, infer, or contradict these insights
- Do NOT add insights that are not in this list
- Match tone: high-impact = direct, medium = informative
```

Replace any prior "Analyze the data and provide insights" instructions with the explain-only directive.

### 6. Persist insights in `recap_data`
Add `computed_insights: rankedInsights` alongside `workout_stats` so future UI/PR detection features can consume them without re-computing.

## Guardrails Built-In
- Skip insights with `confidence = 'low'`
- Skip progression if change < 10%
- Skip consistency if sessions < 3 (insufficient sample)
- Cap output at top 5

## Files

| File | Change |
|------|--------|
| `supabase/functions/generate-vault-recap/index.ts` | Add `Insight` type, weekly metric computation, 5-detector engine, ranking, prompt rewrite, persist `computed_insights` |

## Out of Scope (Unlocked for Future)
- PR detection
- Plateau / overtraining warnings
- UI rendering of insight cards (data will already be in `recap_data`)

