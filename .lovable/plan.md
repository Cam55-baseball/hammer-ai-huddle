# Make System Non-Negotiable Cards Real Tasks (Daily Mental Reset, etc.)

## The problem

When an athlete taps a system-created Non-Negotiable on the Game Plan (e.g. **Daily Mental Reset**), the detail dialog opens but it currently shows nothing actionable:

- The template's `purpose`, `action`, and `success_criteria` (which exist in the DB and are full of context) are never rendered.
- Because the template has zero sub-tasks, the dialog falls into the "No sub-tasks to track. Tap the button below when you're done" empty state.
- There is no countdown / timer / guided execution — so a "2-minute mental reset" has no 2-minute element. The user just sees a "Mark Complete" button, which feels fake.

The Game Plan row itself is clean (small flame icon, no clutter — keep that). The fix is entirely inside the **detail dialog** that opens on tap.

## What we'll change

### 1. Render the NN context block (always, when present)

In `src/components/CustomActivityDetailDialog.tsx`, directly under the header, render a structured **"What this is"** block whenever the template has any of `purpose`, `action`, or `success_criteria`:

- **Purpose** — one-line "why" (italic, muted)
- **The Action** — the exact instruction (bold body text, primary readability)
- **Success Criteria** — what counts as done (with a small target icon)
- **Source** badge (e.g. "Hammer Standard · Phase 9") in the corner, only when `template.source` is set — signals this is a system standard, not a user activity.

This replaces the current "No sub-tasks to track" empty state for system NN cards. For ordinary user activities with no NN context, the existing empty state stays.

### 2. Add a real interactive task: the Reset Timer

For NN templates whose `action` clearly implies a timed focus block (detected via `duration_minutes` being set OR action text matching "minute"/"breath"/"reset"), render an embedded **Reset Timer**:

- Big, legible MM:SS display, monospaced, ~5xl on mobile so it's actually usable on the 440px viewport.
- **Start / Pause / Reset** controls.
- Uses `performance.now()` + `requestAnimationFrame` (per the CNS Readiness Test standard) so it stays accurate when the tab backgrounds.
- Default duration = `template.duration_minutes ?? 2` minutes for Daily Mental Reset.
- On natural completion: light haptic + auto-trigger the existing `onComplete()` flow and close — the timer **is** the verification of `success_criteria`.
- Manual "Mark Complete" button stays visible underneath as an escape hatch.

### 3. Wire it up cleanly

- Keep the Game Plan row visuals exactly as they are now (clean, flame icon only).
- All depth lives inside the dialog → row stays minimal, dialog becomes the real task.
- Reuse `customColor` from the template for timer accent so each NN keeps its identity.
- No new tables, no edge function changes, no new dependencies.

## Files touched

- `src/components/CustomActivityDetailDialog.tsx` — add NN context block + Reset Timer subcomponent; replace empty state for NN templates.
- (New) `src/components/identity/NNResetTimer.tsx` — small self-contained rAF-based timer used by the dialog.

## What stays the same

- Game Plan row UI (flame icon, no red glow) — unchanged.
- Behavioral evaluator, notifications, NN suggestions, Hammer engine — unchanged.
- The "Mark Complete" button continues to write to `custom_activity_logs` via the existing `onComplete` path (single source of truth preserved).

## Out of scope

- Editing system NN templates from the UI (still owner-only).
- New NN types beyond the timer pattern (future: breath-pacing visual, journaling prompt) — intentionally deferred.
