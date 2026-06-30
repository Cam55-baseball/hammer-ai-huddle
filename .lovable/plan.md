## Slice 3 — PitchLogger pitcher rep sheet + SubLogger polish

### Scope
Bring the remaining two Game Hub loggers up to Practice-Hub `RepCard` parity, then unblock the 7 deferred audit items.

### 1. PitchLogger — pitcher-only rep sheet
Refit `src/components/games/PitchLogger.tsx` so each logged pitch is a numbered child rep inside the outing context:

- Wrap each pitch row in `RepCard` with sky/pitching accent stripe and rep number.
- Header badges: inning, pitch # of PA, pitch type, velo, result (ball/called/swinging/foul/in-play).
- Meta row: zone, spin, intent vs result delta, batter side, count before pitch.
- Form gating via `showPitcherHitterOutcomes` flag:
  - Always: pitch type, intent zone, actual zone, velo, spin, result.
  - When hitter-outcomes on: contact type, exit direction, hard-hit flag.
- `RepKeyboardHints` for fast logging (B/C/S/F/I shortcuts).
- `showUndoToast` on pitch delete (mirror AtBatPitchPanel pattern).
- Preserve every founder-protected column; fold UI-only extras into `notes` if no column exists yet.

### 2. SubLogger field polish
Update `src/components/games/SubLogger.tsx` to match the rep-sheet visual language:

- `RepCard` with neutral/slate accent.
- Badges: inning, sub type (offensive/defensive/pitching), in/out player, position.
- Meta row: reason, leverage, runners-on state.
- `RepKeyboardHints` (O/D/P/R shortcuts).
- Undo on delete.

### 3. Then the 7 deferred audit items
After loggers ship, work through in order:

1. RLS sweep across `gp_*` tables — confirm policies + GRANTs.
2. Edge function heartbeats for long-running analyses.
3. GP → roadmap per-skill delta wiring in `useGpSignal.ts`.
4. Side-context heatmaps in `GameReports.tsx` (L/R split).
5. SeasonScheduleImporter UX polish (preview diff, dedupe).
6. Onboarding resume deep-link by step ID.
7. Drift markers in `scripts/check-eternity-guards.sh`.

### Verification
- `tsgo` typecheck after each logger.
- Manual smoke via preview: log a pitch, undo, log a sub, undo.
- Confirm founder-protected columns still written (read back via `supabase--read_query`).

### Out of scope
- No schema migrations this slice (extras → notes as stopgap, same as DefenseLogger).
- No changes to AtBatLogger or DefenseLogger.
