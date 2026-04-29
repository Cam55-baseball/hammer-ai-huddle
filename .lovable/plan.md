## Goal
Make practice toughness scoring **rep-source aware** so the engine recognizes that facing 100mph live BP or live ABs is fundamentally harder than tee/flip/coach toss, and that pitching to a real hitter is harder than throwing a bullpen. Today the engine only weights by `session_type` (game vs practice vs rehab), which collapses every practice rep — tee swing or live BP — into the same competitive multiplier of 1.0.

## Root cause
`supabase/functions/calculate-session/index.ts` (lines ~77–83) hard-codes:
```
competitiveMultiplier = isGame ? 1.25 : isRehab ? 0.3 : 1.0
decisionMultiplier    = isGame ? 1.18 : isRehab ? 0.3 : 1.0
```
Every micro-rep already carries `rep_source` (tee, flip, front_toss, soft_toss, coach_pitch, machine_bp, live_bp, regular_bp, bullpen, flat_ground, flat_ground_vs_hitter, bullpen_vs_hitter, sim_game, game) plus `machine_velocity_band`, but those signals are ignored when computing BQI / PEI / FQI / decision / competitive_execution. The existing `velocityDifficultyMult` (max +15%) only triggers for machine reps and is too narrow.

## Design — Rep Source Toughness Tiers

### Hitting (face the pitch)
| Tier | Rep sources | Toughness |
|---|---|---|
| 0.70 | `tee` | Static — pure mechanics |
| 0.80 | `soft_toss`, `flip` | Predictable, short distance |
| 0.85 | `front_toss` | Underhand short distance |
| 0.95 | `coach_pitch` | Slow, predictable |
| 1.05 | `machine_bp` | Real velocity, no read |
| 1.15 | `regular_bp` (live, friendly) | Live arm, controlled |
| 1.25 | `live_bp` | Live pitcher, full intent |
| 1.30 | `live_abs`, `sim_game` | Competitive at-bats |
| 1.35 | `game` | Real game (already covered by isGame) |

### Pitching (the pitcher's task)
| Tier | Rep sources | Toughness |
|---|---|---|
| 0.85 | `bullpen` | No hitter, pure mechanics |
| 0.95 | `flat_ground` | No mound, no hitter |
| 1.05 | `flat_ground_vs_hitter` | Hitter present, no mound |
| 1.15 | `bullpen_vs_hitter` | Mound + live hitter |
| 1.25 | `live_bp` (pitching to hitters) | Live BP from mound |
| 1.30 | `sim_game` | Simulated competition |
| 1.35 | `game` | Real game |

### Fielding/throwing/baserunning
Existing `session_type` multiplier remains the primary signal (no rep-source remap for now — those modules aren't what the user flagged).

## Fix

### 1. New shared toughness map
Create `supabase/functions/_shared/repSourceToughness.ts` exporting:
```ts
export type Module = 'hitting' | 'pitching' | 'fielding' | 'throwing' | 'baserunning' | 'bunting';
export function getRepSourceToughness(module: Module, repSource?: string | null): number;
```
Returns a multiplier in [0.7, 1.35]. Defaults to 1.0 for unknown sources or non-hitting/pitching modules.

### 2. Apply the multiplier in `calculate-session/index.ts`
After computing `microReps`, derive the **module of this session** (already known from `session.module`) and compute a **session-level rep-source toughness**:
```ts
const moduleForToughness = session.module as Module;
const sourceCounts = new Map<string, number>();
for (const r of microReps) {
  const src = r.rep_source ?? 'unknown';
  sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
}
let toughnessSum = 0, toughnessReps = 0;
for (const [src, n] of sourceCounts) {
  toughnessSum += getRepSourceToughness(moduleForToughness, src) * n;
  toughnessReps += n;
}
const repSourceToughness = toughnessReps > 0 ? toughnessSum / toughnessReps : 1.0;
```

Then multiply into the **module-appropriate composite** (not all of them):
- Hitting session → `bqiRaw *= repSourceToughness` and `competitive_execution` line uses `competitiveMultiplier * repSourceToughness`.
- Pitching session → `peiRaw *= repSourceToughness` and same competitive_execution adjustment.
- Fielding/throwing → unchanged.

Decision multiplier: only boost decision when reps were against a live arm/hitter (`repSourceToughness >= 1.05`); otherwise leave at 1.0. This prevents a "tee work" session from inflating decision-making score.

### 3. Replace the narrow `velocityDifficultyMult`
Keep it but **fold it into the tier map**: machine_bp at high velocity gets an *additive* +0.05–0.10 on top of its 1.05 base (not multiplicative on top of the new toughness). Cap combined hitting toughness at 1.35 so machine work can never exceed live-AB difficulty.

### 4. Surface the value in `composite_indexes`
Add two transparency fields so the UI / vault / coach views can show *why* a session graded the way it did:
```
rep_source_toughness: repSourceToughness   // 0.70 - 1.35
rep_source_breakdown: { tee: 12, live_bp: 8, ... }
```
No DB migration — `composite_indexes` is JSONB.

### 5. Align the legacy `gameWeighting.ts`
Already loosely aligned (bullpen = 1.0). Leave it for now — it's not the hot path; the edge function constants are. Add a TODO comment pointing to the new toughness map so future work consolidates.

## Verification
- A hitting session of 30 tee reps → `repSourceToughness ≈ 0.70` → BQI / competitive_execution scaled down ~30%. A "great" tee day cannot grade as Elite.
- A hitting session of 25 live_bp reps vs 90+ mph → `repSourceToughness ≈ 1.25` → BQI scaled up; a 60 raw becomes ~75. Same execution against a coach flip caps lower.
- A pitching session of 30 bullpen reps → `peiRaw *= 0.85` → no false "Elite" tag for clean bullpen-only work.
- A pitching session of 25 live_bp reps to hitters → `peiRaw *= 1.25` and competitive_execution amplified.
- Mixed sessions (10 tee + 10 live_bp) average to ~0.975 → close to today's neutral baseline.

## Files to edit
- `supabase/functions/_shared/repSourceToughness.ts` (new)
- `supabase/functions/calculate-session/index.ts` (apply multiplier; surface fields)

## Notes
- No DB migration needed — uses existing `rep_source` on micro reps and JSONB `composite_indexes`.
- No client changes required to make scoring more accurate, but we add the breakdown so future UI work can show "Toughness: 1.22 (mostly live BP)" on session cards.
- Fielding/throwing untouched — user flagged hitting and pitching specifically; expanding to defensive rep contexts is a future task.