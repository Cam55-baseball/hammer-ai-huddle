# Game IQ — Phase 4: Situation Authoring UI + Live Voiceover + Post-Play Debrief

Phase 3 landed the mastery ladder, difficulty rungs, combo builder, and preset expansion. This phase closes the plan by turning Game IQ into a fully self-serve authoring platform and adding the live "coach in your ear" layer during playback.

## 4.1 Situation Authoring UI (`/owner/iq/situations`)

New owner page with an end-to-end drag-based authoring flow — no SQL required.

- **Setup panel**: sport, base alignment (from `iq_defensive_alignments`), runners/outs/count, batter side, difficulty rung (1–5), concept tag multi-select (from `iq_concept_tags`), title/slug/summary/debrief text.
- **Defender canvas**: reuses `IqField` as the draw surface. For each of the 9 defenders:
  - Drag to set the resolved set position (writes into `iq_situation_actors.set_x/set_y`).
  - Click sequential points along the play to add waypoints (`primary_path` jsonb, each with `{x, y, t?}`; `t` auto-computed by arc-length, editable in a side sheet).
  - Inline inputs for `assignment`, `footwork_cue`, `communication_call`, `eyes_target`, `coaching_note`, `common_mistake`, `elite_cue`.
- **Ball track**: click-to-add points; `t` values auto-spaced, editable. Writes to `iq_scenarios.ball_track`.
- **Live preview**: right-side pane runs the exact same `IqDiamond` + `IqPlaybackControls` the athlete sees — scrubbable, with coach overlays.
- **Save**: creates `iq_situations` (status `draft`), `iq_situation_actors`, `iq_situation_concepts` link rows, and a default `iq_scenarios` row. Publish is a separate action (existing publish checklist).

## 4.2 Live Coaching Voiceover

Wire the already-shipped `useIqVoiceover` hook (Phase 3) into the actual playback loop.

- **Trigger**: subscribe to timeline events in `IqDiamond`; when a defender's footwork cue chip or comm bubble becomes visible at time `t`, enqueue an utterance:
  - Footwork → third-person ("Shortstop: crossover, gain ground toward second").
  - Comm → first-person quote of `communication_call` ("I got two!").
  - Eyes → skipped (visual only).
- **Toggle**: extend `IqOverlayFilterBar` with a persistent "🔊 Voice" toggle stored in `localStorage` (`iq.voice.enabled`).
- **Sync with scrub**: cancel pending utterances on pause/scrub so voice never runs ahead of the timeline.
- **Fallback**: silent no-op when `window.speechSynthesis` is unavailable.

## 4.3 Post-Play Debrief

- After a correct answer in `IqScenarioRunner`, and after "Watch the play" completes, render a debrief card:
  - Concept name(s) + short "why" (from `iq_situations.debrief`).
  - Per-defender one-liner (assignment + elite cue) rendered from actors.
  - "Next rung" prompt: link to the next-difficulty situation in the same primary concept, computed via the ladder hook.
- If `debrief` is null, fall back to a generated summary from the concept description + top elite cues.

## Technical Details

- **Files (new)**:
  - `src/pages/owner/IqSituationsAuthoring.tsx` — the authoring page.
  - `src/components/iq/authoring/IqDefenderPositionEditor.tsx` — drag + waypoints on `IqField`.
  - `src/components/iq/authoring/IqBallTrackEditor.tsx` — ball path click-to-add.
  - `src/components/iq/authoring/IqActorCueForm.tsx` — per-defender cue inputs.
  - `src/components/iq/IqDebriefCard.tsx` — post-play debrief.
- **Files (edited)**:
  - `src/App.tsx` — register `/owner/iq/situations` route.
  - `src/components/iq/IqDiamond.tsx` — call `useIqVoiceover` at cue-visible timeline events.
  - `src/components/iq/IqCoachOverlay.tsx` — add "Voice" toggle to `IqOverlayFilterBar`.
  - `src/components/iq/IqScenarioRunner.tsx` — render `IqDebriefCard` on reveal + on Watch-the-Play completion.
  - `src/pages/owner/IqAlignmentsEditor.tsx` — add nav link to the new authoring page.
- **Schema**: no new tables. Uses `iq_situations.debrief` (already added in Phase 3), `iq_situation_actors` (set_x/set_y/footwork_cue/eyes_target/primary_path already exist), `iq_scenarios.ball_track` (already exists), and `iq_situation_concepts` (already exists).
- **Constitutional**: authoring writes as `status='draft'` so the existing publish flow gates production content — matches the `bulkImport.ts` precedent and Phase 3 combo governance.
- **Out of scope** (Phase 5 backlog): multiplayer coach-led playback, MP4 overlays, AI-generated situations from scouting dossiers.
