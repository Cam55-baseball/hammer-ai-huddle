
# Game IQ Alignments — Editor v2 + Range-Aware, Drastic-Shift Coverage

## Why this needs a redo
The current editor at `/owner/iq/alignments` technically works but is unusable in practice: drag handles are invisible/tiny, touch drag fights the page, there's no snap or undo, moving 4 outfielders in unison is impossible, and there's no way to see whether the defenders you moved actually cover the field. It also doesn't expose the concepts you called out — per-defender range, independent IF/OF placement, lateral vs longitudinal shifts, and truly drastic situational alignments (wheel, 1st-and-3rd D, 5-man infield, 4-man OF, no-doubles-with-corners-in, etc.).

Answering your direct questions:
- **Lateral + longitudinal:** the coordinate system already supports both (x = lateral, y = longitudinal), but the UI hides it. v2 exposes explicit "slide sideways" and "play deeper/shallower" controls per role and per group.
- **Position depends on neighbors' range:** not modeled yet. v2 adds a per-role range radius and a coverage overlay so you can *see* the gaps between SS and CF, 1B and 2B, etc., and adjust.
- **Independent OF vs IF placement:** v2 groups defenders so you can shift the whole outfield deeper/left without touching the infield, and vice-versa.
- **Drastic shifts:** partially covered today (bunt D, shift L/R, corners in, OF shallow/deep). v2 adds the missing extreme presets and lets you clone/create your own.

## What ships

### 1. New editor UX (`/owner/iq/alignments`)
- **Big, obvious drag pucks** with the position label, drop shadow, and a live x/y readout that follows the finger. Pointer + touch, `touch-action: none`, no page scroll while dragging.
- **Snap-to-grid** toggle (1% default, 0.5% fine mode) and **keyboard nudge** (arrows = 1%, shift+arrows = 5%) when a puck is selected.
- **Undo / Redo** stack per editing session, plus **Revert to saved** and **Reset to seed**.
- **Multi-select + group drag:** tap-select multiple defenders (or use "Select all OF" / "Select all IF" chips) and drag them together. Also exposes group buttons: *Shift OF ← / → / deeper / shallower*, *Shift IF ← / → / in / back*, with a step slider (1–10%).
- **Mirror L↔R** button for creating opposite-handed shifts from an existing one in one tap.
- **Compare overlay:** ghost the currently-saved positions underneath the working copy so you can see what changed.

### 2. Range + coverage model
- Add per-role `range_radius` (0–100 grid units) with sane defaults (e.g. CF 18, corner OF 14, MI 10, corners 8, P 6, C 5). Editable per preset.
- Render each defender's range as a translucent disk on the diamond; overlaps show blended color, gaps show as unshaded field. This is the "did I actually cover the field?" check you're missing.
- Coverage score chip (% of fair territory covered) updates live so you know when a drastic shift leaves a hole you didn't intend.

### 3. Situational preset library (drastic shifts included)
Seed the missing presets per sport so *every* situation the app teaches has an accurate starting frame:
- Standard, DP depth, No-doubles, Corners in, Bunt D (standard), **Wheel play (bunt)**, **1st-and-3rd defense**, **Infield in (bases loaded)**, **Guard the lines**, **Shift L / Shift R (full)**, **Half-shift L / R**, **4-man outfield**, **5-man infield**, **OF shallow / deep**, **OF no-doubles with corners in**, **Squeeze defense**.
Also expose **Duplicate preset**, **Rename**, **Delete** (owner only) so you can spin up custom ones without another migration.

### 4. Data changes (single migration)
- `iq_defensive_alignments`: add `range_radii jsonb` (per-role radius map, nullable) and allow user-created presets via existing `preset_key` uniqueness `(sport, preset_key)`.
- Seed the new preset rows for baseball + softball with initial coordinates and role-appropriate ranges. GRANTs + RLS unchanged (read = authenticated, write = admin).

### 5. Runtime consumption (no visual regression)
- `useDefensiveAlignment` already returns `positions`; extend it to also return `rangeRadii` (falls back to defaults when null) so future overlays in the athlete-facing IQ views can show coverage when relevant. Scenarios continue to resolve `alignment_preset` exactly as they do today — no change to authored `primary_path` data.

## Non-goals
- No changes to scenario content, quiz logic, or `fieldGeometry.ts` (game-scoring canvas).
- Athlete-facing coverage overlays are wired but off by default; only the editor uses them at launch.
- No new roles/actors — still the 9 defenders.

## Technical notes
- Drag layer uses a single SVG `<g>` with `pointer-events` on each puck; group drag moves selected pucks by the same delta and clamps each individually to `[2, 98]`.
- Undo stack is in-memory (last 50 states) — cheap and enough for a session.
- Range disks are pure SVG `<circle>` with `mix-blend-mode: screen`; coverage % is a Monte-Carlo sample (500 points) over fair territory computed once per state change.
- Owner-only routes stay gated by the existing `has_role(auth.uid(),'admin')` check.

## Deliverable order
1. Migration: `range_radii` column + seed the new drastic-shift presets for both sports.
2. Rewrite `IqAlignmentsEditor.tsx`: new drag layer, group controls, undo, snap, keyboard, compare overlay, coverage overlay, duplicate/rename/delete.
3. Extend `useDefensiveAlignment` to expose `rangeRadii`; leave athlete views unchanged.
4. You tune Standard for both sports, then we sweep the drastic presets together.
