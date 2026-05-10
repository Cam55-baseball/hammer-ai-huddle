## Goal

Make the Owner Video Library editor easier and more expressive again. Restore the freeform "talk to Hammer" textarea, restore explicit tag weights, and add a new section so each video can be linked to your teaching formulas (Hitting 1-2-3-4 and per-domain equivalents).

## What changes (Owner-facing)

### 1. Coach's Notes to Hammer (freeform textarea — restored as primary)

A large multi-line textarea sits at the top of the **Engine Fields** card, above Video Format and Skill Domains.

- Label: **"Coach's Notes to Hammer"**
- Helper: *"Talk to Hammer in your own voice. Tell it who this video is for, what it teaches, and the fault it fixes. Hammer reads this verbatim."*
- 4–6 rows, character counter, 20+ chars unlocks **Auto-Suggest Tags**.
- This text is the source of truth saved to `ai_description`.

### 2. Quick-fill Chips (demoted, optional helper)

The current `HammerDescriptionComposer` is kept but moved **below** the textarea inside a collapsed `<details>` panel labeled **"Quick-fill helpers (optional)"**.

- Picking chips appends a clean sentence to the textarea (does not overwrite).
- Owners who liked the chip flow keep it; the freeform field is no longer blocked behind a hidden toggle.

### 3. Formula Linkage (new section)

A new card inside Engine Fields, directly under Skill Domains, titled **"Formula Linkage — what does this video teach?"**.

Renders a **phase-chip picker** scoped to the selected skill domain:

```text
Hitting:      [P1 Hip Load] [P2 Heel Plant] [P3 Launch] [P4 Hitter's Move]
Pitching:     [P1 Setup] [P2 Stride] [P3 Lateral Shoulders] [P4 Release] [P5 Follow-through]
Fielding:     [P1 Pre-pitch] [P2 Read] [P3 Approach] [P4 Field/Transfer] [P5 Throw]
Throwing:     [P1 Grip/Setup] [P2 Stride] [P3 Lateral Shoulders] [P4 Release]
Base Running: [P1 Read] [P2 Jump] [P3 Acceleration] [P4 Slide/Finish]
```

Below the chips:
- A small textarea **"Formula notes (optional)"** for nuance — e.g. *"Specifically attacks the P1 hands-break hard trigger and the P4 elite move bonus."*
- A read-only summary line: *"Hammer will treat this as: P1 + P4 fix · Advanced · Hitting"*.

Multi-select, deterministic order P1→P5, each phase chip uses semantic tokens.

### 4. Restored explicit tag weights (1 / 3 / 5)

In the Tag Assignments grid, replace the tap-cycle with the previous inline weight stepper:

```text
[Early hands] [1|3|5]    [Bat drag] [1|3|5]
```

`5` = max priority (engine boost), `3` = strong, `1` = normal. Default = `1` on add. Removing the chip clears the weight.

### 5. "What Hammer hears" preview (new)

A subtle preview block at the bottom of Engine Fields, read-only:

> **Hammer reads this video as:** Advanced hitting · P1 + P4 fix · Common cause: Early hands · Boosts: bat drag, posture loss
> *"Best for advanced hitters rolling over inside fastballs due to early hand drift…"*

This is purely derived from current state — no DB writes — and gives the owner an instant "did Hammer get it?" check.

## Layout (final order inside the Engine Fields card)

```text
┌─ Engine Fields ─────────────────────────────────┐
│ [Confidence] [Ready 4/4]                        │
│                                                 │
│ Coach's Notes to Hammer  ← freeform textarea    │
│ ▸ Quick-fill helpers (optional)  ← collapsed    │
│ Video Format                                    │
│ Skill Domains                                   │
│ Formula Linkage  ← phase chips + notes  (NEW)   │
│ Tag Assignments  ← with 1|3|5 weights restored  │
│ AI vs Owner Compare                             │
│ ── What Hammer hears ──  ← derived preview      │
└─────────────────────────────────────────────────┘
```

## Technical Section

**Files edited**
- `src/components/owner/VideoEditForm.tsx` — restructure Engine Fields card; restore freeform textarea; restore weight stepper (1/3/5); mount new `FormulaLinkageEditor`; add `WhatHammerHears` preview.
- `src/components/owner/VideoUploadForm.tsx` and `src/components/owner/StructuredTagEditor.tsx` — same three additions so new uploads write the same fields.
- `src/components/owner/HammerDescriptionComposer.tsx` — switch from "either/or" to "append helper": chip selection appends/updates a marked block in the textarea, never wipes owner text.

**Files created**
- `src/components/owner/FormulaLinkageEditor.tsx` — phase chip picker + notes textarea, props `{ domain, value, onChange }`.
- `src/lib/formulaPhases.ts` — single source of truth for domain → phase list (mirrors the Universal Cause→Effect doctrine; hitting matches the 1-2-3-4 memory exactly).
- `src/components/owner/WhatHammerHears.tsx` — derived read-only summary.

**Database (migration)**
Add two columns to `library_videos`:
- `formula_phases text[]` — e.g. `{p1_hip_load, p4_hitters_move}`. Default `'{}'::text[]`.
- `formula_notes text` — nullable.

Backfill existing rows to `'{}'`/`null`. No RLS changes (existing owner-write / public-read policies cover it). Per `Editing Integrity` core rule, clears write explicit `null`.

**Hooks / engine**
- `src/hooks/useVideoLibraryAdmin.ts` — extend `updateStructuredFields` and `uploadVideo` payloads with `formulaPhases` and `formulaNotes`.
- `src/hooks/useVideoLibrary.ts` — add the two new fields to `LibraryVideo`.
- `src/lib/videoRecommendationEngine.ts` and `src/lib/foundationVideos.ts` — read `formula_phases` as a soft scoring boost when the athlete's open fault matches a video's tagged phase. Pure additive; existing scoring stays intact.
- Edge function that builds AI suggestions reads `formula_notes` + `ai_description` together as the prompt context, so the freeform narration flows back into Auto-Suggest.

**Out of scope**
- No changes to athlete-facing surfaces, foundation pipeline, RLS, or any other tab in the Video Library Manager (Tags / Taxonomy / Rules / Hammer Suggestions / Analytics) beyond the editor.
- No removal of Fast Mode or other existing controls.
- Not changing how the recommendation engine weights phases beyond a small additive bonus — full phase-aware ranking can come in a follow-up once data is flowing.

## Memory updates after build
- New memory: `features/video-library/formula-linkage-and-coach-notes` describing freeform-as-primary, chips-as-helper, explicit weights restored, and per-domain phase chip set.
- Update `features/video-library/owner-controlled-system` to reference the new fields.
