## Goal
Move the L/R side selector so it sits directly under the "Enable Hammer Analysis" toggle on the Video Analysis screen — the natural place for switch hitters / ambidextrous throwers to declare which side this upload belongs to before it's filed away.

## Changes

1. **`src/pages/AnalyzeVideo.tsx` — header row**
   - Remove the `<SideContextPicker>` currently rendered in the top-right button cluster (next to Delete / Back). That's the cramped placement visible in the screenshot.

2. **`src/pages/AnalyzeVideo.tsx` — below Enable Hammer Analysis toggle (~line 1134)**
   - Add a new panel that renders only when `shouldShowPicker(sideDiscipline)` is true (switch hitter for hitting, ambidextrous for throwing/pitching).
   - Panel content:
     - Label: "Filing side" with sub-copy explaining that the analysis, notes, and drills from this video will be filed under the selected side of the athlete's profile.
     - `<SideContextPicker discipline={sideDiscipline} size="md" />` (larger, easier to tap).
   - Styled to match the neighboring toggle card (`p-3 bg-muted/30 rounded-lg border`) so it visually chains to the toggle.

3. **No behavior changes elsewhere.** The side value continues to flow through the existing `activeSide` → upload → `videos.batting_side` / `throwing_hand` → downstream filing path already in place (lines 166, 641). Non-switch / non-ambi athletes still see nothing (picker auto-hides), preserving the switch/ambi gating invariant from `.lovable/side-context-mastery.md`.

## Out of scope
- No schema, RLS, or filing logic changes.
- No changes for single-side athletes.
