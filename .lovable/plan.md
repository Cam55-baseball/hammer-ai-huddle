

# Base Stealing — Recording Start at "TAKE LEAD" + AI Video Reaction Analysis

## Key Change from Previous Plan

Recording now starts when "TAKE LEAD" appears (countdown = 3), not when countdown reaches 0. This captures the athlete's full lead setup and subsequent reaction.

## Updated Signal Flow

```text
Countdown: 10...4 → "TAKE LEAD" appears at 3 → RECORDING STARTS
Countdown: 3...2...1...0 → transition to waiting_signal
Random delay → Signal fires (full-screen color/number, NO buttons)
Signal auto-dismisses after 3s → Recording continues 2s more → Stops
Extract frames → Send to AI edge function → Get direction + timing → Display results
```

## Files to Create

### `supabase/functions/analyze-base-stealing-rep/index.ts`
- Edge function using Gemini vision via `LOVABLE_API_KEY`
- Accepts: base64 frames (5-8), signal frame index, signal type/value
- AI detects: forward vs backward movement, which frame movement began
- Returns: `{ direction: 'go' | 'return', movementStartFrameIndex: number, confidence: 'high' | 'medium' | 'low' }`
- Reaction time calculated client-side from frame index delta

## Files to Modify

### `LiveRepRunner.tsx` — Major Changes
- **Start recording at countdown = 3** (when "TAKE LEAD" shows), not at countdown = 0
- Remove `handleUserReact` — no more button-based reactions
- After signal fires: wait 3s (signal visible) → wait 2s more → stop recording
- Add `'analyzing'` phase with spinner
- Extract ~8 frames from video blob around signal timestamp using canvas
- Call edge function, build `RepResult` from AI response
- New helper: `extractFrames(videoBlob, startSec, endSec, count)` using off-screen video + canvas

### `ReactionSignal.tsx`
- Remove GO/BACK buttons entirely
- Remove `onUserReact` prop
- Signal auto-dismisses after 3s via timeout
- Add `onSignalDismissed` callback prop
- Keep `onSignalFired` unchanged

### `PostRepInput.tsx`
- Add AI confidence badge (high/medium/low) to results
- Remove any manual steal/return selection

### `BaseStealingTrainer.tsx`
- No changes needed — `RepResult` interface stays the same

## Countdown + Recording Logic (LiveRepRunner)

```ts
// In countdown effect:
if (countdown === 3) {
  startRecording(); // Start recording when TAKE LEAD appears
}
if (countdown <= 0) {
  setPhase('waiting_signal'); // Transition after countdown ends
}
```

## Preserved Systems
- `RepResult` interface — unchanged
- `SessionSummary` + MLB benchmarks — unchanged
- `RepReviewPlayer` — unchanged
- Session save logic — unchanged
- All existing grading/analytics — unchanged

