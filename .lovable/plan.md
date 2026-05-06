# Demo: Universal Back Button + Working 10s Video Preview

Two fixes that close real gaps in the demo experience.

---

## 1. Back button on every demo page

Currently `DemoRoot` (the demo home `/demo`) does not show a Back control — only an Exit button. All other demo pages (`DemoTier`, `DemoCategory`, `DemoSubmodule`, `DemoUpgrade`) already pass `showBack` to `DemoLayout`.

**Change:** make Back universal in `DemoLayout`.

- Always render a Back button in the header (replace the "Demo Mode" badge slot when `showBack` is omitted).
- On `/demo` (entry point), the Back button label becomes **"Dashboard"** and navigates to `/dashboard`.
- On any other demo route, behavior stays the same (`navigate(-1)`, or "Demo Home" if at history entry 0).
- Keep the Skip and Exit buttons as-is for clarity.

Files: `src/components/demo/DemoLayout.tsx` (logic update only).

---

## 2. Real 10-second video preview

Today `PrescribedVideoCard` claims **"Preview: first 10s unlocked"** but clicking the Play button just routes to `/demo/upgrade`. There is no preview. We have no hosted MP4 assets for the ~60 prescribed drills, so the fix is to build a **real 10-second animated preview** driven by data we already have on each `PrescribedVideo` (title, purpose, expectedImprovement, thumbnailHue) plus the simId.

### Behavior

Click Play on a prescribed video card → opens an inline modal that plays a true 10-second animated storyboard, then auto-routes to `/demo/upgrade` (or shows an Unlock CTA when the user clicks before timeout).

Storyboard structure (10s total):

```text
0.0s ──── 3.3s ──── 6.6s ──── 10.0s
[ SETUP ] [  CUE  ] [ RESULT ]
  drill     coaching   expected
  title     point      improvement
```

- **Frame 1 (Setup, 0–3.3s):** drill title + sport-themed animated SVG backdrop tinted by `thumbnailHue`. Reuses existing diagram components when the simId matches (e.g. `SwingArcDiagram` for hitting, `PitchTunnelDiagram` for pitching, `SpeedTrackDiagram` for speed sims) so the preview feels feature-specific.
- **Frame 2 (Cue, 3.3–6.6s):** the `purpose` text animates in as a coaching card with a pulsing cue marker overlaid on the same diagram (e.g. red dot on the swing arc).
- **Frame 3 (Result, 6.6–10s):** `expectedImprovement` chip scales up with a confetti-free "before → after" bar (uses existing `GapBarChart` styling).
- A **countdown progress bar** at the bottom of the modal shows seconds remaining; a **"Unlock full drill"** CTA is visible the entire time.
- At 10s the modal auto-routes to `/demo/upgrade?from=…&video=…&reason=preview` (same destination as today).
- ESC or backdrop click closes the modal without routing.

### Why this is honest

The user genuinely sees a 10-second preview of the prescription concept (drill, cue, expected outcome) rendered with real visualization. The label can stay accurate as **"10-second preview"**. No fake video player, no broken `<video>` tag pointing at nothing.

### Components

- **New:** `src/components/demo/VideoPreviewModal.tsx`
  - Props: `{ open, onClose, video: PrescribedVideo, simId: string, fromSlug: string }`
  - Internal: 10s timer (`useEffect` + `requestAnimationFrame` for smooth progress), 3-frame storyboard via `framer-motion` `AnimatePresence`, sport-aware diagram resolver (small switch on `simId`).
  - Uses existing viz: `SwingArcDiagram`, `StrikeZoneDiagram`, `PitchTunnelDiagram`, `SpeedTrackDiagram`, `HeatBlockDiagram`, `MacroRingDiagram`, `GapBarChart`, `AnimatedNumber`. Falls back to a generic motion-line backdrop tinted by `thumbnailHue` when no diagram matches.

- **Edited:** `src/components/demo/PrescribedVideoCard.tsx`
  - Click opens the modal instead of immediately routing.
  - Pass `simId` (already known from parent strip — extend `PrescribedVideoStrip` props to forward `simId`).
  - Keep the `onPreviewClick` telemetry callback firing the moment the modal opens.
  - Keep "first 10s preview" copy — it's now true.

- **Edited:** `src/components/demo/DemoLoopShell.tsx`
  - Pass `simId` down through `PrescribedVideoStrip`.

- **Edited:** `src/components/demo/shells/GenericModuleDemo.tsx`
  - Same pass-through for the generic modules.

### Telemetry

- `preview_attempted` fires on modal open (already exists).
- New `preview_completed` event fires when the 10s timer finishes (vs `preview_dismissed` on early close). Uses existing `logDemoEvent` helper.

---

## Out of scope

- Real hosted MP4 drill videos (no assets available; revisit when video library is wired in).
- Changes to upgrade-flow routing or pricing.
- Softball-specific re-skin of preview frames.

## Files touched

- Edit: `src/components/demo/DemoLayout.tsx`
- Edit: `src/components/demo/PrescribedVideoCard.tsx`
- Edit: `src/components/demo/DemoLoopShell.tsx`
- Edit: `src/components/demo/shells/GenericModuleDemo.tsx`
- New: `src/components/demo/VideoPreviewModal.tsx`
