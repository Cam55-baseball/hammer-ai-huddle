## Scope (this approval slice)

Two deliverables. Approve to ship; I will then ask for the next continuation slice until zero fragments remain.

### 1. Sidebar reorganization
- Move **The General** into the **Main navigation** group (top section with Home, Hammer, Calendar, IQ).
- Move **Organization** into the **Game Hub** group (alongside Games, Reports, Scouting Profiles).
- Single edit in `src/components/AppSidebar.tsx`. No route changes, no behavior changes — pure grouping. Active-state and collapsed/icon mode preserved.

### 2. Game Hub loggers → Practice Hub "rep sheet" format

Goal: every logged event in a game looks and feels like a Practice Hub rep card — one card per rep, role/position-conditional fields, founder-protected metrics intact, keyboard-driven, undo on every rep.

Per-logger work:

**AtBatLogger** (`src/components/games/AtBatLogger.tsx`)
- Reformat each at-bat as a **rep card** with the inline pitch panel rendered as **pitch-reps inside the at-bat** (1 pitch = 1 rep, matching Practice Hub visual treatment).
- Hitter-only fields surface when the user's role this game = hitter; pitcher-facing fields hidden.
- Keep all founder-protected metrics: swing decision, contact quality, exit direction, pitch type, velocity band, ABS guess, location, pitcher spot intent, batter side.

**PitchLogger** (`src/components/games/PitchLogger.tsx`)
- Pitcher-only rep sheet: 1 pitch = 1 rep card with location grid, intent vs result, velocity, spin direction, hitter outcome block (gated by `contextAppropriatenessEngine` `showPitcherHitterOutcomes`).
- Inline keyboard shortcuts + undo toast parity with AtBat.

**DefenseLogger** (`src/components/games/DefenseLogger.tsx`)
- Position-conditional rep cards driven by `getContextFields(module, position, sport, sessionType)`:
  - C → pop time, transfer, throw base, blocking
  - Infield (P/1B/2B/3B/SS) → infield rep type, play direction, throw fields
  - OF → play direction, throw fields, route quality
- Each fielding chance = one rep card.

**BaserunLogger** (`src/components/games/BaserunLogger.tsx`)
- Each baserunning event = one rep card: lead type, jump quality, read, outcome, base reached, pitcher/catcher pressure context.
- Keyboard + undo parity.

**SubLogger** (`src/components/games/SubLogger.tsx`)
- Keep simple but bring to the rep-card visual language so the Game Hub feels uniform.

Cross-cutting:
- Shared `<RepCard>` shell extracted to `src/components/games/RepCard.tsx` so all 5 loggers share spacing, header, undo affordance, and keyboard hint row — the Practice Hub look in one component.
- All conditional fields routed through existing `getContextFields()` so logic stays in one place; no founder-protected field is removed.
- `undoToast` already wired in Defense/Baserun/Sub — extend to inline-pitch reps inside AtBat.

### Verification
- `bunx tsgo --noEmit` clean.
- `bash scripts/preflight.sh` green (includes eternity guards).
- Playwright smoke under `/tmp/browser/game-hub-reps/`: open a game, log 1 at-bat with 4 pitches, 1 defensive chance per role, 1 baserunning event, 1 sub — screenshot every rep card.

### Out of scope this slice (next continuation slices)
- Deferred items from part-2 audit (RLS sweep, edge heartbeats, GP→roadmap per-skill deltas, side-context heatmaps, importer UX, onboarding resume deep-link). I'll bring each as its own slice for approval until zero fragments.

## Size
~8 files touched, 1 new shared component, no schema changes, no route changes.
