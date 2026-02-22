

# Move "Ask the Coach" Above Scorecard + Update Wording

## Changes

### 1. Reorder in `src/pages/AnalyzeVideo.tsx`

Move the `AnalysisCoachChat` block (currently at lines 954-964, after the action buttons) to just before "The Scorecard" section (currently at line 885). The new order inside the analysis card will be:

1. Analysis results (efficiency score, feedback, drills, etc.)
2. **Ask the Coach** (moved up)
3. The Scorecard (progress report)
4. Disclaimer + action buttons

### 2. Update text in `src/components/AnalysisCoachChat.tsx`

Two string changes in the fallback text:

- Line 150: Change `'Have questions about your analysis? Ask our AI biomechanics coach.'` to `'Have questions about your analysis? Ask our Biomechanics Coach!'`
- Line 161: Change `'This is your AI biomechanics coach. Ask follow-up questions about your analysis results, drills, or mechanics.'` to `'This is your biomechanics coach. Ask follow-up questions about your analysis results, drills, or mechanics.'`

No other files need to change. These are simple positional and copy edits.
