

# Base Stealing — Camera + Reaction System Fix

## Problems Identified

1. **Camera bug**: `startCamera` has empty dependency array `[]` but references `config.cameraFacing` — always uses stale value. Also allows rear camera selection when it should be front-only.
2. **Decision timing is wrong**: Signal fires, then auto-dismisses after 2s to `rep_done` phase where user taps Go/Back. The `decisionTimeSec` is calculated as `Date.now() - sig.firedAt` at button tap time — this includes the 2s signal display + however long user takes to read the question. Real decision time should be captured immediately when user taps during the signal overlay.
3. **No video review in PostRepInput**: After rep completes, user sees metrics and optional inputs but cannot watch their recorded video before proceeding.
4. **No Delete Rep option**: PostRepInput only has "Next Rep" and "Save & End".
5. **Missing 0-step options**: `SHORT_STEP_OPTIONS` starts at 1, needs 0 for outfield/pitcher steps.
6. **Missing 0.75x speed**: RepReviewPlayer only has 0.25x, 0.5x, 1x.
7. **MediaRecorder stop race condition**: `stopCamera()` calls `recorder.stop()` but chunks may not be flushed before creating the Blob.
8. **Camera preview not shown during idle**: Preview should always show in idle phase (front camera only now) so user can frame themselves.

## Changes

### `SessionSetup.tsx`
- Remove camera facing toggle — hardcode `cameraFacing: 'user'` (front camera only)
- Remove the `SwitchCamera` toggle UI from the Camera Position card
- Update camera instruction text to reflect front-camera-only behavior
- Add `{ value: '0', label: '0' }` to `SHORT_STEP_OPTIONS`

### `LiveRepRunner.tsx` — Major Rewrite
- Fix `startCamera` to always use `facingMode: 'user'`
- **Start camera immediately on mount** (idle phase) so preview is visible for framing
- Show camera preview during `idle` phase, hide during countdown/signal/rep_done
- **Move Go/Back buttons INTO the signal overlay** so user taps during the signal (not after). This captures true reaction time at the moment of decision, not after signal dismissal
- Fix MediaRecorder stop: use `recorder.stop()` + `onstop` event to create blob reliably
- After user taps Go/Back during signal → transition to `rep_done` with accurate timing
- Pass video blob to result only after `onstop` fires

### `ReactionSignal.tsx`
- Add Go/Back tap targets to the signal overlay itself so athletes can respond while seeing the signal
- Accept `onUserReact: (decision: 'go' | 'return') => void` prop
- Remove auto-dismiss timer — signal stays until user taps

### `PostRepInput.tsx`
- Add `RepReviewPlayer` component when `result.videoBlob` exists
- Add "Delete Rep" button that calls new `onDeleteRep` callback
- Show decision time, correctness, and elite jump status prominently

### `RepReviewPlayer.tsx`
- Add 0.75x to speed cycle: `[0.25, 0.5, 0.75, 1]`

### `BaseStealingTrainer.tsx`
- Add `handleDeleteRep` that discards current result and goes back to `live_rep` without incrementing counter
- Pass `onDeleteRep` to PostRepInput

## Flow After Fix

1. **Setup** → user configures lead, sees signal rules, taps Start
2. **Idle** → front camera preview visible, user confirms framing, taps Start Rep
3. **Countdown** → 10s countdown, "TAKE LEAD" at 3-2-1, camera hidden, recording starts
4. **Waiting Signal** → random delay, pulsing indicator
5. **Signal fires** → full-screen color/number overlay with GO and BACK buttons overlaid at bottom. User taps immediately — timestamp captured at tap = true decision time
6. **Rep Done** → camera stops, video blob created via `onstop` event. Shows: decision correctness, decision time (0.01s), signal info, elite jump badge. Video review player embedded. Optional inputs. Three buttons: Next Rep / Save & End / Delete Rep

## Files Modified

| File | Change |
|------|--------|
| `SessionSetup.tsx` | Remove camera toggle, hardcode front, add 0-step option |
| `LiveRepRunner.tsx` | Fix camera init, show preview in idle, capture reaction during signal overlay, fix blob creation |
| `ReactionSignal.tsx` | Add Go/Back buttons to signal overlay, remove auto-dismiss |
| `PostRepInput.tsx` | Add video review player, add Delete Rep button |
| `RepReviewPlayer.tsx` | Add 0.75x speed option |
| `BaseStealingTrainer.tsx` | Add delete rep handler |

