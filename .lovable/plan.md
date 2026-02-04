

# Enhanced Real-Time Playback: Fullscreen Camera, Auto-Record Reset, and Analysis Timeout

## Overview
This plan addresses three key improvements to the Real-Time Playback feature:

1. **Fullscreen Camera During Recording** - Camera fills the screen during countdown and recording phases
2. **Auto-Record Default OFF** - Auto-record setting resets each session instead of persisting
3. **Analysis Timeout Alert** - Shows popup if analysis can't detect user in frame within 20 seconds

---

## Problem 1: Camera Not Fullscreen During Recording

### Current Behavior
When "Start Recording" is clicked, the camera only goes fullscreen if the native Fullscreen API request succeeds. On mobile or if the user declines, the camera stays small (max 40vh height), making it hard to frame properly.

### Solution
Apply fullscreen-style CSS (`fixed inset-0 z-[9999]`) during `countdown` and `recording` phases regardless of native fullscreen status. This ensures the camera always fills the available space when recording.

### File Changes
**`src/components/RealTimePlayback.tsx`** (around line 1385-1391)

```tsx
// Before:
isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ...

// After:
(isFullscreen || phase === 'countdown' || phase === 'recording') 
  ? 'fixed inset-0 z-[9999] rounded-none' 
  : ...
```

---

## Problem 2: Auto-Record Persists Between Sessions

### Current Behavior
The `autoRecordEnabled` state is initialized from localStorage (line 121-123), meaning if the user enabled auto-record in a previous session, it stays ON.

### Solution
- Initialize `autoRecordEnabled` to `false` always
- Remove localStorage persistence for this setting specifically

### File Changes
**`src/components/RealTimePlayback.tsx`** (lines 121-123)

```tsx
// Before:
const [autoRecordEnabled, setAutoRecordEnabled] = useState<boolean>(() => 
  localStorage.getItem('rtPlayback_autoRecord') === 'true'
);

// After:
const [autoRecordEnabled, setAutoRecordEnabled] = useState<boolean>(false);
```

Also remove the localStorage persistence for autoRecordEnabled from the useEffect (line 192):
```tsx
// Remove this line from the useEffect:
localStorage.setItem('rtPlayback_autoRecord', String(autoRecordEnabled));
```

And remove `autoRecordEnabled` from the useEffect dependency array.

---

## Problem 3: No Feedback When Analysis Can't Detect User

### Current Behavior
When analysis is enabled, the AI attempts to analyze the video frames. If the athlete isn't visible (wrong camera angle, too far away, obstructed), the AI returns generic fallback analysis without alerting the user that it couldn't properly analyze their form.

### Solution
Add a **20-second timeout** during the analysis phase. If analysis takes longer than 20 seconds OR if the analysis completes but indicates it couldn't properly observe the mechanics, show an alert dialog prompting the user to:
- Ensure they're fully visible in frame
- Check their camera angle
- Try recording again

### Implementation Approach

1. **Add New State for Alert Dialog**
   ```tsx
   const [showAnalysisIssueAlert, setShowAnalysisIssueAlert] = useState(false);
   ```

2. **Add Analysis Timeout Logic**
   Track when analysis starts and set a 20-second timeout. If the timeout fires while still analyzing, show the alert.

3. **Detect Low-Quality Analysis Results**
   After analysis completes, check if the result indicates the AI couldn't properly see the athlete:
   - Very generic observations without specific body part references
   - All categories have same generic score
   - Check for phrases like "unable to observe", "cannot see", "not visible"

4. **Add Alert Dialog Component**
   Show a user-friendly dialog with:
   - Clear explanation of the issue
   - Tips for better framing (distance, angle, lighting)
   - Option to dismiss and try again

### File Changes
**`src/components/RealTimePlayback.tsx`**

| Change | Location | Description |
|--------|----------|-------------|
| Add alert state | New state variable | `showAnalysisIssueAlert` boolean |
| Add analysis timeout | `uploadAndAnalyze` function | 20-second timeout that triggers alert |
| Add result quality check | After analysis completes | Check for generic/poor results |
| Add AlertDialog component | Before closing `</Dialog>` | User-friendly popup with retry tips |

---

## Technical Implementation Details

### Analysis Timeout Implementation

```tsx
// In uploadAndAnalyze function, add timeout tracking:
const analysisStartTime = Date.now();
const analysisTimeout = setTimeout(() => {
  if (isAnalyzing) {
    setShowAnalysisIssueAlert(true);
    setIsAnalyzing(false);
    setAnalysisStatus('failed');
  }
}, 20000); // 20 seconds

// After analysis completes, clear timeout:
clearTimeout(analysisTimeout);
```

### Quality Check Logic

```tsx
const isLowQualityAnalysis = (analysis: Analysis): boolean => {
  // Check for generic phrases that indicate poor visibility
  const genericPhrases = [
    'unable to observe', 'cannot see', 'not visible', 
    'obscured', 'out of frame', 'difficult to analyze'
  ];
  
  const textToCheck = [
    analysis.quickSummary,
    analysis.keyStrength,
    analysis.priorityFix
  ].join(' ').toLowerCase();
  
  return genericPhrases.some(phrase => textToCheck.includes(phrase));
};
```

### Alert Dialog UI

```tsx
<AlertDialog open={showAnalysisIssueAlert} onOpenChange={setShowAnalysisIssueAlert}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {t('realTimePlayback.analysisIssueTitle', 'Unable to Analyze Recording')}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {t('realTimePlayback.analysisIssueDescription', 
          'We couldn\'t gather enough information from your recording for an accurate analysis. This usually happens when the athlete isn\'t fully visible in the frame.'
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="space-y-3 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">
        {t('realTimePlayback.tipsForBetterRecording', 'Tips for a better recording:')}
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>{t('realTimePlayback.tip1', 'Stand 6-10 feet from the camera')}</li>
        <li>{t('realTimePlayback.tip2', 'Ensure your full body is visible in frame')}</li>
        <li>{t('realTimePlayback.tip3', 'Use good lighting (avoid backlight)')}</li>
        <li>{t('realTimePlayback.tip4', 'Position camera at waist height for best angle')}</li>
      </ul>
    </div>
    <AlertDialogFooter>
      <AlertDialogAction onClick={() => setShowAnalysisIssueAlert(false)}>
        {t('realTimePlayback.gotIt', 'Got it, I\'ll try again')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/RealTimePlayback.tsx` | 1. Fullscreen during countdown/recording<br>2. Auto-record default OFF<br>3. Analysis timeout with alert dialog |

---

## Summary

These three improvements will:
1. **Ensure users can properly frame themselves** by making the camera fullscreen during recording
2. **Prevent unexpected auto-recording** by requiring explicit opt-in each session
3. **Guide users when analysis fails** with clear feedback and actionable tips for better recordings

