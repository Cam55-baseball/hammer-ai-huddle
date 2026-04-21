

## Plan — Finish Recap V2 Wiring (Steps 2–4)

Phase 1 (context engine, correlation engine, season profiles, prompt injection, admin component, migration) is done. Three steps remain to make V2 user-visible and verified.

### Step 1 — Persist V2 fields into saved recap

Edit `supabase/functions/generate-vault-recap/index.ts`:
- Extend the saved `recapData` payload (the object inserted into `vault_recaps.recap_data`) to include the new AI-returned keys: `context_header`, `trend_insights`, `transfer_analysis`, `physical_impact`, `system_correlations`, `elite_suggestions`.
- Also persist the deterministic `correlationInsights` and a slim `globalContextSnapshot` (season phase, MPI current/delta, transfer gap, workload summary) so the UI can render truth fields without re-querying.
- Bump a `recap_version: 'v2'` field on the saved row for forward compatibility.

### Step 2 — Mount RecapEngineSettings in admin

Edit `src/pages/AdminEngineSettings.tsx`:
- Wrap the existing single-card layout in a `Tabs` component with two tabs:
  - **"HIE Engine"** — the existing `engine_settings` editor (current content unchanged).
  - **"Recap Engine"** — renders `<RecapEngineSettings />` (the component already created).
- Owner-gating already exists via `useOwnerAccess`; no new guard needed.

### Step 3 — Render new V2 sections in UnifiedRecapView

Edit `src/components/vault/UnifiedRecapView.tsx`:
- Add 5 new collapsible sections, each rendered ONLY when the corresponding key exists on `recap.recap_data` (backward compatible — old recaps unchanged):
  1. **Context Header** (top) — season phase chip, player summary line, workload summary line.
  2. **Trend Insights** — improved[], declined[], block_comparison narrative.
  3. **Transfer Analysis** — practice→game delta number + narrative.
  4. **Physical Impact** — body changes + performance correlation.
  5. **System Correlations** — movement×results, physical×performance, workload×outcome, key_insight.
  6. **Elite Suggestions** — priority-ordered cards with rationale and `season_appropriate` badge.
- Reuse existing Card / Collapsible primitives. No new design tokens.

### Step 4 — Deploy + smoke test

- Deploy `generate-vault-recap` edge function.
- Pull one recent test user's recap row via `supabase--read_query` to confirm V2 keys land in `recap_data`.
- Confirm `/admin/engine-settings` shows the new "Recap Engine" tab and saves to `recap_engine_settings`.

### Files

**Edited**
- `supabase/functions/generate-vault-recap/index.ts` — persist V2 fields + version stamp
- `src/pages/AdminEngineSettings.tsx` — add Tabs wrapper with Recap Engine tab
- `src/components/vault/UnifiedRecapView.tsx` — render 6 new conditional sections

**Deployed**
- `generate-vault-recap`

### Verification

1. `/admin/engine-settings` → two tabs visible; "Recap Engine" tab shows sliders for all 10 input sources, section toggles, season-overrides JSON; save persists to `recap_engine_settings`.
2. Generating a fresh recap → DB row contains `recap_version='v2'` and the 6 new keys under `recap_data`.
3. `UnifiedRecapView` renders Context Header at top, plus Trend / Transfer / Physical / Correlations / Elite Suggestions sections when present.
4. Older recaps (no V2 keys) render exactly as before — no empty cards, no errors.
5. Owner sets `mpi: 0` weight → next regeneration's prompt omits MPI block; recap text no longer references MPI.

