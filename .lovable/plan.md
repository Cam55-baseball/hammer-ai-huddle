

# Fix Plan: Require Video Frames for Accurate Pitching Analysis

## Problem Identified

The `analyze-video` edge function is **NOT sending video frames** to the AI model. Looking at the code:

```typescript
// Current analyze-video/index.ts (lines 980-985)
messages: [
  { role: "system", content: systemPrompt },
  { role: "user", content: userMessage },  // TEXT ONLY - NO FRAMES!
],
```

The AI receives **only text instructions** with no visual data. Without frames showing the pitcher's body position at landing, the AI cannot:
- See if the back leg is facing the target
- See if shoulders are aligned at landing
- Detect any timing violations

The AI guesses based on text prompts alone, defaulting to a generous 85 score since it cannot actually see any violations.

Compare to `analyze-realtime-playback` which **correctly** sends frames:

```typescript
// analyze-realtime-playback sends frames correctly (lines 700-708)
userContent.push({
  type: 'image_url',
  image_url: { url: frames[i] }
});
```

---

## Root Cause

The video upload flow captures a thumbnail but never extracts key frames to send to the AI:

1. User uploads video file
2. Frontend generates thumbnail at 0.1 seconds (for display only)
3. Frontend calls `analyze-video` with only `videoId`, `module`, `sport`, `userId`
4. Edge function sends **text-only prompt** to AI
5. AI guesses mechanics without visual evidence

---

## Solution: Multi-Frame Extraction and Analysis

### Step 1: Extract Key Frames on Frontend

Before calling `analyze-video`, extract 5-7 frames from the video at key timing intervals focused on the landing moment.

```typescript
// In src/pages/AnalyzeVideo.tsx - new frame extraction function
const extractKeyFrames = async (videoFile: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const duration = video.duration;
      const frames: string[] = [];
      
      // Extract 7 frames across the motion (10%, 25%, 40%, 50%, 60%, 75%, 90%)
      // Focused on middle portion where landing typically occurs
      const timestamps = [0.1, 0.25, 0.40, 0.50, 0.60, 0.75, 0.90]
        .map(pct => pct * duration);
      
      for (const time of timestamps) {
        video.currentTime = time;
        await new Promise(r => video.addEventListener('seeked', r, { once: true }));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        frames.push(dataUrl);
      }
      
      URL.revokeObjectURL(video.src);
      resolve(frames);
    };
    
    video.onerror = () => reject(new Error('Failed to load video for frame extraction'));
  });
};
```

### Step 2: Add Optional Landing Marker UI

Add a "Mark Landing" button that allows users to optionally specify the exact landing moment for maximum accuracy:

```typescript
// State for landing marker
const [landingTime, setLandingTime] = useState<number | null>(null);

// In EnhancedVideoPlayer, add a "Mark Landing" button
<Button onClick={() => setLandingTime(video.currentTime)} variant="outline" size="sm">
  <Target className="h-4 w-4 mr-2" />
  Mark Landing
</Button>
```

When landing is marked, extract frames centered around that moment (e.g., -0.3s, -0.15s, landing, +0.1s, +0.2s).

### Step 3: Update Edge Function to Accept and Process Frames

Modify `analyze-video/index.ts` to:
1. Accept `frames` array in request body
2. **REQUIRE frames** - return error if not provided
3. Build multimodal message with images
4. Add explicit landing-focused instructions

```typescript
// Updated request schema
const requestSchema = z.object({
  videoId: z.string().uuid(),
  module: z.enum(["hitting", "pitching", "throwing"]),
  sport: z.enum(["baseball", "softball"]),
  userId: z.string().uuid(),
  language: z.string().optional(),
  frames: z.array(z.string()).min(3, "At least 3 frames required for analysis"),
  landingFrameIndex: z.number().optional(), // If user marked landing
});

// Build multimodal message content
const userContent: Array<{type: string; text?: string; image_url?: {url: string}}> = [];

userContent.push({
  type: 'text',
  text: `CRITICAL ANALYSIS INSTRUCTION:
  
You are analyzing ${frames.length} sequential frames from a ${sport} ${module} motion.
${landingFrameIndex != null ? `The user has marked Frame ${landingFrameIndex + 1} as the EXACT MOMENT of front foot landing.` : ''}

AT THE FRAME WHERE FRONT FOOT FIRST CONTACTS GROUND, check:
1. Is BACK LEG (foot, knee, hip) fully facing the target? 
   - If back foot still pointing backward, hip not rotated → back_leg_not_facing_target = TRUE
2. Are SHOULDERS aligned with target (draw line throwing shoulder → front shoulder → catcher)?
   - If shoulders rotated open or closed relative to target line → shoulders_not_aligned = TRUE
3. Have shoulders ALREADY started rotating while foot is landing?
   - If any rotation before firm plant → early_shoulder_rotation = TRUE

THESE ARE PASS/FAIL CHECKPOINTS AT LANDING. No partial credit.

Be HONEST in violation detection - the score caps depend on accurate flags.`
});

// Add each frame with temporal labels
for (let i = 0; i < frames.length; i++) {
  const isLandingFrame = landingFrameIndex != null && i === landingFrameIndex;
  userContent.push({
    type: 'text',
    text: `[Frame ${i + 1}/${frames.length}${isLandingFrame ? ' - LANDING MOMENT' : ''}]`
  });
  userContent.push({
    type: 'image_url',
    image_url: { url: frames[i] }
  });
}

// Call AI with vision content
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }  // Now includes frames!
    ],
    tools: [...],
    tool_choice: { type: "function", function: { name: "return_analysis" } }
  }),
});
```

### Step 4: Strengthen Score Caps Per User Preference

Update score caps to enforce **max 60** for EITHER alignment violation:

```typescript
// Stricter score caps (user preference: "Max 60 if either fails")
if (violationCount >= 2) {
  cappedScore = Math.min(efficiency_score, 55); // Both violations = max 55
  console.log(`[SCORE CAP] Multiple violations - max 55`);
}
else if (violations.back_leg_not_facing_target) {
  cappedScore = Math.min(efficiency_score, 60); // Single leg violation = max 60
  console.log(`[SCORE CAP] Back leg not facing target - max 60`);
}
else if (violations.shoulders_not_aligned) {
  cappedScore = Math.min(efficiency_score, 60); // Single shoulder violation = max 60
  console.log(`[SCORE CAP] Shoulders not aligned - max 60`);
}
else if (violations.early_shoulder_rotation) {
  cappedScore = Math.min(efficiency_score, 65); // Early rotation = max 65
  console.log(`[SCORE CAP] Early shoulder rotation - max 65`);
}
```

### Step 5: Frontend Error Handling for Frame Requirement

If frame extraction fails, show clear error and prevent analysis:

```typescript
// In handleUploadAndAnalyze
let frames: string[];
try {
  toast.info("Extracting key frames for analysis...");
  frames = await extractKeyFrames(videoFile);
  if (frames.length < 3) {
    throw new Error("Could not extract enough frames for analysis");
  }
} catch (frameError) {
  toast.error("Failed to extract video frames. Please try a different video format or browser.");
  setUploading(false);
  return;
}

// Pass frames to edge function
const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
  "analyze-video",
  {
    body: {
      videoId: videoData.id,
      module,
      sport,
      userId: user.id,
      language: i18n.language,
      frames,
      landingFrameIndex: landingTime ? Math.round((landingTime / videoFile.duration) * frames.length) : undefined,
    },
  }
);
```

---

## Files to Modify

1. **`src/pages/AnalyzeVideo.tsx`**
   - Add `extractKeyFrames()` function
   - Add landing marker state and UI
   - Pass frames to edge function
   - Handle frame extraction errors

2. **`src/components/EnhancedVideoPlayer.tsx`**
   - Add "Mark Landing" button prop
   - Callback to parent with landing timestamp

3. **`supabase/functions/analyze-video/index.ts`**
   - Add `frames` to request schema (required)
   - Add `landingFrameIndex` (optional)
   - Build multimodal message with frames
   - Add landing-focused analysis instructions
   - Update score caps to max 60 for alignment violations

4. **`supabase/functions/analyze-realtime-playback/index.ts`**
   - Update score caps to match (max 60 for alignment violations)
   - Ensure parity with video upload analysis

---

## Expected Outcome

After implementation:

1. **The example pitching video will score 55-60**
   - AI now SEES the back leg still rotating at landing
   - AI now SEES shoulders not aligned with target
   - Both violations detected → Score capped at 55

2. **Consistent detection across all videos**
   - Frames provide visual evidence for every analysis
   - No more text-based guessing

3. **User control for maximum accuracy**
   - Optional "Mark Landing" gives users power to specify exact moment
   - Auto-extraction works well for standard videos

4. **Clear error handling**
   - If frames can't be extracted, user gets clear message
   - No silent fallback to inaccurate text-only analysis

---

## Technical Considerations

### Frame Size Optimization
- Use JPEG at 80% quality to balance size/clarity
- Typical frame: 50-100KB after compression
- 7 frames = ~350-700KB total payload (well within limits)

### Browser Compatibility
- Canvas and video APIs are widely supported
- Works in all modern browsers (Chrome, Safari, Firefox, Edge)
- Mobile browsers also support this flow

### Performance
- Frame extraction takes 1-3 seconds for most videos
- User sees "Extracting frames..." toast during this time
- Analysis quality vastly improved vs. text-only

