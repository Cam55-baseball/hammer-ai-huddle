

# Make Contact Quality Mandatory in Quick Log for Hitting

## Problem
Contact Quality is currently only shown in Advanced mode for hitting reps. It needs to be a mandatory field in Quick Log mode as well, and the confirm button should require it.

## Changes

### 1. `src/components/practice/RepScorer.tsx`

**A. Move Contact Quality out of the `mode === 'advanced'` block (line ~994)**
- Extract the Contact Quality grid from inside the `{mode === 'advanced' && (...)}` block (lines 994-1015)
- Place it directly after the Swing Decision section (after line 972), so it appears in both Quick and Advanced modes
- Add the required asterisk indicator to the label

**B. Add to `canConfirm` validation (line 384)**
- Add condition: `&& (!isHitting || current.contact_quality != null)`
- This makes it mandatory for all hitting reps regardless of Quick/Advanced mode

**C. Update the validation error message (around line 2081)**
- Add a hint when contact quality is missing: "Select contact quality"

## No other files changed
- Contact Quality options already defined (line 195)
- Field already stored in rep data via `updateField('contact_quality', ...)`
- No DB changes needed

