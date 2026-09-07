# Fold the bottom red box into Key Findings

The red "One problem, X parts of your game" box at the very bottom of an analysis repeats
what the findings already say. It moves up into the findings, and the standalone box at the
bottom goes away. Ball speed stays where it is.

## What changes for the athlete

- The cross-skill pattern ("Your body turns before your front foot lands") appears at the top
  of **Key findings**, right above the top takeaway, styled as part of that white card instead
  of a separate red block.
- Nothing is lost: the pattern name, the plain-language explanation, the skill tags, the
  per-skill lines and the "fixing it once helps all of them" note all move with it.
- The bottom of the report ends with Watch this next and Ball speed. No repeated content.

## Technical notes

- `src/components/analyze/RootPatternCallout.tsx`: add an `inline` variant that drops the
  outer `Card`/red border and renders the same content as a plain block, so it can sit inside
  the Key findings card. Existing default behaviour untouched.
- `src/components/analyze/AnalysisResultsPanel.tsx`: new optional `crossDomainSlot?: ReactNode`
  rendered at the top of section 2 (Key findings). Key findings card renders when
  `summary.length > 0` **or** the slot is present, so the pattern is never dropped on a
  summary-less analysis.
- `src/pages/AnalyzeVideo.tsx`: remove the bottom `<RootPatternCallout />`. Pass
  `crossDomainSlot={<RootPatternCallout inline />}` to `AnalysisResultsPanel`. In the report-card
  view (where there is no findings card), render `<RootPatternCallout />` directly under
  `HammerReportCard` so the information still has one home.
- No changes to fault detection, scoring, or `useCrossDomainFaults` — presentation only.
