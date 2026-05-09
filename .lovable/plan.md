## Goal

Make owner video tagging a tap-only flow. Eliminate three typing burdens — Hammer description, short description, and per-tag weight sliders — across both the Upload Wizard and the Fast Editor. Title + URL stay typed (URL is unavoidable, title is short and unique).

## What changes

### 1. Hammer description — chip composer (replaces required textarea)

Today: required free-text textarea inside `StructuredTagEditor.tsx` (3 rows). Forces typing on every upload.

Replace with a 4-chip "Description Builder" — owner taps one option per row and the description string is composed automatically:

- **Audience** — Beginner · Intermediate · Advanced · All Levels
- **Best For** — Common Fault Fix · Skill Build · Mechanic Reinforcement · Game-Speed Rep · Diagnostic
- **Focus** — Sequencing · Timing · Power · Direction · Vision · Decision · Recovery · Mobility
- **Common Cause** — Early hands · Lower-half stall · Bat drag · Posture loss · Glove drift · Front-side fly-open · None / N/A

The composer renders the live description as read-only preview text below the chips ("Best for **Intermediate** hitters working on a **Common Fault Fix**. Focus: **Sequencing**. Cause: **Early hands**.") so the owner sees exactly what gets stored. An "Edit text" link reveals the original textarea for the rare case the owner wants to override — overrides persist as-is and skip the composer on next edit.

Validation: still required, but satisfied as soon as Audience + Best For + Focus are picked (Cause optional). No typing needed.

### 2. Short description — auto-generated, hidden by default

Today: optional Textarea on Step 2 of the Upload Wizard.

Remove the textarea from Step 2. Auto-generate the short description from `${category} · ${videoFormat} · ${primaryTagLabel}` (e.g. "Hitting · Drill · Hip Load Fix") at publish time. Add a small "Customize blurb" disclosure that reveals the textarea only if owner wants to override. Same auto-fill rule applies in `VideoEditForm` for parity.

### 3. Tag weights — drop the slider, add a "Boost" toggle

Today: every selected tag in `StructuredTagEditor` and `VideoFastEditor` shows a 1–5 slider.

New behavior:
- Tapping a tag chip selects it at weight **1** (default).
- A second tap on a selected chip toggles **Boost** (weight **3**, shown with a filled chip + small ⚡ icon).
- A third tap deselects.
- No sliders rendered. The 1–5 scale collapses to {1, 3} which preserves the engine's relative-weight ordering and keeps existing data readable (any pre-existing weight ≥ 3 displays as "Boost", < 3 as normal).

This affects: `StructuredTagEditor.tsx`, `VideoFastEditor.tsx`, and the assignment write path in `useVideoLibraryAdmin.syncTagAssignments` (no schema change — `weight` column already accepts integers).

### 4. Wizard flow simplification

Step 2 (Basic Info) becomes:
- Title (typed, unchanged)
- Sport chips (unchanged)
- Category chips (replace the Select dropdown with the same chip pattern used for Sport — one tap)
- Description blurb hidden behind the "Customize" disclosure

Step 3 (Engine Fields) becomes:
- Format chips (unchanged)
- Skill domain chips (unchanged)
- Tag chips with Boost toggle (no sliders)
- Hammer Description chip composer (replaces textarea)

Result: a typical upload becomes URL → Title → ~8 taps → Publish.

## Files touched

- `src/components/owner/StructuredTagEditor.tsx` — swap textarea for `HammerDescriptionComposer`, remove sliders, add Boost toggle.
- `src/components/owner/VideoUploadWizard.tsx` — Category as chips; hide blurb behind disclosure; auto-derive blurb on publish.
- `src/components/owner/VideoFastEditor.tsx` — same chip composer + Boost toggle for tag weights.
- `src/components/owner/VideoEditForm.tsx` — same composer + chip-tag treatment for parity when editing later.
- New: `src/components/owner/HammerDescriptionComposer.tsx` — small reusable component (chips + live preview + override link). Exports `composeHammerDescription(state)` helper used by both wizard and editor.

## Out of scope

- No DB schema changes (uses existing `ai_description` text column and `weight` integer column).
- No changes to the recommendation engine math or `videoReadiness.computeMissingFields` rules — composed description satisfies the existing "non-empty `ai_description`" requirement.
- No bulk apply, no recipes/presets (per your answer).
- Title and external URL still typed.
