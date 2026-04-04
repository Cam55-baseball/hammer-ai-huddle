

# Consistency Score Integrity Fix

## Problem
Line 81: `stabilityScore = 100` when zero micro days exist rewards absence of data with perfect stability. Combined with `loggingFrequency = 100` for daily loggers, this yields score = 70 (green zone) with zero micronutrient data.

## Changes

### 1. `src/hooks/useNutritionConsistency.ts`

**Update interface** — make `score` nullable, add `status` field:
```typescript
export interface ConsistencyData {
  score: number | null;
  status: 'active' | 'insufficient_data';
  stabilityScore: number;
  loggingFrequency: number;
  deficiencyFreeRate: number;
  daysAnalyzed: number;
}
```

**Early return when zero micro days** — after computing `daysWithMicros` (line 90), add:
```typescript
if (daysWithMicros === 0) {
  return {
    score: null,
    status: 'insufficient_data',
    stabilityScore: 0,
    loggingFrequency,
    deficiencyFreeRate: 0,
    daysAnalyzed: daysLogged,
  };
}
```

**Fix stability defaults** — replace line 81-82:
```typescript
let stabilityScore = 0;
if (dailyScores.length === 0) {
  stabilityScore = 0;
} else if (dailyScores.length === 1) {
  stabilityScore = 50;
} else {
  // existing std dev calculation
}
```

**Add `status: 'active'`** to the normal return object.

### 2. `src/components/nutrition-hub/NutritionScoreCard.tsx`

Update the consistency badge (lines 232-244) to handle null score:
```typescript
{consistency && consistency.daysAnalyzed >= 3 && (
  <div className="mt-1.5 flex items-center gap-1.5">
    <BarChart3 className="h-3 w-3 text-primary/60" />
    {consistency.score !== null ? (
      <>
        <span className="text-[10px] text-muted-foreground">14-day consistency:</span>
        <span className={cn('text-[10px] font-semibold', /* existing color logic */)}>
          {consistency.score}
        </span>
      </>
    ) : (
      <span className="text-[10px] text-muted-foreground italic">
        Consistency unavailable — insufficient micronutrient data
      </span>
    )}
  </div>
)}
```

## Verification

**Zero-micro scenario** → `score: null`, status `insufficient_data`, UI shows "unavailable" message.
**1 micro day** → `stabilityScore: 50`, score ≈ 30 (amber), not inflated.
**2+ micro days** → normal std dev calculation, no change.

