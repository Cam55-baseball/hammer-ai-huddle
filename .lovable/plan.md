

# Toggle Undo Buttons for Skip Day & Push Day

## What changes

Instead of showing undo in a temporary toast, the **Skip Day** and **Push Day** buttons themselves will toggle to **Undo Skip** and **Undo Push** after activation. Clicking the undo button restores the game plan.

## Implementation

### 1. GamePlanCard.tsx — Add toggle state

Add two state variables:
```
const [daySkipped, setDaySkipped] = useState(false);
const [dayPushed, setDayPushed] = useState(false);
```

Plus refs to store the skipped task IDs and pushed state for undo:
```
const skippedTaskIdsRef = useRef<string[]>([]);
```

### 2. Skip Day button — Toggle behavior

**When `daySkipped` is false** (current behavior):
- Skip all incomplete tasks, store IDs in ref
- Set `daySkipped = true`
- Show plain success toast (no undo action in toast)

**When `daySkipped` is true** (undo mode):
- Call `handleRestoreTask` for each stored ID
- Set `daySkipped = false`
- Show "Day restored" toast

Button renders as:
- Default: amber text, `SkipForward` icon, "Skip Day"
- Undo: green text, `Undo2` icon, "Undo Skip"

### 3. Push Day button — Toggle behavior

**When `dayPushed` is false**: Opens the push day dialog as normal.

**When `dayPushed` is true** (undo mode):
- Calls `undoLastAction()` from the reschedule engine
- Sets `dayPushed = false`

Button renders as:
- Default: white/70 text, `ArrowRight` icon, "Push Day"
- Undo: green text, `Undo2` icon, "Undo Push"

### 4. GamePlanPushDayDialog.tsx — Signal push completed

Add an `onPushComplete` callback prop. After any successful push action, call it so GamePlanCard can set `dayPushed = true`.

### 5. Reset on date change

Both `daySkipped` and `dayPushed` reset to `false` when the component remounts or when the task list refreshes (new day).

## Files

| File | Change |
|------|--------|
| `src/components/GamePlanCard.tsx` | Add toggle state, change Skip/Push buttons to toggle between action and undo |
| `src/components/game-plan/GamePlanPushDayDialog.tsx` | Add `onPushComplete` callback prop |

