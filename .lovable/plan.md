
# Phase 10.2 — Intelligent Non-Negotiable Suggestion Engine

Pure decision-support layer. Surfaces high-confidence NN candidates based on the user's own 14-day behavior and converts them with one tap. **Zero changes** to evaluator outputs, hammer scoring, streak math, NN execution, or logs schema.

---

## Part 1 — Storage (new table only)

Migration: `user_nn_suggestions`

```sql
CREATE TABLE public.user_nn_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.custom_activity_templates(id) ON DELETE CASCADE,
  score numeric(4,3) NOT NULL,
  completion_rate numeric(4,3) NOT NULL,
  total_completions_14d int NOT NULL,
  consistency_streak int NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','accepted','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

ALTER TABLE public.user_nn_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own suggestions" ON public.user_nn_suggestions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users update own suggestions" ON public.user_nn_suggestions
  FOR UPDATE USING (auth.uid() = user_id);
-- Inserts/upserts are server-side only (service role). No INSERT policy.

CREATE INDEX idx_nn_sugg_user_status ON public.user_nn_suggestions(user_id, status);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_nn_suggestions;
```

---

## Part 2 — Suggestion computation in `evaluate-behavioral-state`

Additive block at the end of `evaluateUser` (after current snapshot/event writes, before return). Wrapped in try/catch — failure here must NOT affect existing evaluator output.

Logic:

1. Pull all of user's templates: `is_non_negotiable=false`, `deleted_at IS NULL`. Include `display_days`, `recurring_days`, `recurring_active`, `display_on_game_plan`.
2. Pull last-14-day logs (already partially loaded — extend the existing `actLogs` window to 14 days minimum, reuse rows).
3. For each template compute:
   - `days_scheduled_14d` = count of last 14 days where the template was scheduled (via `display_days` if `display_on_game_plan`, else `recurring_days` if `recurring_active`, else fallback = total log-day count for that template).
   - `total_completions_14d` = distinct dates where a log for that template_id had `completion_state='completed'`.
   - `completion_rate = total_completions_14d / max(days_scheduled_14d, 1)` (clamped 0–1).
   - `consistency_streak` = current consecutive completed days walking back from today.
4. Eligibility gate: `completion_rate >= 0.80 AND total_completions_14d >= 6`.
5. Score:
   ```
   score = clamp01(
     completion_rate * 0.6
     + min(consistency_streak, 5) / 5 * 0.1   // normalized streak component
     + (total_completions_14d / 14) * 0.3
   )
   ```
   (Spec literal `min(streak,5) * 0.1` would over-weight to 0.5 alone; we normalize to keep the 60/10/30 weighting and `score ∈ [0,1]`. High-priority threshold 0.90 still meaningful.)
6. Surface threshold: `score >= 0.75`. High priority: `score >= 0.90`.
7. Upsert into `user_nn_suggestions` ON CONFLICT (user_id, template_id):
   - If existing row is `dismissed` AND `updated_at > now() - interval '7 days'` → SKIP (suppression window).
   - If existing row is `accepted` → SKIP.
   - Else update score/metrics/`status='active'`/`updated_at=now()`. Idempotent within a day (evaluator-throttled by existing 8s recompute).
8. Mark suggestions stale: any `active` suggestion whose template no longer qualifies OR whose template flipped to `is_non_negotiable=true` → set `status='dismissed'` (silent cleanup, no UI churn).

No changes to snapshot fields, events, or hammer pipeline.

---

## Part 3 — Hook: `src/hooks/useNNSuggestions.ts`

```ts
export function useNNSuggestions() {
  // SELECT * FROM user_nn_suggestions
  //   WHERE user_id = auth.uid() AND status = 'active'
  //   JOIN template (id, title, icon, color, display_nickname)
  //   ORDER BY score DESC LIMIT 3
  // Realtime subscribe → invalidate
  // Mutations: accept(template_id), dismiss(suggestion_id)
}
```

`accept`:
1. Optimistic: remove from local list.
2. `supabase.from('custom_activity_templates').update({ is_non_negotiable: true }).eq('id', template_id).eq('user_id', user.id)`
3. `supabase.from('user_nn_suggestions').update({ status: 'accepted', updated_at: new Date() }).eq('id', suggestion_id)`
4. Fire-and-forget: `evaluate-behavioral-state` + `compute-hammer-state` (reuse existing recompute helper from `useQuickActionExecutor`).
5. Invalidate game-plan + NN-progress queries.
6. Toast: *"Standard locked. This is now required daily."*

`dismiss`:
1. Optimistic remove.
2. Update `status='dismissed'`, `updated_at=now()`.
3. No recompute needed.

---

## Part 4 — UI: `src/components/identity/NNSuggestionPanel.tsx`

Mounted on **Progress Dashboard only** (above `PracticeIntelligenceCard`).

Renders nothing if `suggestions.length === 0`.

Card shell:
- Header: **"Suggested Standards"**
- Subtext: *"Based on your recent behavior, these are already part of your identity."*
- Up to 3 suggestion rows.

Per row:
- Activity icon + title (use `display_nickname || title`).
- Stat line: `"{total_completions_14d} of last 14 days"` · `"{consistency_streak}-day streak"` (streak chip hidden if 0).
- Confidence pill:
  - `score >= 0.90` → red `LOCK THIS IN` (red glow ring `ring-1 ring-red-500/40`, `scale-[1.02]`, flame icon).
  - else → neutral `READY TO LOCK`.
- Buttons: **[ Make Non-Negotiable ]** (primary, red on high-priority) · **[ Not Now ]** (ghost).

Hard cap at 3 rendered rows even if more active.

---

## Part 5 — Mounting

`src/pages/ProgressDashboard.tsx`: import and render `<NNSuggestionPanel />` directly above `<PracticeIntelligenceCard />` inside the always-visible top stack. No other dashboards touched.

---

## Part 6 — Invariants (must hold)

- Evaluator output snapshot fields unchanged. Suggestion writes are isolated.
- No automatic NN flip — only the user's tap mutates `custom_activity_templates.is_non_negotiable`.
- System user `00000000-0000-0000-0000-000000000001` skipped (already short-circuits at top of `evaluateUser`).
- Suppression: dismissed suggestions don't resurface for 7 days.
- Already-NN templates never appear (eligibility filter + stale cleanup).
- Realtime keeps panel reactive; UI mutations are <1s optimistic.

---

## Files

**New**
- `supabase/migrations/<ts>_user_nn_suggestions.sql`
- `src/hooks/useNNSuggestions.ts`
- `src/components/identity/NNSuggestionPanel.tsx`

**Edit**
- `supabase/functions/evaluate-behavioral-state/index.ts` (additive suggestion block at end of `evaluateUser`, wrapped in try/catch)
- `src/pages/ProgressDashboard.tsx` (mount panel)
- `src/integrations/supabase/types.ts` (auto-regenerated from migration)

---

## Acceptance

- A template with ≥80% completion over 14 days and ≥6 completions appears within one evaluator cycle.
- Tapping **Make Non-Negotiable** flips the template, recomputes engine, and the row disappears <1s.
- Tapping **Not Now** hides the row and suppresses re-surfacing for 7 days.
- Max 3 cards visible; high-priority cards have red ring + flame.
- Already-NN templates and dismissed-within-7d templates never surface.
- Evaluator continues to produce identical snapshots if the suggestion block throws.
