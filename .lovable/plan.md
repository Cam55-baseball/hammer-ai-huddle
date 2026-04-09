

# Upgrade Drill Recommendation Engine — Backend Filtering, Ranked Issues, Negative Penalties, Sport Modifiers + Test Proof

## 4 Changes

### 1. Backend Subscription Filtering — Don't Return Premium Drills to Free Users

**File: `src/hooks/useDrillRecommendations.ts`** (line 34-39)

Currently fetches all active/published drills regardless of subscription. When `userHasPremium === false`, the engine still scores premium drills and marks them `locked`. Instead, filter them out entirely at the query level so premium drill data never reaches the client for free users.

Add conditional filter: if `!userHasPremium`, add `.eq('premium', false)` to the drills query. Premium users get everything.

**File: `src/hooks/usePlayerDrillLibrary.ts`** (line 73-80)

Same fix: when `!userHasPremium`, add `.eq('premium', false)` to the query. Already strips `video_url` — this prevents even drill metadata from leaking.

### 2. Replace Threshold-Based Detected Issues with Ranked Selection

**File: `src/hooks/usePlayerDrillLibrary.ts`** (line 63-65)

Current: `filter(w => w.score > 0.3)` — arbitrary threshold. Issues below 0.3 are silently dropped; issues above are all treated equally.

Replace with ranked selection: sort by score descending, take top 10, no threshold. This ensures the most impactful issues are always surfaced regardless of magnitude.

```
const detectedIssues = (weaknessRes.data || [])
  .sort((a, b) => b.score - a.score)
  .slice(0, 10)
  .map(w => w.weakness_metric);
```

### 3. Negative Scoring Penalties in Engine

**File: `src/utils/drillRecommendationEngine.ts`**

Add a new `penalty` field to `ScoreBreakdown` (value 0 to -20). Apply penalties for:

- **Overused drills**: If `useCount >= 10` and `avgSuccessRating < 2.5` → penalty -15 ("low success, high usage = drill isn't working")
- **Stale drills**: If `useCount >= 8` and `avgSuccessRating` between 2.5-3.5 → penalty -8 ("mediocre returns, try something new")
- **Sport mismatch on position**: If drill has positions but NONE match player position → penalty -10 (currently just 0 bonus, but should actively penalize wrong-position drills when player has a position set)

Update `sumBreakdown` to include `penalty`. Penalties are negative so they naturally reduce the total.

### 4. Sport-Specific Score Modifiers

**File: `src/utils/drillRecommendationEngine.ts`**

Currently `sport_modifier` is per-drill (stored in DB, default 1.0). Add a **sport-level modifier map** applied globally based on the `sport` input:

```typescript
const SPORT_SCORE_MODIFIERS: Record<string, Record<string, number>> = {
  baseball: { fielding: 1.1, throwing: 1.05, hitting: 1.0 },
  softball: { fielding: 1.15, hitting: 1.1, throwing: 1.0 },
};
```

This multiplies the module-specific component of the score. For softball, fielding drills get a 15% boost (more emphasis on defensive fundamentals at shorter distances). For baseball, fielding gets 10%. Applied as a second multiplier alongside the existing per-drill `sport_modifier`.

### 5. Test Scenarios — Softball vs Baseball Scoring

**File: `src/utils/__tests__/drillRecommendationEngine.test.ts`**

Add 5 new tests:

- **26. Negative penalty: overused low-success drill penalized**: Drill with useCount=12, avgRating=2.0 gets penalty -15, scores lower than equivalent drill without usage.
- **27. Negative penalty: wrong-position drill penalized**: SS player, drill tagged OF-only → penalty -10 applied.
- **28. Ranked issues: top 10 selection proves no threshold cutoff**: 15 issues passed, only top 10 by score used for matching.
- **29. Softball vs Baseball: same drill, different sport modifiers**: Fielding drill with softball sport_modifier=1.15 vs baseball sport_modifier=1.1 — softball version scores higher.
- **30. Sport module modifier: softball fielding outscores softball hitting**: Two identical drills, one module=fielding one module=hitting, softball sport → fielding drill gets 1.15x vs 1.1x.

## Files Summary

| File | Action |
|------|--------|
| `src/utils/drillRecommendationEngine.ts` | Add `penalty` to breakdown, negative scoring logic, sport-level module modifiers |
| `src/hooks/useDrillRecommendations.ts` | Filter out premium drills for free users at query level |
| `src/hooks/usePlayerDrillLibrary.ts` | Filter premium drills for free users; replace threshold with ranked selection |
| `src/utils/__tests__/drillRecommendationEngine.test.ts` | Add tests 26-30 for penalties, ranked issues, sport modifiers |

