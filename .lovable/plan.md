# Game IQ — Accurate Default Positions + Admin Alignment Editor

## Problem
Defensive starting positions in Game IQ are hard-coded in `src/components/iq/IqDiamond.tsx` (`HOME_POS`). They don't match real baseball/softball alignments, aren't tunable per sport, and every scenario animates *from* those wrong starts — which is why plays look off. There is no way for you (the owner) to correct them without a code change, and there is no concept of situational alignments (double play depth, no-doubles, corners in, shift, etc.).

## Goal
1. You (owner) can visually drag each of the 9 defenders to their correct default spot, per sport, and save it once.
2. Scenarios can optionally reference an **alignment preset** (Standard, Double Play Depth, No Doubles, Corners In, Bunt Defense, Shift L / Shift R, Outfield Shallow / Deep) so starting positions match the situation before the play animates.
3. IqDiamond stops using hard-coded coords — it always reads the saved defaults for the current sport, then applies preset overrides, then applies per-actor `roleShifts`.

## What gets built

### 1. Storage (Lovable Cloud)
New table `iq_defensive_alignments`:
- `id`, `sport` ('baseball'|'softball'), `preset_key` (text, e.g. `standard`, `dp_depth`, `no_doubles`, `corners_in`, `bunt`, `shift_l`, `shift_r`, `of_shallow`, `of_deep`), `label`, `positions jsonb` ({ P:{x,y}, C:{x,y}, "1B":{x,y}, ... 9 positions on a 0–100 grid }), `is_default bool`, `updated_at`, `updated_by`.
- Unique `(sport, preset_key)`.
- RLS: read for `authenticated`; write only for `admin` role via `has_role`. Standard GRANTs.
- Seed one row per sport with `preset_key = 'standard'`, `is_default = true`, using best-known real alignments (baseball 90ft, softball 60ft) as a starting point — you'll then fine-tune them in the editor.

Optional column on `iq_situations` / `iq_scenarios`: `alignment_preset text null` so a scenario can pin its starting alignment (e.g. bunt-defense scenarios pin `bunt`).

### 2. Owner alignment editor — `/owner/iq/alignments`
- Sport toggle (Baseball / Softball).
- Preset dropdown (Standard, DP depth, No doubles, Corners in, Bunt D, Shift L/R, OF shallow/deep) with "New preset" and "Duplicate from Standard".
- Full-size IqDiamond with **draggable** defender dots (pointer + touch). Live x/y readout; snap-to-grid toggle (0.5% increments); numeric nudge buttons; "Reset to seed" per role.
- "Save preset" writes to `iq_defensive_alignments`. "Set as default for sport" flips `is_default`.
- Preview toggle to overlay the current preset on top of an existing scenario so you can eyeball routes.

### 3. Runtime wiring
- New hook `useDefensiveAlignment(sport, presetKey?)` → returns saved `positions` (falls back to `standard`, then to a tiny built-in constant if the network fails, so the diamond always renders).
- `IqDiamond` no longer holds `HOME_POS` for the 9 defensive roles. It accepts `defensivePositions` (from the hook) and keeps its own coords only for `R1/R2/R3/BR/BAT`.
- `IqScenarioRunner` and `GameIqSituation` resolve `alignment_preset` (scenario → situation → sport default) and pass the resulting positions into `IqDiamond`. `roleShifts` still layers on top (so a scenario like "SS cheats up the middle" stays a shift, not a new preset).
- `primary_path` points stay authored relative to the same 0–100 grid, so authored routes keep working — only the starting dot moves.

### 4. Data hygiene
- One-time seed migration inserts the 9 preset rows per sport with sensible starting coordinates.
- After you save your corrections once, all 114 scenarios inherit them automatically — no per-scenario re-authoring needed.

## Non-goals (this pass)
- Not changing scenario content, actor paths, or the quiz engine.
- Not touching `fieldGeometry.ts` (game-scoring canvas is a separate surface).
- Not exposing the editor to non-admin users.

## Technical notes
- Coordinate system stays the existing 0–100 grid where y=100 is home, y=0 is the CF wall — no math changes downstream.
- Drag uses pointer events on the SVG overlay; coordinates clamped to [2, 98] to match current guardrails.
- Presets are cached in React Query keyed by `(sport, presetKey)`; editor invalidates on save.
- Admin gate reuses existing `has_role(auth.uid(),'admin')` pattern; if you aren't flagged admin yet I'll add you in the same migration.

## Deliverable order
1. Migration + seed + GRANTs + RLS.
2. `useDefensiveAlignment` hook + refactor `IqDiamond` to consume it (no visible change yet, just decoupled).
3. Owner editor page + route.
4. Wire `alignment_preset` resolution into `GameIqSituation` / `IqScenarioRunner`.
5. You tune Standard for both sports; we then add the situational presets together.
