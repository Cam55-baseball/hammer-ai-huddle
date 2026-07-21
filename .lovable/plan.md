# Phase 4 — Honest Completeness Audit

Phase 4 is ~85% shipped. The core is live: `/owner/iq/situations` authoring page (532 lines) with defender drag, waypoints, ball track, live preview, and draft save; coach voiceover hook wired into the runner with a localStorage-persisted "Voice" toggle; debrief text + concept chips render inline on correct answer; route + `GameIq` nav button registered.

Five items from the original plan are not yet done. To call this "E2E with extreme mastery" we need to close them.

## Gaps to close

1. **`IqDebriefCard.tsx` extraction + "Next rung" prompt**
   - Debrief is currently inline in `IqScenarioRunner.tsx` (lines 382–395). Plan called for a standalone `src/components/iq/IqDebriefCard.tsx`.
   - Missing entirely: the "Next rung" link that jumps to the next-difficulty situation in the same primary concept (uses the existing ladder hook + `iq_situations.difficulty_rung` + `iq_situation_concepts`).
   - Also add the fallback summary (concept description + top elite cues) when `debrief` is null, per plan §4.3.

2. **Voice triggering on true timeline events inside `IqDiamond`**
   - `useIqVoiceover` currently fires from the runner using a progress-index heuristic (`0.1 + (idx % 6) * 0.12`), not the actor's real `start_at`/waypoint `t`. Plan §4.2 specified subscribing to timeline events in `IqDiamond` so utterances fire the instant a footwork chip / comm bubble becomes visible.
   - Rework: expose a `cueEvents: { role, kind, text, t }[]` derived from `buildTimeline` + actor cues, and drive the hook off `progress >= event.t` instead of the index heuristic. Keep the pause/scrub cancel + speak-once dedupe.

3. **Voice toggle location**
   - Plan §4.2 puts the "🔊 Voice" toggle inside `IqOverlayFilterBar`. It's currently a separate button on the runner toolbar. Move it into the filter bar so it lives with the other overlay controls (still persisted to `localStorage`).

4. **Nav link from `IqAlignmentsEditor` → authoring page**
   - Plan §Files-edited requires `src/pages/owner/IqAlignmentsEditor.tsx` to link to `/owner/iq/situations`. Currently only `GameIq.tsx` links to it. Add a header button so alignment authors can jump directly into situation authoring.

5. **Authoring subcomponents extraction (hygiene)**
   - `IqSituationsAuthoring.tsx` is 532 lines with the defender editor, ball-track editor, and cue form inlined. Plan specified splitting into:
     - `src/components/iq/authoring/IqDefenderPositionEditor.tsx`
     - `src/components/iq/authoring/IqBallTrackEditor.tsx`
     - `src/components/iq/authoring/IqActorCueForm.tsx`
   - Pure refactor, no behavior change, but required to match the stated file layout and keep the page maintainable.

## Verification after build mode

- Load `/game-iq`, run a scenario, answer correctly → `IqDebriefCard` renders with concept chips + "Next rung: <slug>" button that navigates to the next-rung situation in the same concept.
- Toggle Voice inside the overlay filter bar → utterances fire on the actual footwork/comm event times; pause/scrub cancels queued speech.
- Open `/owner/iq/alignments` → header button navigates to `/owner/iq/situations`.
- `tsgo` passes; `IqSituationsAuthoring.tsx` shrinks and imports the three extracted authoring components.

## Out of scope (unchanged from original plan)

Multiplayer coach-led playback, MP4 overlays, AI-generated situations from scouting dossiers — Phase 5 backlog.
