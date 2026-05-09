## Goal

Long, holistic "A–Z philosophy" videos (hitting/pitching/throwing/fielding/baserunning/mental) don't fit the current tag taxonomy — they cover everything, so they get tagged poorly, score poorly, and never surface. We need a first-class **Foundations** class that:

1. Is one-tap to tag for the owner (no fighting the per-rep taxonomy).
2. Has its own discovery surface (athletes can browse it deliberately).
3. Gets **automatically suggested** by the engine at the right moments: new-to-the-app, fragile foundation, or "lost" (mechanics + results both deteriorating).

## What we add

### 1. New video class: `foundation` (separate from `video_format`)

Add a column `library_videos.video_class text` with values: `application` (default — the existing rep/drill/breakdown world) or `foundation`. Foundation videos still keep `skill_domain` (hitting / pitching / throwing / fielding / base_running / mental) but **bypass per-rep movement/result/context tagging**. Instead they carry a small, fixed set of foundation chips:

- **Domain** (one) — Hitting · Pitching · Throwing · Fielding · Base Running · Mental Game · Strength · Nutrition · Regulation
- **Scope** (one) — A–Z Philosophy · Mechanics Primer · Mental Framework · Strategy & IQ · Lifestyle / Habits
- **Audience Level** (one or many) — New to Sport · Beginner · Intermediate · Advanced · All Levels
- **Refresher Triggers** (multi) — `new_user_30d` · `fragile_foundation` · `lost_feel` · `mechanics_decline` · `results_decline` · `pre_season` · `post_layoff` · `confidence_low` · `philosophy_drift`
- **Length tier** (auto from duration) — Short (<10m) · Standard (10–25m) · Deep Dive (25–60m) · Masterclass (60m+)

These are stored as a structured JSON column `foundation_meta jsonb` so we don't pollute `video_tag_assignments`.

Owner UX: in the Upload Wizard a top-level toggle "**This is a Foundation video (full philosophy / A–Z)**". Flipping it on swaps the Step 3 panel from `StructuredTagEditor` to a new `FoundationTagEditor` — five chip rows, no typing, no taxonomy. The Hammer description composer is reused but with a foundation-specific Focus list (Philosophy · Mechanics · Mental · Strategy · Habits).

Tier rules: foundation videos are exempt from the `recompute_library_video_tier` "missing 4 fields → blocked" rule — completeness is judged on the foundation chips instead. A small SQL branch handles this.

### 2. New athlete surface: "Foundations" shelf

Inside `VideoLibrary.tsx` add a top-row shelf above the normal feed: **"Foundations — refresh your base"**. It shows the user's domain-relevant foundation videos, sorted by:

1. Direct trigger match (see §3) — pinned with a reason chip ("Recommended: your timing has slipped this week").
2. Length tier matching the user's available time signal (recently long sessions → Deep Dive surfaces; short windows → Standard).
3. Recency.

Also a dedicated `/video-library/foundations` route with filter chips (Domain · Scope · Length).

### 3. Trigger engine — when Hammer auto-suggests a Foundation video

Add a small derivation `computeFoundationTriggers(userSnapshot)` that returns the set of active trigger keys. Inputs come from data we already track:

| Trigger key | Condition (source) |
|---|---|
| `new_user_30d` | `profiles.created_at` < 30 days OR onboarding completed < 30d ago |
| `fragile_foundation` | Athlete has < 50 logged reps in domain OR no completed Iron Bambino / Tex Vision baseline |
| `lost_feel` | Last 7d: BQI delta ≤ −10 **AND** PEI delta ≤ −10 (mechanics + results both falling) |
| `mechanics_decline` | 14d rolling movement-pattern fault rate up ≥ 25% |
| `results_decline` | 14d competitive_execution down ≥ 15% |
| `confidence_low` | Regulation index < 40 for 3+ days OR self-reported low confidence in last journal entry |
| `pre_season` | Calendar season phase = `pre_season` |
| `post_layoff` | ≥ 14d gap in `custom_activity_logs` for the domain |
| `philosophy_drift` | Hammer chat shows ≥ 2 "I don't know what I'm doing" / "feel lost" intents in last 14d (already classified by `predict-hammer-state`) |

Trigger evaluation runs in two places:
- **`useVideoSuggestions`** — extended with a new `mode: 'foundation'` (cap: 2). When *any* trigger fires, foundation candidates whose `foundation_meta.refresher_triggers` overlap the active triggers get scored.
- **Hammer chat / Today Tips** — when a trigger fires, Hammer surfaces a single foundation suggestion with the trigger reason ("You've felt off this week — refresh your hitting philosophy") instead of a drill.

Scoring formula for foundation suggestions (parallel path, doesn't touch the existing engine):

```
score = 60 (base for trigger match)
      + 20 × (# overlapping triggers − 1)
      + 15 if audience level matches user level
      + 10 if length tier matches user's recent session length pattern
      + tierBoost (existing TIER_BOOST applied last)
      − 30 if user watched this same foundation video in the last 21 days (avoid spam)
```

Hard cap of **1 foundation suggestion per day** per domain (stored in `video_user_outcomes` with `mode='foundation'`) so we don't bury the rep-level prescriptions.

### 4. Minor engine touch

In `recommendVideos`, add an early branch: if `mode === 'foundation'`, use the parallel scorer above instead of the per-tag math. Existing `session` and `long_term` modes are unchanged. `video_class = 'foundation'` is excluded from `session`/`long_term` candidate lists so foundations never compete with drills in the rep-feedback shelf.

## Files touched

- **Migration** — add `library_videos.video_class`, `library_videos.foundation_meta jsonb`, default `'application'`; update `recompute_library_video_tier` to treat foundation videos by foundation completeness; backfill existing rows to `'application'`.
- `src/lib/videoRecommendationEngine.ts` — add `'foundation'` to `SuggestionMode`, parallel scorer, candidate filtering by `video_class`.
- `src/lib/foundationTriggers.ts` *(new)* — pure `computeFoundationTriggers(snapshot)` with the table above; fully unit-testable.
- `src/hooks/useFoundationSnapshot.ts` *(new)* — fetches the inputs (recent BQI/PEI deltas, regulation, season phase, layoff, Hammer intents) into one snapshot.
- `src/hooks/useVideoSuggestions.ts` — accept `mode: 'foundation'` and pass triggers through.
- `src/components/owner/FoundationTagEditor.tsx` *(new)* — five chip rows + reuses `HammerDescriptionComposer`.
- `src/components/owner/VideoUploadWizard.tsx` — top-level "Foundation video" toggle that swaps the Step 3 panel.
- `src/components/owner/VideoFastEditor.tsx` + `VideoEditForm.tsx` — same toggle for parity.
- `src/pages/VideoLibrary.tsx` — Foundations shelf + filter; new `/video-library/foundations` route.
- `src/components/hammer/HammerSuggestion.tsx` (or equivalent today-tips renderer) — render foundation suggestions with their trigger reason.

## Out of scope

- No changes to drill / rep recommendation math.
- No new AI/Hammer model — triggers are deterministic from existing signals.
- No paid-tier gating change; foundation videos inherit existing distribution tier rules.
- No bulk migration of long historical videos — owner re-classifies them with one tap from the library manager.

## Why this is the elite move

- **Owner**: tagging an A–Z philosophy video drops from "fight the taxonomy" to **5 chips + title + URL**.
- **Athlete**: the right philosophy video shows up at the exact moment they need it (lost feel, fragile base, post-layoff, pre-season), with a reason — not buried under drill suggestions.
- **Engine**: parallel path keeps the rep-feedback engine pure; foundation triggers reuse signals we already compute, so cost is near-zero.
- **Data**: new `foundation_meta` is structured JSON, so we can iterate triggers without schema churn.
