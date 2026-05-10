# Finish Formula Linkage Wiring + Owner Video Playback

Two tracks in this pass:

## Track A — Finish the Formula Linkage rollout (carryover)

1. **Recommendation scoring boost** — `src/lib/videoRecommendationEngine.ts`
   - Read `formula_phases` from each library video.
   - When the active context (drill / fault / chat surface) carries a phase tag (e.g. `P1`, `P4` for hitting), add a soft score boost to videos whose `formula_phases` array contains that phase.
   - Boost is additive and capped so it never overrides hard sport/position filters; treat it as a "tie-breaker + lift" similar to current confidence weighting.

2. **Foundation pipeline awareness** — `src/lib/foundationVideos.ts` + `useFoundationVideos.ts`
   - Pass `formula_phases` and `formula_notes` through the foundation projection so foundation surfaces can display phase chips and prefer phase-matched clips.

3. **Auto-Suggest edge function prompt** — `supabase/functions/analyze-video-description`
   - Include `formula_notes` and `ai_description` (Coach's Notes to Hammer) together in the model prompt.
   - Ask the model to return suggested `formula_phases` per the domain's phase list (mirrors `src/lib/formulaPhases.ts`).
   - Persist returned phases as suggestions only — owner still confirms in the editor.

4. **Memory index** — append a single line in `mem://index.md` Memories section pointing at a new `mem://features/video-library/formula-linkage` note documenting: freeform Coach's Notes is source of truth, explicit 1/3/5 weights, formula phases as soft scoring boost.

## Track B — Owner can watch videos from the library

Today the owner sees only metadata; there is no `<video>` element in `VideoLibraryManager` or `VideoEditForm`. Add playback in two places:

1. **Inline preview in the library list** — `VideoLibraryManager.tsx`
   - Each row gets a small "Play" button that opens a lightweight `VideoPreviewDialog` (new component) rendering an HTML5 `<video controls>` from `video.video_url`.
   - If `video_url` is empty/null, show "No file attached" instead of the play control (per the project's strict video_url integrity rule).

2. **Player inside the edit modal** — `VideoEditForm.tsx`
   - At the top of the form (above Engine Fields), render a collapsible "Preview" panel with `<video controls preload="metadata">` for the current `video.video_url`.
   - Include poster from `video.thumbnail_url` if present.
   - Same null-guard as above.

3. **New shared component** — `src/components/owner/VideoPreviewDialog.tsx`
   - Props: `video`, `open`, `onOpenChange`.
   - Uses existing `Dialog` primitive, semantic tokens only, no hard-coded colors.
   - Honors the project's video playback standards (controls, preload metadata, no autoplay).

## Out of scope
- No changes to athlete-facing video surfaces.
- No changes to RLS, storage bucket policies, or upload flow.
- No new analytics events for owner playback in this pass.

## Files

**Edit**
- `src/lib/videoRecommendationEngine.ts`
- `src/lib/foundationVideos.ts`
- `src/hooks/useFoundationVideos.ts`
- `supabase/functions/analyze-video-description/index.ts`
- `src/components/owner/VideoLibraryManager.tsx`
- `src/components/owner/VideoEditForm.tsx`
- `mem://index.md`

**Create**
- `src/components/owner/VideoPreviewDialog.tsx`
- `mem://features/video-library/formula-linkage`
