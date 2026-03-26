
Fix the quick-log gating by tightening the shared rep logger and the subcomponents that still leak optional inputs.

### What I found
The issue is real. Quick Log is not enforcing “required fields only” consistently:

- `ThrowingRepFields.tsx` still shows optional fields in quick mode:
  - exact throw distance
  - throw tracking (`FieldingThrowFields`)
  - arm feel
  - exact velocity
- `BaserunningRepFields.tsx` still shows several optional fields in quick mode:
  - goal of rep
  - jump grade
  - read grade
  - time-to-base band
- `RepScorer.tsx` still shows at least one pitching optional field in quick mode:
  - `Contact Type` is outside advanced gating
- `Fielding` is mostly gated already, but I will re-audit the whole fielding block while fixing this to ensure only required fields remain in quick mode.
- `BuntRepFields.tsx` already gates most optional fields, but I will align it with the “required-only in quick” rule so the experience is consistent.

### Implementation plan

| File | Change |
|------|--------|
| `src/components/practice/ThrowingRepFields.tsx` | Keep only required quick fields visible: throw distance, self-catch quality, effort level. Move exact distance, throw tracking, arm feel, exact velocity, and all grading/spin fields under `mode === 'advanced'`. |
| `src/components/practice/BaserunningRepFields.tsx` | Keep only required quick fields visible: drill type. Keep custom AI drill description visible only when required by custom drill. Move goal, jump/read grades, time band, exact time, and exact steps into advanced mode. |
| `src/components/practice/RepScorer.tsx` | Gate pitching `Contact Type` behind advanced mode. Re-audit pitching/fielding sections so quick mode truly shows only required fields. Preserve required live-context inputs only where they are genuinely needed for validation. |
| `src/components/practice/BuntRepFields.tsx` | Reconfirm quick mode shows only core bunt fields and move any remaining optional/detail fields to advanced if needed. Also keep behavior consistent with the shared quick/advanced contract. |

### Quick mode target behavior
After the fix, Quick Log should show only essential fields:

- Throwing: throw distance, self-catch quality, effort level
- Fielding: position, batted ball type, fielding result
- Baserunning: drill type, plus custom AI description only when custom drill is selected
- Bunting: only core bunt inputs
- Pitching: only required pitch inputs, with optional analytics/detail fields hidden

### Safeguards
- Keep validation aligned with what is visible in quick mode so hidden optional fields are never required.
- Do not change saved data shape or backend behavior.
- Apply the fix in the shared `RepScorer` flow so it works in both standard logging and video + log.

### Result
Quick Log will become truly minimal and usable across all practice modules, with all optional detail fields available only after switching to Advanced.
