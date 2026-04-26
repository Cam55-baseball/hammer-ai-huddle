## Phase 5 Final Wiring — Owner Authority + Remaining Integration

### Audit Summary

The Owner Authority rule is **already respected** in current code:
- `AIComparePanel` adoption requires explicit click on the `+` Plus button (line 163, `onAdoptTag`).
- `Auto-Suggest Tags` is button-gated (no auto-fire on description change).
- `regenerateAISuggestions` writes to `video_tag_suggestions`, never to `video_tag_assignments`.
- `syncTagAssignments` only persists what the owner has in local `assignments` state.
- Smart Defaults in `VideoFastEditor` apply **only when fields are empty** (line 45–50: `video.video_format || defaults.topFormat`) — never overrides existing owner data.

What's missing is **labeling, integration, and reinforcement** — not behavior changes.

---

### 1. ConfidenceBadge on Library Cards (`VideoLibraryManager.tsx`)
- Render `<ConfidenceBadge score tier compact />` next to `<ReadinessBadge />` on each card.
- Pull from existing `confidenceMap` (already destructured but unused on cards).
- Skip badge if no entry yet (avoid layout flicker).

### 2. Fast Mode Editor Swap — Edit Dialog
In `VideoLibraryManager.tsx` Edit Dialog body:
```
{fastMode
  ? <VideoFastEditor video={editTarget} onSuccess={...} onCancel={...} />
  : <VideoEditForm video={editTarget} tags={tags} ... />}
```
Both paths already use `useVideoLibraryAdmin` (`updateStructuredFields`, `syncTagAssignments`) — identical mutation path, no divergence.

### 3. Add Tab Behavior (Fast Mode for new uploads)
Current `VideoFastEditor` requires an existing `LibraryVideo` (it loads `assignments` by `video_id` and saves via `updateStructuredFields(video.id, ...)`). It is **not** a new-video creator.

**Decision needed — minimal-risk approach:**
- Keep `VideoUploadWizard` as the upload entry-point in both modes (uploading bytes / external URL is wizard step 1).
- When `fastMode` is on, after Step 1 completes (file uploaded / URL set + minimal metadata), short-circuit to a Fast-Mode-style compact pane (Steps 2+3 collapsed into one screen) → publish.
- Concretely: add a `fastMode` prop to `VideoUploadWizard`. When true, render Steps 2+3 as a single combined view with the same fields, `⌘+Enter` to publish. Step 4 review is skipped (smart defaults pre-fill format/domain).
- This preserves beginner wizard intact (default `fastMode=false`) and gives elite owners a 1-screen flow without forking a second creation pipeline.

### 4. Owner Authority Reinforcement (Labeling)
Add subtle persistent label `"Hammer Suggestion — Owner Decides"`:
- `AIComparePanel.tsx` header (next to "Compare with Hammer" switch).
- Bottom of the AI suggestions panel in `VideoEditForm` Engine Fields section (under Auto-Suggest Tags button).
- `VideoFastEditor.tsx` next to Auto-Suggest button.
- Constant exported from a small new file `src/lib/ownerAuthority.ts` so the phrase stays consistent.

Add an explicit code-level guard (defensive, even though no path violates it today):
- In `useVideoLibraryAdmin.regenerateAISuggestions`: add a comment + assertion that this function MUST NOT call `syncTagAssignments` or write to `video_tag_assignments`. (Documentation guard — no behavior change.)

### 5. Help Sheet Updates (`VideoLibraryHelpSheet.tsx`)
Append two new sections + a Reset button:
- **⚡ Fast Mode** — "For owners who know the system. Skips guidance, opens compact one-screen editor. Same save logic, same enforcement."
- **🧠 Smart Defaults** — "Hammer watches your last 50 saves and pre-suggests your most-used Format and Skill Domain on new videos. It only fills empty fields. You can always change or clear them."
- **Reset Learning** button → calls `resetLearning()` from `ownerLearning.ts`, shows toast confirmation.
- **Owner Authority** — short callout: "Hammer suggests. You decide. The system never auto-applies tags or overrides your picks."

### 6. Type Safety + Stability Pass
- Verify `confidenceMap.get(video.id)` is null-checked before passing to `ConfidenceBadge` (it returns `ConfidenceResult | undefined`).
- `VideoFastEditor` keyboard listener: current effect has no dep array → re-attaches every render. Fix: add deps `[handleSave, onCancel]` or wrap `handleSave` in `useCallback` with stable refs. Low priority (no leak — cleanup runs each render) but worth fixing.
- Confirm `useVideoConfidenceMap` query cache is invalidated after `updateStructuredFields` / `syncTagAssignments` so the badge live-updates after save. Add `qc.invalidateQueries({ queryKey: ['video-confidence-map'] })` to the success paths in `useVideoLibraryAdmin` (or in `handleEditSuccess`).
- No `tsc --noEmit` run in plan mode — will run after approval.

### 7. Validation Checklist (verified against current code)
| Rule | Status |
|------|--------|
| Confidence updates live while editing | ✅ already (computed from local state in `VideoEditForm` & `VideoFastEditor`) |
| AI Compare never auto-applies | ✅ already (explicit `onClick={() => onAdoptTag(tag.id)}`) |
| Removing tag — AI doesn't re-add | ✅ already (suggestions live in separate table; assignments are owner-controlled state) |
| Fast Mode = same save path | ✅ already (both call `updateStructuredFields` + `syncTagAssignments`) |
| Smart Defaults only suggest | ✅ already (only applied when field is empty) |
| Confidence badge on cards | ⏳ this PR |
| Fast Mode swap in Edit dialog | ⏳ this PR |
| Help sheet additions | ⏳ this PR |
| "Hammer Suggestion — Owner Decides" labels | ⏳ this PR |

---

### Files Touched
**Created:**
- `src/lib/ownerAuthority.ts` — exports `OWNER_AUTHORITY_LABEL` constant + `<OwnerAuthorityNote />` tiny component.

**Edited:**
- `src/components/owner/VideoLibraryManager.tsx` — render ConfidenceBadge on cards; swap to FastEditor when `fastMode`; pass `fastMode` to wizard.
- `src/components/owner/VideoUploadWizard.tsx` — accept optional `fastMode` prop; collapse steps 2+3 into one screen when on; skip step 4.
- `src/components/owner/VideoLibraryHelpSheet.tsx` — Fast Mode / Smart Defaults / Reset Learning / Owner Authority sections.
- `src/components/owner/AIComparePanel.tsx` — add Owner Authority label.
- `src/components/owner/VideoEditForm.tsx` — add Owner Authority label near Auto-Suggest.
- `src/components/owner/VideoFastEditor.tsx` — add Owner Authority label; fix keyboard effect deps.
- `src/hooks/useVideoLibraryAdmin.ts` — invalidate `['video-confidence-map']` on structured-field / assignment saves; add documentation guard comment to `regenerateAISuggestions`.

### Out of Scope
- No changes to recommendation engine.
- No DB migrations.
- No removal of beginner wizard.
- No new edge functions.
