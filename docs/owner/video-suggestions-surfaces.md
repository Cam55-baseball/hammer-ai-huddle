# Hammer Picks — When & Where Owner-Tagged Videos Show Up

The single owner-facing reference for **where** videos uploaded and tagged in
the owner Video Library are surfaced to athletes, **what has to be true** for
them to appear, and **why nothing is showing up yet** if that's what you're
seeing today.

---

## TL;DR — the rule

A video is eligible for picks **only if BOTH** of these are true:

1. `library_videos.skill_domains` contains the discipline (e.g. `{hitting}`).
2. The video has **at least one row** in `video_tag_assignments` pointing at
   a tag in `video_taxonomy` for that discipline.

If either is missing, the video is **invisible** to every surface below.
There are no time delays, no rep thresholds, no minimum-session gates — the
suggestion engine fires the first time an athlete saves a session that
matches.

---

## The four surfaces

### 1. Post-Session Picks (highest signal)
- **Component:** `src/components/practice/PostSessionVideoSuggestions.tsx`.
- **Fires:** On the post-session summary screen, immediately after the
  athlete saves a practice session.
- **Trigger:** The session must produce **≥1 movement pattern OR ≥1 result
  tag** from `aggregateSessionToTaxonomy()` (driven by `drill_blocks`,
  `detected_issues`, `session_context`). If a session logs zero drills and
  zero detected issues, you'll see "No targeted picks this session — clean
  work" instead of picks.

### 2. Dashboard "Develop This Week" (long-term picks)
- **Component:** `src/components/dashboard/LongTermVideoSuggestions.tsx`.
- **Fires:** On the athlete dashboard.
- **Trigger:** Reads the latest `hie_snapshots.weakness_clusters` plus a
  14-day rolling window of `performance_sessions`. If there are no weakness
  clusters and no recent sessions, it shows the empty-state copy ("Log a few
  more sessions and Hammer will queue long-term picks here.") **There is no
  hard session-count threshold** — but practically, a brand-new account with
  zero saved sessions and no HIE snapshot will see the empty state.

### 3. Weakness Cluster Cards
- **Component:** `src/components/hie/WeaknessClusterCard.tsx`.
- **Fires:** Whenever a weakness cluster is materialized for the athlete and
  the cluster's tag set matches tagged videos. Requires the HIE snapshot
  pipeline to have produced clusters.

### 4. Post-Analysis Picks (video analyzer)
- **Page:** `src/pages/AnalyzeVideo.tsx`.
- **Fires:** After a video is analyzed; suggestions reflect the
  `detected_issues` for that specific video.

All four share the same engine (`src/lib/videoRecommendationEngine.ts`) and
hook (`src/hooks/useVideoSuggestions.ts`). Tags set once in the Video
Library feed every surface — you don't tag per-surface.

---

## Why no one has gotten a pick yet (current state, verified)

As of the last check on this database:

| metric | value |
| --- | --- |
| `library_videos` total | 10 |
| `library_videos` with a non-empty `skill_domains` | **3** |
| `video_tag_assignments` rows | 66 |
| `video_user_outcomes` rows (picks ever shown to a user) | **0** |

**Diagnosis:** 7 of 10 library videos have an **empty `skill_domains` array
and zero tag assignments**. Those 7 are effectively dark — the engine can't
see them. The 3 hitting videos that *are* tagged correctly will surface, but
only when an athlete saves a hitting session whose patterns/result tags
overlap the tags on those videos.

This is not a bug in the engine. It's a content-tagging gap.

### Fix the dark videos (per video, 60 seconds each)
1. Open Owner → Video Library → edit the video.
2. Set `skill_domains` to the correct discipline(s) — e.g. `["hitting"]`.
3. Add at least one tag assignment. Aim for 3–5 movement-pattern or
   result-tag rows from the taxonomy for that discipline.
4. Save. The very next matching session save will show it.

---

## Verify a newly tagged video is live (3-minute check)

1. In the Video Library, confirm `skill_domains` includes the discipline you
   expect.
2. Confirm it has ≥1 row in `video_tag_assignments` for that discipline's
   taxonomy.
3. Log a quick practice session that exercises the tagged pattern (drill
   that produces those result tags / movement patterns).
4. Save the session — the post-session summary should display the video
   under "Hammer Picks for You" within seconds.
5. Cross-tab invalidation is wired: saving a session or rep broadcasts
   `data-sync` (`session_saved`, `analysis_complete`) and forces every open
   tab to refresh picks.

If it still doesn't appear:
- Re-check `skill_domains` (most common cause).
- Re-check that the tag IDs in `video_tag_assignments` exist in
  `video_taxonomy` for that skill domain.
- Open the browser console — `useVideoSuggestions` logs candidate fetch
  counts and reason strings; reasons surface in the UI under each pick
  ("Why these?").

---

## Field reference — what the owner controls

| Field | Where it lives | What it does |
| --- | --- | --- |
| `skill_domains` | `library_videos` | Gates which discipline considers the video. **Required.** |
| `video_tag_assignments` | `video_tag_assignments` | Rows linking video → taxonomy tag → weight. Primary match surface. |
| `distribution_tier` | `library_videos` | Eligibility tier (free vs. premium). |
| `ai_description`, `description` | `library_videos` | Soft-signal text match. |
| `confidence_score` | `library_videos` | Tie-breaker for ranking. |

---

## What is NOT included here

- Sensor-ingested (Blast/Zepp) pick paths.
- Coach-curated playlists (bypass the recommendation engine entirely).
- Admin-side "preview picks for this tag set without doing a test session"
  tooling — not currently built; if you want a live preview surface, that
  is a separate scoped task.
