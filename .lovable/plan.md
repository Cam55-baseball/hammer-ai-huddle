
# Hide Efficiency Score Display Across All Modules

## Problem Summary

Users are complaining that players receive repetitive scores. To address this, the numeric efficiency score needs to be hidden from the analysis results display across all modules while keeping the score data available for 6-week recap generation.

## Files to Modify

| File | Location | What to Remove |
|------|----------|----------------|
| `src/pages/AnalyzeVideo.tsx` | Lines 754-759 | Large "Efficiency Score: XX/100" heading |
| `src/components/SessionDetailDialog.tsx` | Lines 415-417 | "Efficiency: XX%" badge |
| `src/components/RealTimePlayback.tsx` | Lines 2436-2439 | Score pill showing "X/10" |
| `src/pages/PlayersClub.tsx` | Lines 320-324 | Score badge in mobile session cards |
| `src/pages/PlayersClub.tsx` | Lines 440-442 | Score badge in desktop session cards |
| `src/pages/OwnerDashboard.tsx` | Lines 607-609 | "Score: XX/100" text in video list |
| `src/pages/Dashboard.tsx` | Lines 267-280 | "Average Score" card display |
| `src/components/VideoComparisonView.tsx` | Lines 275-277 | Score badge for video 1 |
| `src/components/VideoComparisonView.tsx` | Lines 348-350 | Score badge for video 2 |
| `src/pages/AdminDashboard.tsx` | Lines 213-215 | "Score: XX/100" text in video list |
| `src/pages/AdminDashboard.tsx` | Lines 360-372 | "Avg Score" statistics card |

## What Will Remain Intact

- Score data continues to be calculated and stored in the database
- 6-week recap system will still have full access to efficiency scores for AI analysis
- `TheScorecard` component still receives `currentScore` for internal trend calculations
- All qualitative feedback (summary, positives, negatives, recommendations) remains visible
- Decision efficiency scores in S2 Cognition diagnostics (separate system, not affected)

## Detailed Changes

### 1. AnalyzeVideo.tsx (Lines 754-759)
Remove the prominent score display block:
```tsx
// DELETE THIS BLOCK
<div>
  <h4 className="text-lg font-semibold">{t('videoAnalysis.efficiencyScore')}</h4>
  <div className="text-4xl font-bold text-primary">
    {analysis.efficiency_score}/100
  </div>
</div>
```

### 2. SessionDetailDialog.tsx (Lines 415-417)
Remove the efficiency badge:
```tsx
// DELETE THIS BLOCK
{session.efficiency_score !== undefined && (
  <Badge>{t('sessionDetail.efficiency')}: {session.efficiency_score}%</Badge>
)}
```

### 3. RealTimePlayback.tsx (Lines 2436-2439)
Remove the score pill from the Quick Analysis header:
```tsx
// DELETE THIS BLOCK
<div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10">
  <span className="text-lg font-bold text-primary">{analysis.overallScore}</span>
  <span className="text-sm text-muted-foreground">/10</span>
</div>
```

### 4. PlayersClub.tsx (Lines 320-324 & 440-442)
Remove both score badges (mobile and desktop views):
```tsx
// DELETE BOTH BLOCKS
{session.efficiency_score !== undefined && (
  <Badge variant="secondary" className="text-xs">
    {session.efficiency_score}%
  </Badge>
)}
```

### 5. OwnerDashboard.tsx (Lines 607-609)
Remove the score text:
```tsx
// DELETE THIS BLOCK
{video.efficiency_score && (
  <p className="text-sm">Score: {video.efficiency_score}/100</p>
)}
```

### 6. Dashboard.tsx (Lines 267-280)
Replace the average score display with a placeholder - the entire block showing `average_efficiency_score` will be removed, leaving only the "No data yet" placeholder state.

### 7. VideoComparisonView.tsx (Lines 275-277 & 348-350)
Remove score badges from both video comparison panels:
```tsx
// DELETE BOTH BLOCKS
{video1.efficiency_score !== undefined && (
  <Badge variant="secondary">{video1.efficiency_score}%</Badge>
)}
```

### 8. AdminDashboard.tsx (Lines 213-215 & 360-372)
Remove the score text from video list and the entire "Avg Score" statistics card.

## Impact Summary

| Area | Before | After |
|------|--------|-------|
| Analysis Results | Shows "Efficiency Score: 85/100" prominently | Qualitative feedback only |
| Session Cards | Shows percentage badges | Sport/module badges only |
| Owner/Admin Dashboards | Shows scores in lists | Status and date only |
| Video Comparison | Shows score badges | Sport/module badges only |
| 6-Week Recaps | Uses scores for AI analysis | **Unchanged** - still works |
| Database | Stores efficiency scores | **Unchanged** - still stored |
