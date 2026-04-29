## Status
The hitting and pitching toughness ladders you described are already deployed in `supabase/functions/_shared/repSourceToughness.ts` and wired into `calculate-session/index.ts`:

**Hitting ladder (BQI + competitive_execution):**
tee 0.70 → soft_toss/flip 0.80 → front_toss 0.85 → coach_pitch 0.95 → machine_bp 1.05 → regular_bp 1.15 → live_bp 1.25 → live_abs/sim_game 1.30 → game 1.35

**Pitching ladder (PEI + competitive_execution):**
bullpen 0.85 → flat_ground 0.95 → flat_ground_vs_hitter 1.05 → bullpen_vs_hitter 1.15 → live_bp 1.25 → sim_game 1.30 → game 1.35

Already applied:
- `bqiRaw *= repSourceToughness` for hitting/bunting sessions
- `peiRaw *= repSourceToughness` for pitching sessions
- `competitive_execution = normalizedScore * competitiveMultiplier * repSourceToughness` for all sessions
- `decisionRaw *= liveContextBonus` (toughness if ≥1.05, else 1.0) so tee/coach-toss work cannot inflate decision-making
- `composite_indexes.rep_source_toughness` and `rep_source_breakdown` surfaced for transparency

## Gap to close
You explicitly named **FQI** as a target. It is currently not weighted by toughness — a clean fielding rep in a real game grades the same as a clean rep in pre-practice ground balls.

## Fix
In `supabase/functions/calculate-session/index.ts`, after the FQI raw is fully assembled (after the receiving_quality block, ~line 231), apply:

```ts
// FQI toughness: only amplify when reps occurred in live/game context (≥1.05).
// Pure drills stay neutral; a clean play in a real game outweighs a clean rep in solo work.
if (liveContextBonus > 1.0) fqiRaw *= liveContextBonus;
```

Why `liveContextBonus` (not full `repSourceToughness`):
- Defensive drills (cone work, fungo) have no `rep_source` mapped → toughness = 1.0 → no change
- Game/sim_game/live_bp fielding reps drive `liveContextBonus` ≥ 1.05 → FQI scales up
- This avoids penalizing solo defensive work (which has no "soft" hitting analog like tee work)

## Files
- `supabase/functions/calculate-session/index.ts` — add the 3-line FQI toughness application

## Deploy
- Redeploy `calculate-session` edge function