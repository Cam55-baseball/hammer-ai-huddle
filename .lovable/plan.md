

## Overview
Two changes requested for Real-Time Playback:
1. **Rename "AI Analysis" to "Hammer Analysis"** - Update the toggle label/description and ensure it uses the same analysis formula as the "upload your video" analysis
2. **Fix Pause/Resume behavior** - When paused, countdown should truly pause and require "Resume" to continue

---

## Current State Analysis

### Issue 1: "AI Analysis" Branding
- Current label: `realTimePlayback.aiAnalysis` → "AI Analysis"
- Current description: `realTimePlayback.aiAnalysisDescription` → "Get AI-powered feedback on your form"
- The Real-Time Playback uses `analyze-realtime-playback` edge function
- The "Upload Video" uses `analyze-video` edge function
- Both functions have identical mechanics formulas and scoring frameworks (verified via code inspection)

**Verdict:** The analysis logic is already the same between both edge functions. Only the branding needs to change.

### Issue 2: Pause Button Behavior
- Current: The pause button toggles `autoRecordPaused` state
- The button shows "Pause" when running and "Resume" when paused
- The countdown timer respects `autoRecordPaused` and doesn't decrement
- **This already works correctly** based on code review (lines 1203-1227 show timer doesn't decrement when paused)

**However:** The user may be experiencing an issue where the button label doesn't clearly indicate action needed. Let me verify the UI shows "Resume" clearly when paused.

---

## Changes Required

### Change 1: Rebrand to "Hammer Analysis"

**File: `src/i18n/locales/en.json`**

Update the following translation keys:

| Key | Old Value | New Value |
|-----|-----------|-----------|
| `realTimePlayback.aiAnalysis` | "AI Analysis" | "Hammer Analysis" |
| `realTimePlayback.aiAnalysisDescription` | "Get AI-powered feedback on your form" | "Get expert coaching feedback on your mechanics" |
| `realTimePlayback.analysisDisabled` | "AI analysis is turned off. Your video has been saved." | "Hammer Analysis is turned off. Your video has been saved." |
| `realTimePlayback.analysisFailed` | "AI analysis failed" | "Analysis failed. Please try again." |
| `realTimePlayback.frameCount` | "Frames for AI Analysis" | "Frames for Analysis" |

Also update duplicate keys in the file (the realTimePlayback namespace appears twice in en.json - both instances need updating).

**File: `src/components/RealTimePlayback.tsx`**

Update the icon from `Brain` to `Sparkles` or keep `Brain` but ensure it aligns with Hammer branding. The current icon is fine, but we could optionally use `Sparkles` to match the existing Hammer AI branding throughout the app.

### Change 2: Improve Pause/Resume UX

After deeper review, the current logic appears correct - when paused, the timer stops and "Resume" is shown. However, there may be a visual clarity issue. Let's improve the paused state UI:

**File: `src/components/RealTimePlayback.tsx`**

Enhance the paused state visibility:
1. When paused, make the button more prominent (different color scheme)
2. Add a frozen countdown display showing "PAUSED" instead of the countdown
3. Ensure the Resume button is clearly actionable

Current behavior in lines 1544-1555 already toggles between Play/Resume and Pause icons with correct labels. The fix should enhance visual distinction.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/locales/en.json` | Update 5 translation keys to replace "AI Analysis" with "Hammer Analysis" |
| `src/components/RealTimePlayback.tsx` | Optionally change Brain icon to Sparkles; enhance paused state visual styling |

---

## Technical Details

### Translation Updates
```json
{
  "realTimePlayback": {
    "aiAnalysis": "Hammer Analysis",
    "aiAnalysisDescription": "Get expert coaching feedback on your mechanics",
    "analysisDisabled": "Hammer Analysis is turned off. Your video has been saved.",
    "analysisFailed": "Analysis failed. Please try again.",
    "frameCount": "Frames for Analysis"
  }
}
```

### Pause State Enhancement
The current code already correctly implements pause functionality:
- Timer stops when `autoRecordPaused` is true (line 1205)
- Button shows "Resume" when paused (line 1548)

Visual enhancement: Add stronger styling when paused to make it clear action is required.

---

## QA Checklist
1. Open Real-Time Playback → verify toggle says "Hammer Analysis" (not "AI Analysis")
2. Record a video with Hammer Analysis ON → verify analysis runs and provides feedback
3. Record a video with Hammer Analysis OFF → verify message says "Hammer Analysis is turned off..."
4. Enable Auto-Record → after playback, click Pause → verify countdown STOPS
5. While paused → verify button shows "Resume" and timer doesn't count down
6. Click Resume → verify countdown resumes from where it stopped
7. Verify frame count label shows "Frames for Analysis" (not "Frames for AI Analysis")

