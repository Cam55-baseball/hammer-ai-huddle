

# Add Steps Taken & Stride Analytics to SpeedTimeEntry

## Overview
Add an optional "Steps Taken" integer input per sprint rep alongside the existing time input. When both time and steps are filled, display inline Stride Efficiency (distance/steps) and Step Frequency (steps/time) metrics.

## Changes

### 1. `SpeedTimeEntry.tsx` — Add steps input + analytics display

- Add new prop: `stepsValues: Record<string, number[]>` and `onStepsChange: (key: string, repIndex: number, value: number) => void`
- Per rep row: add a compact integer input (placeholder "Steps", width ~16) after the time input
- When both `repTime > 0` and `steps > 0`, show two small inline badges:
  - **Stride Efficiency**: `(dist.yards / steps).toFixed(2)` yd/step
  - **Step Frequency**: `(steps / repTime).toFixed(1)` steps/sec
- Steps input is optional — empty means no analytics shown

### 2. `SpeedSessionFlow.tsx` — Wire state through

- Add `const [distanceSteps, setDistanceSteps] = useState<Record<string, number[]>>({})` 
- Add handler `handleDistanceStepsChange` (same pattern as `handleDistanceTimeChange`)
- Pass `stepsValues={distanceSteps}` and `onStepsChange={handleDistanceStepsChange}` to `SpeedTimeEntry`
- Include `steps: distanceSteps` in the `onComplete` data payload

### 3. `SpeedSessionFlow.tsx` — Update completion data type

- Add `steps?: Record<string, number[]>` to the `onComplete` callback interface

### Layout per rep row
```text
[Rep 1] [____time____] sec [__steps__] [⭐] [analytics badges]
```

Analytics badges appear only when both values are filled, keeping the UI clean when steps are skipped.

