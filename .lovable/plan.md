

# Baserunning Drill Type: Per-Rep Mandatory + AI Drill Clarification Optional

## Problem
The previous implementation moved Drill Type to session-level setup. The user now requires it back at the per-rep level as mandatory, and wants AI Drill Clarification to be optional but visible in Quick Log.

## Changes

### 1. `src/components/practice/SessionConfigPanel.tsx` — Remove Baserunning Drill Type from Setup

- Remove `baserunning_drill_type` and `ai_baserunning_drill_description` from `SessionConfig` interface
- Remove `baserunningDrillType` / `aiBaserunningDrillDesc` state variables
- Remove `baserunningDrillValid` and `baserunningCustomDescValid` from `canConfirm`
- Remove the entire baserunning drill type UI block (lines ~230-294)
- Remove baserunning fields from `handleConfirm` payload
- Remove baserunning error messages from validation hint

### 2. `src/components/practice/BaserunningRepFields.tsx` — Add Drill Type Back (Always Visible)

- Add Drill Type `SelectGrid` back as the FIRST field, shown regardless of mode (not gated behind `mode === 'advanced'`)
- Add custom drill description field when `drill_type === 'custom'` (also always visible)
- Keep all other fields (goal, jump/read grade, time to base, etc.) gated behind `mode === 'advanced'`

### 3. `src/components/practice/RepScorer.tsx` — Validation + Remove Session Inheritance

**A. Add per-rep `baserunningDrillValid`:**
```
const baserunningDrillValid = !isBaserunning || !!current.drill_type;
```
Add to `canConfirm` chain.

**B. Remove session-level inheritance in `commitRep`:**
- Delete lines 417-423 that spread `sessionConfig.baserunning_drill_type` into the rep

**C. Make AI Drill Clarification optional for baserunning:**
- The existing `drillClarificationValid` logic uses `isDrill` — baserunning doesn't use "drill" rep source, so this is likely already fine. Will verify the `isDrill` check doesn't affect baserunning.

**D. Add error message:**
- Add `!baserunningDrillValid ? 'Select drill type' :` to the validation hints

**E. AI Drill Clarification visibility:**
- Currently gated behind `mode === 'advanced'` or certain conditions. Ensure it remains visible in Quick Log for baserunning as an optional field. If it's not already showing for baserunning in quick mode, add it.

### 4. `src/components/practice/RepScorer.tsx` — Baserunning custom desc validation

- Update `baserunningCustomDescValid` to always be `true` (no blocking) since AI drill clarification is optional
- Or simply remove it from `canConfirm` if it only applies to baserunning

## Files

| File | Change |
|------|--------|
| `src/components/practice/SessionConfigPanel.tsx` | Remove baserunning drill type from setup UI, interface, and validation |
| `src/components/practice/BaserunningRepFields.tsx` | Add drill type selector back (always visible, not advanced-gated) |
| `src/components/practice/RepScorer.tsx` | Add per-rep drill_type validation, remove session inheritance, ensure AI drill clarification is optional |

## No DB Changes
All data stored in `drill_blocks` JSONB — no schema changes needed.

