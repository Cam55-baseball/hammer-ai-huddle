

# Multi-Module Session Updates: Throwing, Baserunning, Coach Access, Velocity, and Video Rep Tagging

This is a large implementation spanning 5 major areas. Here is the exact plan.

---

## 1. THROWING SESSION OPTIMIZATION

**File: `src/components/practice/ThrowingRepFields.tsx`**

- **Remove** Exchange Time field (lines 139-146) and `exchangeOptions` constant (lines 75-79)
- **Add** "Self-Catch Quality" required SelectGrid: Bad / Decent / Good
- **Add** "Exact Throw Distance (Feet)" optional numeric Input below distance band
- **Add** "Sink" to `spinQualityOptions` array, update cols to 5
- **Add** "Effort Level" required SelectGrid: Low / Medium / High
- **Add** "Exact Velocity (MPH)" optional numeric Input

**File: `src/components/practice/RepScorer.tsx`** (ScoredRep interface)

- Remove `exchange_time_band` from ScoredRep
- Add: `self_catch_quality?: string`, `exact_throw_distance_ft?: number`, `effort_level?: string`, `exact_velocity_mph?: number`
- Update `canConfirm` validation: when throwing, require `self_catch_quality` and `effort_level`

---

## 2. BASERUNNING SESSION OPTIMIZATION

**File: `src/components/practice/BaserunningRepFields.tsx`**

- **Add** "Exact Time to Base (Seconds)" optional numeric Input below time band
- **Add** "Exact Steps to Base" optional integer Input (new field)
- **Add** "Custom" option to drill type lists (both baseball and softball)
- **Add** conditional `AITextBoxField` for "AI Drill Type Description" when `drill_type === 'custom'`, min 15 chars, required

**File: `src/components/practice/RepScorer.tsx`** (ScoredRep interface)

- Add: `exact_time_to_base_sec?: number`, `exact_steps_to_base?: number`, `ai_baserunning_drill_description?: string`
- Update `canConfirm`: if baserunning + drill_type === 'custom', require `ai_baserunning_drill_description` >= 15 chars
- Pass `sessionConfig` to `BaserunningRepFields` so it can render the AITextBoxField

---

## 3. COACH DATA ACCESS — REMOVE RESTRICTIONS

**File: `src/pages/CoachDashboard.tsx`** and related coach components

- Audit all subscription/module gating logic for coach views of player analytics
- Remove any `isSubscribed` or module purchase checks when coaches view compiled player data
- Ensure the rule: if data exists, coaches see full analytics with no prerequisite gating
- This is primarily a UI-level change — remove conditional rendering that hides analytics behind subscription checks for coach role

---

## 4. EXACT PITCH VELOCITY INPUT (Pitcher, At Bats, Live BP, Machine Mix)

**File: `src/components/practice/RepScorer.tsx`**

- Add `exact_pitch_velocity_mph?: number` to ScoredRep
- In pitching fields section: add optional numeric Input "Exact Pitch Velocity (MPH)" below velocity band (visible for live_bp, game, flat_ground_vs_hitter, and advanced mode)
- In hitting fields section: add same field when rep source is live_bp, live_abs, or game (competitive contexts)
- Field is always optional, never blocks saving

---

## 5. VIDEO + REAL-TIME REP LOGGING SYSTEM

This is the largest feature. It introduces a split-screen video player with synchronized rep marking.

### A) New Component: `VideoRepLogger.tsx`

Split-screen layout:
- **Left panel**: Video player (uploaded/recorded) with playback controls, speed adjustment
- **Right panel**: Rep logging form (existing RepScorer logic)
- User can watch video and log reps simultaneously

### B) Rep Marker System — New Component: `VideoRepMarker.tsx`

- Start/End time buttons that capture `video.currentTime`
- Creates a `RepTimeSpan` object: `{ video_id, start_time_sec, end_time_sec }`
- Visual timeline bar showing all rep markers on the video scrubber
- Click a marker to jump to that rep's clip

### C) Post-Session Self-Tagging Mode

- After a full session video is uploaded, user enters "Review & Tag" mode
- Full video plays; user creates rep markers retroactively
- Each marker opens a rep data entry form (same fields as RepScorer per module)
- Reps are saved with video binding data

### D) Database Migration

Add columns to `session_videos` table:
```sql
ALTER TABLE session_videos ADD COLUMN rep_markers JSONB DEFAULT '[]';
```

Each rep marker stored as:
```json
{
  "rep_index": 0,
  "start_time_sec": 12.5,
  "end_time_sec": 15.8,
  "locked": false
}
```

Update ScoredRep interface:
- Add `video_id?: string`, `video_start_sec?: number`, `video_end_sec?: number`

### E) Rep-to-Video Binding

- Each rep stores video_id + start/end timestamps
- Reps are retrievable, sortable, filterable by video
- On dashboard, rep badges link to their video clip segment
- Once session is finalized, rep-video bindings are locked (non-editable except by coach)

### F) Integration into PracticeHub

- Add a toggle/tab in `build_session` step: "Standard Logging" vs "Video + Log"
- When "Video + Log" is selected, render `VideoRepLogger` instead of standalone `RepScorer`
- Session save includes all video-bound rep data

---

## Updated ScoredRep Interface (All New Fields)

```typescript
// Throwing
self_catch_quality?: string;
exact_throw_distance_ft?: number;
effort_level?: string;
exact_velocity_mph?: number;

// Baserunning
exact_time_to_base_sec?: number;
exact_steps_to_base?: number;
ai_baserunning_drill_description?: string;

// Velocity (pitcher/hitting competitive)
exact_pitch_velocity_mph?: number;

// Video binding
video_id?: string;
video_start_sec?: number;
video_end_sec?: number;
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/practice/VideoRepLogger.tsx` | Split-screen video + rep logging |
| `src/components/practice/VideoRepMarker.tsx` | Timeline marker UI for start/end times |
| `src/components/practice/VideoRepReview.tsx` | Post-session review & retroactive tagging |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/practice/ThrowingRepFields.tsx` | Remove exchange time, add self-catch quality, exact distance, sink spin, effort level, exact velocity |
| `src/components/practice/BaserunningRepFields.tsx` | Add exact time, exact steps, custom drill type + AI text box |
| `src/components/practice/RepScorer.tsx` | New ScoredRep fields, validation updates, exact velocity for pitching/hitting |
| `src/pages/PracticeHub.tsx` | Video+Log mode toggle, integrate VideoRepLogger |
| `src/pages/CoachDashboard.tsx` | Remove analytics access restrictions for coaches |
| `src/components/practice/SessionVideoUploader.tsx` | Support rep_markers JSONB storage |

## Database Migration

```sql
ALTER TABLE session_videos ADD COLUMN IF NOT EXISTS rep_markers JSONB DEFAULT '[]';
```

