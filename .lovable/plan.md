

# Phase 3 — Production Connection

## Architecture

The rendering pipeline cannot run inside an edge function (60s timeout, no Chromium). Instead, the edge function `render-promo` will act as a **queue processor** that:

1. Reads queued jobs from `promo_render_queue`
2. Loads project + scene data from DB
3. Executes the Remotion render script via a child process (within the sandbox for now)
4. Uploads the MP4 to Supabase Storage
5. Updates DB with public URL

Since edge functions cannot run Remotion (no Chromium, no Node), the actual architecture is:

```text
Admin UI                    Edge Function              Remotion (sandbox CLI)
─────────                   ─────────────              ────────────────────
Queue Render ──→ insert     render-promo ──→           Not callable from edge
  into queue     row        (cannot render)            
```

**Revised approach**: The edge function `render-promo` handles validation, status updates, and scene data assembly. The actual render is triggered client-side via `supabase.functions.invoke()` which returns the assembled scene data, and the render itself happens via the existing CLI script. For true automation, we build the edge function to:

1. Validate the project (scene_key mapping, sim_data presence, non-empty sequence)
2. Assemble the full `INPUT_JSON` payload (resolving scene_key → sim_data from DB)
3. Return the payload for CLI rendering OR mark as ready

**However**, given sandbox constraints, the most practical production path is:

- Edge function `render-promo`: validates, assembles data, stores assembled payload in render_metadata
- Admin UI polls queue status via React Query refetch
- For **this phase**: render is triggered via the admin clicking "Render Now" which calls the edge function for validation + data assembly, then we execute the render in the sandbox and upload to storage

**Storage**: Create a `promo-videos` bucket (public) for rendered MP4s.

## Implementation

### 1. Storage Bucket
- Create `promo-videos` public bucket via migration

### 2. Edge Function: `render-promo`
Validates and assembles render payload:
- Accepts `{ queue_id }` 
- Loads queue row → project → scenes
- Validates: no empty sequence, all scene_keys have mapped components, all sim_data present
- Assembles full `sceneSequence` array with `durationInFrames` computed from `duration_variant`
- Updates queue status to `processing`
- Returns assembled payload
- On validation failure: sets queue to `failed` with `error_message`

### 3. Four New Remotion Scene Components

**MPIEngineScene** — consumes `{ metrics: {name, value, grade}[], overallScore }` 
- Radial gauges animating per metric
- Overall score counter
- Grade badges spring in

**TexVisionDrillScene** — consumes `{ targetSequence: string[], reactionTimes: number[], accuracy }` 
- Simulated drill targets appearing/disappearing
- Reaction time counter
- Accuracy ring filling

**VaultProgressScene** — consumes `{ beforeLabel, afterLabel, progressPercent, timeframe }` 
- Side-by-side comparison frames sliding in
- Progress bar filling
- Timeframe label

**CTACloserScene** — consumes `{ headline, subtext, url }` 
- Brand logo/text slam in
- URL/CTA text fades in
- Pulsing accent glow

### 4. MainVideo.tsx Update
- Add all 4 new scene_keys to `SCENE_MAP`
- Add validation: throw error if unknown `sceneKey` encountered

### 5. Render Script Update
- After render completes, upload MP4 to Supabase Storage `promo-videos` bucket
- Update `promo_render_queue` row: status → `complete`, `output_url` → public URL
- Update `promo_projects` row: status → `complete`, `output_url` → public URL
- On failure: update queue row with `failed` + error_message

### 6. usePromoEngine Hook Updates
- `useQueueRender`: after inserting queue row, invoke `render-promo` edge function for validation
- Add `useRenderQueue` polling: `refetchInterval: 5000` when any job is `queued` or `processing`
- Add `useTriggerRender` hook that calls the edge function

### 7. ExportManager Updates
- Add video preview (`<video>` element) when `output_url` exists
- Add realtime polling for active renders
- Show error messages for failed renders
- Disable re-render while processing

### 8. Validation in Render Script
- Check every `sceneKey` exists in `SCENE_MAP` — abort with error if not
- Check every entry has non-empty `simData` — abort if missing
- Check `sceneSequence` is non-empty — abort if empty

## Files

| File | Change |
|------|--------|
| DB migration | Create `promo-videos` storage bucket |
| `supabase/functions/render-promo/index.ts` | New: validate + assemble render payload |
| `remotion/src/scenes/MPIEngineScene.tsx` | New scene component |
| `remotion/src/scenes/TexVisionDrillScene.tsx` | New scene component |
| `remotion/src/scenes/VaultProgressScene.tsx` | New scene component |
| `remotion/src/scenes/CTACloserScene.tsx` | New scene component |
| `remotion/src/MainVideo.tsx` | Add 4 scene_keys to SCENE_MAP + validation |
| `remotion/scripts/render-remotion.mjs` | Add storage upload + DB status updates |
| `src/hooks/usePromoEngine.ts` | Add polling, trigger hook, validation invoke |
| `src/components/promo-engine/ExportManager.tsx` | Video preview, polling, error display |

## Constraints
- Actual automated rendering from button click requires either a server process or external service (Remotion Lambda). For this phase, the edge function validates and assembles the payload; rendering is triggered as a CLI step that can be executed in the sandbox. The admin UI will show the correct status flow.
- True one-click-to-video automation requires infrastructure beyond edge functions (no Chromium available). This phase builds all the pieces so that wiring to an external renderer is a single integration point change.

