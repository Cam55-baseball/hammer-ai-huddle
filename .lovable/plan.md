# Elite Defensive Drill Library Expansion

## Problem
- Only **3 catcher-specific drills** exist across 57 fielding drills (Block & Recover, Pop Time, and one implicit).
- Softball fielding is nearly empty (3 drills total).
- Existing descriptions are 1–2 sentences with no "why," setup, cues, reps, or common mistakes — pros can't use them.

## Scope
Seed the `drills` table with a professional-grade defensive drill library and enrich the description schema so every drill reads like an elite coaching card.

### 1. New drill migration (additive, seed-only)
Insert ~60 new defensive drills into `public.drills`, tagged by position and skill:

**Catcher (16 new)** — receiving/framing, blocking, throwing, game management
- One-Knee Framing Ladder (bottom/top/glove-side/arm-side frames)
- Sword Draw Transfer (elite transfer path)
- Pop Time 1.9 Progression (dry → ball → live)
- Backhand Pick Block (glove-side dirt balls)
- Barehand Bunt Attack (pop, plant, throw)
- Runner-on-3rd Block & Smother
- Third-to-First Back Pick
- Pitcher Mound Visit Reset (game IQ)
- Blocking Recovery Ladder (block → recover → throw to 3rd)
- Stealth Stance Framing (one-knee stolen strike zone)
- Two-Strike Chase Block
- Pitch Tunnel Receiving (sequencing awareness)
- Wild Pitch Angle Recovery
- Foul Pop Spin & Find
- Elite Snap Throw Series
- Catcher Fatigue Circuit (5-round game-simulation)

**Infield (14 new)** — pros-level range and transitions
- Deep Hole SS Backhand Jump Throw
- 2B Feed Menu (glove flip, backhand toss, spin throw, dart)
- 3B Chopper Charge & Barehand
- 1B Scoop Ladder (short/inside/outside/reverse)
- Slow Roller Do-or-Die
- Bunt Coverage Rotations
- Pickoff Tag Series (sweep vs snap tag)
- Rundown Choreography
- Diving Stab & Snap Throw
- Cutoff/Relay Alignment Reads
- In-Between Hop Neutralizer
- Bare-Hand Exchange @ Full Speed
- Around-the-Horn Under 6s
- SS/2B Communication Ladder (who covers)

**Outfield (10 new)** — pro-level reads and arms
- Route Efficiency Grid (over-shoulder line reads)
- Do-or-Die Charge & Long-Hop Throw
- Wall Reads (drift, brace, jump)
- Sun/Lights Read Drill
- Off-Hand Backhand Run-Through
- Trail Runner Cutoff Reads
- Sinking Line Drive Dive Series
- 4-Seam Grip in Flight (crow-hop mechanics)
- Fence Angle Ricochet Reads
- Fly-Ball Fatigue Ladder

**Softball parity (~20)** — mirror the above for softball positions with sport-specific spacing, ball behavior, and pitcher-catcher timing.

### 2. Description schema upgrade (per drill)
Descriptions become **structured markdown** stored in existing `description` (or `ai_context`) column so no schema migration is required. Every drill will contain:

```
Why it matters: <sport-specific outcome>
Setup: <equipment, spacing, reps, partners>
Execution: <step-by-step, numbered>
Elite cues: <3–5 short cues pros hear>
Common mistakes: <3 pitfalls>
Progressions: <regression → base → advanced>
Success marker: <measurable outcome>
```

This turns 1-line blurbs into pro-legible drill cards.

### 3. Tagging & discoverability
- Insert into `drill_positions` for each new drill so `useDrillRecommendations` can filter by C/1B/2B/SS/3B/LF/CF/RF.
- Insert into `drill_tag_map` for skills (framing, blocking, transfer, pop_time, range, route_efficiency, arm_strength, communication, chaos).
- Set `skill_target` on legacy nulls where obvious (catchers, DP work) as a light backfill.

### 4. UI display
No new components required — existing drill card renders `description` as text. Add a `MarkdownDrillDescription` helper (small component) that renders the structured block with headings, so the enriched content is readable at a glance.

## Technical Details
- Single SQL migration seeding `drills`, `drill_positions`, `drill_tag_map`.
- `premium: true` on advanced tiers (elite, fatigue, chaos), `premium: false` on foundational.
- `sport` field set for baseball/softball rows; softball drills mirror with adjusted cues.
- No changes to RLS, engines, or recommendation logic — the seed rides existing infrastructure.
- New `src/components/drills/DrillDescriptionBlock.tsx` for structured rendering.

## Out of scope
- Video attachments (existing owner tools handle upload).
- Recommendation engine weighting changes.
- Hitting / pitching / speed drills.

## Deliverable
+60 defensive drills (catcher-heavy) with structured elite explanations, position + tag mappings, and a small UI helper to render the richer descriptions cleanly.
