

# Manual Entry Mode for Base Stealing Drill

## Overview

Add a completely isolated Manual Mode that bypasses all camera/AI logic. The mode toggle lives in `SessionSetup`, and a new `ManualRepRunner` component handles the simplified rep flow (countdown → signal → user confirmation → data entry).

## File Changes

| File | Changes |
|------|---------|
| `src/components/base-stealing/SessionSetup.tsx` | Add `sessionMode: 'ai' | 'manual'` to `LeadConfig`. Add toggle switch between AI Video Analysis and Manual Entry. Show one-time stopwatch instructions card when manual is selected. |
| `src/components/base-stealing/ManualRepRunner.tsx` | **New file.** Handles: 10s countdown → "Take Your Lead" at 3-2-1 → randomized 1-3s delay → full-screen STEAL or BACK signal (stays visible until user taps). No camera, no recording, no AI. After user taps, shows correct/incorrect buttons, then optional inputs (First 2 Steps time, Steps to Base, Time to Base). Next Rep / Save & End buttons. Next Rep auto-starts the next countdown. |
| `src/pages/BaseStealingTrainer.tsx` | Branch on `config.sessionMode`: render `LiveRepRunner` for AI mode, `ManualRepRunner` for manual mode. Skip AI save logic for manual — build `RepResult` directly from user inputs. |
| `src/components/base-stealing/PostRepInput.tsx` | No changes needed — manual mode handles its own post-rep UI inline within `ManualRepRunner` for a faster, cleaner flow. |
| `src/components/base-stealing/SessionSummary.tsx` | Minor: hide video review sections when `videoBlob` is null (already handled). Hide AI confidence badge for manual reps. |
| `src/components/base-stealing/PerformanceAnalysis.tsx` | No changes — already works with whatever data is in `RepResult`. Manual reps will have `decisionTimeSec: null` (no reaction timing), but will have `firstTwoStepsSec`, `timeToBaseSec`, `stepsTaken`, and `decisionCorrect` from user input. |

## ManualRepRunner Flow Detail

```text
[Start Rep] → 10s countdown → "TAKE YOUR LEAD" (3..2..1)
  → random 1-3s delay
  → Full-screen signal: "STEAL" (green) or "BACK" (red)
  → Signal stays until user taps anywhere
  → "Did you make the correct decision?" → [Correct] [Incorrect]
  → Optional inputs (only show First 2 Steps + Time to Base for STEAL signals):
      - Time of First 2 Steps (s)
      - Steps to Base (#)  
      - Time to Base (s)
  → [Next Rep] or [Save & End]
```

## Key Design Decisions

- **Signal stays visible** until tapped (unlike AI mode's 3s auto-dismiss) — user needs to see it while physically running
- **No reaction time measurement** — spec explicitly says "we are NOT measuring reaction decision time yet"
- **First 2 Steps + Time to Base only shown on STEAL/go signals** — not applicable for BACK/return
- **Steps to Base shown for both** signal types (useful for return steps too, but can be toggled per spec preference)
- **Stopwatch instructions** shown as a dismissible card in SessionSetup when manual is toggled on
- `RepResult` reused with `videoBlob: null`, `decisionTimeSec: null`, `aiConfidence: undefined` for manual reps
- Manual mode sets `decisionCorrect` from the user's button tap, not AI

