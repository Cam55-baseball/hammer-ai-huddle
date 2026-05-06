# Eliminate "Coming Soon" — Build Interactive Previews for All 20 Demo Modules

## Problem

Only 3 of ~20 demo `component_key`s have built shells (`hitting-analysis`, `iron-bambino`, `vault`). Every other module (Unicorn Engine, Pitching Analysis, Throwing Analysis, Pick-off Trainer, Drill Library, Pitch Design, Command Grid, Heat Factory, Speed Lab, Base Stealing, Baserunning IQ, Royal Timing, Tex Vision, Bullpen Planner, Custom Cards, Hammer Block Builder, Video Library, Nutrition, Regulation, Explosive Conditioning) falls back to the `DemoComingSoon` card with a placeholder line. That kills conversion.

## Strategy

Rather than hand-build 20 bespoke shells, ship **one config-driven `GenericModuleDemo`** that consumes a per-key `ModuleConfig` describing inputs, sim outputs, and which visual to render. Each config is small (15–40 lines), uses the existing `DemoLoopShell` for the Insight/Prescribed/CTA scaffold, and renders one of a small set of new sport visuals.

This gives every node:
- Real inputs the user can change (taps/toggles)
- A live diagnosis that recomputes on input
- A sport-appropriate animated diagram
- The full You-vs-Elite gap chart, severity meter, projected sparkline, prescribed-video strip, and CTA

## New visualization components (`src/components/demo/viz/`)

1. `RadialDial.tsx` — animated 0–100 dial; for command %, regulation index, sleep score, etc.
2. `BarRanking.tsx` — horizontal animated bar list; for drill rankings, pitch usage %, nutrient breakdown.
3. `diagrams/PitchTunnelDiagram.tsx` — pitcher's mound → tunnel point → strike-zone, multiple pitches with bend; one highlighted. Used by `pitching-analysis`, `pitch-design`, `throwing-analysis`, `pickoff-trainer`, `bullpen-planner`.
4. `diagrams/CommandGridDiagram.tsx` — 5×5 zone grid; intent cell lit, hits dotted. Used by `command-grid`, `royal-timing`.
5. `diagrams/SpeedTrackDiagram.tsx` — two animated runners on lanes (You vs Elite) finishing at scaled speed. Used by `speed-lab`, `base-stealing`, `baserunning-iq`, `explosive-conditioning`.
6. `diagrams/HeatBlockDiagram.tsx` — 3×3 lift block grid (squat/hinge/push/pull/carry/jump) lit by % volume; for `heat-factory`, `hammer-block-builder`, `merged-builder`, `unicorn-engine`.
7. `diagrams/MacroRingDiagram.tsx` — 3 stacked rings (P/C/F) with target ticks; for `nutrition`.
8. `diagrams/RegulationGaugeDiagram.tsx` — vertical thermometer with HRV/sleep/soreness inputs feeding a 0–100 readiness index; for `regulation`.
9. `diagrams/TexVisionGridDiagram.tsx` — 16-cell daily drill matrix, completed cells lit; for `tex-vision`.
10. `diagrams/CardStackDiagram.tsx` — fanned-out custom-card carousel, selected card scaled; for `custom-cards`, `drill-library`, `video-library`.

All built with framer-motion + pure SVG; respect `prefers-reduced-motion`.

## New sims (`src/demo/sims/`)

Each sim is ~30–60 lines following the existing `hittingSim`/`programSim` pattern (deterministic via `seedFromString` + `rng`, returns `{ benchmark: { severity, gap*, projectedImprovement, whyItMatters, ...numeric }, ... }`).

- `pitchingSim.ts` — inputs: pitch type + intent location → outputs: velo, spin, command%, command grid hits, tunnel deviation
- `throwingSim.ts` — inputs: position + arm slot → outputs: pop time, accuracy, carry distance
- `pickoffSim.ts` — inputs: runner lead + pickoff type → outputs: success%, tag time, deception score
- `pitchDesignSim.ts` — inputs: pitch + grip variation → outputs: spin axis, expected break, vsLHH/vsRHH whiff%
- `commandGridSim.ts` — inputs: target zone + count situation → output: 25-cell hit distribution + accuracy%
- `bullpenSim.ts` — inputs: pitch mix percentages → output: pitch counts, fatigue curve, tunneling overlap%
- `royalTimingSim.ts` — inputs: tempo (slow/medium/quick) → output: balance score, timing variance
- `speedLabSim.ts` — inputs: distance (10/30/60yd) + experience → output: your time, elite time, split breakdown
- `baseStealingSim.ts` — inputs: lead + jump quality → output: success probability + slide adjustment
- `baserunningIQSim.ts` — inputs: situation (1st-2nd, 0/1/2 outs) → output: correct read %, decision tree
- `explosiveSim.ts` — inputs: focus (jump/sprint/throw) → output: peak power watts, RFD, vs elite
- `heatFactorySim.ts` — inputs: phase + days/wk → output: lift block volumes, est strength gain
- `hammerBlockSim.ts` — inputs: emphasis sliders → output: 3×3 block grid intensity, weekly volume
- `nutritionSim.ts` — inputs: meal preset (lean/build/recover) → output: macros, top 2 limiters, hydration score
- `regulationSim.ts` — inputs: sleep hrs + HRV qualitative + soreness → output: 0–100 readiness, recommendation
- `texVisionSim.ts` — inputs: focus area (tracking/recognition/timing) → output: 16-cell daily plan, completion %
- `customCardsSim.ts` — inputs: card type + difficulty → output: card preview, point value, est rep value
- `drillLibrarySim.ts` — inputs: skill area → output: top 5 drill ranking with effectiveness scores
- `videoLibrarySim.ts` — inputs: category → output: 6 video tiles with popularity bars
- `unicornSim.ts` — inputs: hitter focus % vs pitcher focus % → output: weekly split, dual-track readiness

## Generic module shell (`src/components/demo/shells/GenericModuleDemo.tsx`)

A single component that:
1. Reads its `ModuleConfig` by `componentKey` prop (passed via a thin wrapper)
2. Renders a Card of `Picker`s for each declared input
3. Calls the module's `sim.run()` with current state
4. Renders the configured diagram in the `diagnosis` slot
5. Wires the sim's benchmark output into `DemoLoopShell` (numeric values for `GapBarChart`/`SparkTrajectory`)

```ts
interface ModuleConfig {
  fromSlug: string;
  simId: string;
  inputs: InputDef[];        // {key, label, options, default}
  sim: (state) => SimResult; // returns { result, benchmark, diagramProps }
  diagram: 'pitchTunnel' | 'commandGrid' | 'speedTrack' | 'heatBlock' | 'macroRing' | 'regulationGauge' | 'texGrid' | 'cardStack' | 'strikeZone' | 'swingArc' | 'weekGrid' | 'vaultTimeline';
  statTiles?: { label: string; key: string; unit?: string; decimals?: number }[];
}
```

## Module configs (`src/demo/modules/configs.ts`)

One entry per `component_key`, ~15-30 lines each, mapping `component_key` → `ModuleConfig`. Built-up modules (`hitting-analysis`, `iron-bambino`, `vault`) keep their custom shells; everything else uses the generic.

## Registry update (`DemoComponentRegistry.ts`)

Add lazy entries for each new key, each importing a tiny wrapper that calls `<GenericModuleDemo configKey="…" />`. Keys covered: `pitching-analysis`, `throwing-analysis`, `pickoff-trainer`, `pitch-design`, `command-grid`, `bullpen-planner`, `royal-timing`, `speed-lab`, `base-stealing`, `baserunning-iq`, `explosive-conditioning`, `heat-factory`, `hammer-block-builder`, `nutrition`, `regulation`, `tex-vision`, `custom-cards`, `drill-library`, `video-library`, `unicorn-engine`.

## Prescription catalog expansion (`src/demo/prescriptions/videoPrescription.ts`)

Add 3-severity × 3-video entries for each new `simId` (≈60 new catalog entries) so the prescribed-video strip never empty-falls-back to `hitting`. Each video gets a sport-relevant title, purpose, expected improvement, and unique hue.

## DemoSubmodule cleanup

Remove the user-visible `Interactive preview coming soon` line in `src/pages/demo/DemoSubmodule.tsx` (`DemoComingSoon` becomes a true 500-style fallback that just says "Loading preview…" — but in practice will never render once the registry is complete).

## Files

**New (15):**
- `src/components/demo/viz/RadialDial.tsx`
- `src/components/demo/viz/BarRanking.tsx`
- `src/components/demo/viz/diagrams/PitchTunnelDiagram.tsx`
- `src/components/demo/viz/diagrams/CommandGridDiagram.tsx`
- `src/components/demo/viz/diagrams/SpeedTrackDiagram.tsx`
- `src/components/demo/viz/diagrams/HeatBlockDiagram.tsx`
- `src/components/demo/viz/diagrams/MacroRingDiagram.tsx`
- `src/components/demo/viz/diagrams/RegulationGaugeDiagram.tsx`
- `src/components/demo/viz/diagrams/TexVisionGridDiagram.tsx`
- `src/components/demo/viz/diagrams/CardStackDiagram.tsx`
- `src/components/demo/shells/GenericModuleDemo.tsx`
- `src/demo/modules/configs.ts`
- 20 thin wrapper files in `src/components/demo/shells/generic/<key>.tsx` (each ~6 lines, just for `lazy()` import targets)
- `src/demo/sims/*.ts` — 20 new sim files

**Edited (3):**
- `src/components/demo/DemoComponentRegistry.ts` — register all 20 keys
- `src/demo/prescriptions/videoPrescription.ts` — add catalog entries for all 20 simIds
- `src/pages/demo/DemoSubmodule.tsx` — strip the user-visible "Coming soon" fallback line

## Out of scope

- Real video playback in prescribed-video cards (gradients + motion overlay only — already shipped)
- Persisting per-module sim state across navigation (each visit re-runs sim)
- Re-themeing for softball variants (still uses primary token; sport theming follows separately)
