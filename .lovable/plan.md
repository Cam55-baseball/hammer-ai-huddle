# Elite Lifting & Workload Intelligence — from your source material

All batches are now in: the workload-spike screenshots, the intensity/rep table, the fast-twitch and fascia threads, your 2026–27 offseason outline, the in-season post-game template, and the long pasted knowledge package.

This plan turns that material into rules the training engine actually uses, without letting the shakier claims become fake medical facts.

## What gets built

### 1. A single knowledge document (the source of truth)
One governed document that records every concept from your material in layers:
raw source claim → what is actually established → confidence → training adaptation →
the programming rule Hammers is allowed to apply → exercise mapping → recovery cost → progression.

Nothing becomes engine behavior unless it has a rule line in this document. The fascia claims
(30% power amplification, myofibroblast pre-tightening, hyaluronan shear-thickening,
"tight fascia = explosive") are recorded as source claims only, never as rules.

### 2. Single-session spike guard
New safety layer, missing today. Before any session ships, Hammers compares today's dose to the
athlete's biggest comparable session in the trailing 30 days — running distance, sprint volume,
jump/contact count, throwing volume, and sport practice all count as one workload pool.

- Over ~30% above the 30-day peak: the session is trimmed back before the athlete ever sees it.
- 10–30% above: allowed, but flagged as a build week and it can't stack two days running.
- The athlete-facing note says plainly why the day was trimmed.

This encodes the core principle from your material: program from what the body has been exposed
to recently, not from what it theoretically can do.

### 3. Lift spacing law
Your later screenshots overruled the earlier 2-day answer. New rule:

- 3 days between any heavy, banded, eccentric, or high-velocity lift — all offseason phases.
- 2 days allowed only for pure unloaded KOT/mobility work with no heavy or fast lifting in it.
- In-season: lifts land on post-game days only, every 3 days.

### 4. In-season post-game rotation
A real template for your situation (6 games/week, lift after the game, 20–25 minutes):

- **Lift A — Power Anchor**: overcoming isometrics → 3x3 at roughly 80–85% → heavy sled push 2–3 x 15–20 yd.
- **Lift B — Velocity Reload**: banded 3x3 at roughly 40–50% bar + band → light backward sled drag → low-intensity KOT.
- They alternate every 3 days. Daily light extensive plyos stay in the pre-game warm-up.
- If a road day has no sled or turf, the sled role drops to its equipment-free sibling rather than being faked.

### 5. Offseason phase arc
Your outline becomes the offseason shape, mapped onto the quarters the app already uses:
6 weeks KOT/structural with 3x3 → 4 weeks double-eccentric with 3x5 and absorption plyos →
2 weeks heavy sport → 4 weeks banded/velocity with reactive plyos → 4 weeks peaking with
isometrics, heavy sled runs, and light plyos. Surface progresses sand → dirt/grass → concrete
as the phases advance, and never jumps forward early.

### 6. Intensity ↔ reps relationship
The %1RM table is stored as a reference the engine consults, not a law that authors sets and reps.
The dose stays owned by the existing dosage authority; the table only sanity-checks that the
intensity being asked for and the reps being asked for belong together.

### 7. Whole-chain force transfer (the usable part of the fascia material)
Exercises get tagged for the chain they load (foot → ankle → knee → hip → pelvis → trunk →
scapula → shoulder → hand) and whether they train force transmission. When an athlete has a
local issue, the engine can look at adjacent and distal contributors instead of only isolating the
sore structure. No claim about fascia mechanics is ever shown to an athlete as fact.

## What does not change
- The existing dose authority still owns every set and rep number.
- Methods still never author a dose, and drop silently when uncertain.
- Weight-room standards stay recognition-only.
- Nothing is prescribed that the athlete lacks equipment for.
- Warm-up twitch work stays single-leg majority.

## Technical notes
- New doc `docs/wic/elite-workload-knowledge-v1.md` with the layered A–J structure and an evidence tier on every entry.
- New `supabase/functions/_shared/wic/workload/spikeGuard.ts`: rolling 30-day peak per workload channel (run distance, sprint volume, jump contacts, throws, sport minutes), ratio bands at 1.10 / 1.30 / 2.00, returns a clamp + reason code. Wired into the daily generator before validation, and mirrored client-side for the "why" card.
- New `wic/lift/spacing.ts`: `minDaysBetweenLifts(sessionKind, phase)` — 3 for heavy/banded/eccentric/velocity, 2 for unloaded mobility only. Enforced in `weeklyMicrocycle.ts` and the in-season scheduler.
- New in-season templates `full_body_in_season_power_anchor` and `full_body_in_season_velocity_reload` in `wic/lift/templates.ts`, with a deterministic A/B alternation keyed off the last completed lift, plus a `post_game` placement gate in `wic/schedule/gameProximity.ts`.
- Offseason arc: extend `wic/season.ts` + `src/lib/hammer/roadmap/seasonQuarters.ts` with week-count sub-blocks and a `surface` field (`sand | dirt_grass | turf | concrete`) that gates plyo selection; surface never advances ahead of phase.
- `%1RM ↔ reps` reference table added as a validator in `wic/dosage/` — advisory only, it can reject an incoherent pairing but cannot author numbers.
- Chain tags added to the movement catalog (`chain_segments`, `force_transmission: boolean`), consumed by the selector as a coverage bonus, not a requirement.
- All new behavior is versioned and deterministic so replays reproduce identical output; every clamp emits a canonical event with its reason.

## Suggested order
1. Knowledge document + evidence tiers.
2. Spike guard (biggest safety win).
3. Lift spacing law.
4. In-season A/B post-game rotation.
5. Offseason arc + surfaces.
6. Intensity/rep validator and chain tags.

Steps 1–3 can ship on their own if you want value sooner.
