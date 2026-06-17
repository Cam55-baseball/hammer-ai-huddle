# Bucket A — Presentation/Wording Changes Log

Read-only audit of every copy/label change shipped in the Bucket A pass.
**No measurement formulas were changed.** No engine_version, prompt_version, or schema bumps. The determinism investigation is unaffected.

## Files touched

1. `src/lib/reportCard/disciplines/bh.ts` — explainer/standard/encouragement copy only.
2. `src/components/report-card/hammer/ReportCardTile.tsx` — confidence tooltip relabeled honestly.
3. `src/pages/AnalyzeVideo.tsx` — failed-analysis card now surfaces actual error message; thumbnail-failed toast rewritten.
4. `src/i18n/locales/en.json` — `videoAnalysis.*` strings rewritten for honesty.

## Change set

### 1. P2 Timing → Knee Lift (`bh.ts` tile `p2_timing`)
- **Before:** "P2 should resolve right as the pitcher hits peak knee lift. Early = drifts forward; late = rushed P3."
- **After:** Explicit that the hitter's **hand load finish** is what's being timed against the **pitcher's** peak knee lift — not a knee-lift evaluation of the hitter. Adds slow-mo cue.

### 2. Sequencing (`bh.ts` tile `sequencing`)
- **Before:** "Load legs → Load hands → Pause → Step / Stride → Pause → Contact…"
- **After:** Explains the kinetic chain order (back hip → torso/shoulders → back elbow → hands → barrel), states what a low score means, and flags that every downstream metric (bat path, on-plane, time to contact, bat speed) inherits the leak.

### 3. Hands Outside Shoulders at Landing (`bh.ts` tile `hands_outside_shoulders_at_landing`)
- **Before:** Generic "pause-at-landing / wall drills / mirror reps."
- **After:** Three failure-specific drills (drift inside / collapse inward / never got outside in the load). Each drill is keyed to the underlying miss, per approved Bucket A direction.

### 4. Back Elbow at Contact (`bh.ts` tile `back_elbow_contact`)
- **Before:** Single-frame contact-frame check with "Acceptable ≥0° past BB · Elite ≥20°" framed as actionable guidance.
- **After:** Tile renamed **"Back Elbow at Contact (under review)"**, threshold chip replaced with a pointer to `.lovable/back-elbow-methodology.md`, explainer states the methodology is under review, the contact-frame is the wrong window, and athletes should not change mechanics based on this tile until the replacement ships. **Formula unchanged** — only presentation flags it as provisional.

### 5. Finish & Balance (`bh.ts` tile `finish_balance`)
- **Before:** "Post-contact balance, no fall-off, two-hand finish" / "Finish like a statue."
- **After:** Standard is now "Stayed connected with two hands through contact and extension until the ball was gone." Explainer states the goal is connection through extension, not a posed finish, and notes the measurable definition is being reviewed separately. **Formula unchanged.**

### 6. Confidence label (`ReportCardTile.tsx`)
- **Before tooltip:** "Low measurement confidence (X%)"
- **After tooltip:** "Low model-stated measurement confidence (X%) — provisional. This is the model's self-reported confidence in the measurement, not a frame-coverage or pose-quality score."
- Adds `aria-label` for screen readers. No numeric value invented; the threshold (<0.5 → warn dot) is unchanged.
- Source trace logged in `.lovable/confidence-source-trace.md`.

### 7. Failed-analysis surface (`AnalyzeVideo.tsx`)
- **Before:** Card showed only a generic rate-limit / payment / "An error occurred" line.
- **After:** Heading reads "Analysis did not complete." Generic message says explicitly that **no score was produced** and the run is shown as failed instead of as a partial result. Adds a collapsible "Technical details" disclosure with the raw error message so the user can see what actually failed without it being hidden.

### 8. Thumbnail-failed toast (`AnalyzeVideo.tsx`)
- **Before:** "Thumbnail generation failed: {raw error}" — read as a hard failure.
- **After:** "Couldn't generate a preview image for this video — the analysis will still run. You can upload a custom cover image later from the session." Non-blaming, accurate about scope (preview only, not analysis).

### 9. i18n keys (`en.json videoAnalysis.*`)
- `analysisFailed`: "Analysis Failed" → **"Analysis did not complete"**
- `rateLimitError`: rewritten to confirm the video is still saved.
- `paymentRequiredError`: rewritten to confirm the video is still saved.
- `genericAnalysisError`: rewritten as the canonical honest message ("no score was produced", "shown as failed instead of as a partial result").
- `thumbnailFailed`: new key, message above.
- `frameExtractionFailed`: new key, honest "your video has not been analyzed" framing.
- `probeFailed`: new key, format-suggestion framing.

## Explicitly NOT touched

- `compute:` functions in `bh.ts` — every formula, every threshold value, every input field name unchanged.
- Engine versions, prompt text, edge-function logic, schema, migrations.
- `confidence_summary_jsonb` source, calculation, or storage.
- Back-elbow measurement formula. Only the label, threshold chip, and explainer changed.
- Finish-and-balance measurement formula. Only standard text and explainer changed.

## Verification

Run `rg -n "compute: \(a\)" src/lib/reportCard/disciplines/bh.ts` and compare against git history — every `compute` block is byte-identical to its pre-Bucket-A version.
