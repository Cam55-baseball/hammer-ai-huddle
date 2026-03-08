

# Baseball-Only Base Stealing Training System

## Overview

A dedicated reaction-training submodule accessible from Practice Hub → Baserunning → Base Stealing, and from Golden 2Way / Complete Player tiles. Baseball only — hidden when sport is softball.

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/pages/BaseStealingTrainer.tsx` | Main page — session setup → live reps → review |
| `src/components/base-stealing/SessionSetup.tsx` | Lead config, camera setup, difficulty |
| `src/components/base-stealing/LiveRepRunner.tsx` | Countdown, signal display, camera capture |
| `src/components/base-stealing/ReactionSignal.tsx` | Full-screen color/number signal with randomized delay |
| `src/components/base-stealing/PostRepInput.tsx` | Optional post-rep data entry (steps, time, distance) |
| `src/components/base-stealing/RepReviewPlayer.tsx` | Video playback with scrubber, slow-mo, frame-step |
| `src/components/base-stealing/SessionSummary.tsx` | All reps listed with metrics, save to DB |

### Modified Files

| File | Change |
|------|---------|
| `src/App.tsx` | Add route `/base-stealing` |
| `src/pages/PracticeHub.tsx` | Add "Base Stealing" as sub-entry under baserunning (baseball only) |
| `src/pages/GoldenTwoWay.tsx` | Add Base Stealing tile (baseball only) |
| `src/pages/CompletePlayer.tsx` | Add Base Stealing tile (baseball only) |
| `src/components/practice/SchedulePracticeDialog.tsx` | Add `base_stealing` module option (baseball only) |

### No DB Migration Needed

All rep data stores in existing `performance_sessions.drill_blocks` JSONB and `micro_layer_data` JSONB. Videos upload to existing `videos` storage bucket.

## Session Setup Flow (`SessionSetup.tsx`)

1. **Camera Position Guide** — instructional card: "Position camera to capture 3 steps in each direction from lead position"
2. **Lead Style Inputs**:
   - Steps Toward Next Base: dropdown 1, 1.5, 2 ... 15
   - Shuffle Steps Toward Next Base: dropdown 1, 1.5, 2 ... 15
   - Steps Back Toward Outfield: dropdown 1, 1.5, 2
   - Steps Toward Pitcher: dropdown 1, 1.5, 2
   - Lead Distance (ft): number input
3. **Which Base Stealing**: 2nd / 3rd / Home (optional)
4. **Who Holds Runner**: 1B / 2B / SS / Nobody (optional, conditional on base)
5. **Signal Mode**: Colors (default) or Numbers (alternate)
6. **Difficulty Level**: Easy (0-2s delay) / Medium (0-3s) / Hard (0-5s) — controls randomization range

## Live Rep Flow (`LiveRepRunner.tsx`)

1. User taps **Start Rep**
2. 10-second countdown displays: `10 → 9 → ... → 1`
3. At `3-2-1`, text prompt: **"Take Lead"**
4. After countdown ends, random delay (0 to max based on difficulty)
5. **Signal fires** — full-screen flash:
   - Color mode: Green (Go) or Red/Yellow/Blue (Return) — weighted ~40% Go
   - Number mode: Even (Go) or Odd (Return)
6. Camera captures via `navigator.mediaDevices.getUserMedia({ video: true })` — recording starts at countdown, stops after signal reaction window (5 seconds post-signal)
7. Camera preview is **hidden** during rep (CSS `opacity-0`), shown only on playback

## Reaction Signal (`ReactionSignal.tsx`)

- Full viewport overlay with the signal color/number
- Signal stays visible for 2 seconds then fades
- Randomization engine: `Math.random()` for signal type + delay within configured range
- Signal selection is truly random each rep — no patterns

## Post-Rep Flow (`PostRepInput.tsx`)

After recording stops:
1. Show video playback of the rep
2. Display **Decision Correctness** (system auto-determines: Green→Go=correct, Red/Yellow/Blue→Return=correct)
3. Optional inputs: Steps taken, Time to base (sec), Base distance (ft)
4. Two buttons: **Start Next Rep** | **Save & End Session**

## AI Video Analysis Metrics

Store in `micro_layer_data` per rep:
- `decision_time_sec` — time from signal to first movement (calculated from video timestamps)
- `decision_correct` — boolean
- `first_two_step_time_sec` — placeholder for manual or future AI analysis
- `elite_jump` — boolean, if movement begins within 0.2s before green signal
- `signal_type` — 'go' or 'return'
- `signal_color` or `signal_number`
- `delay_before_signal_sec`

Note: True frame-by-frame AI analysis of reaction time from video requires computer vision. The system will capture timestamps programmatically (signal fire time vs user-tap confirmation) and store video for future AI pipeline integration. Manual entry of precise times is supported.

## Video Review (`RepReviewPlayer.tsx`)

- `<video>` element with recorded blob
- Timeline scrubber (range input)
- Frame step buttons (±1 frame via `video.currentTime += 1/30`)
- Playback speed: 0.25x, 0.5x, 1x
- Pause/Play toggle

## Storage & Integration

- Session saves as `performance_sessions` with `module: 'baserunning'`, `session_type: 'base_stealing'`
- `drill_blocks` contains one block per rep with all metrics
- Videos upload to `videos` bucket, referenced in `micro_layer_data`
- Appears in: Player Club → Baserunning, Vault → Video Library
- Scheduling: `base_stealing` added to `SchedulePracticeDialog` MODULES (filtered to baseball only)

## Sport Gating

All entry points check `sport === 'baseball'`. The Base Stealing tile/option is hidden for softball users. This is enforced at:
- PracticeHub baserunning sub-options
- GoldenTwoWay tiles
- CompletePlayer tiles
- SchedulePracticeDialog module list

