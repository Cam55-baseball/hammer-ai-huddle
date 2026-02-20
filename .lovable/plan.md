
# Resting Heart Rate Measurement in Morning Check-In

## Current State

The Morning Check-In already has a "Physio Check-in" section (lines 706–815 of `VaultFocusQuizDialog.tsx`) with a basic `<Input type="number">` for resting heart rate. State (`restingHr`) and the save path (`data.resting_hr`) are already wired up. The `resting_hr` column already exists in the database — no schema migration needed.

## What's Being Built

A new self-contained component `src/components/vault/quiz/RestingHeartRateCapture.tsx` that:

- **On mobile**: shows a "Measure with camera" button that uses the phone's rear camera and the [Web Photoplethysmography (rPPG)](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) technique to detect pulse from fingertip colour changes
- **On desktop (or when camera is unavailable)**: shows a clean manual number input
- Emits a single `onResult(bpm: number | null)` callback used by the dialog

The mobile detection reuses the existing `useIsMobile` hook.

---

## How the Camera Heart Rate Measurement Works

The camera-based approach uses **photoplethysmography (PPG)**:

1. The user presses their fingertip over the phone camera lens
2. The app captures video frames via `getUserMedia({ video: { facingMode: 'environment' } })`
3. Each frame is drawn to a `<canvas>` and the average **red channel** pixel value is sampled
4. The red channel fluctuates subtly in sync with each heartbeat as blood flow changes
5. Over ~30 seconds of samples, the app detects peaks in the red-channel signal and calculates beats-per-minute from peak intervals
6. The reading is displayed and the user can accept or retake it

This is an established web technique used by apps like Instant Heart Rate. Accuracy is typically ±5–10 bpm, appropriate for resting measurement.

---

## Files Changed

### New file: `src/components/vault/quiz/RestingHeartRateCapture.tsx`

A standalone component with these phases:

```text
idle → measuring (30s countdown) → result
         ↓ (camera fail / desktop)
      manual input
```

**States:**
- `phase`: `'idle' | 'measuring' | 'result' | 'manual'`
- `countdown`: seconds remaining (counts from 30 to 0)
- `bpm`: calculated result
- `redSamples`: raw red-channel array collected during measurement
- `manualValue`: string for the text input fallback

**Key logic:**
- `startMeasurement()`: calls `navigator.mediaDevices.getUserMedia`, creates a hidden `<video>` + `<canvas>`, samples every 100ms
- `analyzeSignal(samples)`: smooths the red-channel array, finds peaks using a simple threshold algorithm, computes inter-peak intervals → bpm
- On camera error: automatically switches to `'manual'` phase
- Desktop: if `!isMobile`, renders only the manual input (no camera button shown)

**UI layout:**
- Matches the existing quiz card style (`bg-gradient-to-br from-rose-500/10 to-red-500/10 rounded-xl border border-rose-500/20`)
- Idle: shows icon, description, and two buttons — "Measure with Camera" (mobile only) and "Enter Manually"
- Measuring: red pulsing animation, countdown timer, instruction text ("Hold finger over camera")
- Result: BPM displayed large, Accept / Retake buttons
- Manual: compact number input with a heart icon, 30–200 range

### Modified file: `src/components/vault/VaultFocusQuizDialog.tsx`

- Import `RestingHeartRateCapture`
- Replace the existing `<Input type="number">` resting HR block (lines ~716–751) with `<RestingHeartRateCapture value={restingHr} onResult={(v) => setRestingHr(v ? String(v) : '')} />`
- All existing state (`restingHr`) and save logic remain unchanged

---

## Technical Notes

- No database migration needed — `resting_hr` column already exists
- No new dependencies — uses native browser `getUserMedia` and `<canvas>` APIs
- Camera permission is requested at measurement time, not on page load
- If the browser doesn't support `getUserMedia` or the user denies permission, falls back to manual input gracefully
- The peak-detection algorithm uses a rolling mean + standard deviation threshold, which is robust enough for a 30-second resting window
- The component is fully self-contained and can be reused in future check-in types
