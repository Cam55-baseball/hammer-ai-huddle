# Owner Video Library — Elite Improvement Plan (Additive Only)

**Hard rule:** we are NOT rebuilding. Every existing component stays. We add a Golden Path on top, fix the 0-of-10-videos-wired-to-the-engine gap, close silent failures, and add a Help layer.

---

## A. The Golden Path (one screen, four steps)

Add a new **"Add Video (Guided)"** flow that becomes the default when the Add tab is opened. Existing `VideoUploadForm` stays as "Advanced" toggle. The guided flow is a 4-step wizard inside the same Add tab:

**Step 1 — Source** (1 decision)
- Paste link OR drop a file. Auto-detect YouTube/Vimeo. Show inline preview thumbnail.
- Validate: URL not blank, valid scheme, file ≤ 500MB & supported format.

**Step 2 — What is it?** (3 fields)
- Title (required)
- Sport: single-select segmented control [Baseball | Softball | Both] (no contradictory multi-select)
- Skill Domain: single-select chips (hitting / pitching / fielding / throwing / base_running)

**Step 3 — Teach the engine** (2 fields, the engine NEEDS these)
- Video Format: single-select (drill / breakdown / game_at_bat / practice_rep / slow_motion / pov / comparison)
- "What does this video teach?" — a single textarea (this becomes `ai_description`). Placeholder: a real example. Below it, a button **"✨ Auto-suggest tags from this description"** that calls `analyze-video-description` *synchronously* and shows the proposed taxonomy tags right there for one-click accept.

**Step 4 — Review & Publish** (one screen)
- Show: thumbnail, title, sport, domain, format, AI description, list of tag assignments with weights (default 3, editable inline).
- Big primary button: **"Publish to Library"**.
- A clear amber warning banner if assignments < 2: "This video won't be recommended yet — accept at least 2 tags or click Auto-suggest above."

Result: an owner who knows nothing finishes in 4 screens, ~30 seconds, with a video that's actually wired to the engine.

---

## B. Fix the dead-library problem (the real bug)

Add a top-of-page **Library Health strip** in the Videos tab:

```
📊 Library Health: 0/10 videos ready for recommendations
  [ Backfill missing data ]   [ Show only incomplete ]
```

- Adds a `readiness` derived flag per video: ready = has video_format AND ≥1 skill_domain AND ai_description AND ≥2 tag assignments.
- Each video card gets a small badge: ✅ Ready | ⚠️ Incomplete (needs format + tags) | 🔴 Empty
- "Backfill missing data" opens a queue dialog that walks through each incomplete video using the same Step 3 from the wizard, with a "✨ Auto-suggest" button. Owner can finish all 10 in one sitting.

---

## C. Make the Edit form actually edit what matters

`VideoEditForm.tsx` gets the missing fields added (additive — keep all existing fields):
- Video Format dropdown
- Skill Domains multi-select
- AI Description textarea + **"✨ Re-run AI suggestions"** button (calls `analyze-video-description` on demand — currently impossible)
- Existing taxonomy assignments shown with weight sliders + ability to add/remove

This single change unblocks fixing the 10 stranded videos without deleting & re-uploading.

---

## D. Reorganize the 7 tabs (no removal, just hierarchy)

Group tabs into two rows with clear labels:

```
Daily:     [ Videos ]  [ + Add Video ]  [ AI Suggestions (3) ]
Setup:     [ Tags ]    [ Taxonomy ]     [ Rules ]    [ Analytics ]
```

- "Daily" row uses larger pills and is shown by default.
- "Setup" row collapses behind a "⚙ Setup" disclosure on first visit, but stays one-click away.
- Add a count badge on AI Suggestions whenever there are pending items (already in data, not surfaced).

---

## E. Always-visible Help

Add a **"❓ Help"** button in the top-right of `VideoLibraryManager`. Opens a side sheet with three short sections written for an 8-year-old:

**1. The 4 things every video needs** (illustrated)
1. A title
2. A sport + a skill (e.g. baseball + hitting)
3. A "format" — what kind of video is it? (drill, breakdown, etc.)
4. A short description of what it teaches → this powers the smart recommendations

**2. The simple rule of tags**
- "Tags" = friendly keywords to search by (free-form).
- "Taxonomy" = the engine's vocabulary. Movement (what the body does) → Result (what happens) → Context (when it happens) → Correction (what it fixes).
- *Just type a description and hit Auto-suggest. The engine will pick the right taxonomy tags for you.*

**3. Common mistakes**
- Empty description = no recommendations
- Only one tag = won't show up
- Wrong sport = wrong audience

The sheet is reachable from every tab.

---

## F. Owner Rule System (one-page, in /docs and inside the Help sheet)

```
THE 4 RULES OF ADDING A VIDEO
1. Every video needs a title, a sport, a skill, and a format.
2. Always write 1–2 sentences about what the video teaches.
3. Always click "Auto-suggest tags" and accept at least 2.
4. If a video has a 🔴 or ⚠️ badge, fix it before walking away.
```

That's the whole rulebook. Printable, repeatable.

---

## G. Fail-safe UX (close every silent failure)

In `useVideoLibraryAdmin.ts`:
1. If `video_tag_assignments` insert errors → show **destructive** toast + mark video with ⚠️ badge. Do NOT show "Video added" success.
2. If `analyze-video-description` fails → show toast "Auto-suggest unavailable — you can retry from the Edit screen."
3. Validate `video_url.trim() !== ''` before insert (per project memory rule). Reject empty.
4. On Sport selection: enforce mutual exclusion ("both" cannot coexist with "baseball" or "softball" — radio, not checkbox).
5. On `replaceVideoFile`: if RPC fails after upload, attempt to delete the orphan file and surface the error.
6. On Tag delete: count usage first (`SELECT count(*) WHERE name = ANY(tags)`); if >0, confirm "This tag is on N videos — remove anyway?"
7. On Edit save: if `selectedSports.length === 0` after edit, block save (already partially there; tighten).

---

## H. Speed optimizations (reduce clicks, reduce thinking)

1. **Auto-suggest button** in Step 3 turns a 2-minute manual taxonomy hunt into one click.
2. **Inline accept** on AI suggestions — already exists in `AISuggestionsReview`, surface count in the tab badge so owner notices.
3. **"Duplicate video" action** on each card → pre-fills wizard with same domain/format/tags so a series of similar drills can be added in seconds.
4. **Keyboard shortcuts** in the wizard: ⌘↵ next step, Esc cancel.
5. **Remember last-used** sport + domain + format in localStorage — pre-populate Step 2/3 with the previous video's selections.
6. **Lazy-load** Tags/Taxonomy/Rules/Analytics tab content (already render-on-demand via Tabs; verify no eager imports).
7. **Bulk-backfill queue** (from B) processes one video at a time but remembers state, so the owner never re-enters the same field.

---

## I. Database / migration changes (minimal, additive)

1. Add a generated column or view `library_videos_readiness` exposing the boolean `is_ready` (format + ≥1 domain + description + ≥2 assignments) so the Health strip is one query.
2. **No** new required columns on `library_videos` — would break the 10 existing rows. Readiness is computed, not enforced at DB level (yet). Once backfill is complete the owner can opt into a soft "publish gate" (toggle in Setup) that hides not-ready videos from athletes.
3. Add an `audit_log` entry on every assignment insert/delete for traceability (owner-only).

---

## J. What we are explicitly NOT doing

- Not removing any existing tab, component, or hook.
- Not breaking the existing `VideoUploadForm` (still available as "Advanced mode").
- Not changing the athlete-facing `/video-library` UI.
- Not changing the recommendation scoring math.
- Not deleting any data.

---

## Files that will change (planned)

**Edit (additive only):**
- `src/components/owner/VideoLibraryManager.tsx` — add Help button, regroup tabs into Daily/Setup, add Library Health strip
- `src/components/owner/VideoEditForm.tsx` — add Video Format / Skill Domains / AI Description / Assignments + "Re-run AI" button
- `src/hooks/useVideoLibraryAdmin.ts` — surface tag-assignment errors, validate empty video_url, add `regenerateAISuggestions(videoId)`, add `updateStructuredFields(videoId, …)`

**Create:**
- `src/components/owner/VideoUploadWizard.tsx` — 4-step guided flow (default mode)
- `src/components/owner/LibraryHealthStrip.tsx` — readiness summary + backfill entry
- `src/components/owner/BackfillQueueDialog.tsx` — walks owner through incomplete videos
- `src/components/owner/VideoLibraryHelpSheet.tsx` — always-on help / rules
- `src/lib/videoReadiness.ts` — pure helper: `isVideoReady(video, assignments)` + reasons array

**DB migration (one):**
- View `library_videos_readiness` exposing `(video_id, is_ready, missing_fields[])`.

---

## Verification checklist (post-implementation)

- [ ] Brand-new owner can add a video in <60s without reading docs.
- [ ] All 10 existing videos can be made "Ready" via the Backfill queue without re-uploading.
- [ ] No silent failures: tag-assignment errors and AI failures surface as destructive toasts.
- [ ] Empty `video_url`, blank title, or 0 sports cannot be saved.
- [ ] Help sheet is reachable from every tab.
- [ ] Library Health strip shows correct counts and updates after each save.
- [ ] Existing `VideoUploadForm` (Advanced mode) still works untouched.
- [ ] Athlete-facing video library unchanged.
