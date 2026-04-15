

# Add Evidence Binding to Coaching Report

## Summary
Add `confidence` and `dataSignals` fields to root cause analysis, enforcing that every claim is backed by specific data signals. Low-confidence items get exploratory prescriptive fixes.

## Changes

### 1. `src/lib/coachingReportTypes.ts`
Add two fields to `RootCause`:
```typescript
confidence: 'high' | 'medium' | 'low';
dataSignals: string[];
```

### 2. `supabase/functions/session-insights/index.ts`

**Tool schema** — add to `rootCauseAnalysis` items:
- `confidence`: enum `["high", "medium", "low"]`, required
- `data_signals`: array of strings, required

**System prompt** — add EVIDENCE BINDING block:
- Every root cause MUST reference exact data signals (e.g., "low execution_grade on backhand drills", "chase_pct at 38%")
- `dataSignals` must reference inputs actually present in the session data — no fabrication
- If data does not clearly support a mechanism, set confidence to `"medium"` or `"low"`
- If insufficient data exists, state uncertainty explicitly instead of inferring
- Low-confidence root causes must have prescriptive fixes labeled as exploratory (drill description prefixed with "[Exploratory]")
- High confidence requires ≥2 corroborating data signals; medium requires 1; low means the issue is inferred but not directly measurable

### 3. `src/components/practice/CoachingReportDisplay.tsx`

In root cause cards, render:
- A confidence badge next to the classification badge (color-coded: high=green, medium=amber, low=gray)
- `dataSignals` as a comma-separated list below evidence, labeled "Data Signals:"
- For prescriptive fixes tied to low-confidence root causes, show an "Exploratory" badge

### 4. Backward compatibility
Old cached reports without `confidence`/`dataSignals` degrade gracefully — fields render only when present.

## Files modified

| File | Changes |
|------|--------|
| `src/lib/coachingReportTypes.ts` | Add `confidence`, `dataSignals` to `RootCause` |
| `supabase/functions/session-insights/index.ts` | Add fields to tool schema, add evidence binding rules to prompt |
| `src/components/practice/CoachingReportDisplay.tsx` | Render confidence badge and data signals |

