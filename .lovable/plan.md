## Add back buttons + real video pickers to the build flows

Two things to fix in the Program / Bundle / Consultation builders:

1. There's no easy way back to the Owner Dashboard → **add a Back button** on all three pages.
2. Right now videos can ONLY be attached by clicking a video in the Video Library and choosing a CTA — the builders accept exactly one `videoId` from the URL and have no in-page picker. Bundles literally show one video. **Add a real video picker** inside Program Builder and Bundle Builder.

---

### Current state (what the owner sees today)

- **Open from Owner Dashboard → Builds tab → New Program / New Bundle / New Consultation** lands on a builder page with **no video selected** (URL has no `?videoId=…`), so the only way to attach a video today is the indirect path: go to Video Library → click a video → "Create Program/Bundle" CTA → builder opens with that one video pre-filled.
- Bundle Builder shows a single-item list ("Videos in Bundle"). It can't actually hold multiple videos despite the name.
- No Back button anywhere — owner has to use browser back or the sidebar.

---

### What will change

**1. Back button on all three builder pages**
- `src/pages/owner/ProgramBuilder.tsx`
- `src/pages/owner/BundleBuilder.tsx`
- `src/pages/owner/ConsultationFlow.tsx`

Add a small `← Back to Owner Dashboard` ghost button at the top of each page (above the title), navigating to `/owner-dashboard` (the Builds tab is the natural return point, but the dashboard preserves the user's last-active section). Uses lucide `ArrowLeft`.

**2. Video picker inside Program Builder (single video)**
Replace the read-only "Selected Video" card with an interactive picker:
- A `<Select>` dropdown listing all videos from the existing video library hook (`useVideoLibrary` — already used elsewhere), showing title + sport.
- If the page was opened with `?videoId=…`, that value is the initial selection.
- Selected video is stored in local state and saved into `meta.videoId` on Save (existing field).
- Empty state if library has zero videos: "Add a video in the Video Library first" with a link.

**3. Video picker inside Bundle Builder (multi-video — this is the real fix)**
A bundle is supposed to be many videos. Replace the single-id display with:
- An "Add Video" `<Select>` that appends to a list.
- A list of selected videos with a remove (×) button per row, drag-to-reorder skipped for v1 (just up/down arrows or just removal).
- Save writes `meta.videoIds: string[]` (new field, additive — old `meta.videoId` stays for backward compat with already-saved single-video bundles; reader code in `BuildLibrary` and `OwnerDashboard` Builds tab already only uses `meta.videoId` for display, which we'll extend to fall back to `meta.videoIds[0]`).
- Initial state: if `?videoId=…` is present, prefill list with that one video.

**4. Consultation Flow — back button only**
Consultations don't bundle videos (they're 1:1 sessions tied optionally to a reference video). No picker change needed — keep the optional `videoId` from URL as-is, just add the Back button.

**5. Tiny display tweak in the Builds list**
- `src/pages/OwnerDashboard.tsx` (Builds tab) and `src/pages/owner/BuildLibrary.tsx`: where it currently shows `video: {meta.videoId}`, also show video count for bundles (e.g. `3 videos`) when `meta.videoIds` exists.

---

### Files touched

- `src/pages/owner/ProgramBuilder.tsx` — back button + video `<Select>` picker
- `src/pages/owner/BundleBuilder.tsx` — back button + multi-video picker, save `meta.videoIds`
- `src/pages/owner/ConsultationFlow.tsx` — back button only
- `src/pages/OwnerDashboard.tsx` — Builds list: show video count for bundles
- `src/pages/owner/BuildLibrary.tsx` — same display tweak

No DB schema changes, no new routes, no Stripe/webhook changes, no edge function changes. Athlete dashboard untouched.

### Technical notes

- Video list source: `useVideoLibrary()` hook (already imported in `VideoLibrary.tsx`). Uses the owner-controlled video library — same source the existing CTA flow uses.
- `meta` is `Record<string, any>` in `BuildItem`, so adding `videoIds: string[]` is non-breaking.
- Back button uses `navigate('/owner-dashboard')` (the existing owner dashboard route). If the user came from the Video Library CTA flow, this still feels right because the Builds tab is now the canonical home for builds.
