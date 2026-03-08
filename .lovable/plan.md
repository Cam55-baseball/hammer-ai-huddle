

# Base Stealing — Base Distance + Session Results Intelligence

## Changes

### 1. Add `baseDistanceFt` to `LeadConfig` (`SessionSetup.tsx`)
Add a "Base Distance" dropdown (50, 60, 70, 80, 90 ft) to the Situation card, right below the existing fields. Default: `'90'`. Add `baseDistanceFt: string` to the `LeadConfig` interface.

### 2. Upgrade `SessionSummary.tsx` — Performance Intelligence
Complete rewrite of the summary screen to include three sections:

**Session Summary** — Total Reps, Correct Decisions, Incorrect Decisions

**Performance Metrics** — Avg Decision Time, Avg Takeoff Speed (from `timeToBaseSec` user input), Avg Run Time to Base, Elite Jumps count

**Performance Insight** — Generated interpretation message based on metrics and MLB benchmarks:

Interpretation logic (pure client-side function):
- Decision time < 0.3s → "Elite reaction"
- Decision time 0.3–0.5s → "Good reaction"  
- Decision time > 0.5s → "Delayed reaction"
- If `timeToBaseSec` provided and `baseDistanceFt` known: calculate speed, compare to MLB elite steal times (~3.3s for 90ft)
- Elite jump count > 50% of go-reps → "Elite jump timing"
- Combine into a coaching sentence like: "Elite first step acceleration but reaction timing is slightly delayed. Improving decision speed will significantly improve steal success."

MLB benchmark constants (internal, not shown to user):
```ts
const MLB_BENCHMARKS = {
  eliteReactionSec: 0.25,
  goodReactionSec: 0.40,
  eliteStealTime90ft: 3.3,
  goodStealTime90ft: 3.6,
  avgStealTime90ft: 3.9,
};
```

### 3. Add `results` phase to `BaseStealingTrainer.tsx`
New phase flow: `setup → live_rep → post_rep → summary → results`

After user clicks "Save Session" in summary, save to DB, then show the new results screen instead of navigating away. Results screen has a "Done" button that navigates to `/practice?module=baserunning`.

Pass `config` to `SessionSummary` so it can access `baseDistanceFt` and `leadDistanceFt`.

### 4. Store `baseDistanceFt` in session data
In `handleSave`, include `base_distance_ft` and `lead_distance_ft` from config in the session notes/micro_layer_data so it persists.

## Files Modified

| File | Change |
|------|--------|
| `SessionSetup.tsx` | Add `baseDistanceFt` to interface + dropdown in Situation card |
| `SessionSummary.tsx` | Full rewrite with 3-section results, MLB benchmark interpretation engine |
| `BaseStealingTrainer.tsx` | Pass config to SessionSummary, update save flow to show results before navigating |

