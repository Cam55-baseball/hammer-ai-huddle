# IO-safe scheduling certification (D/E/H) — run plan

Applies from Oct 29 2026, after the disk-IO outage.

## Limits now live
- `wk-generate-daily` builds **one date per call** (no loops over dates on the server). The seven-day re-plan calls it one date at a time, in order.
- TEST/demo accounts (`hammersmodality+…@gmail.com`): **one build at a time and at most 16 builds per 10 minutes** per account per instance. Extra calls get `429` with `Retry-After: 60`.
- Nightly plan job: never more than `SAFE_PARALLEL` (4) builds at once, even if a caller asks for more.
- Server queries: 60-second statement timeout for the service role.

## Batch shape
1. One unit = **one persona-week** = 7 sequential builds, waiting for each reply.
2. After each unit: wait **60 s**, then run `db_health`.
3. Continue only if: database up, memory < 85%, connections < 70%, and there is **no new DiskIO alert** newer than the unit's start. Otherwise stop, record where it stopped, and wait at least 30 minutes before resuming at the same unit.
4. At most **8 units per hour** (one persona's four weeks = 4 units). The full 32 units (224 days) run over at least 4 hours, in separate runs if needed.
5. Readback uses narrow queries (one player, one week, indexed on `user_id, plan_date`), never counts over whole tables.
6. Never overlap with the nightly plan job's heavy window, and never rerun a unit that already has saved days. Built days are skipped, not rebuilt.
