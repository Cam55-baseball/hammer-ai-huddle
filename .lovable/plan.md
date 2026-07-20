
# Game IQ — Pinnacle Upgrade

Goal: make Baseball/Softball Game IQ the clear best-in-market experience — beyond Motion Playbook, Baseball Instincts, and Softball IQ apps — with accurate positioning, lines that always originate from the *actual* set position, and coaching depth those apps don't have.

## Problems today

1. **Routes don't follow the defender's real set position.** `IqDiamond` computes `posFor(role)` correctly (owner alignment → hand-aware → fallback), but `primary_path` arrays are authored as absolute grid points, and the drawn line uses `start = posFor(role)` + raw `primary_path` points. When alignment shifts (shift, DP depth, no-doubles, wheel, corners in, etc.), the *start* moves but the path targets stay pinned to the old preset — so a SS drawn at `x:40,y:52` gets rerouted from `x:32,y:48` (shift) yet the line still ends at the old spot, producing bent, wrong-looking routes.
2. **Scenarios feel static.** No ball flight, no runner motion, no play timeline, no "watch it, then quiz me" cycle. Competitors (Motion Playbook especially) win on animated play playback.
3. **Situational depth is thin.** Alignment selector resolves a preset but scenarios don't visibly explain *why* the alignment changed for this situation, don't show pre-pitch adjustments (corners in with runner on 3B, IF-in-DP depth, no-doubles, wheel/rotation on bunt, 4th-outfielder, shaded shifts by count).
4. **No coaching layer per role beyond text.** No footwork cue, no eye discipline, no ball priority, no communication call visualized on the field.
5. **No sport-authentic polish.** Softball uses baseball diamond visuals scaled down; no rise-ball/dropball-specific cues, no slap-hitter alignment, no short-game (bunt defense wheel) presets.
6. **No progression / mastery arc surfacing.** Situations exist as a flat list; no "level" ladder like the competitors' "Rookie → Pro → Elite" progression paths.

## What to build

### 1. Route anchoring (fix the lines-must-follow-the-defender bug)
Change scenario authoring model from *absolute path points* to *anchor-relative path deltas*, resolved at render time against each defender's actual set position:
- Add `primary_path_mode: "absolute" | "relative_to_start" | "to_target"` on `iq_actors` scenario rows (default backfill `"absolute"` so existing content still works).
- New authoring format supports `{ target: "1B" | "2B" | "3B" | "H" | "cutoff" | { role: "SS" } | { dx, dy } }` segments.
- `IqDiamond` resolves each waypoint at render, so when the alignment resolver picks *no-doubles* or *DP depth* or *shift* the paths always start at the real defender dot and terminate at the correct bag/cutoff/backup spot.
- Backfill existing scenarios: for each actor whose path clearly targets a base, rewrite to `{ target: "<base>" }`; leave others as absolute with a deterministic offset applied so they at least start from the resolved position.

### 2. Play Playback Engine (beats Motion Playbook)
Add a "Watch the play" mode above the quiz:
- Ball timeline (`ball_path: [{ t, x, y, phase: "pitch"|"contact"|"in-flight"|"fielded"|"throw" }]`).
- Runner timelines per base (`runner_paths`).
- Defender routes animated in sync with ball frames using `framer-motion` `useAnimationFrame` on a shared clock (0..1).
- Controls: Play / Pause / Scrub / 0.5×/1×/2×, and "Loop until I get it".
- Quiz mode still hides paths; Reveal mode plays the animation with your chosen role highlighted so you *see* what you should have done.

### 3. Coach Layer overlays (per role, per situation)
Extend `iq_actors` (or a sibling `iq_actor_coaching` table) with:
- `footwork` (e.g., "drop-step, crossover to the bag"),
- `eyes` (e.g., "runner at 2B, then ball"),
- `priority` (`ball | bag | backup | communicate`),
- `call` (verbal — "I got 2!", "Cut 4!", "Bag!"),
- `common_mistake`.
Render as toggleable overlays on the diamond (Footwork / Eyes / Comm bubbles) — nothing in the market ships this on a field diagram.

### 4. Situational depth expansion
Preset library expansion (owner editor already exists at `/owner/iq/alignments`):
- **Bunt defense**: wheel-left, wheel-right, crash, rotation, safe.
- **Runner on 3B < 2 outs**: corners in / halfway / all-in.
- **Runners on / DP situation**: IF DP depth.
- **No-doubles / late innings**: OF deep + corners on lines.
- **Shifts**: full shift RHH/LHH, shaded, 4th-OF (softball slap look).
- **Softball-specific**: slap-hitter alignment (3B crash + SS creep), rise-ball 2-strike, drop-ball GB alignment.
Alignment selector rules on situations reference these presets so playback reflects the *right* pre-pitch look automatically.

### 5. Sport-authentic field polish
- `IqField` gets sport-specific dirt shapes (softball skinned infield vs baseball dirt cutout), correct mound-to-plate ratio, correct foul line lengths, bases sized to sport.
- Batter box shown with L/R based on `state.batterSide`, so alignment "shift vs LHH" visibly reads correct.
- Warning track, outfield fence arc, coach's boxes — all drawn once from `fieldGeometry.ts` (already the SoT).

### 6. Progression Ladder + Weekly Program (mastery moat)
- Tag every situation with `difficulty: "rookie" | "varsity" | "college" | "pro"` and `concept_tags` (e.g., `cut-relay`, `1st-and-3rd`, `bunt-D`, `pickoff`, `pop-up-priority`, `rundown`).
- New page `/iq/ladder` renders a visual ladder per lens (Defense / Offense / Baserunning / Pitching) with unlock gating from mastery.
- "IQ Path of the Week" pulls 5 due situations + 2 next-difficulty stretch situations into a single-tap program from the Hammer daily plan.

### 7. Attempt telemetry → real mastery
Extend `iq_attempts` payload with `time_to_first_click_ms`, `changed_answer_before_lock`, `role_chosen`, `mode ("quiz"|"watch-then-quiz")`. Mastery decay curve becomes concept-tag aware so a wrong answer on `cut-relay` resurfaces *other* cut-relay situations, not just the exact scenario.

## Technical details

**Files to add**
- `src/lib/iq/pathResolver.ts` — resolves relative/target waypoints against `AlignmentPositions`.
- `src/lib/iq/playbackClock.ts` — shared animation clock hook.
- `src/components/iq/IqPlayback.tsx` — play/pause/scrub controls + ball/runner rendering.
- `src/components/iq/IqCoachOverlays.tsx` — footwork/eyes/comm toggles.
- `src/pages/IqLadder.tsx` — difficulty ladder view.
- `supabase/migrations/*` — add columns: `iq_actors.primary_path_mode`, `iq_actors.footwork/eyes/priority/call/common_mistake`, `iq_scenarios.ball_path jsonb`, `iq_scenarios.runner_paths jsonb`, `iq_situations.difficulty text`, `iq_situations.concept_tags text[]`. Include `GRANT`s per public-schema rule.

**Files to change**
- `src/components/iq/IqDiamond.tsx` — resolve paths via `pathResolver`; accept `phase` prop from playback clock; stop drawing lines from the fallback map.
- `src/components/iq/IqScenarioRunner.tsx` — add "Watch → Quiz → Reveal" flow, wire coach overlays, log richer attempt telemetry.
- `src/components/iq/IqField.tsx` — sport-authentic polish, batter box handedness, softball skinned infield.
- `src/hooks/useIqSituations.ts` — surface `difficulty` and `concept_tags`.
- `src/pages/owner/IqAlignmentsEditor.tsx` — add preset templates for wheel/no-doubles/DP/corners-in/slap.

**Backwards compatibility**
- Existing scenarios default to `primary_path_mode: "absolute"` and continue to render, but a data migration script rewrites obvious base-target paths to `{ target }` form so the "lines follow defender" fix immediately applies to the library without hand-editing every row.

## Rollout order

1. Route anchoring + backfill (fixes the user's reported "lines must follow the new defender set position").
2. Field polish + sport authenticity.
3. Play Playback Engine.
4. Coach Layer overlays.
5. Preset expansion + selector rules on top situations.
6. Progression Ladder + weekly program hook.
7. Richer attempt telemetry + concept-tag mastery decay.

Each phase ships independently; the app stays green between phases.
