## Add "Watch the play" to Teach mode

Currently only Quiz mode (via `IqScenarioRunner`) exposes the play animation and `IqPlaybackControls`. In Teach mode (`src/pages/GameIqSituation.tsx`), `IqDiamond` is rendered statically with `mode="teach"` — users can see routes but cannot play them back.

### Changes

**`src/pages/GameIqSituation.tsx`** (Teach branch, around line 165)
- Add local state: `playing`, `progress`, `speed`.
- Wrap the `IqDiamond` render so when `playing || progress > 0`:
  - pass `mode="reveal"`, `playing`, `progress`, and `scenario={firstScenario}` so pucks walk the routes (same wiring `IqScenarioRunner` uses).
  - otherwise keep `mode="teach"` static preview.
- Render a "Watch the play" button + `IqPlaybackControls` (play/pause, scrub, speed, restart) directly under the diamond, only when `firstScenario` exists.
- Auto-reset `playing` to false when `progress` reaches 1 (mirrors runner behavior).

### Out of scope
No changes to Quiz mode, scenario data, or `IqDiamond` internals — the component already supports `playing`/`progress` in reveal mode.
