# Elite Game Performance — Final Mastery Wave

The `gp_*` data layer, loggers, dossiers, reports, and AI ingest are in place. This final wave closes the loops that turn the system from "built" into "mastered": cross-referencing into Hammer's daily plan, Roadmap, and Progress Dashboard, plus the drift-proofing and UX polish that prevent regressions.

## Scope (what "complete" means)

```text
1. Cross-reference  →  Hammer · Roadmap · Progress Dashboard read gp_* truth
2. Pitch ↔ At-Bat   →  in-AB pitch logging, count auto-advance, AB summary
3. Game Day Mode    →  one-tap live logging surface, opens automatically on game day
4. Realtime         →  drawer + reports react to inserts without refresh
5. Drift guards     →  legacy table grep, schema lint, tests
6. UX polish        →  empty states, keyboard, undo, sticky totals
```

## 1. Cross-reference into the rest of the organism

- **Hammer Daily Plan** (`src/lib/hammer/dailyPlan.ts` + `scheduleContext.ts`):
  read `gp_at_bats` + `gp_pitches` from the last 7 days. Surface 2 lineage-bound signals:
  - **Plate discipline gap** (chase % > 35 on outside zones) → bias a Tex-Vision / pitch-recognition block.
  - **Defense miscue cluster** (≥2 misplays at same position) → bias a fielding rep block.
  - Always additive: never overrides survivability or freshness mode.
- **Roadmap** (`useRoadmapProgress.ts`): emit a derived `gp_signal` envelope so milestone ordering can react to real game evidence (e.g., promote "2-strike approach" milestone when 2K% spikes).
- **Progress Dashboard** (`HittingPanel`, `PitchingPanel`, `DefensePanel`): add an *In-Game* section that pulls from `gp_*` and runs through the existing `correlations.ts` engine (e.g., sleep vs. chase %, tempo vs. command %).

## 2. Pitch ↔ At-Bat coupling

- `AtBatLogger` gains an inline `PitchLogger` strip scoped to the open AB. Logging a pitch auto-increments balls/strikes; ball 4 / strike 3 / in-play closes the AB with the resulting outcome pre-filled.
- New helper `useAtBatPitches(atBatId)` in `useGamePitches.ts`.
- Pitch totals (count, K, BB, whiffs) shown live at the top of the AB drawer.

## 3. Game Day Mode

- New `GameDayMode.tsx` surface inside `GameSheet`: large-touch buttons for the 4 loggers, current score, inning, and outs.
- `useGameDayContext` already detects `isGameToday`; on the Today/Hammer header, surface a "Open today's game" CTA that deep-links into `GameSheet` for that `gp_games` row.
- Auto-create a `gp_games` shell row when a calendar game starts (idempotent on `calendar_event_id`).

## 4. Realtime

- Subscribe `GameSheet` + `GameReports` to `postgres_changes` on the 5 ledger tables, scoped by `game_id` / `user_id`. Invalidate the matching React Query keys on insert/update/delete.
- Reuse the auth-stable gating pattern from `Calendar.tsx` so reconnect storms don't evict typing users.

## 5. Drift guards

- `scripts/check-no-legacy-games.sh`: fail if any source file references the dropped legacy tables (`games`, `at_bats`, `pitches`, etc.) outside `src/lib/games/ledger.ts` and migration files.
- `scripts/preflight.sh`: add the new check + a vitest suite that asserts every `gp_*` write goes through `gp(...)` from `ledger.ts`.
- Lint: a `src/lib/games/__tests__/ledger.spec.ts` that enumerates `GP_TABLES` keys and confirms types match the Supabase generated types.

## 6. UX polish

- Empty states for every logger ("No at-bats yet — log your first PA").
- Keyboard shortcuts in `AtBatLogger` (1B/2B/3B/HR/K/BB/HBP single-key).
- Undo toast on every insert (10s window) using the existing `sonner` toast.
- Sticky totals header in `GameSheet` (PA, AB, H, BB, K, RBI; IP, ER, K, BB for pitchers).

## Technical notes

- No schema changes. All work rides existing `gp_*` tables + `gp(...)` adapter.
- Realtime requires the tables to be in the `supabase_realtime` publication; if not already, a tiny migration will `ALTER PUBLICATION supabase_realtime ADD TABLE ...` (additive-only, replay-safe).
- Hammer cross-reference is additive and respects `applyScheduleModulation` (freshness mode + high-density ceilings still win).
- Progress Dashboard widgets only render when `n ≥ MIN_SAMPLES`, matching the existing correlation contract.

## Out of scope (explicit)

- No legacy table revival, no parallel ledger.
- No new AI surfaces beyond what `gp-ingest-document` already provides.
- No changes to organism truth authoring — game data remains an interpretive signal, never authority.

Approve and I'll execute in this order: drift guards → realtime → pitch/AB coupling → Game Day Mode → cross-reference → UX polish, validating each slice before moving on.
