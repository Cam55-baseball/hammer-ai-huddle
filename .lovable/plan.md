
## Problem

The Bat Speed card is prescribing **Band-Resisted Swings (band around bat handle/waist)**. That drill is unsafe (band around a bat = injury/loss-of-control risk), requires exotic rigging, and — worst — pushes the hands / distorts the swing pattern we teach. The catalog also lacks true **overload/underload contrast**, **hip-assistance contrast**, and elite bat-speed staples.

## Fix in two moves

### 1. Remove / demote the offending drill
- Delete `Band-Resisted Swings` from `wk_movement_catalog` (id `e286cd8e…`) and any references in `drill_tag_map` / prescriptions history is preserved (governance events keep lineage; we only remove future prescribability).
- If deletion trips FK constraints, instead set `is_active=false`, blank `bat_speed_category`/`bat_speed_adaptation`, and add a validator block so the resolver can never select it.

### 2. Seed an elite bat-speed library (no bat-handle bands, patterns preserved)

Add ~18 movements covering the full contrast matrix. Each row gets: `bat_speed_category`, `bat_speed_adaptation`, `pap_classification`, `movement_velocity`, `game_day_legal`, `practice_day_legal`, `season_legality`, `training_age_legality`, `transfer_group`, `substitution_family`, plus plain-English cue, "why this movement", common mistakes, success markers, and a 5-rung substitution ladder (equipment / environment / injury / time / coach_override).

**Overload (heavier bat, hands stay clean)**
- Overload Bat Swings — refined dosage, +10–20% bat weight cap
- Weighted Sleeve Dry Swings (Axe/Fungo sleeve)
- Heavy Bat Tee Work (contact-quality gated)

**Underload / Overspeed (bat-speed PR driver)**
- Underload Bat Swings — −10–20%
- Speed-Stick / Momentus Speed Trainer Dry Swings
- Whiffle-Bat Overspeed Tee

**Hip Assistance Contrast (band on **HIPS ONLY**, never bat)**
- Hip-Assisted Rotational Swings (band pulls lead hip open — assistance, not resistance)
- Hip-Resisted Rotational Swings (band resists hip turn — separation driver)
- Contrast Set: Hip-Resisted → Hip-Assisted → Free (3-way PAP)

**Rotational Power Transfer (med-ball, elite staples)**
- Med Ball Rotational Shot-Put — keep, add elite cueing
- Med Ball Scoop Toss — keep, add elite cueing
- Med Ball Step-Behind Side Toss
- Med Ball Walking Windup Toss
- Med Ball Rebounder Rapid-Fire (elastic)

**Elastic / Reactive Rotation**
- Cable/Pulley Rotational Chop (low-to-high, high-to-low)
- Landmine Rotational Punch
- Plyo Ball Wall Rebounds (rotational)

**PAP Contrast Complexes (paired, not single movements)**
- Heavy → Standard → Light bat 3-set complex
- Med-Ball Shot-Put → Free Swing complex
- Trap-Bar Jump → Rotational Med-Ball Toss (lower-body PAP into rotation)

### Engine hookups
- Update `wk-generate-daily` bat-speed template resolver so `bs.max`, `bs.elastic`, `bs.overload`, `bs.underload`, and `bs.mixed_pap` prefer the new contrast pairs (overload never selected without an underload/free counterpart in same session — enforce via a new validator code `bs_missing_contrast_pair`).
- Ensure `Overload Bat Swings` and `Underload Bat Swings` are eligible for training ages ≥ HS varsity only (younger athletes get med-ball + free-swing contrast instead).
- Game-day set: only elastic/med-ball light-PAP options; block all heavy overload.

### UI (no visual redesign)
- `WkBatSpeedCard` continues to render `WkPrescriptionCard`. New "why this movement", cue, and common-mistakes fields flow through the existing plain-English rationale surface — no jargon leakage (respects the recent metadata cleanup).

## Out of scope
- No changes to Speed / Lifts / Conditioning cards.
- No changes to onboarding, DelayCam, Game IQ.
- No UI redesign of the Bat Speed card — content upgrade only.

## Verification
- Query `wk_movement_catalog` post-migration to confirm the offending drill is gone/blocked and the new movements have full WIC governance metadata.
- Run `scripts/audits/explosive-governance-audit.ts` and `scripts/audits/spine-differentiation-test.ts` — must pass with new `bs_missing_contrast_pair` code enforced.
- Manually regenerate a today plan for an HS-varsity and a youth athlete and confirm the Bat Speed card prescribes contrast pairs, never a band-on-bat drill.
