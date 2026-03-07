

# Single Player Game Rebuild + Defensive Fixes + UI Corrections

## Issues Identified from Code Review

### 1. Single Player Flow — Actually Works but Inning Logic is Wrong
The single player lineup is correctly 1 player (GameSetupForm line 231-237). `currentBatterIndex % activeLineup.length` cycles back to index 0 correctly. **However**, the system hardcodes `currentHalf = 'bottom'` on init (line 124) and only shows AtBatPanel when `currentHalf === 'bottom'` (line 490). This means:
- Top of 1st is always skipped
- No Home/Away concept exists
- Defense can only be logged during opponent's half (top), but there's no mechanism to log defensive plays separately

### 2. Strikeout Auto-Detection — Missing Entirely
PitchEntry logs pitches but AtBatPanel never checks if 3 strikes have been reached. The user must manually select "K" as outcome even after 3 strikes are logged.

### 3. No Batter/Pitcher Hand — Missing from Setup & AtBat
No handedness fields exist in GameSetupForm or AtBatPanel.

### 4. No Video+Logging Mode — GamePlay interface has `video_id`, `video_start_sec`, `video_end_sec` fields but no UI to use them.

### 5. Venue/Date Overlap — GameSetupForm line 311-319, both in `grid-cols-2` but may overlap on mobile.

### 6. Pitcher (P) removed from InfieldRepTypeFields — line 51 exports `['1B', '2B', '3B', 'SS']`, needs `'P'` added back.

---

## Plan

### A. GameSetupForm — Add Home/Away + Batter Hand + Pitcher Hand + Video Mode

**File: `src/components/game-scoring/GameSetupForm.tsx`**

1. Add `homeAway` state: `'home' | 'away'` with selector buttons (like Real/Practice toggle)
2. Add `batterHand` state for single player: `'right' | 'left' | 'switch'`
3. Add `videoMode` boolean toggle: "Video + Logging" mode
4. Pass `home_or_away`, `batter_hand`, `video_mode` through `GameSetup` interface
5. Fix Venue/Date grid: Change from `grid-cols-2` to responsive `grid-cols-1 sm:grid-cols-2` with proper spacing

**File: `src/hooks/useGameScoring.ts`**
- Add `home_or_away`, `batter_hand`, `video_mode` to `GameSetup` interface

### B. LiveScorebook — Fix Inning Logic + Single Player Defense Logging

**File: `src/components/game-scoring/LiveScorebook.tsx`**

1. **Home/Away inning fix**: Initialize `currentHalf` based on `home_or_away`:
   - Away team bats in `top`, defends in `bottom`
   - Home team bats in `bottom`, defends in `top`
   - Replace hardcoded `'bottom'` with dynamic value

2. **Single player batting half**: Show AtBatPanel when it's the player's batting half (not hardcoded to `bottom`)

3. **Single player defense logging**: When it's the opponent's batting half, show a lightweight "Defensive Play Logger" instead of `OpponentScoringPanel` alone. This allows logging defensive actions during opponent's half.

4. **Inning transition fix**: When 3 outs in player's batting half → switch to opponent half. When opponent half ends → advance inning properly based on home/away.

5. **Add pitcher hand input**: Next to "Who's pitching to you?" add a R/L toggle for pitcher hand

### C. AtBatPanel — Auto-Strikeout + Batter/Pitcher Hand

**File: `src/components/game-scoring/AtBatPanel.tsx`**

1. **Auto-strikeout**: After each pitch logged, check if strikes >= 3. If so, auto-set `outcome = 'strikeout'` (swinging if last pitch was swinging_strike, looking if called_strike). Show a brief toast/indicator.

2. **Auto-walk**: Similarly, if balls >= 4, auto-set `outcome = 'walk'`.

3. **Add `batterHand` and `pitcherHand` props**: Display as small badges in the header. Store in `situational_data`.

4. **Gentle detail prompts**: After outcome is selected, show a subtle "Add more detail?" nudge if no advanced fields are filled (contact quality, spray direction, etc.)

### D. Video + Logging Mode

**File: `src/components/game-scoring/LiveScorebook.tsx`**

When `videoMode` is true:
1. Show a video player area at the top (file upload or URL input)
2. Add "Pause & Log" button that captures current video timestamp
3. Each logged play stores `video_start_sec` from the pause point
4. Store video reference in `video_id` field

New component: `src/components/game-scoring/GameVideoPlayer.tsx`
- Simple HTML5 video player with upload support
- Pause/resume controls
- Current timestamp display
- "Log This Play" button that passes timestamp to AtBatPanel

### E. InfieldRepTypeFields — Add P Back

**File: `src/components/practice/InfieldRepTypeFields.tsx`**
- Line 51: Change `['1B', '2B', '3B', 'SS']` to `['P', '1B', '2B', '3B', 'SS']`

### F. Field Diagram Polish

**File: `src/components/game-scoring/FieldPositionDiagram.tsx`**

The diagram was already rebuilt with 500x500 viewBox and proper geometry. Minor remaining fixes:
- Add position labels (small text) at each defensive zone for orientation
- Slightly increase foul territory visibility
- Add grass stripe pattern (alternating green shades) for visual richness

---

## Files Modified

| File | Changes |
|------|---------|
| `GameSetupForm.tsx` | Home/Away selector, batter hand, video mode toggle, fix date/venue overlap |
| `useGameScoring.ts` | Add `home_or_away`, `batter_hand`, `video_mode` to GameSetup |
| `LiveScorebook.tsx` | Dynamic batting half based on home/away, single player defense logging, pitcher hand input, video mode integration |
| `AtBatPanel.tsx` | Auto-strikeout/walk detection, batter/pitcher hand props, detail nudge |
| `GameVideoPlayer.tsx` | New component — video player with timestamp capture |
| `InfieldRepTypeFields.tsx` | Add 'P' to INFIELD_POSITIONS |
| `FieldPositionDiagram.tsx` | Position labels, visual polish |
| `GameScoring.tsx` | Pass new setup fields through to LiveScorebook |

No database changes needed — all new fields fit within existing JSONB columns (`situational_data`, `defensive_data`) and the `games` table already stores `lineup` as JSONB.

