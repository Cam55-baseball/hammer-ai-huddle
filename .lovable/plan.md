

# Practice Data Integrity Upgrade: Live AB Parity, Goal Optional, Source Restoration, Context Engine

## Issues Found

1. **Pitching Live ABs** — `VALID_PITCHING_SOURCES.live_abs` only allows `['live_bp']`. The RepScorer pitching section shows all bullpen fields (pitch type, velocity, spot intent, location, command, spin, ABS guess) but lacks **Live AB-specific hitter tracking** (swing result, contact type, ball-in-play result). Currently `flat_ground_vs_hitter` has a `contact_type` field — Live ABs need the same plus more.

2. **"Goal of Rep" is mandatory** — In `PracticeHub.tsx` lines 96-98, `goalOfRepValid` requires `length > 0` and `sessionAIFieldsValid` blocks save. The save button is disabled and shows "Fill Goal & Outcome" when empty.

3. **Hitting rep sources for `live_abs`** — Only `['live_bp', 'regular_bp']` allowed. Missing tee, soft_toss, front_toss, flip, coach_pitch, machine_bp.

4. **No context appropriateness engine** — All fields show regardless of module/position/sport. Spin direction shows for hitting AND pitching (duplicate). Catcher fields show in fielding when position=C but not contextually gated by module.

---

## Plan

### 1. Pitching Live ABs — Full Bullpen Parity + Hitter Tracking

**`RepSourceSelector.tsx`**: Add `bullpen` to `VALID_PITCHING_SOURCES.live_abs`:
```typescript
live_abs: ['live_bp', 'bullpen'],
```

**`RepScorer.tsx`**: In the pitching section, when `repSource` is `live_bp` (Live ABs context), add hitter tracking fields AFTER existing bullpen fields:
- Hitter Side (already exists for `live_bp`)
- **Swing Result**: Take / Swing & Miss / Foul / In Play (new field)
- **Contact Type**: already exists for `flat_ground_vs_hitter` — extend to `live_bp`
- **Ball In Play Result**: Single / Double / Triple / HR / Out / FC / Error (new field)
- **At-Bat Outcome**: Strikeout / Walk / HBP / In Play (new field)

New `ScoredRep` fields:
```typescript
live_ab_swing_result?: 'take' | 'swing_miss' | 'foul' | 'in_play';
live_ab_ball_result?: string;
live_ab_outcome?: string;
```

These fields appear ONLY when `isPitching && repSource === 'live_bp'`. All existing bullpen fields (pitch type, velocity, spot intent, location, command grade, spin, ABS guess) remain intact.

### 2. Goal of Rep — Make Optional

**`PracticeHub.tsx`**:
- Line 96: Change `goalOfRepValid` to always `true` (or remove validation)
- Line 98: Change `sessionAIFieldsValid` to not require goal/outcome
- Lines 416-434: Change label from "Required" to "Optional" and remove `required` prop
- Line 441: Remove the "Fill Goal & Outcome" warning
- Line 447: Remove `!sessionAIFieldsValid` from disabled condition
- Lines 202-204: Remove the save-blocking toast for missing AI fields

Both fields remain in UI, still attached to session data if filled, but no longer block save.

### 3. Hitting Rep Sources — Restore Full Options for Live ABs

**`RepSourceSelector.tsx`**: Update `VALID_HITTING_SOURCES.live_abs`:
```typescript
live_abs: ['tee', 'soft_toss', 'machine_bp', 'front_toss', 'flip', 'coach_pitch', 'live_bp', 'regular_bp'],
```
This matches `solo_work` sources, giving full access in Live AB mode.

### 4. Context Appropriateness Engine

**New file: `src/data/contextAppropriatenessEngine.ts`**

Exports a function `getContextFields(module, position, sport, sessionType, repSource)` that returns which field groups are visible:

```typescript
interface ContextFieldVisibility {
  showSpinDirection: boolean;
  showContactType: boolean;
  showCatcherFields: boolean;
  showInfieldRepType: boolean;
  showPlayDirection: boolean;
  showThrowFields: boolean;
  showLiveAbHitterFields: boolean;
  showApproachQuality: boolean;
  showBattedBallType: boolean;
  showSwingIntent: boolean;
  showCountSituation: boolean;
}
```

Rules:
- `showSpinDirection`: Only in pitching (remove from hitting advanced — it's a pitcher metric, hitters don't assess spin direction)
- `showCatcherFields`: Only when `module === 'fielding' && position === 'C'` OR `module === 'catching'`
- `showInfieldRepType`: Only `module === 'fielding'` AND position in P/1B/2B/3B/SS
- `showPlayDirection`: Only `module === 'fielding'`
- `showThrowFields`: `module === 'fielding' || module === 'catching' || module === 'throwing'`
- `showContactType`: Pitching with `flat_ground_vs_hitter` or `live_bp`
- `showLiveAbHitterFields`: `isPitching && repSource === 'live_bp'`

**Founder-Mandated Fields** (protected, cannot be removed):
- Execution Score, Pitch Location, ABS Guess, Pitcher Spot Intent, Swing Decision, Contact Quality, Exit Direction, Pitch Type, Velocity Band, Thrower Hand, Batter Side, Tee Depth Zone, all catcher metrics (pop time, transfer, throw base), all throw tracking fields, infield rep type, play direction

**`RepScorer.tsx`**: Import and use the engine to conditionally render field groups. Remove duplicate spin direction from hitting advanced section (lines 900-914).

### 5. Throw "Dot" Definition

**`FieldingThrowFields.tsx`**: Update the `dot` option description:
```typescript
{ value: 'dot', label: '💎 Dot' } // Already has this label
```
Add a title/tooltip: `"Perfect throw — ideal trajectory, on-line, no adjustment needed by receiver"`

In the engine contract or analytics layer, `dot` maps to the highest quality grade (1.0 multiplier).

### 6. Files to Modify

| File | Changes |
|------|---------|
| `src/components/practice/RepSourceSelector.tsx` | Expand `live_abs` sources for hitting and pitching |
| `src/components/practice/RepScorer.tsx` | Add Live AB hitter fields for pitching; remove hitting spin direction; integrate context engine; add new ScoredRep fields |
| `src/pages/PracticeHub.tsx` | Make Goal of Rep and Actual Outcome optional |
| `src/components/practice/FieldingThrowFields.tsx` | Add tooltip for "Dot" definition |

### 7. New File

| File | Purpose |
|------|---------|
| `src/data/contextAppropriatenessEngine.ts` | Module/position/sport field visibility rules |

