# Game IQ — Phase 3 & Phase 4

Building on Phase 1 (route anchoring, watch-the-play) and Phase 2 (playback engine, coach overlays, concept mastery + decay), the next phases turn Game IQ into a true mastery ladder with authoring tools that let you scale content without a developer.

## Phase 3 — Mastery Ladder, Combo Presets, Preset Library Expansion

**Goal:** Make the concept mastery data visible to athletes as a progression ladder, and give owners the authoring tools to build composite defensive presets and seed a large preset library.

### 3.1 Concept Mastery Ladder (athlete-facing)
Edit `src/pages/GameIq.tsx` to render a "Ladder" view above the scenario grid:
- Groups scenarios by `iq_concept_tags` (e.g., "Cutoffs & Relays", "Bunt Defense", "1st-and-3rd", "Pickoffs", "Rundowns", "Tag-up reads").
- Each concept row shows: mastery bar (0–100 from `iq_user_concept_mastery`), rung count (attempts / mastered), and lock badge for concepts gated behind prerequisite concepts.
- Tapping a concept expands to its situations, sorted by difficulty rung.
- Uses `fetchConcepts` + `fetchMyConceptMastery` already shipped in `src/lib/iq/concepts.ts`.

### 3.2 Difficulty Rungs
Add a `difficulty_rung` (1–5) column to `iq_situations` and surface it as rung pips on each situation card. Unlock rung N+1 for a concept once rung N reaches 70% mastery. Locked situations still previewable in "demo" mode but don't count toward attempts.

### 3.3 Combo Builder (owner-facing)
Add a "Combos" tab to `src/pages/owner/IqAlignmentsEditor.tsx`:
- Composite preset = ordered stack of base alignment + situational overrides (e.g., "Base 4-3 defense" → "Runner on 2B, no outs shift" → "LHH pull shade").
- Drag to reorder overrides; each override sees the previous stack as its baseline.
- Preview panel renders the composed result on `IqField`, with a diff view showing which defenders moved at each layer.
- Saves to a new `iq_alignment_combos` table (id, name, sport, base_alignment_id, layers jsonb, created_by).

### 3.4 Preset Library Expansion
Seed additional canonical alignments authored via the new editor:
- Infield: no-doubles depth, corners-in bunt, halfway, DP depth, guard-the-line, wheel play, first-and-third defense (3 variants).
- Outfield: no-doubles, standard, shallow (infield-assist), pull shade LHH/RHH, opposite-field shade.
- Sport-specific: softball slap-hitter shift, baseball extreme shift vs pull power.
Total target: ~25 alignments per sport.

## Phase 4 — Situation Authoring UI + Live Coaching Layer

**Goal:** Owner can author new situations end-to-end in-app (no SQL), and athletes get a live "coach in your ear" audio layer during playback.

### 4.1 Situation Authoring UI
New page `/owner/iq/situations`:
- Pick sport, base alignment, and runners/outs/count.
- For each defender: drag on the field to set the set position, then place waypoints along the play with per-waypoint `t` values.
- Author footwork/comm/eyes cues inline (attach to defender + timing window).
- Ball track authored by clicking sequential points; `t` values auto-computed from spacing but editable.
- Attach one or more `iq_concept_tags` and a `difficulty_rung`.
- Preview uses the exact same `IqDiamond` playback the athlete sees.
- Saves to `iq_situations` + `iq_situation_actors` + `iq_situation_concepts`.

### 4.2 Live Coaching Voiceover
- Use the browser's speech synthesis (free, offline) to speak coach cues in sync with playback: footwork chip appears → speak the footwork cue; comm bubble → speak the call in first-person ("I got two!").
- Toggle in `IqOverlayFilterBar` (existing component).
- Falls back silently if speech synthesis unavailable.

### 4.3 Post-Play Debrief
After "Watch the play" completes:
- Show a debrief card: what the concept was, why each defender moved where they did, and one "next rung" prompt.
- Debrief text pulled from a new `debrief` field on `iq_situations` (nullable, authored in 4.1).

## Technical Details

- **Schema additions**: `iq_situations.difficulty_rung int default 1`, `iq_situations.debrief text`, new table `iq_alignment_combos` with RLS (owner-write, all-authenticated-read + GRANTs).
- **Concept gating**: prerequisites stored as `iq_concept_tags.requires_concept_ids uuid[]`; ladder view resolves lock state client-side.
- **Combo composition**: pure client-side reduce over layers; each layer is a partial `Record<Role, PositionOverride>`.
- **Voiceover**: `window.speechSynthesis` + `SpeechSynthesisUtterance`; queued from timeline events so it stays in sync with scrub.
- **Authoring UI**: reuses `IqField` for the draw surface; waypoints stored in the same `iq_situation_actors.path` jsonb shape playback already reads.

## Out of Scope (queued for Phase 5)
- Multiplayer/coach-led synchronized playback.
- Video overlay (author-uploaded MP4 aligned to the timeline).
- AI-generated situation suggestions from opponent scouting dossiers.
