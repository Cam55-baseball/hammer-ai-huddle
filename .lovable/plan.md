

# Pass 4-8: Batch Processing, Coach AI, Comparison Tool, Admin Panel

## Pass 4: Batch Nightly Processing with Error Isolation

### `supabase/functions/nightly-mpi-process/index.ts`

Currently processes all athletes sequentially in a single loop (line 186: `for (const athlete of athletes)`). Refactor to:

1. Split athletes into batches of 50
2. Wrap each athlete in try/catch so one failure doesn't crash the batch
3. Track per-batch timing and log failures
4. If total runtime exceeds 50 seconds (`Date.now() - nightlyStartTime > 50000`), stop processing and log remaining athletes
5. After all batches complete, trigger `hie-analyze` for each successfully processed user (fire-and-forget via `fetch()` to the function URL)

The core MPI calculation logic stays identical — only the iteration wrapper changes.

### `supabase/functions/nightly-mpi-process/index.ts` — Post-nightly HIE triggers

After the main processing loop completes, for each processed athlete ID, invoke `hie-analyze` via `fetch()` to `${SUPABASE_URL}/functions/v1/hie-analyze` with the service role key. Fire-and-forget (no await on response).

---

## Pass 5: Coach Intelligence — AI Team Plans + Real Alerts

### `src/components/hie/TeamWeaknessEngine.tsx` — Add AI-generated team drill blocks

Currently just shows aggregated weakness counts. Enhance to:
1. After computing weakness patterns, call an edge function to generate team drill blocks via AI
2. New edge function: `supabase/functions/hie-team-plan/index.ts` — accepts `{ weakness_patterns, team_size }`, calls Lovable AI (Gemini) with a system prompt to generate 3-5 team drill blocks per weakness, returns structured JSON
3. Display generated drill blocks below each weakness pattern with drill name, duration, and focus area
4. Cache results in `hie_team_snapshots.suggested_team_drills` so AI isn't called on every render
5. Add a "Generate Team Plan" button that triggers the AI call

### `src/components/hie/CoachAlertPanel.tsx` — Already reads real alerts

This component already reads `risk_alerts` from player snapshots and flags stalled players (lines 10-15). It also shows truncated UUIDs instead of names (line 40: `item.userId.slice(0, 8)`). Fix:
1. Accept a `playerNames: Record<string, string>` prop from `CoachDashboard`
2. Display actual player names instead of UUID fragments

### `src/pages/CoachDashboard.tsx` — Wire names into alert panel

Build a `nameMap` from `following` players and pass it to `CoachAlertPanel` and `CoachPlayerCard`. The `following` array already contains `id` and `full_name`.

### `src/components/hie/PlayerComparisonTool.tsx` — New component

Side-by-side comparison of two players' HIE snapshots:
1. Two dropdowns to select players from the team roster
2. Compare: MPI, development status, readiness, weakness clusters, prescriptive actions
3. Visual diff with color coding (green = better, red = worse)
4. Add to `CoachDashboard.tsx` after TeamWeaknessEngine

---

## Pass 6: Launchable Drills (Already Done)

`PrescriptiveActionsCard.tsx` already has "Start" buttons that navigate to Practice Hub with query params (lines 14-26). This pass is complete.

---

## Pass 7: Adaptive Learning Loop (Partially Done)

The `drill_prescriptions` table exists. `hie-analyze` already writes prescriptions (line 970) and updates effectiveness (line 961). What's missing:

### `src/components/hie/ProofCard.tsx` — Show drill effectiveness data

Currently shows before/after trends from `hie_snapshots.before_after_trends`. Also display data from `drill_prescriptions`:
1. Fetch `drill_prescriptions` for the user via a new query in `useHIESnapshot` or a dedicated hook
2. Show each prescribed drill with pre_score, post_score, effectiveness_score, and adherence_count
3. Color code: green if effectiveness > 0, red if < 0, gray if no post_score yet

---

## Pass 8: Owner Admin Panel

### Migration: Insert default engine settings

Use insert tool (not migration) to seed `engine_settings` with default values from `ENGINE_CONTRACT.ts`:
- `mpi_weight_bqi` = 0.25
- `mpi_weight_fqi` = 0.15
- `mpi_weight_pei` = 0.20
- `mpi_weight_decision` = 0.20
- `mpi_weight_competitive` = 0.20
- `integrity_threshold` = 80
- `retroactive_window_days` = 7
- `data_gate_min_sessions` = 60

### `src/pages/AdminEngineSettings.tsx` — New page

- Gated behind `useOwnerAccess()` — redirects if not owner
- Fetches all rows from `engine_settings`
- Renders each as an editable input (number or text based on value type)
- Save button updates values via `supabase.from('engine_settings').update()`
- Logs changes to `audit_log`
- Header: "Engine Settings — Owner Only"

### `src/App.tsx` — Add route

Add lazy import and route: `<Route path="/admin/engine-settings" element={<AdminEngineSettings />} />`

### `supabase/functions/hie-team-plan/index.ts` — New edge function

Accepts `{ weakness_patterns, team_size, sport }`. Uses `LOVABLE_API_KEY` to call Gemini with a structured prompt asking for team drill blocks. Returns JSON array of drill blocks with `name`, `duration`, `focus`, `description`, `intensity`.

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/nightly-mpi-process/index.ts` | Add batch processing (batches of 50) + error isolation + post-run HIE triggers |
| `supabase/functions/hie-team-plan/index.ts` | New — AI team drill plan generation |
| `src/components/hie/TeamWeaknessEngine.tsx` | Add AI drill block generation + display |
| `src/components/hie/CoachAlertPanel.tsx` | Accept playerNames prop, show real names |
| `src/components/hie/PlayerComparisonTool.tsx` | New — side-by-side player comparison |
| `src/components/hie/ProofCard.tsx` | Add drill_prescriptions effectiveness display |
| `src/pages/CoachDashboard.tsx` | Wire nameMap to alerts/cards, add comparison tool |
| `src/pages/AdminEngineSettings.tsx` | New — owner admin panel for engine tuning |
| `src/App.tsx` | Add `/admin/engine-settings` route |
| Insert SQL | Seed `engine_settings` with ENGINE_CONTRACT defaults |

