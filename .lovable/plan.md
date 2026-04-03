

# Fix: Base Running Drill Clarification Must Never Be Required

## Root Cause

In `RepScorer.tsx` line 342:
```
const needsDrillClarification = !isCatching && isDrill;
```
When a baserunning session uses `repSource === 'drill'`, `isDrill` is true, which makes `drillClarificationValid` require ≥15 characters in `ai_drill_clarification`. This blocks submission if the field is empty.

## Fix

### `src/components/practice/RepScorer.tsx`

**Line 342** — Exclude baserunning from drill clarification requirement:
```
const needsDrillClarification = !isCatching && !isBaserunning && isDrill;
```

This single change ensures:
- Baserunning reps never require `ai_drill_clarification`
- The `drillClarificationValid` check always passes for baserunning
- The "Drill Clarification requires min 15 characters" error never appears for baserunning
- The field in `BaserunningRepFields.tsx` remains visible and optional (already `required={false}`)
- Other modules (hitting, pitching, etc.) with `repSource === 'drill'` still enforce clarification as intended

No other files need changes. `BaserunningRepFields.tsx` already has `required={false}` and the correct label.

