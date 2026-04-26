## Goal
Layer a **feedback + learning system** on top of the existing video library. Additive only — no removal, no schema changes. Every signal is derivable from data we already have (`library_videos_readiness`, `video_tag_assignments`, `video_tag_taxonomy`, `video_tag_suggestions`, localStorage).

---

## 1. Confidence Score (`src/lib/videoConfidence.ts` — new)

Pure function `computeVideoConfidence({ video_format, skill_domains, ai_description, assignments })` → `{ score: 0–100, tier: 'elite'|'solid'|'needs_work', breakdown }`.

Weights (sum 100):
- **Format present** → 15
- **Skill domain present** → 15
- **Description quality** → 25 — length-based curve: <20=0, 20–60=10, 60–140=20, 140+=25; bonus only if it contains a verb cue (regex on action verbs from `coaching-language-standard`).
- **Tag count** → 20 — 0=0, 1=5, 2=12, 3–6=20, 7+=15 (over-tagging penalty).
- **Tag layer diversity** → 25 — +6 per layer covered (movement / result / context / correction), +1 floor.

Tier cutoffs: ≥90 elite (emerald), 70–89 solid (sky), <70 needs_work (amber).

New hook `useVideoConfidenceMap()` — joins `useVideoReadiness` + a single batched query for `video_tag_assignments` (with taxonomy layer) → returns `Map<video_id, ConfidenceResult>`. Cached 60s via react-query.

**UI**:
- New `<ConfidenceBadge score tier />` rendered next to `<ReadinessBadge />` in `VideoLibraryManager` cards.
- Same badge inside `VideoEditForm` Engine Fields header (live, recomputes as user edits — local computation off form state).

---

## 2. AI vs Owner Comparison (`src/components/owner/AIComparePanel.tsx` — new)

Inside `VideoEditForm`, below the Tag Assignments grid:

- Toggle: **"Compare with Hammer"** (default off — keeps form clean).
- When on, fetches `video_tag_suggestions` for `video_id` (any status) + maps `suggested_key + layer` → taxonomy `id`.
- Computes three sets vs current `assignments` state:
  - **Matching** — owner picked + AI suggested → green chips with ✓
  - **AI suggested, owner missed** → amber chips with **"Add"** one-click button (calls existing `toggleAssignment`)
  - **Owner picked, AI didn't suggest** → neutral chips labeled "Owner pick" (no action — informational)
- Confidence % from suggestion shown on AI chips.
- Empty state: "No Hammer suggestions yet. Click Auto-Suggest Tags above."

No new mutations — reuses local `assignments` state.

---

## 3. "Why this tag?" System

Reuse the existing `WhyButton` pattern but lighter — create `<TagWhyPopover tag suggestion? />` (Popover, not Sheet) for inline use:

Content:
- **What it means** → `taxonomy.description` (already in DB).
- **Why it applies** → `suggestion.reasoning` (already stored on `video_tag_suggestions`) when available, else "No Hammer rationale recorded — owner pick."
- **Connected cue** → display `taxonomy.layer + key`.

Mounted on:
- Each AI chip in `AIComparePanel`.
- Optional: small `?` next to selected tags in the assignments grid (only when reasoning exists, to avoid clutter).

---

## 4. Owner Performance Feedback (`src/components/owner/OwnerTaggingPerformancePanel.tsx` — new)

Card mounted **above** the Videos tab (collapsed by default, "Show your tagging stats" toggle).

Derived purely client-side from `useVideoConfidenceMap()` + `useVideoReadiness()`:
- **Avg confidence** (big number + tier color).
- **Most common missing layer** — counts which of `movement/result/context/correction` is least represented across ready videos.
- **Consistency** — % of videos with all 4 layers represented (diversity rate).
- **Trend (lite)** — compare last 5 videos by `created_at` vs prior 5 → ▲/▼ chip on avg confidence. No new tables, just `videos.sort(created_at).slice(...)`.

---

## 5. Fast Mode (Elite Mode)

`src/hooks/useOwnerPrefs.ts` — new, localStorage-backed (`hammer.owner.fastMode`, `hammer.owner.smartDefaults`).

UI:
- Switch in `VideoLibraryManager` top bar: **⚡ Fast Mode** (next to Help).
- When ON:
  - Add tab swaps `<VideoUploadWizard />` → new `<VideoFastEditor />` (compact single-pane: dropzone + 4 inline engine inputs + Save). All required fields visible at once, keyboard navigation (`Tab`/`Cmd+Enter`).
  - Edit dialog opens in a denser layout: hide non-engine sections behind "More options" disclosure. Engine Fields panel becomes the primary content.
- Beginner wizard remains the default and is never removed.

Persistence: choice survives reloads via localStorage; no DB write.

---

## 6. Smart Defaults (`src/lib/ownerLearning.ts` — new)

Learned from existing data, not new tables:
- On every successful save in `useVideoLibraryAdmin.updateStructuredFields`, call `recordOwnerChoice({ format, domains, layers })`.
- Store rolling counts (last 50 saves) in localStorage: `hammer.owner.learning.v1`.
- Expose `getSmartDefaults()` → `{ topFormat, topDomains, topLayerWeights }`.

Applied in:
- `VideoUploadWizard` Step 3 → format selector pre-selects `topFormat` (with subtle "Suggested" hint and easy override).
- `VideoFastEditor` (Fast Mode) → same.
- New video defaults skill_domains to `topDomains[0]` only when none chosen and Fast Mode is on (never in beginner wizard, to preserve teaching).

A "Reset learning" button in the Help sheet for owner control.

---

## Files

**New (9):**
- `src/lib/videoConfidence.ts`
- `src/lib/ownerLearning.ts`
- `src/hooks/useVideoConfidenceMap.ts`
- `src/hooks/useOwnerPrefs.ts`
- `src/components/owner/ConfidenceBadge.tsx`
- `src/components/owner/AIComparePanel.tsx`
- `src/components/owner/TagWhyPopover.tsx`
- `src/components/owner/OwnerTaggingPerformancePanel.tsx`
- `src/components/owner/VideoFastEditor.tsx`

**Edited (4):**
- `src/components/owner/VideoLibraryManager.tsx` — Fast Mode switch, Performance panel mount, ConfidenceBadge per card.
- `src/components/owner/VideoEditForm.tsx` — Live ConfidenceBadge, AIComparePanel toggle, TagWhyPopover hooks.
- `src/components/owner/VideoLibraryHelpSheet.tsx` — add "Reset learning" + Fast Mode explainer.
- `src/hooks/useVideoLibraryAdmin.ts` — call `recordOwnerChoice` after structured save.

**No DB migrations. No new edge functions.**

---

## Acceptance
- Every video shows a 0–100 confidence score with elite/solid/needs-work color.
- Edit form has working "Compare with Hammer" with one-click adopt.
- Every AI suggestion has a reachable "Why?" with taxonomy meaning + reasoning + cue.
- Owner panel shows avg score, weakest layer, consistency, and 5-video trend.
- Fast Mode toggle persists, swaps wizard for compact editor, never blocks beginner flow.
- After ~3 saves, format dropdown pre-selects the owner's most-used format.