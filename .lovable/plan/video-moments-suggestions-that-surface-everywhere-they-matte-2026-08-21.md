# Video Moments — suggestions that surface everywhere they matter

Right now video suggestions only appear inline in two places, and they silently disappear whenever the engine has nothing tagged to match. Verified in the code:

- `AnalyzeVideo.tsx` imports `VideoSuggestionsPanel` but never renders it — after an analysis the athlete gets no videos at all.
- `PostSessionSummaryV2.tsx` renders the panel only when the session produced movement or result tags; otherwise it returns `null`.
- The suggestion hook itself is disabled unless at least one movement/result tag exists, so "no tags" always means "no videos".
- Game logging (`GameSheet`, `AtBatLogger`, `PitchLogger`, `DefenseLogger`, `BaserunLogger`), DelayCam clip saves, daily-plan card completions and drill completions have no suggestion surface at all.

## What we build

**1. One shared "Video Moment" system**

A single moment component that can render either as an inline card (where it fits the page) or as a pop-up sheet right after a meaningful event. Same engine, same tracking, one place to fix things.

**2. It never comes up empty**

Three-tier fallback so an athlete always gets something relevant:
1. Tag-matched suggestions from what just happened (best).
2. Domain + position + sport picks (e.g. catcher, softball, throwing) when the event produced no tags.
3. Foundation videos for that skill area when the library has no application matches yet.

If literally nothing exists for the athlete's sport/position, the moment shows a short honest line instead of vanishing, so it never looks broken.

**3. Moments fire at every applicable point**

- After video analysis completes (all modules: hitting, pitching, throwing, fielding, base running) — pop-up with the exact flaws the analysis found.
- After a practice session is saved (both summary versions) — inline, upgraded to always-populated.
- After a game is logged / finished in the Game Hub — from at-bat outcomes, pitch results, defensive plays and baserunning events.
- After a DelayCam clip is saved to Players Club.
- After a daily-plan skill card is completed (hitting, bat speed, throwing, fielding, base running, pitching).
- After a drill is marked complete.
- When a weakness cluster is detected (already exists — routed through the shared component).

**4. Every subscription and sport is covered**

Moments respect the athlete's subscription and sport access: an athlete only sees moments for modules they own, and softball athletes never receive baseball-only assets (that gate already exists in the engine and stays). Switch hitters / ambidextrous athletes get moments scoped to the side they just logged.

**5. Frequency control so it stays a signal, not spam**

Per-moment cooldown and a daily cap, plus "not now" and "already watched" handling so the same video does not chase an athlete all week. Impressions and watches keep flowing into the existing tracking so we can see what actually lands.

## Technical notes

- New `src/lib/videoMoments/` module: moment registry (`analysis_complete`, `session_saved`, `game_logged`, `delaycam_saved`, `plan_card_complete`, `drill_complete`, `weakness_detected`), each mapping event payload -> `{ skillDomain, mode, movementPatterns, resultTags, contextTags, side }` via the existing `analysisToTaxonomy` helpers.
- `useVideoMoment(event)` wraps `useVideoSuggestions`, adds the fallback chain (tagged -> domain/position -> `useFoundationVideos`) and removes the "no tags = disabled" dead end.
- `VideoMoment` component with `variant="sheet" | "inline"`, reusing `VideoSuggestionsPanel`'s row rendering and the existing `trackVideoSuggestionShown` / `trackVideoWatched` calls.
- Cooldown/cap state in `localStorage` keyed by user + moment + video, mirroring the existing owner-learning store pattern (no new tables needed).
- Call sites: `AnalyzeVideo.tsx`, `PostSessionSummary.tsx`, `PostSessionSummaryV2.tsx`, `GameSheet.tsx` (+ the four loggers feeding it), `DelayCam.tsx` save path, the daily-plan card completion handler, `useDrillAssignments` completion, `WeaknessClusterCard.tsx`.
- Sport/position gating and subscription checks reuse `useSportTheme`, `resolvePositionGroups` and `useSubscription` — no new gating logic.

## Verification before this is called done

- Trigger each of the seven moments in the preview and confirm a populated result (or the honest empty line) for both sports and for a position-scoped athlete.
- Confirm a free / unsubscribed athlete gets no moment for modules they don't own.
- Confirm cooldown suppresses a repeat of the same moment within its window.
