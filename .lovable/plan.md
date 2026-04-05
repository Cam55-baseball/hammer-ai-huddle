

# Cinematic Promo Engine — Implementation Plan

## Architecture

The system is a code-generated video pipeline using Remotion. Admin builds videos from a library of pre-defined scene templates, each simulating real app features with clean data. The admin UI lives inside the Owner Dashboard. Rendering infrastructure is stubbed for future external service (Remotion Lambda/Creatomate) — for now, scene preview and configuration are fully functional.

```text
┌─────────────────────────────────────────────────┐
│              Owner Dashboard                     │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ Scene     │  │ Story     │  │ Export       │ │
│  │ Library   │→ │ Builder   │→ │ Manager      │ │
│  └───────────┘  └───────────┘  └──────────────┘ │
│       ↓              ↓              ↓            │
│  ┌──────────────────────────────────────────┐    │
│  │        Scene Template Registry           │    │
│  │  (Remotion components per feature)       │    │
│  └──────────────────────────────────────────┘    │
│       ↓                                          │
│  ┌──────────────────────────────────────────┐    │
│  │     Render Pipeline (future external)    │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

## Database Schema

**New tables (3):**

1. **`promo_scenes`** — Scene template registry
   - `id`, `title`, `feature_area` (vault, tex-vision, dashboard, etc.), `duration_variant` (3s/7s/15s), `description`, `scene_key` (maps to Remotion component), `thumbnail_url`, `sim_data` (jsonb — clean mock data for simulation), `status` (active/outdated/draft), `tags[]`, `created_at`, `updated_at`

2. **`promo_projects`** — Assembled video projects
   - `id`, `title`, `target_audience` (player/parent/coach/scout/program), `video_goal` (awareness/conversion/feature_highlight), `target_duration` (15/30/60), `scene_sequence` (jsonb array of scene refs with per-scene overrides), `format` (tiktok/reels/shorts/youtube/hero), `status` (draft/rendering/complete/failed), `output_url`, `render_metadata` (jsonb), `created_at`, `updated_at`

3. **`promo_render_queue`** — Render job tracking (future external pipeline)
   - `id`, `project_id` (FK), `format`, `status` (queued/processing/complete/failed), `started_at`, `completed_at`, `error_message`, `output_url`

RLS: All three tables gated to owner role only.

## Implementation Steps

### Step 1: Database & Schema
- Create 3 tables with owner-only RLS policies
- Seed `promo_scenes` with scene definitions for key features (Dashboard, TEX Vision, Vault, MPI, Video Library, Game Scoring, Practice Hub, etc.)

### Step 2: Scene Template System (Remotion)
- Create `remotion/` directory with Remotion project setup
- Build reusable scene components that simulate app UI:
  - `DashboardScene` — MPI scores animating in, grade cards appearing
  - `TexVisionScene` — Vision drill with accuracy tracking
  - `VaultScene` — Progress photos side-by-side comparison
  - `MPIScene` — Grade engine computing and displaying results
  - `VideoLibraryScene` — Browsing and searching video content
  - `GameScoringScene` — Live pitch-by-pitch scoring
  - `PracticeHubScene` — Session logging with drill blocks
  - `HookScene` — Problem statement with stats
  - `CTAScene` — Call to action with branding
- Each scene uses simulated data (from `sim_data` in DB) and Remotion animations
- Shared components: `PhoneMockup`, `AppHeader`, `AnimatedMetric`, `BrandWatermark`

### Step 3: Owner Dashboard — Scene Library Tab
- Add `promo-engine` section to `OwnerSidebar`
- Scene Library view: grid of all scenes with thumbnails, feature area badges, duration variants
- Scene detail: preview panel showing simulated scene data, edit sim_data, mark as outdated
- Add/edit scene metadata

### Step 4: Story Builder
- Wizard-style builder:
  1. Select audience + goal + duration
  2. System auto-suggests scene sequence based on Hook→Problem→Solution→Proof→CTA framework
  3. Admin can reorder, swap, remove scenes
  4. Preview timeline showing scene thumbnails in sequence with transitions
  5. Select export format (sets aspect ratio)
  6. Save as project

- Auto-assembly logic maps audience+goal to recommended scenes:
  - Player/awareness → Hook + Dashboard + TEX Vision + MPI + CTA
  - Parent/conversion → Hook + Safety/Progress + Vault + Proof + CTA
  - Coach/feature → Hook + Game Scoring + Practice Hub + Analytics + CTA

### Step 5: Export Manager
- Project list with status badges
- Format selector with aspect ratio preview (9:16, 1:1, 16:9)
- "Queue Render" button (writes to `promo_render_queue`)
- For now: renders are manual via `remotion/` CLI scripts — the admin UI queues and tracks
- Future: webhook trigger to external render service

### Step 6: Auto-Update Integrity
- Each `promo_scenes` row has `feature_area` and `updated_at`
- When app features change, admin can bulk-flag scenes as `outdated`
- Outdated scenes show warning badges in Scene Library
- Projects using outdated scenes show alerts in Export Manager

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/owner/OwnerSidebar.tsx` | Add `promo-engine` section |
| `src/pages/OwnerDashboard.tsx` | Add `promo-engine` tab content |
| `src/components/promo-engine/SceneLibrary.tsx` | Scene grid + management |
| `src/components/promo-engine/SceneCard.tsx` | Scene preview card |
| `src/components/promo-engine/StoryBuilder.tsx` | Wizard for assembling videos |
| `src/components/promo-engine/StoryTimeline.tsx` | Visual timeline of scenes |
| `src/components/promo-engine/ExportManager.tsx` | Project list + render queue |
| `src/components/promo-engine/FormatSelector.tsx` | Aspect ratio picker |
| `src/components/promo-engine/ScenePreview.tsx` | Scene detail/preview panel |
| `src/hooks/usePromoEngine.ts` | CRUD hooks for scenes/projects/queue |
| `remotion/` | Full Remotion project with scene components (built separately, not part of main app bundle) |
| DB migration | 3 new tables + RLS + seed data |

## What Ships Now vs. Future

**Ships now:**
- Full admin UI (Scene Library, Story Builder, Export Manager)
- Database schema with seeded scene definitions
- Story auto-assembly logic (audience + goal → scene sequence)
- Format/aspect ratio configuration
- Outdated scene flagging system
- Render queue tracking

**Future (external render service):**
- Actual Remotion rendering pipeline
- Automated MP4 export
- CDN delivery of rendered videos
- Webhook-triggered re-renders

## Scope

This implementation focuses on the admin orchestration layer — the system that manages scenes, assembles stories, and tracks renders. The Remotion scene components (the actual video content) will be built as a separate `remotion/` project that references the scene definitions from the database. This separation ensures the promo engine never impacts the main app bundle or admin workflows.

