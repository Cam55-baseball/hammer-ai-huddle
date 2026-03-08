

# Fix: Precise Reaction Timing & First-Two-Steps Tracking

## Problem

**Reaction time always ~0.6s**: With only 8 frames spread over ~4.2 seconds, each frame interval is ~0.6s. The AI correctly identifies movement at the next frame after signal (delta = 1 frame), so every rep shows `1 × 0.6 = 0.60s`. The frame resolution is far too coarse for 0.01s precision.

**No first-two-steps tracking**: The system doesn't measure how long it takes a runner to complete their first two steps on a steal/go decision.

## Fix Strategy

### 1. Increase frame density around the signal window (LiveRepRunner.tsx)

Instead of 8 frames over ~4.2s, extract **two separate frame sets**:

- **Reaction window** (signal ± 1.5s): 20 frames over ~3s = **0.15s per frame** — still not 0.01s, but this is the limit of what frame-based analysis can achieve. To get true 0.01s precision, we also need to...
- **Send the exact frame timestamps** to the AI so it can interpolate. Tell the AI the millisecond timestamp of each frame and ask it to estimate movement onset between frames.

Concrete changes:
- Increase `FRAME_COUNT` from 8 to **20**
- Narrow the extraction window: start 0.5s before signal, end 2.5s after signal (3s total window instead of 4.2s)
- This gives **~0.158s per frame** — combined with AI interpolation, we can estimate to ~0.05s
- Pass each frame's exact timestamp (in ms) to the edge function

### 2. Update edge function to return sub-frame precision (analyze-base-stealing-rep)

- Accept a `frameTimestampsMs` array alongside the frames
- Update the system prompt to instruct the AI to estimate movement onset **between frames** using visual cues (e.g., "movement started ~40% between frame 3 and frame 4")
- Add a `estimatedReactionMs` field to the tool schema — the AI returns its best estimate in milliseconds
- Add `firstTwoStepsCompleteFrameIndex` — the frame where the athlete has completed two steps (only for "go" direction)

### 3. Calculate reaction time from AI's ms estimate (LiveRepRunner.tsx)

- Use the AI's `estimatedReactionMs` directly instead of the crude frame-delta calculation
- Fall back to frame-delta if the AI doesn't provide an ms estimate
- Round to 0.01s for display

### 4. Track first-two-steps time for "go" reps only

- Add `firstTwoStepsSec` to the `RepResult` interface
- The AI reports the frame index where two steps are completed (go direction only)
- Calculate time from signal to that frame
- Display in PostRepInput only when `signalType === 'go'`
- Include in session save data (`micro_layer_data`)

## File Changes

| File | Changes |
|------|---------|
| `src/components/base-stealing/LiveRepRunner.tsx` | Increase FRAME_COUNT to 20, narrow extraction window to ±1.5s around signal, compute & send frame timestamps, add `firstTwoStepsSec` to RepResult, use AI's `estimatedReactionMs` for timing |
| `supabase/functions/analyze-base-stealing-rep/index.ts` | Accept `frameTimestampsMs`, update prompt for sub-frame interpolation, add `estimatedReactionMs` and `firstTwoStepsCompleteFrameIndex` to tool schema |
| `src/components/base-stealing/PostRepInput.tsx` | Show "First 2 Steps" time when signal was "go" |
| `src/components/base-stealing/PerformanceAnalysis.tsx` | Include first-two-steps avg in analysis breakdown |
| `src/pages/BaseStealingTrainer.tsx` | Pass `firstTwoStepsSec` through to session save micro_layer_data |

