
# Elite Game IQ — Editor V3, Scenario Auto-Selection & Resolution Audit

Finishes the step-based positioning system by giving owners a coach-grade editor, teaching scenarios to auto-pick the right defensive preset per batter/runners/outs/count, and adding a permanent audit that guarantees every published situation resolves cleanly for RHH + LHH in both sports.

---

## Part 1 — Editor V3 (`IqAlignmentsEditor.tsx`)

Replace the legacy percent-drag UI with a coach-language, step-based editor.

**Layout**
- Header: preset name, sport toggle (Baseball 90' / Softball 60'), status, save state.
- Handedness tabs: **RHH | LHH** (edits `anchors_vs_rhh` vs `anchors_vs_lhh` independently).
- Left: realistic `IqField` (reused from viewer) with 9 draggable defender pucks, live coach-readable label under each ("SS — 4 steps toward 2B, 2 steps back").
- Right: **Numeric Step Panel** for the selected defender(s):
  - `from` (home base of the position) — read-only.
  - `toward` dropdown (2B, 3B, 1B, LF line, RF line, gap, home, mound, etc.).
  - `steps` (lateral, integer, ±).
  - `depthSteps` (in/out, integer, ±).
  - Range disk radius (defensive range in steps).
- Multi-select: shift-click or marquee; step nudges apply to all selected (already supported in V2 — carry forward).
- **Mirror to opposite hand** button: copies current tab's anchors to the other, flipping lateral `toward` (2B↔2B, 3B↔1B, LF line↔RF line, LC gap↔RC gap).
- **Reset defender** / **Reset preset to seed** actions.
- Live **Coverage %** + range-disk overlay recomputed per hand.

**Persistence**
- Writes `anchors_vs_rhh` / `anchors_vs_lhh` (jsonb) via `useIqAlignmentMutations`.
- Also updates legacy `positions_vs_rhh/lhh` (percent) by running anchors through `fieldModel.anchorToPct` so viewers without anchor support stay correct.
- Autosave debounced 800ms + explicit Save button; toast on error.

**Validation**
- Steps clamped to sport bounds (Baseball ±40, Softball ±28).
- Warn (non-blocking) if a defender lands outside fair territory or overlaps another puck within 2 steps.

---

## Part 2 — Scenario Auto-Selection (`alignment_selector`)

Make each situation deterministically resolve to the correct preset given game state.

**Selector schema** (`iq_situations.alignment_selector jsonb`)
```json
{
  "rules": [
    { "when": { "runners": ["1B"], "outs": [0,1], "batter_side": "RHH" }, "preset": "double_play_depth" },
    { "when": { "runners": ["3B"], "outs": [0,1] }, "preset": "infield_in" },
    { "when": { "count": { "balls_gte": 3 } }, "preset": "no_doubles" }
  ],
  "default": "standard"
}
```

**Resolver** (`src/lib/iq/alignmentResolver.ts` — new)
- `resolveAlignment({ situation, batterSide, sport }) → { presetId, anchors, positions, coverage }`.
- Evaluates rules top-down; first match wins; falls back to `default` then to sport `standard`.
- Returns anchor-resolved coords per hand via `fieldModel`.

**Runtime wiring**
- `useIqSituations` selects `alignment_selector` + preset joins.
- `IqScenarioRunner.tsx` calls resolver whenever `batterSide / runners / outs / count` change and passes the result to `IqDiamond`.
- Toggling batter handedness during a scenario re-resolves live.

**Owner UX**
- New "Alignment logic" tab on the situation editor: rule builder (runners chips, outs multi-select, count operators, batter-side selector, preset dropdown). Preview panel shows which rule fires under a chosen game state.

---

## Part 3 — Resolution Audit

Guarantee no published situation ever renders a broken field.

**Edge function** `iq-alignment-audit` (new)
- For every `iq_situations` row where `status = 'published'`:
  - For each sport it supports × {RHH, LHH} × representative game states:
    - Run resolver; assert preset exists, anchors resolve for that hand, no defender falls off-field, coverage ≥ minimum threshold.
  - Collect failures with reason codes (`missing_preset`, `missing_hand_anchors`, `off_field`, `low_coverage`, `no_default`).
- Writes to new table `iq_alignment_audit_runs` (run metadata) + `iq_alignment_audit_findings` (per-situation results). Both RLS-locked to owner role, GRANTed to `authenticated` + `service_role`.

**Owner UI** `/owner/iq/audit`
- "Run audit" button (invokes edge function).
- Table of latest findings grouped by severity, deep-linked to the situation editor and alignment editor.
- Badge on `/owner/iq` nav shows open failure count.

**CI-style guard**
- Publish action on a situation runs a mini-audit inline; blocks publish if any hand fails to resolve.

---

## Technical details

**Files created**
- `src/lib/iq/alignmentResolver.ts`
- `src/components/iq/editor/StepPanel.tsx`, `HandTabs.tsx`, `MirrorButton.tsx`
- `src/components/iq/editor/AlignmentRuleBuilder.tsx`
- `src/pages/owner/IqAlignmentAudit.tsx`
- `supabase/functions/iq-alignment-audit/index.ts`

**Files modified**
- `src/pages/owner/IqAlignmentsEditor.tsx` — full V3 rewrite around anchors + hand tabs.
- `src/hooks/useDefensiveAlignment.ts` — expose anchor writer helpers.
- `src/hooks/useIqSituations.ts` — include `alignment_selector`.
- `src/components/iq/IqScenarioRunner.tsx` — call resolver on state change.
- `src/pages/owner/GameIqSituation.tsx` — add "Alignment logic" tab + inline publish audit.
- `src/pages/owner/GameIqOwner.tsx` — audit failure badge.

**Migrations**
- `iq_alignment_audit_runs` (started_at, finished_at, triggered_by, status, totals).
- `iq_alignment_audit_findings` (run_id, situation_id, sport, batter_side, severity, reason_code, detail jsonb).
- Both: GRANT to `authenticated` + `service_role`; RLS restricting reads/writes to `has_role(auth.uid(),'owner')`; `service_role` bypass for the edge function.

**Constants**
- `SPORT_STEP_BOUNDS`, `RANGE_DEFAULTS`, `COVERAGE_MIN` centralized in `fieldModel.ts`.

---

## Acceptance criteria
1. Owner can drag OR type step values per defender, per hand, per sport, with live coach labels + coverage %.
2. Mirror-to-opposite-hand flips lateral direction correctly for every `toward` landmark.
3. Every scenario in `IqScenarioRunner` auto-picks a preset from `alignment_selector` and re-resolves when batter side / runners / outs / count change.
4. Audit page lists 0 failures after a green run; publish is blocked for any situation with an unresolved hand.
5. Legacy `positions_vs_rhh/lhh` stay in sync so any consumer not yet on anchors still renders correctly.
