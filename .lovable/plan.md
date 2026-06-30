## Slice 2 — AtBat rep-card refit + Defense position-conditional fields

### 1. AtBatLogger → rep-card format
- Wrap each at-bat in `<RepCard accent="hitting">` with numbered rep header, badges (inning, side, count, result), `RepKeyboardHints` ("N" new AB, "P" toggle pitch panel, "U" undo).
- Render the inline `AtBatPitchPanel` as **child reps**: each pitch a mini rep row (#1, #2, …) with accent stripe, pitch result badge, zone chip, delete affordance — matching Practice Hub fill-out look.
- Hitter-vs-pitcher gating: when the user's role this game = hitter, surface swing decision / contact quality / exit direction / pitch type / velocity band / ABS guess / location / pitcher spot intent / batter side. All founder-protected fields preserved — none removed.
- Add `undoToast` parity on pitch deletes inside the panel.

### 2. DefenseLogger → position-conditional rep fields
- Drive the new-play form via `getContextFields(module="fielding", position, sport, sessionType)` from `src/data/contextAppropriatenessEngine.ts`.
- Conditional field groups inside the form:
  - **C** → pop time, transfer, throw base, blocking
  - **Infield (P/1B/2B/3B/SS)** → infield rep type (DP / clean-pick), play direction, throw fields
  - **OF (LF/CF/RF)** → play direction, throw fields, route quality
- Keep all founder-protected metrics (pop_time, transfer, throw_base, time_to_first, arm_velo, play_direction, infield rep type) — show/hide only, never delete.
- Rep card visuals already shipped in slice 1; this slice only changes the **form**.

### Files touched
- `src/components/games/AtBatLogger.tsx` (rep-card refit + child-pitch reps)
- `src/components/games/AtBatPitchPanel.tsx` (mini-rep visual treatment, undo toast)
- `src/components/games/DefenseLogger.tsx` (position-conditional form)
- No schema changes, no route changes, no founder-protected field removed.

### Verification
- `bunx tsgo --noEmit` clean.
- `bash scripts/preflight.sh` green.
- Playwright smoke: open a game → log 1 AB with 4 pitches (auto-close on K) → log defensive chances for C, SS, CF and screenshot the conditional fields.

### Out of scope (next continuation slices)
1. PitchLogger pitcher-only rep sheet with location grid (standalone-pitcher view polish).
2. SubLogger field polish to match.
3. The 7 deferred audit items (RLS sweep, edge heartbeats, GP→roadmap per-skill deltas, side-context heatmaps, importer UX, onboarding resume deep-link, drift markers) — each as its own approval slice until zero fragments.
