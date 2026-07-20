
# Elite Game IQ Overhaul — Phase 2

Phase 1 (route anchoring + "Watch the play") is live. Phase 2 upgrades the diamond into a full play-simulator, adds a coaching overlay layer, expands the alignment preset library to competitor parity, and introduces a mastery ladder tied to concept tags.

## What we're building

### 1. Play Playback Engine (timeline with ball + runners)
Today "Watch the play" animates defender routes in parallel over ~1.4s. Elite competitors show a **synchronized clock** — pitch → contact → ball flight → defender routes → runner advances → tag/out.

- New `src/lib/iq/playTimeline.ts` — resolves a scenario into a normalized 0..1 timeline with typed segments (`pitch`, `contact`, `ball_flight`, `defender_route`, `runner_advance`, `throw`, `tag`).
- Extend `iq_situation_actors` reads to include an optional `timing` field per waypoint (`{ t: 0..1 }`) plus per-actor `start_at` / `end_at`. Absent timing → auto-spaced evenly (back-compat).
- Add `ball_track` to `IqScenario` (jsonb column) — sequence of `{ x,y,t, kind: "batted"|"thrown" }` points. Renders as a distinct yellow trail with a moving ball dot.
- Rebuild `IqDiamond`'s `playing` mode to drive off the timeline: single `elapsed` state (framer-motion `useMotionValue`) that all actors + ball read from. Replaces the current per-actor keyframe hack.
- Playback controls in `IqScenarioRunner` reveal panel: Play / Pause / Scrub / 0.5×–1×–2× speed.

### 2. Coach Overlay Layer (footwork · comm · eyes)
Currently each actor has `coaching_note` / `communication_call` / `secondary_read` / `elite_cue` shown only in the hover card. Elite apps overlay these ON the field during playback.

- New `src/components/iq/IqCoachOverlay.tsx` — toggleable chips anchored to each defender that surface at the timeline moment they matter:
  - **Footwork** (drop step, crossover, rounded route) — icon + 1-line cue.
  - **Comm** — speech bubble with the exact `communication_call`.
  - **Eyes** — dashed sight-line from defender to the read target (ball, runner, cutoff).
- Overlay filter bar above the field: `All · Footwork · Comm · Eyes · Off`. Persisted in `localStorage("iq:overlay")`.
- Extend `IqActor` with optional `footwork_cue: string`, `eyes_target: IqActorRole | "ball" | "1B"…`, migrated via `jsonbMigrations` for legacy rows.

### 3. Preset Library Expansion (parity with Motion Playbook / BR Instincts)
Ship a curated set of alignment presets and route templates coach-legible in `coach-language`, seeded into `iq_defensive_alignments`:

- **Infield**: standard, DP depth, corners-in (bunt), corners-in (contact play), guard the lines, wheel (LH bunter), rotation (RH bunter), 1st-and-3rd defense (concede / cut).
- **Outfield**: standard, no-doubles, shallow (bases-loaded / infield-in combo), shift RH pull, shift LH pull, tag-up depth (R3, <2 outs).
- **Situational combos** (compose infield × outfield): "bases-loaded, tie run at 3rd, 1 out" auto-composes corners-in + shallow OF.

Owner tool at `/owner/iq/alignments` gains a **Combo Builder** tab: pick infield preset + OF preset + situational tag, preview on `IqField`, save as a composite.

### 4. Difficulty Ladder / Progression
Today difficulty is a flat `intro | core | advanced | elite` string. Add a **progression graph** — each situation lists prerequisite concept tags, unlocked once mastery ≥ threshold.

- New table `iq_concept_tags` (id, sport, key, label, description) + `iq_situation_concepts` (situation_id, concept_id).
- `iq_user_progress` gains derived rollup view `iq_user_concept_mastery` (avg mastery across situations touching a concept).
- Library page groups situations into ladders per lens; locked rungs show "unlock by mastering: X, Y".
- Wire `useIqSituations` to also fetch concept mastery so the UI can render lock state.

### 5. Concept-Tag Mastery Decay
Extend spaced-repetition to concept level: if a user hasn't touched a concept in N days, decay concept mastery by 5%/week (visible on the ladder as a fading ring). Nightly cron `iq-decay` edge function.

## Technical details

**Files created**
- `src/lib/iq/playTimeline.ts` — timeline resolver + interpolation helpers.
- `src/components/iq/IqCoachOverlay.tsx` — overlay chips + sight lines.
- `src/components/iq/IqPlaybackControls.tsx` — play/pause/scrub/speed.
- `src/lib/iq/concepts.ts` — concept lookup + mastery aggregation.
- `supabase/functions/iq-decay/index.ts` — nightly concept decay job.

**Files modified**
- `src/components/iq/IqDiamond.tsx` — timeline-driven `playing`, ball track, overlay slots.
- `src/components/iq/IqScenarioRunner.tsx` — playback controls, overlay filter, timeline scrubber.
- `src/pages/GameIqSituation.tsx` — pass ball_track + timeline into diamond; overlay toggle.
- `src/pages/GameIQ.tsx` (library) — ladder rendering, lock badges.
- `src/pages/owner/IqAlignmentsEditor.tsx` — Combo Builder tab.
- `src/lib/iq/types.ts` — `IqPathPoint.t?`, `IqActor.footwork_cue?/eyes_target?`, `IqScenario.ball_track?`, `IqConcept`, `IqSituationConcept`.
- `src/lib/jsonbMigrations.ts` — register migrations for actor/scenario payload shape v2.

**Migrations** (schema-only, additive, with GRANTs)
1. `alter table iq_situation_actors add column footwork_cue text, add column eyes_target text;`
2. `alter table iq_scenarios add column ball_track jsonb;`
3. `create table iq_concept_tags(id uuid pk, sport text, key text, label text, description text)` + GRANT.
4. `create table iq_situation_concepts(situation_id uuid fk, concept_id uuid fk, weight int default 1, primary key(situation_id, concept_id))` + GRANT.
5. `create view iq_user_concept_mastery` (security-invoker view over `iq_user_progress` × `iq_situation_concepts`).

**Cron**: schedule `iq-decay` daily at 04:00 UTC via `supabase/config.toml`.

**Backwards compatibility**: All new fields optional; existing 114 situations render unchanged. Timeline auto-spaces routes when `t` absent; ball_track omitted → no ball rendered.

## Sequencing
1. Timeline resolver + ball track (foundation everything else builds on).
2. Playback controls in the runner reveal panel.
3. Coach overlay layer with filter bar.
4. Preset library expansion + Combo Builder.
5. Concept tags + ladder + decay cron.

## Out of scope (queued for Phase 3)
- Multi-scenario branching ("what if the runner rounds hard?").
- Video-linked scenarios (upload → auto-place ball_track).
- Head-to-head IQ battles between users.
