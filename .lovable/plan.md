

# Base Stealing Lab — 4 Updates

## 1. Steps Toward Base & Shuffle Steps: Allow 0

**Bug**: `STEP_OPTIONS` starts at 1 (formula `(i+2)/2`). Steps Toward Base and Shuffle Steps use this array, so 0 is not selectable.

**Fix** in `SessionSetup.tsx`:
- Add `{ value: '0', label: '0' }` to the beginning of `STEP_OPTIONS`, or create a separate options array for these two fields that starts at 0.
- Simplest: prepend `{ value: '0', label: '0' }` to `STEP_OPTIONS`.

## 2. Base Distance Already Exists

Base Distance setup is already implemented — `BASE_DISTANCE_OPTIONS` with 50/60/70/80/90 ft, and `config.baseDistanceFt` feeds into `SessionSummary` where metrics normalize to 90ft equivalent. This requirement is already satisfied. No changes needed.

## 3. Post-Session Performance Analysis Screen

After save but before returning to main menu, show a detailed performance breakdown. This will be a new component and a new phase in `BaseStealingTrainer.tsx`.

**New file**: `src/components/base-stealing/PerformanceAnalysis.tsx`

Inputs (from session reps + config):
- Avg takeoff/decision time (from AI-detected `decisionTimeSec`)
- Avg run time (from user-input `timeToBaseSec`)
- Lead distance, base distance, step/shuffle data
- Elite jump count

Output display:
- **Takeoff Grade**: Elite / Good / Average / Needs Work (based on `decisionTimeSec` vs MLB benchmarks)
- **Acceleration Grade**: Elite / Good / Average / Needs Work (based on normalized run time vs MLB steal time benchmarks)
- **Lead Efficiency**: Calculated from lead distance relative to base distance
- **Steal Efficiency Score**: Composite 0-100 score combining takeoff + acceleration + decision accuracy
- **Key Insight**: Dynamic coaching sentence (e.g., "Explosive acceleration but delayed first movement. Improving reaction time could drop your steal time by ~0.08s.")
- **Classification labels**: "Slow Takeoff + Elite Acceleration", "Elite Takeoff + Average Speed", etc.

**Modify** `BaseStealingTrainer.tsx`:
- Add new phase `'analysis'` between `'summary'` and navigation back
- After `handleSave` succeeds, transition to `'analysis'` phase instead of navigating away
- Render `<PerformanceAnalysis>` with a "Done" button that navigates to `/practice?module=baserunning`

## 4. Camera Recording Bug — Robustness Fix

**Root cause**: The camera init is fire-and-forget — if `getUserMedia` hasn't resolved by countdown=3, `startRecording()` runs with `streamRef.current === null` and silently fails.

**Fixes in `LiveRepRunner.tsx`**:

1. **Track camera readiness**: Add `cameraReady` state. Set it `true` after `getUserMedia` resolves. Disable "Start Rep" button until camera is ready.

2. **Guard countdown start**: Don't start countdown until `cameraReady === true`. Show "Initializing camera..." message.

3. **Recording safeguard at countdown=3**: If `streamRef.current` is null when countdown hits 3, retry camera init with a short timeout. If still null, show error toast and abort rep.

4. **Timeout recovery**: If `MediaRecorder` doesn't produce data within 10s of starting, trigger error state.

5. **Permission failure handling**: Catch `getUserMedia` errors explicitly — show a clear error message: "Camera permission denied. Please allow camera access to use Base Stealing Lab."

6. **Recording state indicator**: Show a small red recording dot when recording is active so the user has visual confirmation.

## Files Summary

| File | Change |
|------|--------|
| `SessionSetup.tsx` | Prepend `0` to `STEP_OPTIONS` |
| `LiveRepRunner.tsx` | Add camera readiness tracking, recording safeguards, error handling, recording indicator |
| `BaseStealingTrainer.tsx` | Add `'analysis'` phase after save |
| `PerformanceAnalysis.tsx` | **New** — post-session performance breakdown with grades, composite score, classification labels, coaching insight |

