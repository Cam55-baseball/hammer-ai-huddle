# Phase 4 — Finish the Owner Video Library (Additive, Enforced, Mastery-Grade)

This plan completes everything started in Phase 3. Nothing is rebuilt — every existing file, hook, and view is reused. We only add what's missing and enforce what's currently optional.

---

## Audit of current state (verified, not assumed)

| Piece | Status |
|---|---|
| `useVideoLibraryAdmin` (`updateStructuredFields`, `syncTagAssignments`, `regenerateAISuggestions`) | ✅ exists |
| `useVideoReadiness` + `library_videos_readiness` view | ✅ exists |
| `LibraryHealthStrip`, `VideoLibraryHelpSheet` | ✅ exists, **not mounted** |
| `VideoEditForm` engine state (`videoFormat`, `skillDomains`, `aiDescription`, `assignments`) | ✅ wired, **not rendered** |
| Save handler calls `updateStructuredFields` + `syncTagAssignments` | ✅ |
| Publish/Save gating on readiness | ❌ missing |
| `VideoUploadForm` uses `StructuredTagEditor` | ✅ exists (we'll reuse, not duplicate) |
| `VideoUploadWizard.tsx` | ❌ missing |
| `BackfillQueueDialog.tsx` | ❌ missing |
| Per-video readiness badge in manager list | ❌ missing |
| "Show only incomplete" filter | ❌ missing |
| Help button in manager header | ❌ missing |
| Unsaved-changes / leave-incomplete warning | ❌ missing |

---

## 1. Render Engine Fields in `VideoEditForm.tsx`

Add a single, clearly separated section **above the Save row**:

```
─── Engine Fields (Required for Recommendations) ───
[ Video Format ▾ ]    ← Select with VIDEO_FORMATS
Skill Domains: [hitting] [fielding] [throwing] [base_running] [pitching]   ← chips
AI Description (what the engine reads)
[ textarea, 4 rows ]
[ ✨ Auto-Suggest Tags ]   ← calls handleRegenAI (already wired)

Tag Assignments (grouped by layer — only shown once a primary domain is picked)
  Movement   [chip] [chip]…
  Result     [chip] [chip]…
  Context    [chip] [chip]…
  Correction [chip] [chip]…
Per assigned chip → Low / Medium / High weight toggle (1 / 3 / 5)
```

Implementation notes:
- All state already exists in the component (`videoFormat`, `skillDomains`, `assignments`, `grouped`, `handleRegenAI`). Pure render addition.
- Weight toggle: a small 3-button group (`Low=1`, `Med=3`, `High=5`) replacing the freeform value `3` currently set in `toggleAssignment`.
- Empty-state copy when no primary domain selected: *"Pick a skill domain above to load taxonomy."*
- Auto-suggest button disabled if `aiDescription.trim().length < 20` (prevent garbage prompts).

## 2. Enforce Readiness — disable Save with plain-language reasons

Add a derived check inside `VideoEditForm`:

```ts
const missing: string[] = [];
if (!videoFormat) missing.push('Add a format');
if (skillDomains.length === 0) missing.push('Add a skill');
if (!aiDescription.trim()) missing.push('Write a description');
if (Object.keys(assignments).length < 2) missing.push('Add at least 2 tags');
const isReady = missing.length === 0;
```

UI:
- Save button → `disabled={isProcessing || !isReady}`.
- Render a `<ul>` of missing reasons directly above Save (small, muted, only when `!isReady`).
- Same gating logic exported as `computeMissingFields(video, draft)` from a new helper `src/lib/videoReadiness.ts` so the wizard reuses it.

## 3. `VideoUploadWizard.tsx` (new — golden 4-step path)

Path: `src/components/owner/VideoUploadWizard.tsx`. Reuses `useVideoLibraryAdmin.uploadVideo` and `StructuredTagEditor` (no duplication).

- **Step 1 — Upload Video**: link or file (existing logic lifted from `VideoUploadForm`).
- **Step 2 — Basic Info**: title, sport (chips, mutually-exclusive `both`), category, optional short description.
- **Step 3 — Engine Fields**: `<StructuredTagEditor>` + auto-suggest hook (calls `analyze-video-description` after temp save? — see below).
- **Step 4 — Review + Publish**: read-only summary; Publish button disabled unless `computeMissingFields()` is empty.

Wizard mechanics:
- Header: `Step X of 4 · <title>` + thin progress bar (Tailwind `h-1 bg-primary` with `width: ${(step/4)*100}%`).
- "Next" disabled until step is valid (per-step validators).
- On "Next" → autofocus first input of next step (`useRef` + `requestAnimationFrame`).
- "Back" preserves all state.
- On Publish → single `uploadVideo({...})` call (already supports `tagAssignments`); no temp draft row needed because auto-suggest runs server-side **after** insert (already implemented in `useVideoLibraryAdmin` lines 102–113).

Mounting: replaces the contents of the existing `<TabsContent value="upload">` in `VideoLibraryManager`. The legacy `VideoUploadForm` stays in the file for safety but is no longer rendered (additive — not deleted).

## 4. `BackfillQueueDialog.tsx` (new — production-line cleanup)

Path: `src/components/owner/BackfillQueueDialog.tsx`. Triggered from the "Backfill missing data" button already present in `LibraryHealthStrip`.

- Pulls `useVideoReadiness()` rows where `is_ready = false`, joined to `videos` from `useVideoLibrary({ limit: 100 })` by id.
- Left rail: ordered list of incomplete videos, each row shows title + missing-fields chips (`format`, `skill`, `description`, `tags`) using the existing `MISSING_LABEL` map.
- Right pane: embeds `<VideoEditForm>` for the active video.
- After Save: invalidate readiness query, auto-advance to next incomplete video, focus first missing field.
- "Skip" button to move past a video without saving.
- Empty state when queue clears: *"All videos are engine-ready. 🎯"*.

## 5. `VideoLibraryManager.tsx` integration

Above the Tabs, in this order:

1. `<LibraryHealthStrip onBackfill={() => setBackfillOpen(true)} onFilterIncomplete={…} filterActive={…} />`
2. Header row: existing title (none today — manager has no header) + right-aligned **Help** button → opens `<VideoLibraryHelpSheet />` (already built).

Per-video card additions inside the existing `videos.map(...)`:
- A readiness badge next to the title:
  - ✅ `Ready` (emerald)
  - ⚠️ `Incomplete` (amber) — tooltip: missing fields list
  - 🔴 `Empty` (destructive) — when all 4 missing
- Use the same readiness map (`readinessByVideoId`) — already exported.

Filter behavior:
- New local state `showOnlyIncomplete` controlled by the strip's button. When true, filter `videos` array client-side via `readinessMap.get(v.id)?.is_ready === false`.

Mount the backfill dialog at the bottom: `<BackfillQueueDialog open={backfillOpen} onOpenChange={setBackfillOpen} />`.

## 6. Hard Rule System (enforced in UI)

Implemented via the gating from §2 + these additions:
- **Auto-suggest blocked without description** → already done in `handleRegenAI` (toast). Keep, but also disable the button when description is empty.
- **Cannot publish without ≥2 tag assignments** → enforced via `isReady`.
- **Leave-incomplete warning**: in `VideoEditForm` add a `dirty` ref tracking changes to engine fields; wrap the parent `Dialog`'s `onOpenChange` in `VideoLibraryManager` (and `BackfillQueueDialog`) with a `confirm()` if `dirty && !isReady`. Copy: *"This video is still 🔴 Empty / ⚠️ Incomplete. Leave anyway?"*
- **Auto-save on Step transitions in the wizard**: not needed — wizard is in-memory until publish. Backfill dialog is per-video save (already explicit). 

## 7. Speed System (owner mastery)

- **Defaults**: `videoFormat` defaults to `'drill'` if empty when entering Step 3 / opening edit form (only when truly null — never overrides existing data).
- **Auto-focus**: first input of each wizard step + first missing field when entering backfill edit; implemented via `useRef` + `useEffect`.
- **Keyboard nav**: wizard responds to `Enter` → Next (when step valid), `Esc` → close. Backfill dialog responds to `Cmd/Ctrl+Enter` → Save and next.
- **Reduced clicks**: weight selector is a 3-button group (1 click instead of slider drag); chip click toggles assignment + sets default `Med`.

---

## Files

**New (3):**
- `src/components/owner/VideoUploadWizard.tsx`
- `src/components/owner/BackfillQueueDialog.tsx`
- `src/lib/videoReadiness.ts` — shared `computeMissingFields()` + label map

**Modified (3):**
- `src/components/owner/VideoEditForm.tsx` — render Engine Fields section, weight toggle, gating, missing-fields list
- `src/components/owner/VideoLibraryManager.tsx` — mount HealthStrip, Help button, readiness badges, incomplete filter, BackfillQueueDialog, swap upload tab to wizard
- `src/hooks/useVideoLibrary.ts` — no schema change; only consumers add the readiness join client-side via `useVideoReadiness`

**No DB / migration / edge function changes.** All backend pieces (view, RPC, edge function) already exist from Phase 3.

---

## Acceptance checklist (verifiable)

- [ ] Edit form shows Engine Fields section with format / domains / description / auto-suggest / grouped tag assignments + weight toggle.
- [ ] Save button disabled with plain-language missing list when not ready.
- [ ] Wizard renders 4 steps with progress, Next is gated, autofocus moves correctly, Publish creates a fully-ready video in one round trip.
- [ ] Health strip + Help button visible at top of manager; readiness badge on every card.
- [ ] "Show only incomplete" filter hides ready videos.
- [ ] Backfill dialog walks owner through incomplete videos one at a time and clears the queue.
- [ ] Closing a dialog with unsaved 🔴 / ⚠️ work prompts confirmation.
- [ ] Auto-suggest button disabled until description has ≥20 chars.