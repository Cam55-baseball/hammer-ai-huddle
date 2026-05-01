## Goal

Three improvements to the Owner → Video Library → Tag Taxonomy workflow:

1. **Hard-delete inappropriate or misplaced tags** (today only soft-deactivates).
2. **Hammer auto-analyzes new tags** added by the owner — propagating them across the library so existing videos get re-suggested with the new vocabulary.
3. **Clear, opinionated descriptions for each layer** (Movement Pattern / Result / Context / Correction) so the owner picks the correct one when adding a tag.

---

## What changes

### 1. `src/components/owner/TaxonomyManager.tsx` — Delete + Layer guidance + New-tag flow

- **Layer descriptions (always visible).** Add a clear one-line definition + 1 example for each layer right under the Layer dropdown. When a layer is selected, show its full description card so the owner cannot misplace a tag:
  - **Movement Pattern** — *What the body is doing (mechanics).* e.g. `hands_forward_early`, `early_extension`.
  - **Result** — *What happened on the play (outcome).* e.g. `roll_over_contact`, `pop_up`, `barrel`.
  - **Context** — *The situation around the rep.* e.g. `two_strike`, `risp`, `inside_pitch`.
  - **Correction** — *Coaching intent / fix being demonstrated.* e.g. `stay_connected`, `load_back_side`.

- **Real delete (not just deactivate).** Replace the `Trash2` action with a confirm dialog offering two actions:
  - **Deactivate** — current behavior (`active = false`); preserves history on already-tagged videos.
  - **Delete permanently** — `DELETE FROM video_tag_taxonomy WHERE id = ...` (cascade removes dependent `video_tag_assignments` and `video_tag_rules` rows referencing it). Show a warning summarizing how many videos currently use the tag (count from `video_tag_assignments`) before confirming.

- **After adding a tag**, automatically trigger Hammer re-analysis (see step 2) for affected videos and toast the count of videos queued for re-suggestion.

### 2. Hammer re-analysis when a new tag is added

- **New edge function `reanalyze-videos-for-new-tag`** (`supabase/functions/reanalyze-videos-for-new-tag/index.ts`):
  - Owner-only (verifies `user_roles.role = 'owner'`).
  - Input: `{ tagId }`.
  - Loads the new tag (layer, key, label, skill_domain) and the **full active taxonomy** (so Hammer sees siblings/context).
  - Selects all `library_videos` matching the tag's skill domain that have an `ai_description` or `description` and are not `blocked`. Caps the batch at 50 per call (paginates via `cursor` for larger libraries).
  - For each video, calls Lovable AI Gateway (`google/gemini-2.5-flash`) with:
    - The video's title, description, ai_description, existing assigned tags (labels), existing skill_domains.
    - The full vocabulary grouped by layer.
    - A directive: *"Only propose the new tag `<layer>:<key>` if explicitly supported by the description and existing tags. You may also propose other vocabulary tags missing from the video. Confidence must be 0–1."*
  - Inserts proposals into the existing `video_tag_suggestions` table with `source = 'taxonomy_expansion'` so they appear in the existing owner review surface (no new UI needed for the queue).
  - Returns `{ analyzed, proposals_inserted }`.

- **Trigger from `TaxonomyManager`** right after a successful tag insert: fire-and-forget invoke, optimistic toast: *"Hammer is reviewing N videos for this tag — proposals will appear in the suggestion queue."*

- **Why this satisfies the request**: Hammer considers *all corresponding tags and descriptions* (full vocabulary + each video's existing assignments + descriptions) so the new tag is integrated coherently across the library and starts driving recommendations as soon as the owner approves the proposals.

### 3. Layer-description tooltips on `StructuredTagEditor`

Mirror the same one-line layer definitions on `src/components/owner/StructuredTagEditor.tsx` next to each layer label so the same guidance appears when tagging an individual video.

---

## Technical details

**Schema check (no migration needed)** — `video_tag_taxonomy` already has FK cascade behavior via `video_tag_assignments.tag_id` and `video_tag_rules` references; will verify before delete and add `ON DELETE CASCADE` via a small migration only if missing.

**Edge function config** — standard Lovable defaults (`verify_jwt = false`, in-code JWT validation, `persistSession: false`, `Deno.serve`). Uses existing `LOVABLE_API_KEY`.

**Files touched**
- `src/components/owner/TaxonomyManager.tsx` — layer descriptions, delete dialog, post-add re-analysis trigger.
- `src/components/owner/StructuredTagEditor.tsx` — layer description hints.
- `supabase/functions/reanalyze-videos-for-new-tag/index.ts` — new function.
- `supabase/migrations/<ts>_taxonomy_cascade.sql` — only if FK cascade is missing.

**Out of scope** — no changes to the recommendation engine itself; new tags flow in through the existing `video_tag_suggestions` → owner approve → `video_tag_assignments` path which already triggers tier recompute via `trg_recompute_tier_on_assignment`.