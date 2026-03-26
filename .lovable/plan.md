

# Assessment: Advanced Toggle Already Exists for All Modules

## Finding
After thorough investigation, the advanced toggle **already exists** in every practice hub module:

- **`RepScorer.tsx` (line 453-463)**: Contains a Quick Log / Advanced toggle with a `Switch` component. This component is used for ALL non-game session types (solo work, team session, lesson, live ABs) across ALL modules (hitting, pitching, fielding, catching, throwing, baserunning, bunting).
- **`GameScorecard.tsx` (line 265-269)**: Has its own "Advanced Detail" toggle for game-type sessions.

The toggle was added previously and the field gating (hiding optional fields in quick mode) was implemented in the last approved plan across hitting, pitching, fielding, baserunning, and bunting modules.

## What might be happening
1. **Cached preview**: The browser may be showing an older version. A hard refresh (Ctrl+Shift+R) should reveal the toggle.
2. **Toggle visibility**: The toggle sits between the rep badges and the first field. If no reps are logged yet, it appears at the very top of the form — but it's small (text-xs) and could be easy to miss.

## Proposed Enhancement (if the toggle is hard to find)
If the issue is discoverability, I can make the toggle more visually prominent — for example, adding a colored background card or border around it so it stands out more clearly in the form.

| File | Change |
|------|--------|
| `src/components/practice/RepScorer.tsx` | Style the mode toggle row with a subtle background card and border to make it more visually prominent. |

No other files need changes — the toggle and gating logic are already in place for every module.

