

## Plan — Rename "Finish" → "Complete Activity"

Single-file change. The "Finish" button lives in `src/components/CustomActivityDetailDialog.tsx` (used by both folder activities and custom activities per last session's work).

### Change

- Replace the button label `t('customActivity.detail.finish', 'Finish')` with `t('customActivity.detail.completeActivity', 'Complete Activity')`.
- Verify no other "Finish" labels exist in execution dialogs (quick search across `src/components/**` for `>Finish<` / `'Finish'`).

### Out of scope

- Button behavior, disabled logic, completion methods — all unchanged.
- "Done" button — unchanged.

