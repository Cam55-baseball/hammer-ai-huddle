
## Fix the missing/undiscoverable advanced toggle in hitting practice logging

### What I found
The rep logging mode control does exist in code inside `src/components/practice/RepScorer.tsx`, which is the shared logger used by hitting practice sessions. However, in the current UI it is easy to miss because:
- it only shows the current state label (`Quick Log`) instead of clearly presenting both choices
- the switch itself has low visual contrast in the light theme screenshot
- it sits above the form as a subtle row, so users can mistake it for a label instead of an interactive control

Your screenshot matches this: the control is technically there, but it does not read like an obvious “Advanced” toggle.

### Plan
1. Update the shared rep logging mode control in `src/components/practice/RepScorer.tsx` so it is unmistakable in every practice module.
2. Replace the ambiguous single switch row with a more explicit control that shows both modes clearly, such as:
   - `Quick Log` button/tab
   - `Advanced` button/tab
   - short helper text under the control
3. Keep the existing behavior and persistence:
   - default remains `quick`
   - selection still saves to local storage
   - all existing field gating stays intact
4. Ensure the control appears consistently in:
   - standard logging
   - video + log flows
   - all practice modules that use `RepScorer`, including hitting solo work
5. Optionally improve contrast on the underlying `Switch` component only if any other screens rely on it and still need better visibility.

### Files to update
| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | Replace the current subtle mode row with a prominent, explicit Quick/Advanced segmented control or button group. |
| `src/components/ui/switch.tsx` | Only if needed: improve unchecked-state contrast globally. |

### Result
After this change, users in hitting practice sessions will immediately see an obvious `Advanced` option instead of a subtle switch that looks hidden.
