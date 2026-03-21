
Fix the Royal Timing player by bringing it up to the same playback standard already used elsewhere in the app.

1. Stabilize the independent player logic
- Refactor `src/components/royal-timing/VideoPlayer.tsx` to use a more complete local player state:
  - `isPlaying`
  - `currentTime`
  - `duration`
  - `durationResolved`
  - `seekingRef`
- Add video event listeners for `loadedmetadata`, `durationchange`, `timeupdate`, `seeked`, `play`, `pause`, and `ended`.
- Update button state from actual video events instead of assuming actions succeeded.

2. Fix play/pause reliability end-to-end
- Change play handling to use `video.play().then(...).catch(...)` so failed play attempts do not leave the UI in the wrong state.
- Use a single toggle/play/pause implementation consistent with the app’s working video players.
- Ensure mobile taps trigger the button, not overlapping elements.

3. Fix rewind/skip/frame-step precision
- Clamp all time changes against resolved duration.
- Pause before frame stepping, then set `currentTime` safely.
- Update displayed scrubber/time immediately after rewind, skip, and frame step instead of waiting for `timeupdate`.
- Preserve user offsets in comparison mode by only changing the targeted video for independent controls.

4. Fix duration handling for uploaded videos
- Replace the fragile `setTimeout` metadata workaround with the more reliable duration-resolution pattern already used in `VideoRepLogger`.
- Handle WebM/Infinity duration correctly so scrub, skip, and frame-step work on all supported uploads.

5. Fix speed controls consistency
- Sync per-video speed UI with incoming `speed` prop changes so the displayed speed always matches actual playback rate.
- Keep independent speed changes local to that player unless master controls are used.
- Keep master speed changes propagating to both players without resetting positions.

6. Improve mobile usability for seamless comparison setup
- Tighten the controls layout in `VideoPlayer.tsx` for the current narrow viewport so buttons remain tappable and visible.
- Reduce the chance that the floating help button overlaps the study area by checking Royal Timing spacing/layout and, if needed, adding bottom padding to the page container.

7. Verify timer compatibility
- Keep existing timer syncing behavior, but ensure programmatic seeks/frame steps still reflect immediately in synced timers once the video time changes.
- Confirm the player changes do not break synced/unsynced timer flow.

8. Runtime QA pass
- Test on `/royal-timing` in the preview with uploaded video:
  - single mode: play, pause, rewind, skip, frame step, scrub, speed
  - comparison mode: independent controls on each video plus master controls
  - mobile-sized viewport matching the current preview
- Also fix the dialog accessibility warning separately if it is part of the active help widget path, since it may interfere with debugging noise.

Files to update
- `src/components/royal-timing/VideoPlayer.tsx` — primary fix
- `src/components/royal-timing/RoyalTimingModule.tsx` — minor layout/padding/supporting prop behavior if needed
- `src/hooks/useRoyalTimingTimer.ts` — only if immediate synced timer refresh needs a small adjustment

Why this is still broken
- The current player only tracks `timeupdate` and `loadedmetadata`, so UI state can drift after direct seeks and failed play attempts.
- Duration resolution is weaker than the app’s existing robust player pattern.
- Local speed state is initialized from props but not kept in sync.
- The current mobile layout increases the chance of controls feeling unreliable even when the underlying ref exists.
