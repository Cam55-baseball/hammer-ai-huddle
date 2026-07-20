
## Goal

Turn the "sandlot" IQ diamond into an elite, MLB/AUSL-grade teaching field where every fielder has an exact, coach-legible spot ("7 steps toward 2B, 7 steps back from bag"), understands *why* they're there, and shifts correctly for handedness and situation.

## What changes end-to-end

### 1. Real field geometry (removes the sandlot look)
`src/components/iq/IqDiamond.tsx` gets replaced with a sport-aware SVG that renders:
- Back-of-infield dirt arc + grass cutout (per sport radius)
- Base paths, 60'/90' baselines, foul lines to fence, warning track
- Mound (60'6") or pitcher's circle (43') per sport
- Batter's boxes, catcher's box, on-deck circles, 1B/3B coach's boxes
- A **step-grid overlay** (toggleable) that shows a distance ruler when a defender is selected: "15 ft toward 2B · 10 ft back"

All coordinates come from a new `src/lib/iq/fieldModel.ts` that converts *steps from a landmark* into normalized (x,y) using each sport's real distances (already in `leagueDistances.ts`, 1 step = 2.5 ft).

### 2. Step-based, dual-input positioning model
New canonical position format for every defender:

```ts
type StepAnchor =
  | { from: '1B'|'2B'|'3B'|'HOME'; toward: '1B'|'2B'|'3B'|'HOME'|'CF'|'OUT'; steps: number; depthSteps: number }
  | { from: 'BASELINE_1B_2B'|'BASELINE_2B_3B'; lateralSteps: number; depthSteps: number }
  | { from: '2B'; lateralSteps: number; depthSteps: number }; // outfield "line up with 2B"
```

`fieldModel.ts` converts anchor → (x,y). Editor edits either the anchor (numeric inputs) OR the position (drag); they stay in sync. Each puck shows its coach-readable label:
- **3B**: "7 steps toward 2B · 7 steps back"
- **CF (vs RHH)**: "3 steps right of 2B · 60 steps back"
- **SS**: "midway 2B–3B (45 ft) · 3 steps back"

### 3. Handedness split on every preset
`iq_defensive_alignments` gets `positions_vs_rhh jsonb` and `positions_vs_lhh jsonb` (plus `anchors_vs_rhh` / `anchors_vs_lhh`). The editor has an "RHH / LHH" tab; scenario runner auto-picks the right side from the batter actor. Legacy `positions` becomes the fallback during migration.

### 4. Nine seeded situational presets (per sport, per handedness)
Owner-editable, factory-seeded with your specifications:

| Preset | Key rule (baseball defaults, softball scaled) |
|---|---|
| **Standard** | 3B 7↔7, 1B 5↔5, SS/2B 45 ft, CF 3 steps opposite of pitcher, LF/RF lined up with corner-adjacent bag |
| **DP Depth** | Middle IF 4 in / 3 back off bag; corners at 5↔5 |
| **No-Doubles** | OFs +8 steps deep, +4 steps toward foul line |
| **Corners In (bunt/squeeze)** | 1B/3B 3 steps in front of bag on grass |
| **Infield In** | All IF cut distance in half to home |
| **Guard Lines (late)** | 1B/3B hug the line (2 steps off) |
| **Shift — Pull (LHH)** | SS behind 2B, 2B in short RF |
| **Shift — Pull (RHH)** | 2B behind 2B, SS deep 5.5 hole |
| **1st-and-3rd** | Middle IF cheat toward 2B; corners at bag |
| **Wheel** | 3B charges, SS covers 3rd, 2B covers 2nd |

### 5. Scenario-driven auto-alignment
`iq_situations` already has `alignment_preset`. We add `alignment_selector` (function of runners, outs, count, batter side) so each of the 100+ scenarios auto-loads the correct preset. Owner can override per scenario.

### 6. Owner editor upgrades (`src/pages/owner/IqAlignmentsEditor.tsx`)
- RHH / LHH tabs
- Per-defender numeric step panel (anchor + toward + steps + depthSteps) alongside drag
- "Mirror to opposite hand" applies your published mirror rules
- Live coach-readable label under each puck
- Range disks + coverage % kept; recomputed per handedness

## Technical section

**New/changed files**
- `src/lib/iq/fieldModel.ts` — anchor→coord math, step→ft, per-sport scaling, label formatter
- `src/lib/iq/alignmentPresets.ts` — factory presets (9 × 2 sports × 2 handedness = 36 seed objects)
- `src/components/iq/IqField.tsx` — new realistic field SVG (replaces geometry in `IqDiamond`)
- `src/components/iq/IqDiamond.tsx` — consumes `IqField`, reads new position shape
- `src/hooks/useDefensiveAlignment.ts` — returns `{ positions, anchors, byHand(side) }`
- `src/pages/owner/IqAlignmentsEditor.tsx` — dual-input UI, RHH/LHH tabs, step panel, mirror
- `src/hooks/useIqSituations.ts` — resolves auto-selected preset per scenario context

**DB migration** (surfaced separately for approval)
```sql
ALTER TABLE public.iq_defensive_alignments
  ADD COLUMN positions_vs_rhh jsonb,
  ADD COLUMN positions_vs_lhh jsonb,
  ADD COLUMN anchors_vs_rhh   jsonb,
  ADD COLUMN anchors_vs_lhh   jsonb;

ALTER TABLE public.iq_situations
  ADD COLUMN alignment_selector jsonb; -- { default, byBatterSide, byRunners, byOuts }

-- Seed all 9 presets × 2 sports × 2 hands (upsert on (sport, preset_key))
```
Grants + RLS already exist on both tables; no new tables.

**Softball scaling**: `leagueDistances.ts` already has 60' bases / 43' circle. `fieldModel.ts` multiplies every step-anchor by `sport.baseDist / 90` so the same anchor rules render correctly for both sports.

**Back-compat**: If a preset row still has only legacy `positions`, we treat it as `positions_vs_rhh` and auto-mirror for LHH until the owner reviews it.

## Deliverable order
1. DB migration (approval gate)
2. `fieldModel.ts` + `alignmentPresets.ts` (pure logic, unit-testable)
3. `IqField.tsx` + updated `IqDiamond.tsx` (visuals)
4. Editor V3 with RHH/LHH tabs and step panel
5. Scenario auto-selection + audit that all existing situations resolve to a preset

## Out of scope (unless you say otherwise)
- Adding *new* IQ scenarios beyond the current 100+ (this plan fixes positioning; a follow-up can expand the library)
- Video overlays / AR
