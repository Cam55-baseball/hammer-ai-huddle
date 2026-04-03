

# Remove "AI" from UI Labels + Confirm Single Optional Clarification Field

## Current State

`BaserunningRepFields.tsx` has ONE clarification field — the `AITextBoxField` on line 111 labeled "AI Drill Clarification (Optional)". It is already `required={false}` and does not block submission. There is no duplicate required version in baserunning — the required "AI Drill Clarification" in `RepScorer.tsx` (line 631-639) only renders for `repSource === 'drill'`, which baserunning never uses. So there is no functional bug — only incorrect "AI" labeling across the UI.

## Changes

### 1. `src/components/practice/BaserunningRepFields.tsx`
- Line 110 comment: `AI Drill Clarification` → `Drill Clarification`
- Line 112: label `"AI Drill Clarification (Optional)"` → `"Base Running Drill Clarification"`
- Line 115: placeholder `"Optional notes for AI analysis..."` → `"Optional notes for this rep..."`

### 2. `src/components/practice/RepScorer.tsx` — Remove all "AI" from user-facing text
- Line 620 comment: remove "AI" prefix
- Line 623: `"AI Drill Description"` → `"Drill Description"`
- Line 628: placeholder remove "for AI tracking"
- Line 633: `"AI Drill Clarification"` → `"Drill Clarification"`
- Line 638: placeholder remove "for AI tracking"
- Line 643: `"AI Custom Rep Description"` → `"Custom Rep Description"`
- Line 648: placeholder remove "for AI tracking"
- Line 2065: `'AI Drill Description requires min 15 characters'` → `'Drill Description requires min 15 characters'`
- Line 2066: `'AI Drill Clarification requires min 15 characters'` → `'Drill Clarification requires min 15 characters'`
- Line 2067: `'AI Custom Rep Description requires min 15 characters'` → `'Custom Rep Description requires min 15 characters'`
- Line 131 comment, line 333 comment: remove "AI" prefix

### No validation changes needed
- The baserunning clarification field is already `required={false}` and not in `canConfirm`
- The required drill clarification in RepScorer only triggers for `repSource === 'drill'` (non-baserunning modules) — no conflict exists
- `baserunningDrillValid` (drill type per rep) remains correctly enforced

## Files

| File | Change |
|------|--------|
| `BaserunningRepFields.tsx` | Rename label + placeholder to remove "AI" |
| `RepScorer.tsx` | Rename 6 user-facing labels, 3 error messages, 3 placeholders, 3 comments to remove "AI" |

No DB changes. No validation changes. No data model changes. Label-only update.

