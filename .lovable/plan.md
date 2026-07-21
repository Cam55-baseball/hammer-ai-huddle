## Remaining work: Phase 4 §5 — Authoring subcomponent extraction

Gaps 1–4 from `.lovable/plan.md` are already shipped (verified in current source). Only §5 hygiene refactor remains.

### Extract from `src/pages/owner/IqSituationsAuthoring.tsx` (532 lines)

Split into three focused components with no behavior change:

1. `src/components/iq/authoring/IqDefenderPositionEditor.tsx` — 9-role defender drag/click-to-place editor and role picker.
2. `src/components/iq/authoring/IqBallTrackEditor.tsx` — click-to-append waypoint editor for the ball track with clear/undo.
3. `src/components/iq/authoring/IqActorCueForm.tsx` — per-actor cues form (footwork, communication call, eyes target, elite cue, common mistake, coaching note, start/end time).

### `IqSituationsAuthoring.tsx` slim-down

Keep only page-level scaffolding: metadata form (sport, slug, title, summary, difficulty rung, debrief, concepts), draft save, publish toggle, live `IqDiamond` preview, plus imports of the three new components. Props are plain callbacks passing the working situation state up.

### Verification

- `tsgo` passes.
- `/owner/iq/situations` loads; creating/editing a scenario still saves defenders, ball track, actor cues, metadata unchanged.
- Live preview mirrors edits identically.
- File shrinks materially (~150–200 lines) and imports the three new files.

Once merged, the plan is fully complete E2E.