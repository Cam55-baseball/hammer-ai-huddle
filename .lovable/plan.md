

# Fielding System Architecture Rebuild — Unified Position-Intelligent Defense Module

## Current State

The practice logging system has **5 separate modules** for defense: `fielding`, `catching`, `throwing`, plus game scoring has its own `SituationalPrompts`. This creates fragmentation:

- `fielding` module in RepScorer (lines 1343-1558): Position selector includes P and C alongside infield/outfield. Catcher fields (pop time, transfer) are inlined when position=C. No outfield-specific relay/wall play logic (that only exists in game scoring `SituationalPrompts.tsx`).
- `catching` module is completely separate (RepSourceSelector has dedicated catching sources, CatchingRepFields component, RepScorer lines 1560-1579).
- No catcher rep types like "Back Pick → 1B" in the fielding position flow — those only exist in catching rep sources.
- Outfield relay + wall play questions exist only in game scoring `SituationalPrompts.tsx`, not in practice fielding.
- No live catching pitch tracking (ABS Guess + Actual Pitch Location) in the fielding flow when C is selected.
- No pop fly direction selector for catchers in fielding.
- No tag completion input for catchers.

## Plan

### 1. Restructure Position Selector — Remove C from General List, Add Position Groups

**File: `src/components/practice/FieldingPositionSelector.tsx`**

Replace flat 9-position grid with grouped layout:

```
Infield:  [1B] [2B] [SS] [3B]
Outfield: [LF] [CF] [RF]
Catcher:  [C]  ← visually separated, own section
```

Remove `P` from the fielding position list (pitchers field through PFP in throwing module). Catcher is still selectable here but gets its own visual group and triggers completely different rep logic.

### 2. Add Outfield-Specific Fields to Practice RepScorer

**File: `src/components/practice/RepScorer.tsx`** (fielding section, ~line 1343)

Add outfield detection: `const isOutfield = ['LF', 'CF', 'RF'].includes(repFieldingPosition ?? '')`

After the existing fielding fields, when `isOutfield`:

- **Full Play Type selector**: `Fly Ball`, `Line Drive`, `Ground Ball`, `Wall Play`, `Relay` (matches game scoring)
- **Relay sub-question** (if Relay selected): "Hit Cutoff?" → `Complete` / `Incomplete` / `Elite`
- **Wall Play sub-question** (if Wall Play selected): "Played Ball Off Wall?" → `Poor` / `Well` / `Elite`

Add new ScoredRep fields: `outfield_play_type`, `relay_hit_cutoff`, `wall_play_quality`

### 3. Add Infield Relay to Practice RepScorer

**File: `src/components/practice/RepScorer.tsx`** (infield section, ~line 1450)

When infield position is selected AND play type includes a "Relay" option:

- Add `Relay` to infield play type options
- **Relay sub-question**: "Got to Correct Lineup Spot?" → `Off Line` / `Inline`

Add new ScoredRep field: `relay_lineup_spot`

### 4. Rebuild Catcher Logic Within Fielding Module

**File: `src/components/practice/RepScorer.tsx`** (where `repFieldingPosition === 'C'`, ~line 1471)

When catcher is selected, replace the current minimal catcher fields with full catcher defensive logic:

**Catcher Rep Types** (new selector, replaces generic rep source for catchers):
- `Back Pick → 1B`
- `Back Pick → 3B`
- `Throw Down → 2B`
- `Throw Down → 3B`
- `Pop Fly` (triggers direction sub-question)
- `Bunt Play → 1B`
- `Bunt Play → 3B`
- `Bunt Play → Pitcher`
- `Tag Play at Home` (triggers tag completion sub-question)
- `Live Catching` (triggers ABS Guess + Actual Pitch Location)

**Pop Fly Direction** (when Pop Fly rep type selected):
- `Backstop`, `3B Side`, `1B Side`, `Pitcher Area`

**Tag Completion** (when Tag Play selected):
- `Completed`, `Missed`, `Late`

**Live Catching Pitch Tracking** (when Live Catching selected):
- ABS Guess grid (PitchLocationGrid)
- Actual Pitch Location grid (PitchLocationGrid)

**Always-visible catcher metrics**:
- Pop Time (sec) input
- Transfer Time (sec) input

New ScoredRep fields: `catcher_rep_type`, `pop_fly_direction`, `tag_completion`, `catcher_actual_pitch_location`

**File: `src/components/practice/RepSourceSelector.tsx`** (line 127-143)

Remove catcher from `FLAT_SOURCES` catching list — catcher rep types are now handled by the position-intelligent fielding flow. Keep the `catching` module rep sources for `bullpen_receive` only (receiving pitches, not defense).

### 5. Ensure All Core Defensive Questions Appear for ALL Positions

**File: `src/components/practice/RepScorer.tsx`**

Verify these fields are visible for all defensive positions (they mostly already are, but confirm ordering):

1. Execution Score *(already universal)*
2. Goal of Rep *(already universal)*
3. Actual Outcome *(already universal)*
4. Throw Spin Quality *(advanced only — move to always-visible)*
5. Exchange Time *(advanced only — move to always-visible)*
6. Footwork Grade *(advanced only — move to always-visible)*
7. Throw Strength *(already always-visible via FieldingThrowFields)*
8. Ball Arrival Quality *(already always-visible via FieldingThrowFields)*
9. Accuracy Direction *(already always-visible via FieldingThrowFields)*
10. Throw Base *(catcher only — keep as-is)*
11. Play Direction *(already always-visible)*
12. Receiving Quality *(already always-visible)*
13. Play Probability *(already always-visible)*
14. Route Efficiency *(already always-visible)*
15. Fielding Result *(already always-visible)*
16. Batted Ball Type *(already always-visible)*
17. Exit Velocity / Hit Type Hardness *(already always-visible)*

**Key change**: Move Footwork Grade, Exchange Time, and Throw Spin Quality from `mode === 'advanced'` (lines 1515-1555) to always-visible. These are core defensive analytics fields, not optional detail.

### 6. Add Field Position Diagram to Fielding

**File: `src/components/practice/RepScorer.tsx`**

Import `FieldPositionDiagram` from `src/components/game-scoring/FieldPositionDiagram.tsx` (already exists with draggable red/green dots).

Add it as an optional collapsible section at the bottom of all fielding reps (after throw fields, before Goal of Rep):

```tsx
<Collapsible>
  <CollapsibleTrigger>📍 Mark Field Position</CollapsibleTrigger>
  <CollapsibleContent>
    <FieldPositionDiagram sport={sport} onUpdate={...} />
  </CollapsibleContent>
</Collapsible>
```

Store result in new ScoredRep fields: `field_diagram_player_pos`, `field_diagram_ball_pos`

### 7. Update ScoredRep Interface

**File: `src/components/practice/RepScorer.tsx`** (lines 29-149)

Add new fields to the `ScoredRep` interface:
```ts
// Outfield-specific
outfield_play_type?: string;
relay_hit_cutoff?: 'complete' | 'incomplete' | 'elite';
wall_play_quality?: 'poor' | 'well' | 'elite';
// Infield relay
relay_lineup_spot?: 'off_line' | 'inline';
// Catcher defense
catcher_rep_type?: string;
pop_fly_direction?: 'backstop' | '3b_side' | '1b_side' | 'pitcher_area';
tag_completion?: 'completed' | 'missed' | 'late';
catcher_actual_pitch_location?: { row: number; col: number };
// Field diagram
field_diagram_player_pos?: { x: number; y: number };
field_diagram_ball_pos?: { x: number; y: number };
```

## Files Modified

| File | Change |
|------|--------|
| `FieldingPositionSelector.tsx` | Remove P, group positions (Infield/Outfield/Catcher) |
| `RepScorer.tsx` | Add outfield fields, catcher rep types + sub-questions, move advanced fields to always-visible, add field diagram, update ScoredRep interface |
| `RepSourceSelector.tsx` | Clean up catching sources (catcher defense now in fielding) |

No database changes — all data stored in existing `drill_blocks` JSONB on `performance_sessions`.

