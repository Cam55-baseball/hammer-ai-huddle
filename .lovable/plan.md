

# Replace All "AI" Branding with "Hammer" Across the Entire App

## Scope

Every user-facing instance of "AI" in the app will be replaced with "Hammer" to align with the established branding convention (Hammer Analysis, Hammer Warmup Generator, Hammer Workout Recommendations). This includes all 8 locale files and hardcoded strings in component/page files.

## Changes by Category

### 1. English Locale (en.json) -- Primary Source of Truth

| Location | Current Text | New Text |
|----------|-------------|----------|
| `common.ai` | "AI" | "Hammer" |
| `realTimePlayback.statusAnalyzing` | "AI analyzing..." | "Hammer analyzing..." |
| `realTimePlayback.analysisFailed` | "AI analysis failed" | "Hammer analysis failed" |
| `realTimePlayback.frameCount` | "Frames for AI Analysis" | "Frames for Hammer Analysis" |
| `landingPage.aiMotionCapture` | "AI Motion Capture" | "Hammer Motion Capture" |
| `landingPage.aiMotionCaptureDesc` | (keep as-is, describes computer vision, no "AI" in the text) | No change |
| `playersClub.analysisDescription` | "Allow scouts to view the AI analysis and feedback" | "Allow scouts to view the Hammer analysis and feedback" |
| `videoAnalysis.uploadDescription` | "Our AI will analyze your mechanics..." | "Hammer will analyze your mechanics..." |
| `videoAnalysis.enableAIAnalysis` | "Enable AI Analysis" | "Enable Hammer Analysis" |
| `chatWidget.title` | "AI Coach" | "Hammer Coach" |
| `chatWidget.greeting` | "I'm your AI coaching assistant..." | "I'm your Hammer coaching assistant..." |
| `mindFuel.aiGenerated` | "AI Generated" | "Hammer Generated" |
| `mindFuel.aiTipsWarning` | "AI-generated tips may contain inaccuracies..." | "Hammer-generated tips may contain inaccuracies..." |
| `nutrition.smartFood.aiEstimate` | "AI Estimate" | "Hammer Estimate" |
| `nutrition.smartFood.aiAnalyzing` | "AI analyzing..." | "Hammer analyzing..." |
| `nutrition.aiSuggestions.title` | "AI Meal Suggestions" | "Hammer Meal Suggestions" |
| `nutrition.aiSuggestions.clickToGet` | "Click refresh to get AI-powered meal suggestions..." | "Click refresh to get Hammer-powered meal suggestions..." |
| `nutrition.nutritionWeekly.aiPoweredInsights` | "AI-powered insights from your training data" | "Hammer-powered insights from your training data" |
| `nutrition.nutritionWeekly.aiGenerated` | "AI Generated" | "Hammer Generated" |
| `aiRecommendations.generate` | "Generate AI Workout" | "Generate Hammer Workout" |
| `workoutBuilder.warmup.paymentRequired` | "AI credits needed..." | "Hammer credits needed..." |
| `eliteWorkout.generator.paymentRequired` | "AI credits needed..." | "Hammer credits needed..." |
| `onboarding.modules.description` | "...cutting-edge AI to help you improve..." | "...cutting-edge Hammer technology to help you improve..." |
| `onboarding.upload.description` | "Our AI analyzes your mechanics in real-time..." | "Hammer analyzes your mechanics in real-time..." |

### 2. Other 7 Locale Files (de, es, fr, ja, ko, nl, zh)

Each locale file will receive the same changes translated into its language. The key pattern is:
- Replace the translated equivalent of "AI" / "KI" (German) / "IA" (Spanish/French) with "Hammer"
- "Hammer" stays as "Hammer" in all languages (it's the brand name)

### 3. Hardcoded Strings in Component Files

| File | Current | New |
|------|---------|-----|
| `src/pages/Index.tsx` (line 131) | `"AI Motion Capture"` | `"Hammer Motion Capture"` |
| `src/pages/Pricing.tsx` (line 116) | `"Advanced AI Analysis"` | `"Advanced Hammer Analysis"` |
| `src/components/RealTimePlayback.tsx` (line 1034) | fallback `'AI analysis failed'` | `'Hammer analysis failed'` |
| `src/components/RealTimePlayback.tsx` (line 1124) | fallback `'AI analysis failed'` | `'Hammer analysis failed'` |
| `src/components/RealTimePlayback.tsx` (line 2467) | fallback `'AI analyzing...'` | `'Hammer analyzing...'` |
| `src/components/RealTimePlayback.tsx` (line 2280) | fallback `'Frames for AI Analysis'` | `'Frames for Hammer Analysis'` |
| `src/components/custom-activities/WarmupGeneratorCard.tsx` (line 89) | fallback `'AI Warmup Generator'` | `'Hammer Warmup Generator'` |
| `src/components/nutrition-hub/AIMealSuggestions.tsx` (line 118) | fallback `'AI Meal Suggestions'` | `'Hammer Meal Suggestions'` |
| `src/components/nutrition-hub/AIMealSuggestions.tsx` (line 178) | fallback `'Click refresh to get AI-powered meal suggestions...'` | `'Click refresh to get Hammer-powered meal suggestions...'` |

### 4. Internal Strings (NOT Changed)

These are code-level identifiers and error handling strings that users never see -- they stay as-is:
- Variable names like `showAIRecommendations`, `handleUseAIWorkout`
- Status values like `'calling_ai'`, `source: 'ai'`
- Database column names like `is_ai_generated`
- Code comments referencing "AI analysis"
- Internal error strings like `'AI credits required.'` in `useSmartFoodLookup.ts` (these are developer-facing fallbacks)

### 5. Hooks with User-Facing Fallback Strings

| File | Current | New |
|------|---------|-----|
| `src/hooks/useBlockWorkoutGenerator.ts` (line 82) | fallback `'AI credits needed...'` | `'Hammer credits needed...'` |
| `src/hooks/useWarmupGenerator.ts` (line 71) | fallback `'AI credits needed...'` | `'Hammer credits needed...'` |
| `src/hooks/useSmartFoodLookup.ts` (line 184) | `'AI credits required.'` | `'Hammer credits required.'` |

## Technical Details

- Total files modified: ~13 (8 locale JSON files + 5 component/page files)
- All changes are string replacements only -- no logic changes
- The i18n key names (like `aiSuggestions`, `aiRecommendations`) remain unchanged to avoid breaking references
- Desktop and mobile layouts are unaffected
- Brand name "Hammer" is used as-is across all languages

