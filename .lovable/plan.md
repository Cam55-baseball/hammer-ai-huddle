

# Upgrade Drill Recommendation Engine — Weighted Scoring, Backend Filtering, Position Fix, Dynamic Weakness Ranking + Test Proof

## Issues to Fix

1. **No weighted scoring**: Weaknesses are treated equally regardless of severity. A score-20 weakness should dominate over a score-60 weakness.
2. **No backend subscription filtering**: `useDrillRecommendations` fetches ALL drills client-side; `usePlayerDrillLibrary` also fetches all published drills without checking subscription status.
3. **Null-position leakage**: Drills with `positions: []` (no positions assigned) pass through position filters — a drill meant for no specific position shouldn't match position-filtered queries.
4. **Static weakness ranking**: All weaknesses contribute equally to scoring. Weaknesses should be ranked by severity (lowest score = highest priority) with diminishing weight.

## Implementation

### 1. Weighted Weakness Ranking in Engine

**File: `src/utils/drillRecommendationEngine.ts`**

Add a `rankWeaknesses` function that sorts weaknesses by score ascending (worst first) and applies a rank multiplier:
- Rank 1 (worst): 1.5x urgency
- Rank 2: 1.3x
- Rank 3: 1.1x
- Rank 4+: 1.0x

Update `scoreDrillAgainstInput` to accept ranked weaknesses with their multipliers. The `skillMatch` and `tagRelevance` calculations multiply the urgency by the rank weight, increasing the score ceiling for the most critical weaknesses.

### 2. Null-Position Leakage Fix

**File: `src/utils/drillRecommendationEngine.ts`**

In `scoreDrillAgainstInput`, the position matching block (line 168) currently gives 0 points to drills with empty positions — which is fine. But in the **fallback path** (line 246), drills with `positions: []` pass through the position filter. Fix: when position is provided, exclude drills with empty positions from position-filtered results (they should only appear if no position-specific drills exist).

**File: `src/hooks/usePlayerDrillLibrary.ts`**

Line 141: `d.positions.length === 0 || d.positions.includes(position)` — this leaks null-position drills. Change to strict: `d.positions.includes(position)`. Keep the existing fallback (if no drills match, show all).

Line 162: Same fix in the `filteredDrills` memo.

### 3. Backend Subscription Filtering

**File: `src/hooks/useDrillRecommendations.ts`**

Add `is_published = true` filter to the drills query (line 36) — currently only checks `is_active`, missing `is_published`. This ensures unpublished drills never reach the client.

**File: `src/hooks/usePlayerDrillLibrary.ts`**

Already filters by `is_published = true` ✅. But strip `video_url` from response for non-subscribers:
- After building `libraryDrills`, if user doesn't have premium, set `video_url: null` on all drills.
- Import and check subscription status via `useSubscription`.

### 4. Test File with 3 Scenarios

**File: `src/utils/__tests__/drillRecommendationEngine.test.ts`** (new)

Three deterministic test scenarios proving scoring outputs:

**Scenario A — Severe Weakness Prioritization**: Player has two weaknesses (score 15 and score 75). Verify drill matching the severe weakness scores higher than drill matching the mild weakness.

**Scenario B — Position Filtering + Null Position Exclusion**: Player is SS. Three drills: one SS-tagged, one OF-tagged, one with no positions. Verify SS drill ranks first, no-position drill does NOT get position points, and OF drill scores 0 for position.

**Scenario C — Progression Level + Detected Issue Combo**: Player at level 4 with detected issue "slow_hands". Drill A is level 4 with "slow_hands" tag. Drill B is level 7 with "slow_hands" tag. Verify Drill A scores higher due to progression fit despite same tag match.

Each test asserts exact breakdown values and final score ordering.

## Files Summary

| File | Action |
|------|--------|
| `src/utils/drillRecommendationEngine.ts` | Add ranked weakness weighting, fix null-position in fallback |
| `src/hooks/usePlayerDrillLibrary.ts` | Strict position filtering, strip video_url for non-subscribers |
| `src/hooks/useDrillRecommendations.ts` | Add `is_published` filter to query |
| `src/utils/__tests__/drillRecommendationEngine.test.ts` | New — 3 test scenarios proving scoring |

