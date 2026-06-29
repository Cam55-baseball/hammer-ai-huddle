## Problem

1. The Context panel on every IQ situation shows softball-only options — **Tendency → "Slap (SB)"** and **Next pitch → "Rise (SB)" / "Drop (SB)"** — to baseball users.
2. 27 of 111 published situations have zero `primary_path` data on any actor (3 baseball, 24 in `sport='both'`, mostly offense + bunt/comebacker plays). Without paths, `IqDiamond` only renders the static dots — no animated routes, no runner arrows. The "No one on, ball in the gap" situation looks great because every fielder has a `primary_path` array; the others don't.

## Fix

### A. Sport-gated context options (frontend only)

- Add a `sport` argument to `CONTEXT_VALUES` consumption in `src/lib/iq/contextShifts.ts` via a new helper `getContextValues(sport)` that filters out any option flagged `softballOnly: true`.
- Mark `slap`, `rise_ball`, `drop_ball` with `softballOnly: true` and drop the "(SB)" suffix from their labels (no longer needed once they only show for softball).
- In `src/pages/GameIqSituation.tsx`, pass the existing `sport` from `useSportTheme()` into the helper so the toggle rows render only the relevant options. Also clear any selection on those keys if the sport switches.

### B. Backfill `primary_path` for the 27 path-less situations

Run one `iq_situation_actors` data migration that sets a sensible `primary_path` JSON array for the primary mover(s) of each situation. Paths are 0–100 grid points consumed by `IqDiamond` (start = role's `HOME_POS`, then waypoints).

Coverage groups:

- **Offense / baserunning (20):** R1/R2/R3/BR get base-to-base arcs (e.g. `off-first-to-third` → BR: `[1B, rounding, 3B]`; `off-tag-up-3b` → R3: `[3B, plant, HOME]`; `off-steal-2b` → R1: `[1B, secondary, 2B]`; `off-rundown-survival` → BR: zig-zag between two bases). Catcher/middle infielders get cover/throw paths where they're the action ("first-third-r3-breaks", "off-avoid-tag-home").
- **Bunt plays (4):** `bunt-1b-line-r1`, `bunt-3b-line-r1`, `pop-up-bunt-r1`, `squeeze-r3-defense` — 1B/3B/P charge paths to ball spot, C trail, SS covers 2B, 2B covers 1B; R1/R3 advance paths.
- **Defensive specials (3):** `comebacker-r1-double-play` (P → 2B bag → 1B feed; SS cover), `slow-roller-3b` (3B charge barehand → 1B), `wild-pitch-r3` (C retrieve → P cover home, R3 → HOME), `mound-visit-runners-12-no-outs` (huddle: small converging paths to mound).
- **Pickoff / lead (3 baseball):** `off-lead-from-2b`, `off-lhp-pickoff-tells`, `pickoff-1b-daylight-lhp` — R2/R1 primary+secondary lead arcs; SS/2B daylight loop behind runner; P pivot.

Migration writes ~60 actor rows total via `UPDATE iq_situation_actors SET primary_path = '[...]'::jsonb WHERE situation_id=(...) AND role=...`. Existing actor rows are reused; no schema change.

### C. Verification

- `SELECT` count after migration → 0 published situations without any path.
- Visit `/iq/off-first-to-third` and `/iq/bunt-3b-line-r1` in preview, confirm animated arrows render and Context toggles no longer show "(SB)" options on baseball.

## Out of scope

- No changes to scenario quiz logic, scoring, or situation copy.
- Not touching the `IqDiamond` renderer — it already handles `primary_path` correctly.
