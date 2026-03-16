

# Platform Fixes & System Integration Plan

## 1. Softball Pitch Type Consistency

**Current state**: `useSportConfig()` already returns the correct `pitchTypes` based on the active sport. All practice components (`RepScorer`, `BuntRepFields`, `PitchEntry`, `PitchingMicroInput`, `GameScorecard`) already use `useSportConfig().pitchTypes`. The data files are properly separated (`softballPitchTypes` vs `baseballPitchTypes`).

**Issue**: The `LiveScorebook` and `AtBatPanel` in game scoring pass `sport` as a prop but some sub-components may not be using the sport theme context. The `SportThemeContext` drives `useSportConfig`, so if a game is created as softball but the global context is baseball, pitch types will be wrong.

**Fix**:
- In `LiveScorebook.tsx` and `AtBatPanel.tsx`: Verify that `useSportConfig()` is used (not hardcoded lists). Both already use `PitchEntry` which calls `useSportConfig()` — confirmed correct.
- In `GameScorecard.tsx`: Already uses `useSportConfig().pitchTypes` — confirmed.
- Add a `SportThemeProvider` override wrapper in the game scoring flow that sets sport from the game's `sport` field, ensuring the context matches the game being scored regardless of the user's profile default.

**Files**: `src/pages/GameScoring.tsx` (wrap with sport context override), verify `src/components/game-scoring/AtBatPanel.tsx`.

---

## 2. Mound Distance Leading Zero Fix

**Current state**: `SessionConfigPanel.tsx` line 228-237 uses `<Input type="number">` with `value={pitchDistance}`. When `pitchDistance` is `0` initially or the user clears and retypes, the `Number()` conversion can produce leading zeros in display.

**Fix**:
- Change the input to use a string state for display, converting to number only on blur/submit.
- Set `defaultDistance` = `60.6` for baseball (not `60`) and `43` for softball.
- Strip leading zeros on change handler.

**File**: `src/components/practice/SessionConfigPanel.tsx`

---

## 3. Team Game Stat Synchronization

**Current state**: Games are scored via `game_plays` table. Player stats from games are not automatically synced to `performance_sessions` or player profiles.

**Fix**:
- After `completeGame()` in `useGameScoring.ts`, auto-generate a `performance_sessions` entry per player with aggregated stats (hits, at-bats, pitching stats) derived from `game_plays`.
- Add a `syncGameToPlayerStats()` function in `useGameScoring.ts` that:
  - Groups plays by batter/pitcher
  - Creates/updates `performance_sessions` rows with module='hitting'/'pitching', linking to the game
  - Invalidates analytics queries

**Files**: `src/hooks/useGameScoring.ts` (add `syncGameToPlayerStats`), `src/pages/GameScoring.tsx` (call on complete)

---

## 4. Progress Photo 12-Week Comparison

**Current state**: Photos are stored in `vault_progress_photos` with a 6-week lock. No comparison view exists.

**Fix**:
- In `VaultProgressPhotosCard.tsx`, after the "Recent Entries" section, add a "12-Week Comparison" section.
- When a new photo is saved and a photo from ~12 weeks prior exists, auto-generate a side-by-side comparison card.
- Show measurements delta (weight change, arm growth, etc.) alongside the photos.
- Use the existing `vault-photos` bucket URLs for display.

**File**: `src/components/vault/VaultProgressPhotosCard.tsx` (add comparison section)

---

## 5. Undo System for Skip/Push Day

**Current state**: Skip Day and Push Day actions in `GamePlanCard.tsx` are immediate and irreversible. The `useRescheduleEngine` has no undo capability.

**Fix**:
- Add an undo state to `useRescheduleEngine.ts`: Before each action, snapshot the affected rows. Store the snapshot in a `lastAction` ref.
- Expose `undoLastAction()` that reverses the snapshot (re-insert deleted skips, revert moved event dates).
- In `GamePlanCard.tsx`: After any Skip/Push action, show a temporary "Undo" button (visible for 15 seconds) that calls `undoLastAction()`.
- Use `toast` with an undo action button (Sonner supports `action` in toasts).

**Files**: `src/hooks/useRescheduleEngine.ts` (add snapshot + undo), `src/components/GamePlanCard.tsx` (wire undo toast)

---

## 6. Linked Sessions Reliability

**Current state**: `LiveAbLinkPanel.tsx` creates/joins links via `live_ab_links` table. `SessionConfigPanel` stores `link_code` and `linked_session_id` on `performance_sessions`. The join flow uses `maybeSingle()` which can fail silently.

**Fix**:
- Harden `LiveAbLinkPanel.tsx`:
  - Add error handling for expired/used codes
  - Auto-expire codes older than 2 hours
  - Show link status (pending/active/expired) clearly
  - On successful join, update both sessions' `linked_session_id` bidirectionally
- Add a `useLiveAbSync` hook that:
  - Watches for linked session updates via Supabase Realtime
  - When linked partner saves reps, syncs relevant data (pitch type, velocity, result) to the other session's `micro_layer_data`
- Ensure `performance_sessions` with `linked_session_id` appear in both players' session histories

**Files**: `src/components/practice/LiveAbLinkPanel.tsx` (harden), new `src/hooks/useLiveAbSync.ts` (realtime sync)

---

## Summary of All Files

| File | Change |
|------|--------|
| `src/pages/GameScoring.tsx` | Wrap with sport context override for pitch type consistency |
| `src/components/practice/SessionConfigPanel.tsx` | Fix leading zero, default 60.6 for baseball |
| `src/hooks/useGameScoring.ts` | Add `syncGameToPlayerStats()` for team stat sync |
| `src/components/vault/VaultProgressPhotosCard.tsx` | Add 12-week comparison section |
| `src/hooks/useRescheduleEngine.ts` | Add undo snapshot system |
| `src/components/GamePlanCard.tsx` | Wire undo toast after skip/push actions |
| `src/components/practice/LiveAbLinkPanel.tsx` | Harden link flow, bidirectional sync |
| `src/hooks/useLiveAbSync.ts` | **NEW** — Realtime linked session data sync |

