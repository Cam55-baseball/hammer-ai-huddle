

# Fix 5 Critical Platform Issues

## Issue 1: Video Library Upload Failure

**Root Cause**: The storage RLS policy on the `videos` bucket requires `(storage.foldername(name))[1] = auth.uid()`, but `useVideoLibraryAdmin.ts` uploads to path `library/{randomId}.{ext}`. The first folder segment is `library`, not the user's UUID, so the INSERT is denied by RLS.

**Fix in `src/hooks/useVideoLibraryAdmin.ts`**:
- Change upload path from `library/${id}.${ext}` to `${user.id}/library/${id}.${ext}` so the first folder matches the user's auth ID, satisfying the existing storage policy.

## Issue 2: Video + Log Upload Not Loading

**Root Cause**: `VideoRepLogger.tsx` uses `URL.createObjectURL()` which works, but it lacks duration resolution for WebM blobs (duration reports as `Infinity`). The `loadedmetadata` handler only runs once and doesn't handle the WebM workaround. Also missing: scrubber, frame-by-frame controls, rewind/fast-forward.

**Fix in `src/components/practice/VideoRepLogger.tsx`**:
- Add the WebM duration resolution workaround (seek to large time, then seek back)
- Add a range input scrubber synced to `video.currentTime`
- Add frame-by-frame step buttons (±0.033s)
- Add rewind/fast-forward buttons (±5s)
- Add formatted time display (current / total)
- Add `playsInline` and `controls` attributes to video element as fallback

## Issue 3: Game Scoring Accuracy (Tex Vision)

**Root Cause**: The `calculateRunsScored` function has incorrect base-runner advancement logic:
- **Double**: Currently scores `onThird + onSecond` but doesn't score runner from first (who would typically score on a double). Should be `onThird + onSecond + onFirst` (in most cases runners on first score on a double).
- **Single/Error**: Only scores runner from third, but runner from second often scores on a single too.
- **Base runner state after hits**: After a single, runner on second should advance to third (potentially score), but code just shifts everyone up one base. After 3 outs, runners clear correctly.

**Fix in `src/components/game-scoring/LiveScorebook.tsx`**:
- Update `calculateRunsScored`:
  - **Single/Error/FC**: Score runners from third AND second (conservative but more realistic)
  - **Double**: Score runners from third, second, AND first
  - **Triple**: Score all runners (1 + totalOnBase, minus the batter who is on third)
- Update base runner advancement after hits:
  - Single: `{ first: true, second: false, third: prev.second || false }` (runner from first goes to second, runner from second goes to third — already scored)
  - Double: `{ first: false, second: true, third: false }` (all previous runners scored)
- Keep the existing sac_fly, walk/hbp, home_run logic as-is (those are correct)

## Issue 4: Recent Sessions Not Showing Contents

**Root Cause**: `RecentSessionsList.tsx` renders session cards as flat non-interactive rows. The `drill_blocks` and `notes` data is fetched but never displayed to the user.

**Fix in `src/components/practice/RecentSessionsList.tsx`**:
- Make each session card expandable (use Collapsible)
- When expanded, show:
  - Drill blocks with drill names, volumes, and outcomes
  - Session notes
  - Composite indexes (if present)
  - Module tag

## Issue 5: GameVideoPlayer Already Has Controls

The `GameVideoPlayer.tsx` already has: scrubber, frame-by-frame (ChevronLeft/ChevronRight ±0.033s), play/pause, and a "Pause & Log Play" button. The native `controls` attribute is also present. This component appears complete. The real gap is in `VideoRepLogger.tsx` (Issue 2 above).

## Files to Edit

| File | Changes |
|------|---------|
| `src/hooks/useVideoLibraryAdmin.ts` | Fix upload path: `${user.id}/library/${id}.${ext}` |
| `src/components/practice/VideoRepLogger.tsx` | Add scrubber, frame-by-frame, rewind/ff, duration fix |
| `src/components/game-scoring/LiveScorebook.tsx` | Fix `calculateRunsScored` and base runner advancement |
| `src/components/practice/RecentSessionsList.tsx` | Make sessions expandable with drill block details |

