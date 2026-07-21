
## Root cause (verified)

Confirmed by querying `iq_situations` / `iq_situation_actors` / `iq_scenarios`:

- 110 published situations, only **29 have any actor `primary_path`**, and **0 have any `ball_track`**.
- `drag-bunt-rhh-r0`: all 9 defenders have `primary_path = []`, scenario `ball_track = null`.
- The playback engine (`playTimeline.ts` → `IqDiamond`) works, but with no paths and no ball track it renders a static field — exactly what the user is seeing.

So the code is fine; the *content* has no plays authored. Fix must guarantee **every situation has drawn + animated routes + a moving ball**, and stay that way going forward.

## Goals

1. Every published Game IQ situation shows animated defender routes and a moving ball when "Watch the play" is pressed.
2. No situation can be published without at least an auto-generated animation.
3. Owners can visually edit / override the generated play.

## Deliverables

### 1. Play archetype generator (`src/lib/iq/playGenerator.ts`)

Given a situation (slug, title, `lens_tags`, actors, `alignment_preset`, runners, batter side) and its resolved defender positions, output:

- `primary_path` per defender actor (target/landmark waypoints, not absolute pixels)
- `start_at` / `end_at` per actor (staggered by role responsibility)
- `ball_track` with `kind: pitch → batted/bunted → thrown` points
- Runner tracks (R1/R2/R3/BR) advancing to the right base

Archetypes derived from title/tags — the taxonomy already visible in the data:

- Bunt family (drag/sac/push/squeeze/slash/pop-up/foul/wheel/corner-charge)
- Steal / pickoff / first-and-third
- Comebacker / grounder to IF / slow roller
- Fly ball / gap / line drive / relay
- Wild pitch / passed ball
- Mound visit / pre-pitch (static “setup” animation only)

Each archetype is a small function that composes waypoints from `LANDMARKS` + `targetRole` refs in `pathResolver.ts`, so routes stay correct under any alignment shift (already supported).

Specifically for `drag-bunt-rhh-r0`: P charges toward 1B line, 1B charges then retreats to bag, 2B covers 1B, SS covers 2B, 3B holds, C trails up 1B line, OF backup arcs; ball = pitch → bunted toward 1B line → thrown to 1B.

### 2. Backfill migration

`supabase/migrations/<ts>_iq_play_backfill.sql` plus a one-shot script `scripts/backfillIqPlays.ts` (invoked via edge function `iq-backfill-plays`) that:

- Reads every published situation.
- Runs `playGenerator` to produce actor `primary_path` + `start_at`/`end_at` and scenario `ball_track`.
- Writes back only where `primary_path` is empty or `ball_track` is null (non-destructive to the 29 already authored).

### 3. Runtime safety net

In `buildTimeline` (`src/lib/iq/playTimeline.ts`):

- If an actor still has no `primary_path` after resolution, synthesize one from the archetype at render time so playback is never empty.
- If `ball_track` is empty, synthesize a minimal pitch→contact→throw track from actor assignments (find `ball` actor as source, first `bag` actor as destination).

This guarantees animation even for future situations that ship before backfill runs.

### 4. Admin authoring polish (`/owner/iq/situations`)

- Add a "Generate play" button that calls `playGenerator` and previews the result on `IqDiamond`.
- Add a per-actor timeline editor (drag waypoints on the field, drag `start_at`/`end_at` sliders) and a ball-track editor.
- Publish gate: block publish if the situation would render zero motion (both actor paths empty AND ball track empty AND generator returns nothing).

### 5. Situation page ("Watch the play") UX

- Disable/relabel the button to "Preview (auto-generated)" when the play is synthesized at runtime, so users know it's a best-effort visualization until an owner authors it.
- Keep the existing playback controls; no behavior change on already-authored plays.

## Out of scope

- Rewriting `IqField` / `IqDiamond` rendering.
- Changing the concept ladder, quiz, or mastery flow.
- Editing owner-controlled alignments.

## Technical notes

- All new waypoints use the `target` / `targetRole` / `dx,dy` forms in `pathResolver.ts` so alignment shifts, batter side, and outs continue to warp routes correctly.
- `ball_track` uses the existing `BallTrackPoint` shape (`x,y,t,kind`).
- Backfill writes go through service-role edge function; RLS on `iq_situation_actors` / `iq_scenarios` stays unchanged.
- Deterministic seeds keyed on `situation.id` so regenerating is idempotent.

## Acceptance

- Visiting `/iq/drag-bunt-rhh-r0` and pressing "Watch the play" shows P, 1B, 2B, SS, C moving and a ball travelling pitch → bunt → throw to 1B.
- Spot-check 10 random situations across bunts, steals, grounders, fly balls — all animate.
- SQL check after backfill: `count(*) FILTER (WHERE primary_path is empty) = 0` on published actors; `count(*) FILTER (WHERE ball_track IS NULL) = 0` on their scenarios.
