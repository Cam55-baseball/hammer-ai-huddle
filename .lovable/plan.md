## Why you're stuck at ~20% on Foundation videos

The confidence score in the editor is computed by a single shared function (`computeVideoConfidence` in `src/lib/videoConfidence.ts`) that was designed for **Application** videos. It expects five things, summing to 100:

| Component | Max | Where it comes from |
|---|---|---|
| Format | 15 | The "video format" dropdown |
| Domain | 15 | `skill_domains` array |
| Description | 25 | Length + an action verb in `ai_description` |
| Tag count | 20 | Per-rep tag assignments |
| Diversity | 25 | Spread across the 4 tag layers (movement / result / context / correction) |

When you flip a video to **Foundation**, the editor intentionally clears format, skill domains, and per-rep tag assignments (Foundation videos use chips instead). But the score still runs through the Application formula, so:

- format → 0 (cleared)
- domain → 0 (cleared)
- tagCount → 0 (Foundation has no per-rep tags)
- diversity → 0 (no layers)
- description → up to 25

A perfectly written Foundation description therefore caps at **~25/100** — that's the "20%" you're seeing. It's a scoring bug, not a description-quality problem.

## The fix: a Foundation-native confidence formula

Add a parallel scorer that grades what Foundation videos actually use, then route the editor to it when `isFoundation` is true. Same 0–100 scale, same Elite / Solid / Needs work tiers, so the badge reads consistently.

Proposed Foundation breakdown (sums to 100):

| Component | Max | Earned when |
|---|---|---|
| Domain chip | 10 | A Foundation domain is selected |
| Scope chip | 10 | A scope is selected |
| Audience levels | 15 | 1 level = 8, 2 = 12, 3+ = 15 |
| Refresher triggers | 25 | 1 trigger = 10, 2 = 18, 3 = 22, 4+ = 25 (this is what makes Hammer surface it) |
| Coach's Notes length | 20 | <60 chars = 0, 60–199 = 10, 200–399 = 16, 400+ = 20 |
| Coach's Notes quality | 20 | +6 if it contains an action verb (same regex as Application), +7 if it covers ≥2 of {cue, why, fix, when}, +7 if it has a clear structure (numbered steps, line breaks, or "first / next / finally" markers) |

A Foundation video that has all chips filled, ≥2 audiences, ≥2 triggers, and a 400+ char Coach's Notes with verbs and structure will hit 100%.

The `hints[]` array will become Foundation-specific so you can see exactly what's missing the moment you're below Elite — e.g. "Add 1 more refresher trigger (+4)", "Coach's Notes is 180 chars; reach 200 for +6", "Add an action verb (drive, rotate, stack…)".

## What to change

Frontend / presentation only — no DB, no engine, no recommender changes.

1. **`src/lib/videoConfidence.ts`** — add `computeFoundationConfidence(input)` returning the same `ConfidenceResult` shape (score, tier, breakdown, hints). Keep `computeVideoConfidence` unchanged for Application videos.
2. **`src/components/owner/ConfidenceBadge.tsx`** — no behavior change; it already takes `score` + `tier`.
3. **`src/components/owner/VideoEditForm.tsx`** — when `isFoundation` is true, call `computeFoundationConfidence({ foundationMeta, aiDescription })` instead of `computeVideoConfidence(...)`. Render the same badge and the new hints below it.
4. **`src/components/owner/VideoFastEditor.tsx`** — same routing fix so the inline editor agrees with the full editor.
5. **`src/hooks/useVideoConfidenceMap.ts`** — if a video's `video_class === 'foundation'`, run it through the Foundation scorer so the library list badges match.
6. **`src/components/owner/OwnerTaggingPerformancePanel.tsx`** — split the rollup so Foundation videos are graded against the Foundation scale (otherwise the "needs work" count stays inflated).

## Out of scope

- No changes to `FoundationTagEditor` chips, `HammerDescriptionComposer`, the recommender (`scoreFoundationCandidates`), DB columns, or RLS.
- No new analytics events.
- Application-video scoring stays exactly as it is today.

## Quick wins you can apply right now (before the code ships)

Even on the current (broken) formula, the Coach's Notes piece tops out at 25 only when:
- Length ≥ 140 characters, AND
- Contains one of these action verbs: fix, cue, drive, rotate, extend, stay, keep, load, land, swing, throw, catch, track, read, focus, shift, press, brace, prep, finish, follow, connect, stack.

So a Foundation note like *"Drive the back hip, stack the spine, finish through the ball — keep the head still and track the release."* will score the full 25 on description today. That alone moves you from ~5% to ~25% until the Foundation scorer ships.
