# Larger Video Uploads + Size-Limit Messaging

## Goal
1. Allow noticeably larger video files in the owner Video Library and in the rep-analysis modules (hitting / pitching / throwing / fielding / catching).
2. When a user picks a file that exceeds the cap, show a clear, friendly error in the analysis modules ("Your video is too large — please try again with a smaller or shorter clip"), matching the existing toast pattern.

## Current State
- Client cap: `src/data/videoLimits.ts` → `MAX_FILE_SIZE_MB = 500` (already 500 MB on the client).
- Server cap (the real bottleneck): the `videos` storage bucket has `file_size_limit = 52,428,800` (50 MB). Any upload >50 MB fails server-side regardless of the client value.
- Owner Library uploads (`useVideoLibraryAdmin.ts`) call `validateVideoFile` then upload to the `videos` bucket — currently capped at 50 MB by the bucket.
- Analysis entry points (`VideoRepReview.tsx` → `RepVideoAnalysis.tsx`) use `URL.createObjectURL` (no upload), and **do not validate size at all**. Very large files silently fail to play with no user feedback.

## New Limits
- Bump client `MAX_FILE_SIZE_MB` to **2048 MB (2 GB)**.
- Bump the `videos` bucket `file_size_limit` to **2,147,483,648** bytes (2 GB) via migration.
- Keep `MAX_CLIP_DURATION_SEC` and supported formats unchanged.

## Changes

### 1. Database migration — raise bucket cap
```sql
update storage.buckets
set file_size_limit = 2147483648  -- 2 GB
where id = 'videos';
```

### 2. `src/data/videoLimits.ts`
- `MAX_FILE_SIZE_MB: 2048`
- `MAX_FILE_SIZE_BYTES: 2048 * 1024 * 1024`
- Improve error copy returned by `validateVideoFile` so it reads:
  `"Video is too large (X MB). Max is 2048 MB — try a shorter clip or compress the file and upload again."`
  (compute `X` from `file.size`).

### 3. `src/components/practice/VideoRepReview.tsx`
- In `handleFileSelect`, call `validateVideoFile(file)` before `URL.createObjectURL`.
- On failure: show a `toast({ variant: 'destructive', title: 'Video too large', description: validation.error })` and reset the input. Do not create the object URL.

### 4. `src/components/practice/RepVideoAnalysis.tsx`
- This component receives a `videoUrl` from its parent, but the analysis tool description should also surface the limit so users know what to expect.
- Add a small helper line under the dialog title (or near the Save button) reading: `"Max clip size 2 GB. If your file fails to load, try a shorter or compressed clip."` Use `text-xs text-muted-foreground`.

### 5. Owner Library upload UI (`QuickAttachVideo.tsx` + the admin form behind `useVideoLibraryAdmin.ts`)
- Already routes through `validateVideoFile`; the new copy will flow automatically.
- Add the same helper line ("Max 2 GB. Larger files should be compressed first.") under the file picker so owners know the limit before choosing a file.

### 6. Other call sites of `validateVideoFile` (no logic change required, just inherit new limit)
- `src/components/practice/SessionVideoUploader.tsx`
- `src/components/game-scoring/GameVideoPlayer.tsx`

## Out of Scope
- Chunked / resumable uploads (Supabase storage handles up to the new bucket cap with a single PUT; if reliability becomes an issue at 1–2 GB we can revisit with TUS / resumable uploads).
- Server-side transcoding or compression.
- Changing per-clip duration limit.

## Acceptance
- Owner can upload a >50 MB video into the library successfully.
- Selecting a >2 GB file in the rep-analysis uploader shows the destructive toast and the file is not loaded.
- Analysis dialog displays the 2 GB hint text.
- Existing <50 MB uploads continue to work unchanged.
