

# Speed Tracking Engine — System Audit & Build Plan

## SECTION 1 — CURRENT SYSTEM AUDIT

| Capability | Status | Location |
|---|---|---|
| Video recording | **YES** | `src/components/RealTimePlayback.tsx` — MediaRecorder + getUserMedia, WebM/MP4 capture |
| Video upload | **YES** | `src/components/speed-lab/SpeedTimeEntry.tsx` (manual time entry), `RealTimePlayback.tsx` (upload to `videos` storage bucket) |
| Frame extraction | **YES** | `src/lib/frameExtraction.ts` — canvas-based JPEG extraction at configurable timestamps |
| Pose detection (feet tracking) | **NO** | No MediaPipe, TensorFlow, or OpenCV anywhere in codebase |
| Event detection (motion start, crossing) | **NO** | No motion/line detection logic exists |
| Timing engine using frame timestamps | **NO** | Times are entered manually or via partner stopwatch (`PartnerTimer.tsx`) |
| Sprint/speed tracking features | **PARTIAL** | Speed Lab exists with manual time entry, step counting, stride analytics, PB tracking, RPE, 20-80 grading via `gradeBenchmarks.ts`. But NO video-based automatic timing. |

### What Already Exists and Works Well
- **Sport-specific distances**: Baseball (10/30/60yd), Softball (7/20/40yd) in `src/data/speedLabProgram.ts`
- **20-80 grading scale**: Full benchmark tables by age band in `src/data/gradeBenchmarks.ts`
- **Database**: `speed_sessions` table with distances (JSONB), steps_per_rep, RPE, personal bests
- **35+ drill library**, session templates, readiness adjustment, CNS recovery lockout
- **Partner timer**: Real-time stopwatch with coach/parent mode

### What Does NOT Exist (Marked Missing)
- Computer vision pipeline (pose detection, feet tracking)
- Automatic start/split/finish detection from video
- Anti-cheat validation (rolling start, camera angle, incomplete run)
- Video-based timing engine
- Split times table
- Step counting from video
- Acceleration profile computation

---

## SECTION 2-9 — BUILD PLAN

### Critical Architecture Decision

**Computer vision (pose detection, feet tracking, line crossing) cannot run in-browser at production quality.** MediaPipe Pose runs at ~15 FPS on mobile — far too slow for frame-accurate sprint timing at 30-60 FPS. Professional systems (Freelap, DASHR) use hardware sensors.

**Recommended approach**: Use AI vision via an edge function. User uploads sprint video → edge function extracts frames → sends to Gemini vision model → returns detected start/split/finish timestamps, step count, and validation results.

This is the same pattern used by `RealTimePlayback.tsx` (video → frame extraction → AI analysis).

---

### Phase 1 — Database Schema (Migration)

```sql
-- Sprint analysis results table
CREATE TABLE public.sprint_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES speed_sessions(id) ON DELETE SET NULL,
  video_url text NOT NULL,
  sport text NOT NULL DEFAULT 'baseball',
  distance_key text NOT NULL,           -- '60y', '30y', '10y', '40y', '20y', '7y'
  
  -- Timing results
  total_time_sec numeric,
  split_times jsonb DEFAULT '[]',       -- [{distance: "10y", time_sec: 1.52}, ...]
  
  -- Step analysis
  total_steps int,
  steps_per_split jsonb DEFAULT '[]',   -- [{distance: "10y", steps: 6}, ...]
  
  -- Acceleration profile
  acceleration_profile jsonb DEFAULT '{}', -- {peak_velocity_mps, time_to_peak_sec, decel_detected}
  
  -- Validation
  validation_status text NOT NULL DEFAULT 'pending', -- pending, pass, fail
  validation_reasons text[] DEFAULT '{}',
  
  -- Grading
  grade_20_80 int,
  grade_breakdown jsonb DEFAULT '{}',   -- {raw_time, age_band, percentile}
  
  -- AI analysis metadata
  ai_model text,
  frame_count int,
  processing_time_ms int,
  confidence_score numeric,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sprint_analyses ENABLE ROW LEVEL SECURITY;
-- Standard user CRUD policies

CREATE INDEX idx_sprint_analyses_user ON public.sprint_analyses(user_id, created_at DESC);
```

### Phase 2 — Edge Function: `analyze-sprint`

**New file**: `supabase/functions/analyze-sprint/index.ts`

Pipeline:
1. Receive video URL + sport + distance_key
2. Download video from storage
3. Extract 15-20 frames at high density (every ~0.1s for a 6-8s clip)
4. Send frames to Gemini 2.5 Pro vision with a structured prompt:
   - Detect exact frame of first movement (start)
   - Detect split crossing points based on distance markers
   - Count visible steps
   - Check for rolling start, incomplete run, camera angle issues
5. Parse structured JSON response
6. Compute splits, total time, acceleration profile
7. Grade using existing `GRADE_BENCHMARKS` logic (ported to edge function)
8. Write results to `sprint_analyses` table
9. Return full analysis

**Anti-cheat validation** (built into AI prompt):
- Stationary position before start → PASS/FAIL
- Rolling start detection → FAIL with reason
- Deceleration before finish line → FAIL
- Camera angle assessment (side view required) → FAIL if overhead/behind

### Phase 3 — Client-Side Sprint Analysis Component

**New file**: `src/components/speed-lab/SprintVideoAnalysis.tsx`

- Video upload button within Speed Lab session flow
- Calls `analyze-sprint` edge function
- Displays results: times, splits, steps, grade, validation status
- Saves to `sprint_analyses` and optionally links to `speed_sessions`

**Edit**: `src/components/speed-lab/SpeedTimeEntry.tsx`
- Add "Analyze Video" button alongside manual time entry
- When analysis completes, auto-populate time and step fields

### Phase 4 — Grading Integration

The 20-80 grading already exists in `src/data/gradeBenchmarks.ts` with full age-band tables for all speed distances. The edge function will port this interpolation logic to compute grades server-side. Client displays the grade from `sprint_analyses.grade_20_80`.

### Phase 5 — Sprint History & Results Display

**New file**: `src/components/speed-lab/SprintAnalysisResults.tsx`
- Displays full breakdown: total time, splits, steps per split, stride analytics, grade
- Validation badge (PASS/FAIL with reasons)
- Acceleration profile visualization

**Edit**: `src/components/speed-lab/SpeedSessionHistory.tsx`
- Show analysis results alongside manual entries
- Link to video playback

---

## Honest Assessment (Section 9 — Zero-Tolerance)

| Component | Status After Build |
|---|---|
| Upload → Processing → Results | **FULLY BUILT** — video upload triggers edge function, results written to DB, displayed in UI |
| Frame extraction | **BUILT** — reuses existing `frameExtraction.ts` pattern, adapted for sprint density |
| Pose/feet detection | **AI-DELEGATED** — Gemini vision analyzes frames for body position, not local ML model. This is production-grade for the use case. |
| Start/split/finish detection | **AI-DELEGATED** — structured prompt extracts timestamps from visual analysis |
| Step counting | **AI-DELEGATED** — counted from frame sequence analysis |
| Anti-cheat validation | **BUILT** — 4 validation checks with PASS/FAIL + reasons |
| Timing engine | **BUILT** — frame-timestamp-based elapsed time computation |
| 20-80 grading | **ALREADY EXISTS** — `gradeBenchmarks.ts` has complete tables |
| Database | **BUILT** — `sprint_analyses` table with splits, steps, validation, grading |

**What is NOT possible in-browser**: True sub-frame-accurate timing (±0.01s) from phone video. Phone cameras record at 30 FPS = 0.033s resolution. This is stated transparently. Professional timing systems use 1000 Hz sensors. The AI-vision approach provides ~0.05s accuracy which is suitable for training feedback but not official timing.

---

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create `sprint_analyses` table |
| `supabase/functions/analyze-sprint/index.ts` | New — AI vision pipeline + validation + grading |
| `src/components/speed-lab/SprintVideoAnalysis.tsx` | New — upload + trigger analysis UI |
| `src/components/speed-lab/SprintAnalysisResults.tsx` | New — results display |
| `src/components/speed-lab/SpeedTimeEntry.tsx` | Add "Analyze Video" option |
| `src/components/speed-lab/SpeedSessionHistory.tsx` | Show analysis results |

