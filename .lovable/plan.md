# Plan: Simplify the Tempo Deterministic Tile

## Goal
Replace the current `Tempo (deterministic)` result tile in `/analyze/pitching` with a concise, athlete-friendly card that never exposes raw missingness codes, SHA fragments, or long measurement notes. Move the recording instructions into a compact dropdown directly beneath the result card.

## Current state
In `src/pages/AnalyzeVideo.tsx` (lines ~1159–1236) the Tempo tile currently renders:

- Header: `Tempo (deterministic)`
- Sub-line: `Measured from your video by the on-device pose engine. No estimation.`
- Value or missing line that includes the raw reason code, e.g. `Could not be measured from this clip (peak_leg_lift_missing). No value is shown.`
- `evidence sha256: 20ed0ea944bf15dc…`
- A separate guidance block titled `How to record for reliable Tempo`, auto-expanded when the leg-lift anchor is missing.

## Changes

### 1. Simplify the main Tempo result card
Rewrite the card to show only:

- **Title:** `Tempo`
- **Measured value present:** `{value} sec` (no extra explanatory text).
- **Measured value missing:** `Tempo could not be read from this clip.`

Remove the sub-line, the raw reason code, and the SHA prefix from the main card.

### 2. Move recording guidance into a dropdown below the result card
- Place the existing recording tips list inside a `Collapsible` component.
- Position the collapsible immediately under the Tempo result card, not as a separate floating panel.
- Trigger text: `How to record for reliable Tempo` with a chevron.
- Default state: **collapsed** for both success and missing cases.
- Keep the same five bullet tips and the final occlusion note (lead leg occluded by glove-side arm).

### 3. Preserve lineage visibility for debugging
Move the `evidence sha256` string out of the athlete-facing main card. Options:

- **Preferred:** Drop it from the visible UI entirely (it remains in the persisted `video_metric_runs` row for any engineering audit).
- **Alternative if you want it discoverable:** Add a tiny, collapsed `Debug details` expander inside the Tempo card that shows the SHA only when opened. This still removes raw text from the default view.

This plan defaults to the preferred option (drop SHA from UI) unless you ask for the debug expander.

## Files changed
- `src/pages/AnalyzeVideo.tsx` only.

## Verification
- `bunx tsgo --noEmit` passes.
- Tempo tile no longer contains the strings `peak_leg_lift_missing`, `evidence sha256`, or `on-device pose engine`.
- UI renders a single clean result line with the dropdown directly beneath it.