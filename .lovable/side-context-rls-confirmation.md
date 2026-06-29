# Side Context — RLS Inheritance Confirmation

## Summary
Adding a `side` column (text: `'L' | 'R' | 'both' | null`) to existing
side-aware tables does **NOT** require any RLS policy change. All policies
on the affected tables scope by `user_id = auth.uid()` (or equivalent),
and `side` is a non-identifying attribute that rides existing row
visibility rules.

## Tables verified
- `videos` — owner-scoped via `user_id`. `side` (via `batting_side` / `throwing_hand`) already present.
- `vault_saved_drills` — owner-scoped via `user_id`. `side` added in Slice 1.
- `drill_assignments` — assignee-scoped via `user_id`.
- `pending_drills` — assignee-scoped via `user_id`.
- `athlete_body_goals` — owner-scoped via `user_id`. `side` added in Slice 1.
- `daily_standard_checks` — owner-scoped via `user_id`.
- `mpi_scores` — owner-scoped via `user_id`. `side` stamped server-side in nightly scorer.
- `calendar_events` — owner-scoped via `user_id`.
- `athlete_side_preferences` — owner-scoped via `user_id`. Read by `has_role`-style helpers only when needed.

## Invariant
- **Never** widen RLS to expose `side` cross-user.
- **Never** create a policy keyed on `side` value (would leak L/R schedules).
- New columns must default to `NULL` and ride existing `user_id` predicates.

## Audit
Run `bun scripts/lint-side-context.ts` to enforce that every side-aware
write surface includes `side` when the file is side-aware.
