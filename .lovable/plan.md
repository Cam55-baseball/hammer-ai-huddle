
# Goal

Make the app treat a **declared switch hitter** or **ambidextrous thrower/pitcher** as effectively two athlete profiles that live under one account. Every video analyzed, drill/video/tip/note saved, and every roadmap / report surface must be filed and viewable **per side (L / R / Both)**, with a required pre-upload side selection.

## Current state (verified)

- `SideContext` already tracks `hit` and `throw` sides, exposes `shouldShowPicker` only when `is_switch_hitter` / `is_ambidextrous_thrower` is true, and persists via `athlete_side_preferences`.
- `AnalyzeVideo.tsx` reads `activeSide` and passes `batting_side` to the analysis edge function, and passes `side` when saving drills.
- Videos table already has `batting_side`, `throwing_side`, `pitcher_arm_side` columns. `vault_saved_drills`, `library_video_likes`, `vault_saved_tips`, `vault_workout_notes` need audit — drills has `side`; likes/tips/notes do not yet.
- Roadmap, progress panels, and video suggestions currently blend both sides.

## Scope

### 1. Pre-upload side gate (declared switch / ambi only)
- In `AnalyzeVideo.tsx`, block the upload button until `SideContextPicker` has an explicit selection for that session when `shouldShowPicker(sideDiscipline)` is true. Persist selection to the video row (`batting_side` for hitting, `throwing_side` / `pitcher_arm_side` for throwing/pitching).
- Add a small "Analyzing as: Left / Right" confirmation chip above the uploader; tapping it re-opens the picker.
- Pitching page (baseball pitching module) uses `throw` discipline; softball pitching keeps `throw` too — one code path.

### 2. Side tagging on every save surface
Migrations add a nullable `side text check (side in ('L','R','both'))` column (only where missing) plus supporting indexes, and update the save UIs to prompt L / R / Both when the athlete is switch/ambi:
- `library_video_likes` — add `side`.
- `vault_saved_tips` — add `side`.
- `vault_workout_notes` — add `side` (already present in some notes; verify).
- `vault_saved_drills` — already has `side`; add "Both" option to the save dialog.
- Uniqueness constraints updated to `(user_id, target_id, side)` so L and R can coexist.

Save dialogs (`SaveToLibraryDialog`, drill save button, tip save, note save) render a compact L / R / Both segmented control ONLY when the athlete is declared switch/ambi for the relevant discipline; otherwise the column stays null.

### 3. Split views in Vault, Library, Roadmap, Reports
- Add a `SideViewTabs` header (L | R | Both) to: Vault (drills / notes / tips), Video Library (liked), Progress panels (hitting + throwing/pitching), Roadmap progress, and Game Reports for the relevant discipline.
- "Both" tab shows the union; L / R tabs filter by `side = 'L' | 'R' | null-with-side-tagged-elsewhere`.
- Default tab = athlete's `last_used_side` for that discipline.

### 4. Split roadmap and reports
- `useVault`, `useSplitAnalytics`, `useSwitchHitterProfile` already carry side info; extend the progress panels and Hammer report card queries to accept a `side` filter and compute separate scorecards.
- Add `SideBadge` to every card in mixed lists so "Both" tab is legible.
- Long-term video suggestion feeds and daily plan side-aware picks already exist via `getSideFor` — extend to include saved-artifact recency per side.

### 5. Onboarding + declaration
- Confirm the onboarding switch-hitter / ambidextrous flag question stores `is_switch_hitter` / `is_ambidextrous_thrower` (already true). No new question needed.

## Out of scope

- Any change to non-declared athletes (single-side users see zero new UI).
- Coach / recruiter dashboards — this is athlete-facing only for now.

## Technical notes

- One migration adds `side` columns + indexes + updated unique constraints on `library_video_likes`, `vault_saved_tips`, `vault_workout_notes`; verifies `vault_saved_drills.side` allows `'both'`.
- New shared component `SideSaveToggle` used by all save dialogs; hidden when `shouldShowPicker` is false.
- New shared hook `useSideFilteredList<T>(items, side, getSide)` for the tab views.
- `AnalyzeVideo` gains a `requireSideBeforeUpload` guard; existing flow untouched for non-switch users.

## Rollout order

1. Migration (columns + indexes + constraints).
2. Save-side toggle component + wire into 4 save dialogs.
3. Pre-upload side gate + video row tagging.
4. `SideViewTabs` in Vault, Library, Progress, Roadmap, Reports.
5. Side-aware report card / roadmap queries.
