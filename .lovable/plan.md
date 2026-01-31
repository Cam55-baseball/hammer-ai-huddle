

# Plan: Hide Efficiency Score from Analysis Results Display

## Overview

Remove the efficiency score display from the Analysis Results section on the video analysis page (`/analyze/:module`). Users are getting discouraged when they can't improve their scores, causing unintended negative effects on motivation.

## What Will Be Hidden

The efficiency score display that currently shows prominently at the top of analysis results:

| Before | After |
|--------|-------|
| "Efficiency Score" heading + large "XX/100" number | Section removed entirely |
| This appears immediately after analysis completes | Analysis will start with Key Findings |

## What Will Remain Visible

The efficiency score will continue to be stored in the database and displayed in other contexts:
- Session library badges (SessionDetailDialog)
- Dashboard progress indicators
- Video comparison views
- Admin/Owner dashboards

## File to Modify

**`src/pages/AnalyzeVideo.tsx`**

Remove lines 754-759 which display the efficiency score section:

```typescript
// REMOVE THIS SECTION:
<div>
  <h4 className="text-lg font-semibold">{t('videoAnalysis.efficiencyScore')}</h4>
  <div className="text-4xl font-bold text-primary">
    {analysis.efficiency_score}/100
  </div>
</div>
```

The analysis results will then immediately begin with the "Key Findings" summary section, which provides more actionable and encouraging feedback.

## Result

After this change:
- Analysis results will show: Key Findings → Detailed Analysis → Positives → Recommended Drills
- No numeric score shown to discourage users
- Score still calculated and stored for backend AI systems (6-week recap, TheScorecard trends)
- Score still accessible in library views and dashboards for tracking purposes

