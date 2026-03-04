

# Add Custom Rep Source Text Input for Catching "Other" Selection

## Problem
When a user selects "Other" as a rep source for catching sessions, there's no way to specify what the custom source actually is.

## Solution

### 1. Update `RepSourceSelector` component
- Add two new props: `customSource?: string` and `onCustomSourceChange?: (v: string) => void`
- When `value === 'other'`, render a `<Input>` (or `<Textarea>`) placeholder "Describe your rep source" below the button grid
- This keeps the component generic — any module using "Other" can opt into the custom text field

### 2. Thread the value through `SessionConfigPanel`
- Add `custom_rep_source?: string` to the `SessionConfig` interface
- Add local state `customRepSource` in `SessionConfigPanel`
- Pass `customSource` / `onCustomSourceChange` to `<RepSourceSelector>`
- Include `custom_rep_source` in the confirmed config object

### 3. Persist in rep data
- In `RepScorer`, pass `custom_rep_source` from `sessionConfig` into each saved rep so it's stored alongside `rep_source: 'other'`

### Files to modify
| File | Change |
|------|--------|
| `src/components/practice/RepSourceSelector.tsx` | Add optional `customSource`/`onCustomSourceChange` props; render input when value is `'other'` |
| `src/components/practice/SessionConfigPanel.tsx` | Add `custom_rep_source` to `SessionConfig`, wire state + props |
| `src/components/practice/RepScorer.tsx` | Pass `custom_rep_source` from session config into saved rep data |

