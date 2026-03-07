

# Defensive Field Diagram + Logging Logic Corrections

## Changes Required

### 1. Field Position Diagram Redesign (`FieldPositionDiagram.tsx`)

**Problem**: 400x400 square viewBox with sloppy proportions; max-width 320px is too small for mobile finger placement.

**Fix**:
- Change viewBox to 500x500 for more spatial resolution
- Use real proportional geometry: baseball basepaths 90ft, mound at 60.5ft; softball basepaths 60ft, mound at 43ft. Scale these proportionally within the SVG
- Foul lines at exact 45-degree angles from home plate (already correct via 0.707)
- Home plate as pentagon shape, not rotated square
- Mound placement: baseball at ~67% of base distance from home, softball at ~72%
- Outfield fence arc properly proportioned (baseball ~320ft, softball ~220ft)
- Add grass/dirt coloring for infield skin, outfield grass, foul territory
- Remove `max-w-[320px]` — expand to full container width (`max-w-[480px]`) so dots are easy to place on mobile
- Increase `DOT_RADIUS` from 8 to 12 for finger-friendly touch targets
- Add optional position zone highlight: when `position` prop is passed, draw a subtle shaded circle at the typical defensive position (e.g., SS between 2B and 3B)

**New prop**: `position?: string` — highlights typical zone for that position

### 2. Remove "Bunt → Pitcher" from Catcher Rep Types (`RepScorer.tsx` ~line 1567)

Remove `{ value: 'bunt_pitcher', label: 'Bunt → Pitcher' }` from catcher rep type options.

### 3. Remove "Catching" Category from Practice Hub (`PracticeHub.tsx` line 36)

Delete `{ id: 'catching', icon: Shield, label: 'Catching' }` from the modules array. Also clean up references in:
- `RepSourceSelector.tsx`: Remove `catching` from `FLAT_SOURCES` (lines 127-131)
- `RepScorer.tsx`: Remove `isCatching` logic branches — catching validation/AI description logic merges into fielding when position=C
- `HandednessGate.tsx`: Remove `catching` entry
- `SessionVideoUploader.tsx`: Remove `catching` entry
- `SchedulePracticeDialog.tsx`: Remove `catching` from module options
- `CoachScheduleDialog.tsx`: Remove `catching` from module options

### 4. Add "Diving Play" Question for All Defensive Positions (`RepScorer.tsx`)

Add new `ScoredRep` field: `diving_play?: boolean`

After Fielding Result (line ~1400), add a Yes/No toggle:
```
Diving Play: [Yes] [No]
```
Visible for all fielding positions (infield, outfield, catcher).

### 5. Remove Duplicate Batted Ball Types from Outfield Play Type (`RepScorer.tsx` ~line 1471)

Current outfield play type options include `fly_ball`, `line_drive`, `ground_ball` which duplicate `playTypeOptions` (Batted Ball Type).

**Fix**: Change outfield play type options to only:
- `Wall Play`
- `Relay`

Wait — per user requirements, Relay and Wall Play should become Yes/No questions, not play types. So remove the entire "Outfield Play Type" selector and replace with two conditional toggles.

### 6. Outfield Relay as Yes/No + Conditional (`RepScorer.tsx`)

Replace outfield relay logic. Remove `outfield_play_type` field. Add new fields:
- `relay_play?: boolean` — Yes/No toggle
- If Yes → show `relay_hit_cutoff` (Complete/Incomplete/Elite) — already exists

### 7. Outfield Wall Play as Yes/No + Conditional (`RepScorer.tsx`)

Add new fields:
- `wall_play?: boolean` — Yes/No toggle  
- If Yes → show `wall_play_quality` (Poor/Well/Elite) — already exists

### 8. Infield Relay as Yes/No + Conditional (`RepScorer.tsx`)

Currently relay shows only when `infield_rep_type === 'relay'` — but relay isn't in the infield rep type options (which are all DP variants). 

**Fix**: Add a separate Yes/No "Relay Play" toggle for infielders (same pattern as outfield). If Yes → show `relay_lineup_spot` with options renamed: `Off Line` / `Lined Up` (user wants "Lined Up" not "Inline").

### 9. Update `ScoredRep` Interface

- Add: `diving_play?: boolean`, `relay_play?: boolean`, `wall_play?: boolean`
- Remove: `outfield_play_type` (replaced by relay_play + wall_play booleans)

## Files Modified

| File | Change |
|------|--------|
| `FieldPositionDiagram.tsx` | Larger viewBox, accurate geometry, bigger dots, position zone highlight, wider container |
| `RepScorer.tsx` | Remove bunt_pitcher, add diving_play, replace outfield_play_type with relay/wall Yes/No toggles, add infield relay toggle, update ScoredRep |
| `PracticeHub.tsx` | Remove catching module |
| `RepSourceSelector.tsx` | Remove catching from FLAT_SOURCES |
| `HandednessGate.tsx` | Remove catching entry |
| `SessionVideoUploader.tsx` | Remove catching entry |
| `SchedulePracticeDialog.tsx` | Remove catching from modules |
| `CoachScheduleDialog.tsx` | Remove catching from modules |
| `InfieldRepTypeFields.tsx` | Remove 'P' from INFIELD_POSITIONS export |

