

# Phase 1 & 2 — Remotion Foundation + Local Render Proof

## Architecture

```text
remotion/                          # Standalone Remotion project (NOT in main app bundle)
├── package.json
├── tsconfig.json
├── scripts/
│   └── render-remotion.mjs        # Programmatic render script (accepts project ID via env)
├── src/
│   ├── index.ts                   # registerRoot entry
│   ├── Root.tsx                   # Composition registration
│   ├── MainVideo.tsx              # Dynamic scene sequencer (reads scene_sequence prop)
│   ├── scenes/
│   │   ├── HookProblemScene.tsx   # "90% of athletes train blind" — kinetic typography
│   │   └── DashboardHeroScene.tsx # MPI score + grade cards animating in
│   └── components/
│       ├── PhoneMockup.tsx        # iPhone frame wrapper
│       └── AnimatedMetric.tsx     # Reusable number/grade reveal
└── public/
```

## Implementation Steps

### Step 1: Initialize Remotion Project
- `mkdir -p remotion && cd remotion && bun init -y`
- Install: `remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/bundler`, `@remotion/compositor-linux-x64-musl`, `@remotion/transitions`, `@remotion/google-fonts`, `react`, `react-dom`, `typescript`, `@types/react`, `@supabase/supabase-js`
- Fix compositor binary (musl→gnu copy), symlink ffmpeg/ffprobe
- Create `tsconfig.json` with `jsx: "react-jsx"`, `module: "Preserve"`

### Step 2: Build Two Scene Components

**HookProblemScene** — consumes `sim_data: { headline, subtext, stats[] }`
- Dark background with subtle gradient
- Headline slams in via spring (large kinetic type)
- Stats stagger in below with counter animation
- Subtext fades in last as emotional anchor
- All animation via `useCurrentFrame()` + `interpolate()`/`spring()`

**DashboardHeroScene** — consumes `sim_data: { mpiScore, grades, streak }`
- Phone mockup frame containing simulated dashboard UI
- MPI score counts up from 0 to target value
- Grade cards (A-, A, B+) spring in with stagger
- Streak badge pulses in
- Clean, app-realistic visual style

### Step 3: Dynamic Scene Sequencer (MainVideo.tsx)
- Accepts `sceneSequence` prop: array of `{ sceneKey, simData, durationInFrames }`
- Maps `sceneKey` → component (`hook-problem` → HookProblemScene, etc.)
- Renders scenes via `<TransitionSeries>` with wipe transitions
- Each scene receives its `simData` as props

### Step 4: Root Composition
- Registers composition `id="main"` at 1080×1920 (9:16 default), 30fps
- Default props include a sample 2-scene sequence for standalone testing
- Duration calculated from scene sequence

### Step 5: Render Script (`scripts/render-remotion.mjs`)
- Reads `PROJECT_ID` from env
- Connects to Supabase directly (using supabase-js with service role or anon key + the project's URL from env)
- Loads `promo_projects` row → gets `scene_sequence` and `format`
- Loads matching `promo_scenes` rows → injects `sim_data`
- Sets composition dimensions from `FORMAT_CONFIGS` (9:16 vs 16:9)
- Renders via `@remotion/renderer` programmatic API
- Outputs to `/mnt/documents/{project_title}.mp4`
- Uses `chromeMode: "chrome-for-testing"`, `muted: true`, `concurrency: 1`

### Step 6: End-to-End Proof
1. Create a test project in DB with 2 scenes (hook-problem + dashboard-hero)
2. Run: `cd remotion && PROJECT_ID=<uuid> node scripts/render-remotion.mjs`
3. Verify: MP4 exists, duration matches expected (~14s for two 7s scenes), file size > 0
4. Report exact output path and file size

## Files to Create

| File | Purpose |
|------|---------|
| `remotion/package.json` | Remotion project deps |
| `remotion/tsconfig.json` | TS config for Remotion |
| `remotion/src/index.ts` | Entry point |
| `remotion/src/Root.tsx` | Composition registration |
| `remotion/src/MainVideo.tsx` | Dynamic scene sequencer |
| `remotion/src/scenes/HookProblemScene.tsx` | Hook scene with kinetic typography |
| `remotion/src/scenes/DashboardHeroScene.tsx` | Dashboard simulation scene |
| `remotion/src/components/PhoneMockup.tsx` | Phone frame wrapper |
| `remotion/src/components/AnimatedMetric.tsx` | Animated number/grade component |
| `remotion/scripts/render-remotion.mjs` | DB-driven render script |

## What This Proves

- Remotion pipeline is functional end-to-end
- `sim_data` flows from DB → render script → scene component → video frame
- Scene sequencing is dynamic (driven by `scene_sequence` JSON)
- Format configuration works (aspect ratio, dimensions)
- Foundation is extensible — adding scenes is just adding a component + mapping

## What This Does NOT Do

- Does not build all 10 scene types (only 2)
- Does not implement cloud/Lambda rendering
- Does not wire the admin UI "Queue Render" button to actual rendering
- Does not include audio/music

