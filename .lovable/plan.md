# Restore Foundation Videos in the Editor + Fix Playback

Two bugs, one root cause for each. Both are in the owner-only Video Library Manager — no athlete-facing changes.

---

## Problem 1 — Videos won't play in the editor

The edit form (`VideoEditForm.tsx`) and the new `VideoPreviewDialog.tsx` use a raw HTML5 `<video src={video.video_url}>` tag. That works for direct file uploads (.mp4 / .mov), but **silently fails** for:

- YouTube / Vimeo links (need an `<iframe>` embed)
- X (Twitter) / TikTok links (need their embed widgets)
- Any other "external" link

We already have a smart component that handles all of these correctly: `src/components/video-library/VideoPlayer.tsx` (it uses `getEmbedInfo()` from `videoEmbed.ts` to detect the platform and pick the right embed). The athlete-facing player uses it; the owner editor doesn't.

## Problem 2 — Foundation/holistic videos can be uploaded but not edited

Foundation tagging already exists end-to-end:

- `src/lib/foundationVideos.ts` — domain / scope / audience / refresher-trigger taxonomy
- `src/components/owner/FoundationTagEditor.tsx` — the chip editor
- `src/hooks/useFoundationVideos.ts` — projection used by athlete surfaces
- `library_videos.video_class = 'foundation' | 'application'` + `foundation_meta` JSON in the DB
- The **Upload Wizard** has the "This is a Foundation video" toggle and the editor

But `VideoEditForm.tsx` was never updated to include them. So once a Foundation video is uploaded, the owner can never re-tag it, can't flip an Application video into a Foundation video, and can't see / change refresher triggers. That's why it feels like "nothing for tagging holistic videos" — the entry point is missing in the Edit screen.

---

## What we'll change

### Track A — Playback (works for every URL type)

1. **`src/components/owner/VideoPreviewDialog.tsx`** — replace the raw `<video>` block with `<VideoPlayer videoUrl={video.video_url} videoType={video.video_type} title={video.title} />`. Keep the null-guard for empty URLs.
2. **`src/components/owner/VideoEditForm.tsx`** — same swap inside the "Current Video" card. Title text remains.
3. **`src/components/owner/VideoLibraryManager.tsx`** — Play button stays as-is; it already opens `VideoPreviewDialog`, so it inherits the fix automatically.

### Track B — Foundation track in the Edit form

1. **`VideoEditForm.tsx`**
   - Add a "This is a Foundation video" toggle at the top of the Engine Fields card, mirroring the Upload Wizard.
   - When ON: hide Video Format / Skill Domains / Formula Linkage / 1-3-5 tag weights and render `<FoundationTagEditor>` instead. Coach's Notes textarea stays in both modes.
   - When OFF: show the existing Application editor unchanged.
   - State: `isFoundation`, `foundationMeta` initialized from `video.video_class === 'foundation'` and `video.foundation_meta`.
   - Save path: pass `videoClass` and `foundationMeta` (or null) through `updateStructuredFields`. If switching Application → Foundation, clear the Application-only fields with explicit `null` per the project's editing-integrity rule. If switching Foundation → Application, set `foundation_meta` to null.
   - Readiness gate: when `isFoundation`, validation uses `isFoundationMetaValid()` instead of `computeMissingFields()`.

2. **`src/hooks/useVideoLibraryAdmin.ts`** — extend `updateStructuredFields(...)` to accept `videoClass` and `foundationMeta` and write them. (Already supported in `uploadVideo`; we mirror it for updates.)

3. **`src/components/owner/VideoLibraryManager.tsx`** — add a small "Foundation" badge next to the title when `video.video_class === 'foundation'`, and a one-line filter chip alongside `incomplete` / `throttled` so the owner can filter Foundation vs Application.

4. **`src/components/owner/VideoLibraryHelpSheet.tsx`** — add a 2-sentence explainer of what a Foundation video is and when to use it, so the toggle is discoverable.

### Track C — Memory

- Update `mem://features/video-library/formula-linkage` (or add a sibling note) to record that the Edit form has both Application and Foundation tracks, and that playback in the editor goes through `VideoPlayer` for embed support.

---

## Out of scope

- No DB migrations — `video_class` and `foundation_meta` columns already exist.
- No changes to athlete-facing surfaces, recommendation engine weights, or RLS.
- No changes to how the Upload Wizard works (already correct).
- No new analytics events.

## Files

**Edit**
- `src/components/owner/VideoPreviewDialog.tsx`
- `src/components/owner/VideoEditForm.tsx`
- `src/components/owner/VideoLibraryManager.tsx`
- `src/components/owner/VideoLibraryHelpSheet.tsx`
- `src/hooks/useVideoLibraryAdmin.ts`
- `mem://features/video-library/formula-linkage` (or new sibling)

**Create**
- _(none — all components already exist)_
