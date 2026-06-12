# Hammer Picks — Where Owner-Tagged Videos Show Up

This is the single owner-facing reference for **where** videos uploaded and tagged in the owner Video Library are actually surfaced to athletes. If a video is correctly tagged and a session matches those tags, it WILL appear in the surfaces below. If it isn't showing up, use the verification checklist at the bottom.

---

## The four surfaces

### 1. Post-Session Picks (highest signal)
- **Component:** `src/components/practice/PostSessionVideoSuggestions.tsx` → `VideoSuggestionsPanel` (mode `"session"`).
- **When it fires:** Immediately after a saved practice session, on the post-session summary screen.
- **What drives selection:** The session's `drill_blocks`, `detected_issues`, `session_context`, plus the resolved `skill_domain`. Aggregated through `aggregateSessionToTaxonomy()` into `movementPatterns`, `resultTags`, and `contextTags`.
- **Owner control:** Tag a video with the matching `skill_domains` and assign `video_tag_assignments` whose tag IDs map to the patterns or result tags the engine surfaces for that drill set.

### 2. Dashboard Long-Term Picks
- **Component:** `src/components/dashboard/LongTermVideoSuggestions.tsx` → `VideoSuggestionsPanel` (mode `"long_term"`).
- **When it fires:** On the athlete dashboard, driven by the athlete's long-term weakness profile (not a single session).
- **Owner control:** Same tagging surface; videos with stronger pattern coverage of an athlete's recurring weak tags rank higher.

### 3. Weakness Cluster Cards
- **Component:** `src/components/hie/WeaknessClusterCard.tsx`.
- **When it fires:** When a weakness cluster is materialized for the athlete and the cluster's tag set matches tagged videos.

### 4. Post-Analysis Picks (video analyzer)
- **Page:** `src/pages/AnalyzeVideo.tsx`.
- **When it fires:** After a video is analyzed; suggestions reflect the issues detected in that specific video.

All four surfaces share the same engine (`src/lib/videoRecommendationEngine.ts`) and the same hook (`src/hooks/useVideoSuggestions.ts`). Tags set once in the Video Library flow into every surface.

---

## What the owner controls

When uploading or editing a video in the owner Video Library, the fields that matter for selection are:

| Field | Where it lives | What it does |
| --- | --- | --- |
| `skill_domains` | `library_videos` | Gates which discipline (hitting, pitching, throwing, etc.) considers the video. **Required.** |
| `video_tag_assignments` | `video_tag_assignments` (rows linking video → taxonomy tags with a weight) | The primary match surface. Athlete-side patterns and result tags are matched against these. |
| `distribution_tier` | `library_videos` | Controls eligibility tier (e.g., free vs. premium). |
| `ai_description`, `description` | `library_videos` | Read by the engine for soft-signal matching. |
| `confidence_score` | `library_videos` | Tie-breaker for ranking. |

If a video has **no `skill_domains`** or **no `video_tag_assignments`**, it is invisible to every surface above. That is the most common "my picks aren't showing up" cause.

---

## Verify a newly tagged video is live (3-minute check)

1. Open the Video Library, confirm the video's `skill_domains` includes the discipline you expect (e.g., `hitting`).
2. Confirm it has at least one row in `video_tag_assignments` pointing at the taxonomy tag(s) you intend (movement pattern or result tag).
3. Log a quick practice session that exercises the tagged pattern (drill that produces those result tags / movement patterns).
4. Save the session — the post-session summary should display the video under "Hammer Picks for You" within seconds. If multiple videos match, the engine ranks by tag match weight, then by `distribution_tier` / `confidence_score`.
5. Cross-tab invalidation is wired: saving a session or rep broadcasts `data-sync` (`session_saved`, `analysis_complete`) and forces every open tab to refresh suggestions.

If it still doesn't appear:
- Re-check `skill_domains` — most often the cause.
- Re-check that the tag IDs in `video_tag_assignments` exist in `video_taxonomy` for that skill domain.
- Open the browser console — `useVideoSuggestions` logs candidate fetch counts and reason strings; reasons surface in the UI under each suggestion ("Why these?").

---

## What is NOT included here

- Sensor-ingested (Blast/Zepp) suggestion paths.
- Coach-curated playlists (those bypass the recommendation engine entirely).
- Admin-side "preview suggestions for this tag set" tooling — not currently built; if the owner wants a live preview surface separate from doing a test session, that is a separate scoped task.
