## Problem

In the Bundle Builder and Program Builder, when there are no videos in the library the only entry point is a link reading "Add one in the Video Library" pointing to `/owner?section=videos`. Two issues:

1. `OwnerDashboard` does not read the `?section=` query param, so the link does nothing useful — it lands on the overview, not the library.
2. Even if it worked, bouncing the user out of the builder mid-flow loses their in-progress bundle/program.

You also need to be able to add videos *while* building, not only when the library is empty.

## Fix

Embed the existing `VideoUploadWizard` directly inside both builders via a dialog, and refresh the picker after upload so the new video appears immediately and can be selected.

### Bundle Builder (`src/pages/owner/BundleBuilder.tsx`)
- Add an "Upload new video" button next to the picker (always visible, not just when library is empty).
- Clicking opens a Dialog containing `<VideoUploadWizard tags={tags} onSuccess={...} fastMode />`.
- Pull `tags` and `refetch` from `useVideoLibrary`.
- On `onSuccess`: close the dialog, call `refetch()`, and auto-add the newly uploaded video to `videoIds`.
- Replace the "Add one in the Video Library" empty-state link with the same upload button so the empty state actually works.

### Program Builder (`src/pages/owner/ProgramBuilder.tsx`)
- Same treatment: "Upload new video" button beside the anchor-video Select.
- On success: refetch, then auto-set `videoId` to the newly uploaded video.
- Replace the broken empty-state link with the upload button.

### Identifying the new video after upload
`VideoUploadWizard.onSuccess` does not return the new video id. Two options:

- **Preferred**: capture the videos list length / latest `created_at` before upload, then after `refetch()` find the newest entry (`videos[0]` once sorted by `created_at desc`) and select it. The library hook already orders by `created_at desc` as final tie-breaker, so the new upload will appear first for the owner's session.
- Alternatively, lightly extend `VideoUploadWizard`'s `onSuccess` signature to `(newVideoId?: string) => void` and pass the inserted id from `useVideoLibraryAdmin.uploadVideo`. This is cleaner and avoids the heuristic. We'll do this if `uploadVideo` already returns the row; otherwise use the heuristic.

### Files touched
- `src/pages/owner/BundleBuilder.tsx` — add Dialog + upload button + auto-select new video.
- `src/pages/owner/ProgramBuilder.tsx` — same.
- `src/components/owner/VideoUploadWizard.tsx` — only if needed to surface the new video id via `onSuccess`.

### Out of scope
- Wiring `?section=` query-param routing into `OwnerDashboard` (separate concern; not needed once upload is in-builder).
- Changing the Video Library Manager itself.

## Outcome

From inside the Bundle or Program Builder you can click "Upload new video", complete the wizard in a dialog, and the newly uploaded video appears in the picker (and is auto-selected/added) without losing the rest of your in-progress build.
