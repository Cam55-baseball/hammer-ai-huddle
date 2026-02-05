

## Root Cause: Duplicate `realTimePlayback` Namespace in en.json

The English translation file (`src/i18n/locales/en.json`) contains **two separate `realTimePlayback` objects**:

| Location | aiAnalysis Value | Issue |
|----------|------------------|-------|
| Line 12 | "Hammer Analysis" ✅ | Correctly updated |
| Line 6388 | "AI Analysis" ❌ | **OVERRIDES the correct one** |

In JSON, when duplicate keys exist at the same object level, **the last definition wins**. So the old values at line ~6388 override the corrected values at line ~12.

---

## Keys Still Showing Old Text

| Key | Line 12-100 (Ignored) | Line 6388+ (Active) |
|-----|----------------------|---------------------|
| `aiAnalysis` | "Hammer Analysis" | "AI Analysis" ❌ |
| `aiAnalysisDescription` | "Get expert coaching feedback..." | "Get AI-powered feedback on your form" ❌ |
| `analysisDisabled` | "Hammer Analysis is turned off..." | "AI analysis is turned off..." ❌ |
| `analysisFailed` | "Analysis failed. Please try again." | "AI analysis failed" ❌ |
| `frameCount` | "Frames for Analysis" | "Frames for AI Analysis" ❌ |

---

## Solution

Remove the duplicate `realTimePlayback` namespace at lines ~6374-6470 and keep only the correctly updated one at lines 2-100.

**File to modify:** `src/i18n/locales/en.json`

### Steps:
1. Delete the entire duplicate `realTimePlayback` object (lines ~6374 to ~6470)
2. Verify no duplicate keys remain in the file
3. Confirm the component uses the correct translations

---

## Technical Details

The duplicate exists because the file accumulated translations over time without proper deduplication. The component (`RealTimePlayback.tsx`) correctly references the translation keys with fallback values:

```typescript
{t('realTimePlayback.aiAnalysis', 'Hammer Analysis')}
```

The fallback shows "Hammer Analysis" but since the duplicate JSON entry exists and loads last, users see "AI Analysis" from line 6388.

---

## QA Checklist

1. Open Real-Time Playback → Toggle should show **"Hammer Analysis"** (not "AI Analysis")
2. Toggle description should show **"Get expert coaching feedback on your mechanics"**
3. Disable analysis and record → Message should say **"Hammer Analysis is turned off..."**
4. Frame count label should show **"Frames for Analysis"** (not "Frames for AI Analysis")
5. If analysis fails → Error should say **"Analysis failed. Please try again."**

