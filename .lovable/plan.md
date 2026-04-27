# Fix: Quick Video Attach + Price for Bundles and Programs

Two focused fixes to the Bundle Builder and Program Builder.

## 1. Attach a video without the full Video Library wizard

Today the "Upload new video" button opens the full 4-step `VideoUploadWizard` (title, sport, category, structured engine tags, etc.) — overkill when you just want to drop a video into a build.

Add a **"Quick Attach"** option on both builders with two simple inputs:

- **Paste video link** (YouTube / Vimeo / direct URL), or
- **Upload a file** (drag/drop or file picker)

Only one required field beyond the source: **Title** (auto-filled from the file name or URL slug, editable).

On confirm:
- Create a minimal video library record (title + url/file + `owner_id`) — no sport/category/engine tags required.
- Auto-add to the bundle (or set as the program's anchor video) immediately.
- Stay on the builder page — no navigation, no progress lost.

The existing full `VideoUploadWizard` stays available behind a secondary "Advanced upload (full metadata)" link for when you do want to fill in tags.

## 2. Set the price before sharing

Right now you can save a Bundle or Program but you never get to set a price — `BuildLibrary` "Sell / Share" sends it to Stripe Checkout, which falls back to a hard-coded default ($49 bundle / $99 program) in the `create-build-checkout` edge function.

Add a **Price (USD)** input to both builders:

- Required field, numeric, min $0.50.
- Stored in `build.meta.price` (the edge function already reads this and only falls back to the default when missing).
- Shown on the Build Library cards next to the name (e.g. "$79").
- Editable from the Build Library too — small "Edit price" action on each card so you can adjust without re-creating the build.

Save is blocked until name + price + at least one video are filled.

---

## Technical notes

**Files to modify**
- `src/pages/owner/BundleBuilder.tsx` — add Price input, add `QuickAttachVideo` trigger, gate save on price.
- `src/pages/owner/ProgramBuilder.tsx` — same: Price input + Quick Attach + save gating.
- `src/pages/owner/BuildLibrary.tsx` — show price on each card; add inline "Edit price" using a small dialog that calls a new `updateBuild` helper.
- `src/lib/ownerBuildStorage.ts` — add `updateBuild(id, patch)` helper (writes back to the same localStorage key).
- New: `src/components/owner/QuickAttachVideo.tsx` — compact dialog with two tabs (Link / Upload), one Title field, one confirm button. Reuses `useVideoLibraryAdmin().uploadVideo` under the hood with minimal payload.

**Edge function** (`supabase/functions/create-build-checkout/index.ts`) — no change needed; it already honors `build.meta.price` and only falls back when missing. We will simply make sure the price is always set client-side now.

**Validation**
- Price parsed as `Number(value)`; reject `NaN`, `<= 0`, or `< 0.50`.
- Quick Attach link: must start with `http(s)://`.
- Quick Attach upload: same file-size/type checks already in `validateVideoFile` (`src/data/videoLimits.ts`).

**No DB schema changes.** Builds remain in localStorage (`owner_builds` key) — just one new optional `price` field on `meta`.
