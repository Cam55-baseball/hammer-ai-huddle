

# Implementation Plan: Video Tagging, Pitching Sources, Fielding Quality, Hitting Spin, and UI Cleanup

## Overview
Five interconnected changes: (1) video upload system for practice sessions, (2) new pitching practice type, (3) fielding quality metrics, (4) hitting spin direction expansion, (5) practice hub UI streamlining.

---

## 1. Universal Video Upload + Rep Tagging

### Database Migration
Create a `session_videos` table:
```sql
CREATE TABLE public.session_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.performance_sessions(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  filename text,
  duration_ms integer,
  tagged_rep_indexes integer[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.session_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own session videos"
  ON public.session_videos FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches can view athlete videos"
  ON public.session_videos FOR SELECT TO authenticated
  USING (
    public.is_linked_coach(auth.uid(), user_id)
    OR public.is_org_coach_or_owner(auth.uid(), (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = session_videos.user_id LIMIT 1
    ))
  );
```

### New Component: `SessionVideoUploader.tsx`
- Upload button and camera record button using `<input type="file" accept="video/*" capture="environment">`
- Upload to `videos` storage bucket under `session-clips/{user_id}/{session_id}/`
- After upload, show thumbnail with rep tagging interface (multi-select checkboxes for logged reps)
- Save entries to `session_videos` table with `tagged_rep_indexes`
- Display uploaded videos as a scrollable strip below the rep feed

### Integration Points
- Add `SessionVideoUploader` to `PracticeHub.tsx` in the `build_session` step, between the rep scorer and voice notes
- Pass `reps` array for tagging, `sessionId` after save (or use optimistic local state)
- Videos persist through Data Freeze Mode (no deletion on unsubscribe — same RLS, read-only enforced at UI level)

---

## 2. Pitching: Add "Flat Ground vs Hitter"

### RepSourceSelector.tsx
Add to `PITCHING_SOURCES` under the "Mound" group:
```ts
{ value: 'flat_ground_vs_hitter', label: 'Flat Ground vs Hitter', desc: 'Flat ground with live hitter' }
```

Add to `VALID_PITCHING_SOURCES`:
- `solo_work`: add `'flat_ground_vs_hitter'`
- `team_session`: add `'flat_ground_vs_hitter'`

Add `'flat_ground_vs_hitter'` to:
- `REQUIRES_PITCH_TYPE` (needs pitch type tracking)
- `REQUIRES_THROWER_HAND` is N/A for pitching but add hitter side support

### RepScorer.tsx (Pitching section)
When `repSource === 'flat_ground_vs_hitter'`:
- Show Hitter Side (L/R) selector (same as `live_bp`/`game`)
- Show pitch result options including `'hit'` and `'out'`
- Show contact type selector: `{ value: 'swing_miss', label: 'Swing & Miss' }, { value: 'foul', label: 'Foul' }, { value: 'weak_contact', label: 'Weak Contact' }, { value: 'hard_contact', label: 'Hard Contact' }`

Update `PITCHING_ALWAYS_VELO` to include `'flat_ground_vs_hitter'`.

### Edge Function: `calculate-session/index.ts`
Add `'flat_ground_vs_hitter'` as a recognized rep source. Keep it separate from bullpen analytics — it should be tagged as `evaluation_type: 'hybrid'` in composite index calculations.

---

## 3. Fielding: Performance Quality Questions

### ScoredRep Interface (`RepScorer.tsx`)
Add three new fields:
```ts
route_efficiency?: 'routine' | 'plus' | 'elite';
play_probability?: 'routine' | 'plus' | 'elite';
receiving_quality?: 'poor' | 'average' | 'elite';
```

### RepScorer.tsx (Fielding section)
Add three `SelectGrid` blocks after the existing "Fielding Result" field (always visible, not advanced-only):

1. **Route Efficiency**: Routine / Plus / Elite
2. **Play Probability**: Routine / Plus / Elite  
3. **Receiving Quality**: Poor / Average / Elite

### ENGINE_CONTRACT.ts
Add FQI modifiers:
```ts
route_efficiency: { routine: 0, plus: 3, elite: 6 },
play_probability: { routine: 0, plus: 3, elite: 6 },
receiving_quality: { poor: -3, average: 0, elite: 5 },
```

### Edge Function Update
Add the three new fields to `validateMicroRep` validation and to the FQI calculation in `calculate-session/index.ts`.

---

## 4. Hitting: Spin Direction Expansion

### Current State
Spin direction exists in pitching advanced mode only with options: `topspin`, `backspin`, `sidespin`.

### Changes

**RepScorer.tsx** — Move spin direction to the **hitting** section (advanced mode). Add it after "Batted Ball Type":
```ts
options: [
  { value: 'topspin', label: 'Topspin' },
  { value: 'backspin', label: 'Backspin' },
  { value: 'knuckle', label: 'Knuckle' },
  { value: 'backspin_tail', label: 'Backspin Tail' },
]
```

Keep it in pitching too with same expanded options.

**Edge Function** — Update `VALID_SPIN_DIRECTIONS` to include `'knuckle'` and `'backspin_tail'`.

**ENGINE_CONTRACT.ts** — Update `spin_direction` weights:
```ts
spin_direction: { topspin: -2, backspin: 3, knuckle: 0, backspin_tail: 4 }
```

---

## 5. Practice Hub UI Cleanup

### Layout Restructuring in `PracticeHub.tsx` (build_session step)
Reorganize the session logging view into a cleaner structure:

**Top**: `SessionConfigBar` (existing — config summary HUD)

**Main Area**: Rep scorer with progressive reveal (existing quick/advanced toggle)

**Bottom Sticky**: 
- Quick action bar with "Add Video" button and rep counter summary
- The "Save Session" button

### Remove Clutter
- The "Voice Notes" section should collapse into the "Override session defaults" accordion to reduce visual noise
- Remove duplicate label text where icons already convey meaning

---

## File Change Summary

| File | Change |
|------|--------|
| DB Migration | Create `session_videos` table with RLS |
| `src/components/practice/SessionVideoUploader.tsx` (new) | Video upload/record + rep tagging UI |
| `src/components/practice/RepSourceSelector.tsx` | Add `flat_ground_vs_hitter` to pitching sources |
| `src/components/practice/RepScorer.tsx` | Add fielding quality fields, hitting spin direction, flat ground vs hitter pitching fields |
| `src/pages/PracticeHub.tsx` | Integrate video uploader, streamline layout |
| `src/data/ENGINE_CONTRACT.ts` | Add fielding quality weights, expand spin direction weights |
| `supabase/functions/calculate-session/index.ts` | Validate new fields, add FQI modifiers, hybrid eval type |
| `src/hooks/usePerformanceSession.ts` | Update micro rep type to include new fields |
| `src/hooks/useMicroLayerInput.ts` | Update MicroLayerData type for new fields |

