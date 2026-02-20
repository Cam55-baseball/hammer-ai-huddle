
# Simplify Resting Heart Rate to Manual Entry Only

## What's Being Removed

The entire camera-based PPG measurement system in `src/components/vault/quiz/RestingHeartRateCapture.tsx`:

- `startMeasurement()` function and all camera/canvas setup
- `analyzeSignal()` peak-detection algorithm
- `stopCamera()` and all timer/stream refs
- `videoRef`, `canvasRef`, `streamRef`, `samplesRef`, `sampleTimerRef`, `countdownTimerRef`
- The `measuring` phase and its pulsing-heart countdown UI
- The `idle` phase with SVG diagram and camera instructions
- The camera-permission error handling
- The `Camera` and `RotateCcw` icon imports (no longer needed)
- The `useCallback`, `useEffect`, and `useRef` hooks (no longer needed)
- The `useIsMobile` hook (no longer needed — both platforms now do the same thing)
- The `MEASURE_DURATION` and `SAMPLE_INTERVAL_MS` constants

## What Stays / What's Built

A lean component with **two phases only**:

- **`entry`** — numeric input with a heart icon, 30–200 range, Save button, Enter key support
- **`result`** — displays the saved BPM with an Edit button to return to entry

The result display matches the existing desktop result style already in the component (`bg-rose-500/10 border border-rose-500/20` pill with the heart icon and BPM).

## New Component Shape

```text
Props:   value: string, onResult: (bpm: number | null) => void
State:   phase: 'entry' | 'result', inputValue: string, errorMsg: string
```

The `phase` initialises to `'result'` if a valid `value` prop is passed in (preserving the existing behaviour), otherwise `'entry'`.

## Files Changed

**`src/components/vault/quiz/RestingHeartRateCapture.tsx`** — rewritten to ~60 lines (down from ~370). No other files need to change; `VaultFocusQuizDialog.tsx` already calls `<RestingHeartRateCapture value={restingHr} onResult={...} />` which remains compatible.
