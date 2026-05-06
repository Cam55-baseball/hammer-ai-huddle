# Demo Visualization Layer — Plan

Goal: turn the demo from text/number readouts into a visually immersive flow that *shows* the gap, not just describes it. Five focused additions, all reusable across `HittingAnalysisDemo`, `IronBambinoDemo`, and `VaultDemo`.

## New shared components (`src/components/demo/viz/`)

1. **`AnimatedNumber.tsx`**
   - Count-up tween (rAF, ~400ms, easeOutCubic) when `value` prop changes.
   - Props: `value: number`, `decimals?`, `suffix?`, `flashOnChange?` (brief primary-color pulse).
   - Drop-in replacement for raw `{result.exitVelo}` etc. inside `Stat` and `Mini` tiles.

2. **`GapBarChart.tsx`** — *the headline visual, replaces the 3 text tiles in the Insight step*
   - Two stacked horizontal bars: "You" (muted) and "Elite" (primary), with the delta region shaded destructive.
   - Animated width on mount + on value change, with a labeled gap arrow between them.
   - Projected-improvement ghost bar overlay on the "You" bar (dashed primary, animates from current → projected).
   - Props: `yourValue`, `eliteValue`, `unit`, `projectedValue?`, `severity`.

3. **`SeverityMeter.tsx`**
   - Three-segment traffic-light arc (minor=emerald / moderate=amber / critical=destructive) with an animated needle.
   - Sits inline above `GapBarChart` so severity becomes visual, not just a copy variant.

4. **`SparkTrajectory.tsx`**
   - Tiny 8-week SVG line chart projecting current → projected value with a glow tip.
   - Used inside the "projected improvement" pill so `+3 mph in 8 weeks` shows a line, not just text.

5. **`PrescribedVideoCard` upgrade** (edit existing file, not new)
   - Replace flat hue gradient with: animated radial pulse behind Play icon, a faint motion-line SVG overlay (loops 3s), and a hover scale.
   - Add a small per-video severity dot + projected-gain mini sparkline.

## New sport-specific diagrams (`src/components/demo/viz/diagrams/`)

6. **`StrikeZoneDiagram.tsx`** (Hitting demo)
   - 9-cell SVG zone; selected `zone` (inside/middle/outside) highlights the corresponding column.
   - Pitch icon dot animates in from pitcher origin to the selected cell, colored by `pitch` type.
   - Replaces the "Simulated swing result" text-only Diagnosis card body (stats stay below).

7. **`SwingArcDiagram.tsx`** (Hitting demo)
   - SVG bat path arc whose curvature is driven by `batPathScore` and angle by `launchAngle`.
   - Contact dot pulses; a faint "elite path" ghost arc shows the target.

8. **`WeekGridHeatmap.tsx`** (Iron Bambino demo)
   - 7-cell week grid; each cell colored by training intensity, locked day shows lock + blur.
   - Replaces vertical card list; gives a real "calendar at a glance" feel.

9. **`VaultTimelineRibbon.tsx`** (Vault demo)
   - Horizontal timeline with 12 month-tick markers; visible weeks lit, locked weeks faded with a lock glyph every Nth.
   - Replaces (or augments) the 6-tile gradient grid so "history you can't see" is literal.

## Wiring changes

- **`DemoLoopShell.tsx`**
  - Insight section: swap the 3 `Mini` tiles for `<SeverityMeter />` + `<GapBarChart />`.
  - Keep `whyItMatters` text below, but render `projected` inside `<SparkTrajectory />`.
  - Pass `severity`, `yourValue`, `eliteValue`, `projectedValue` numerically (extend `Benchmark` interface to accept optional `yourNumeric`, `eliteNumeric`, `projectedNumeric`, `unit`; fall back to current text rendering when missing — keeps Vault working without numeric values).

- **`HittingAnalysisDemo.tsx`**
  - Diagnosis card: add `<StrikeZoneDiagram pitch={pitch} zone={zone} />` at top, `<SwingArcDiagram score={batPathScore} angle={launchAngle} />` below stats.
  - Wrap stat values in `<AnimatedNumber />`.

- **`IronBambinoDemo.tsx`**
  - Add `<WeekGridHeatmap days={program.days} />` above the existing per-day card list (keep list as detail).

- **`VaultDemo.tsx`**
  - Add `<VaultTimelineRibbon visible={6 - lockedCount} total={6} />` above the tile grid.

## Animation & perf rules

- All viz uses `framer-motion` (already in deps via Tex Vision) for enter + value transitions; respect `prefers-reduced-motion` (skip count-ups, keep static end state).
- No heavy libs — pure SVG + framer-motion. Recharts already loaded for some routes; do **not** add it just for the demo to keep the bundle small.
- Determinism: all viz is driven by sim outputs only — no random animation seeds that diverge from `simEngine`'s `rng`.

## Out of scope

- Real video thumbnails (still gradients with motion overlay; swapping in real frames is a separate content task).
- Touch-drag interactions on diagrams (tap-only for now).
- Telemetry events for viz interactions — current `useDemoInteract.bump()` already fires on input changes which drive viz.

## Files

New:
- `src/components/demo/viz/AnimatedNumber.tsx`
- `src/components/demo/viz/GapBarChart.tsx`
- `src/components/demo/viz/SeverityMeter.tsx`
- `src/components/demo/viz/SparkTrajectory.tsx`
- `src/components/demo/viz/diagrams/StrikeZoneDiagram.tsx`
- `src/components/demo/viz/diagrams/SwingArcDiagram.tsx`
- `src/components/demo/viz/diagrams/WeekGridHeatmap.tsx`
- `src/components/demo/viz/diagrams/VaultTimelineRibbon.tsx`

Edited:
- `src/components/demo/DemoLoopShell.tsx` (Insight section + extended `Benchmark` type)
- `src/components/demo/PrescribedVideoCard.tsx` (motion overlay + severity dot)
- `src/components/demo/shells/HittingAnalysisDemo.tsx`
- `src/components/demo/shells/IronBambinoDemo.tsx`
- `src/components/demo/shells/VaultDemo.tsx`
