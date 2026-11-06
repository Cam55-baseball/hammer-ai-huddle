# Early recap — generator change awaiting owner approval by name

The Early 6-Week Recap must be made by the SAME recap generator (`generate-vault-recap`). Today that
function always covers the last 42 days and saves rows as regular recaps, which would wrongly pause
the regular day-42 countdown. Editing it redeploys it, so it needs your approval by name:
"OWNER APPROVAL BY NAME: apply docs/owner/early-recap-generator-patch.md to generate-vault-recap".

Until then, early recap purchases are recorded and kept (status "awaiting generator"); nothing is
charged twice, and they are delivered automatically on the player's next visit after the change.

## The change (generate-vault-recap/index.ts)
1. Read `periodStart` and `kind` from the body next to `periodEnd`:
   `const isEarly = body?.kind === 'early'; if (isEarly && body?.periodStart) startDate = new Date(body.periodStart);`
2. Duplicate check: add `.eq('recap_kind', isEarly ? 'early' : 'regular')` (early: also require the same `recap_period_start`).
3. Insert: add `recap_kind: isEarly ? 'early' : 'regular'`, and for early recaps leave
   `unlocked_progress_reports_at` empty so the regular countdown is not paused.
4. Return the new row id: `.insert(...).select('id').single()` → `{ success: true, recap_id, recap_data }`.
5. In `supabase/functions/_shared/addons/server.ts` set `EARLY_RECAP_GENERATOR_READY = true`.

The app's countdown already counts regular recaps only (`recap_kind = 'regular'`), and the column
`vault_recaps.recap_kind` (default 'regular') is already added.
