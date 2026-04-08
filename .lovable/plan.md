

# Seed 43 Defensive Drills with Standardized Tags

## What's Needed

The user provided a precise 43-drill library (drills #1-43) with exact tags, progression levels, positions, and AI context. Many of these drills don't exist yet. Some overlap with existing drills that need updating.

## Missing Tags to Create First

**Error tags needed**: `rushed_throw`, `double_clutch`, `bad_angle` (existing `bad_footwork_angle` is different)
**Skill tags needed**: `reaction`, `body_control`, `release`
**Situation tags needed**: `routine_grounder`, `forehand`, `charge_play`, `throw_on_run`, `quick_turn`

## Existing Drills That Overlap (Update, Don't Duplicate)

| User's Drill | Existing Match | Action |
|---|---|---|
| #7 Short Hop Confidence | Short Hop Drill (level 3) | Update level to 2, add tags |
| #20 Quick Exchange Drill | Quick Exchange Drill (level 4) | Update tags to match spec |
| #31 One-Hand Pickup | Bare Hand Exchange (level 6) | Keep separate — different drill |

All others are new inserts (~40 drills).

## Positions Mapping

The user's drill list uses: IF, OF, All, C, P. Map to existing `drill_positions` values: `infield`, `outfield`, `catcher`, `pitcher_fielding`. "All" = all four.

## Implementation Steps

### 1. Migration: Add missing tags + insert drills

Single migration that:
- Inserts 8 missing tags (3 error_type, 3 skill, 5 situation) — using the ENUM categories already in the system
- Inserts ~40 new drills with full metadata (name, sport, module=fielding, ai_context, progression_level, is_active=true, is_published=true)
- Updates 2-3 existing drills to match the spec (level, tags)
- Inserts all `drill_positions` rows
- Inserts all `drill_tag_map` rows with appropriate weights (error tags weight=3, skill tags weight=2, situation tags weight=1)

### 2. No code changes needed

The engine, CMS, and player UI already support all these fields. Once the data is in the database, the recommendation engine will immediately use it — drills will surface in "Fix Your Game" based on detected issues.

## Files

| File | Action |
|------|--------|
| Migration SQL | Insert tags, drills, positions, tag mappings for all 43 drills |

