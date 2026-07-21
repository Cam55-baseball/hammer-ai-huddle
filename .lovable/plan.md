Prominence pass for the DelayCam camera flip control.

## Current state
- `src/components/analyze/DelayCam.tsx` renders the flip button in a compact top-right control cluster.
- The button is labeled only "Flip" and is hidden entirely when a single camera is detected (`hasMulti` false).
- It is disabled until the camera is running, so users cannot discover it before they press Start.

## Proposed changes
1. **Make the flip control always visible (when multiple cameras exist)**  
   - Remove the `disabled={!running}` guard so the button is present before Start; if tapped while stopped, it will pre-select the camera and then start with that facing on the next Start press.

2. **Move it onto the live video pane**  
   - Position it as a semi-transparent floating action button in the top-right corner of the live `<video>` container, over the feed itself, where users naturally look for camera controls.

3. **Increase visual prominence**  
   - Use a larger button (or a circular icon button) with a contrasting background.
   - Label it "Flip camera" instead of just "Flip".
   - Show a small camera-direction badge (e.g., "Rear" / "Front") so the user knows which camera is active.

4. **Preserve existing behavior**  
   - Keep the same `swap()` logic and `facing` state.
   - Keep `hasMulti` gating so single-camera devices don't see a useless control.

## Files to edit
- `src/components/analyze/DelayCam.tsx` — reposition and restyle the flip button.

## Verification
- Visual check in browser preview: the flip button should be immediately visible next to the live feed while the camera is running, and labeled clearly.