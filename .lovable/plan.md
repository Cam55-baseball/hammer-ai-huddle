# Elite Tagging Overhaul — Pitching, Throwing, Fielding (Baseball + Softball)

## What's wrong today

The tagging taxonomy behind the Video Library Manager is deep for hitting and nearly empty everywhere else. Verified counts of active tags:

| Domain | Movement | Result | Context | Correction |
|---|---|---|---|---|
| hitting | 12 | 15 | 14 | 13 |
| fielding | 5 | 4 | 0 | 4 |
| pitching | 2 | 0 | 0 | 2 |
| throwing | 2 | 0 | 0 | 1 |
| base_running | 1 | 0 | 0 | 1 |

Also verified:
- Tags have no sport dimension at all (`video_tag_taxonomy` has no sport column), so a softball windmill pitcher and a baseball overhand pitcher draw from the same 4 tags.
- Tags have no position dimension, so a catcher's block-and-recover clip and a first baseman's scoop tag identically.
- Only 12 cross-tag rules exist total (movement + result + context → correction), which is what actually powers "this result should surface these videos."

Result: pitching, throwing, and fielding videos can't be tagged precisely, and recommendations for those domains are effectively guesses.

## What we'll build

### 1. Sport specialization (baseball vs softball)
Add a sport scope to every taxonomy tag: `baseball`, `softball`, or `both`. Windmill-specific pitching tags never appear for a baseball pitcher; overhand-specific tags never appear for a windmill pitcher; shared concepts stay dual-scoped so cross-tagging still works across both sports where it's genuinely the same movement.

Tag pickers in the editor filter by the video's sport automatically, and recommendations hard-filter by athlete sport.

### 2. Elite pitching taxonomy, split by sport
- Baseball (overhand): full delivery-phase movement set (leg lift, hip/shoulder separation, stride direction, arm path/lag, trunk timing, release, deceleration), arsenal context (fastball, breaking, changeup, count state, runners on, pitch-count fatigue), results (arm-side miss, glove-side miss, hung breaker, flat plane, non-competitive strike), and matching corrections.
- Softball (windmill): its own phase set (drive/push-off, K-position, brush contact, whip, snap, plant-leg block, replant/finish), pitch-type context (rise, drop, screw, change, curve), spin/miss results, and windmill-specific corrections.

### 3. Throwing cleanup and specialization
Throwing stops being a thin copy of pitching. It becomes position-transfer throwing: footwork/exchange, arm slot by throw type (infield short-hop feed, outfield crow-hop, catcher pop-time throw), and result tags (offline arm-side, sailed, short-hopped, slow transfer). Redundant/overlapping keys are merged so a video isn't ambiguously tagged pitching-vs-throwing.

### 4. Position-specific fielding depth
Add a position scope to fielding tags: catcher, 1B, middle infield, 3B, corner outfield, center field, plus general. Each gets its own movement/result/correction set — receiving and blocking for catchers, scoop/pick for 1B, double-play footwork and feeds for middle infield, in-between hop and slow-roller charge for 3B, route/first-step and wall work for outfield. General athletic-fielding tags remain available to all positions.

### 5. Cross-tagging that actually returns videos
Expand the rule set so every new result tag routes to the corrections that fix it, per sport and per position. This is what makes "athlete rolled over / catcher lost the block / pitcher missed arm-side" pull the right library clips.

### 6. Editor upgrades
- Tag picker groups by layer, then by position (fielding) or pitch family (pitching), instead of one flat list.
- Sport and position selectors on the video drive which tags are offered; irrelevant tags are hidden, not just unsorted.
- Readiness rules get domain-aware minimums so a pitching video isn't "ready" with two generic tags.
- Owner taxonomy manager gains sport/position fields so you can keep extending it without a developer.

## Technical section

- Migration: add `sport` (`baseball` | `softball` | `both`, default `both`) and `position_scope` (text array, null = all) to `video_tag_taxonomy`; add the same `sport` scope to `video_tag_rules`. Backfill all existing rows to `both` / null so nothing regresses. GRANTs mirrored from existing table policies.
- Seed data: new taxonomy rows and rule rows inserted via data inserts (not schema migration), grouped by domain and sport.
- `src/lib/videoRecommendationEngine.ts`: add sport and position as hard pre-filters before scoring; scoring model itself unchanged.
- `src/hooks/useVideoTaxonomy.ts`: accept `{ skillDomain, sport, positions }` and filter server-side.
- `src/components/owner/StructuredTagEditor.tsx`: sport/position-aware grouped tag picker.
- `src/components/owner/TaxonomyManager.tsx`: sport + position fields on create/edit.
- `src/lib/videoReadiness.ts` + `library_videos_readiness` view: domain-aware tag minimums (kept in sync, as the file already requires).
- Existing 16 videos and 299 assignments are preserved; nothing is deleted, only scoped and extended.
