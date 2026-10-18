# AC12 — phone team-game report proof

**Overall: FAIL — blocked by StaffPlanGate; no bypass attempted.**

Headless Chromium, 390 × 844. Reused AC8 coach authentication and AC10 player entry/backup/cleanup helpers. Test date: 2026-10-18.

## Checks

- PASS — TEST democoach identity matched the previously verified account; UUID `7f1d7a74-bbc1-4db3-b4be-6af85a1abb9a`.
- FAIL — Direct SQL `select public.is_coach_of('7f1d7a74-bbc1-4db3-b4be-6af85a1abb9a','db9cc8ef-5b00-48f1-b113-24b7790e4660');` was denied: permission denied for function is_coach_of. Authenticated app RPC of the same function returned **false**.
- FAIL — Coach has a `coach` plan with status **canceled** (not active). Both `/coach/console` and `/coach/team-report` show “Coach tools are now part of the Hammers Coach plan.” The connection-request UI and Console → Team game report workflow were inaccessible; no request/connection was created, and no end_connection call was needed. No subscription or entitlement changed.
- PASS — TEST player entered one game through the UI today, opponent **TEST AC12 Team**, with two at-bat ledger entries (single and walk), two pitches (called strike and a genuinely null result), and one defensive ground-ball play at SS. Blank pitch result was permitted and persisted.
- FAIL — Coach player row, AB/H counts, “Who logged it — Logged by: Player-entered”, strike early-read/Not-entered handling, and no-games “Need more data” could not be visually verified behind the gate. They are not claimed as passing.
- PASS — Fresh coach browser context plus reload reproduced the plan blocker.
- PASS — Player individual report survived fresh-context reload, ignoring its regenerated timestamp (the helper's raw text equality falsely failed solely on that timestamp).
- PASS — No captured page errors; tested initial coach and player/fresh-player document widths were 390px at a 390px viewport. Team-report layout itself remains untested.
- FAIL — Supplementary player report displays **Strike 50%** for one called strike plus one null result, and **PUT-AWAY (2K) 0%, 0/0** with no qualifying counts. This is misleading missing-data handling; screenshot evidence retained. No application fix made.
- FAIL — Phone gate's floating Back button overlaps the start of the heading (see initial screenshot); no horizontal overflow observed.
- PASS — Snapshot saved before game writes; exact created rows backed up before deletion; zero readback for every deleted ID.

## Count interpretation

The UI calls both entries “at-bats”, but single + walk means **1 official AB / 1 H / 2 PA**, not 2 official AB. Coach counts could not be observed. No baserunning event or saved report was requested or created. The reused helper expected a saved report and falsely flagged counts; the actual requested ledger counts are correct.

## Cleanup counts

| Table | Backed up | Deleted | Remaining exact IDs |
|---|---:|---:|---:|
| gp_games | 1 | 1 | 0 |
| gp_at_bats | 2 | 2 | 0 |
| gp_pitches | 2 | 2 | 0 |
| gp_defense_plays | 1 | 1 | 0 |
| gp_baserun_events | 0 | 0 | 0 |
| gp_reports | 0 | 0 | 0 |
| Connection requests | 0 | 0 | 0 created |
| Connections | 0 | 0 | 0 created |

Snapshot, full exact-row backup, SQL diagnostic and browser results remain private under `/tmp/browser/ac12/`; no credentials or backend addresses are included here. Only exact newly created TEST row IDs were deleted, scoped to the TEST player. No existing relationships were ended.

## Evidence

- `coach-team-report-initial.png` — blocked route at phone size.
- `coach-fresh-context-reload.png` — fresh-context/reload blocker.
- `coach-console-blocked.png` — blocked console entry point.
- `defense-source.png` — player defensive entry/source.
- `player-individual-report.png` — supplementary report and missing-data issue.
- `player-fresh-reload.png` — player fresh-context persistence.

To complete coach proof, provide an already entitled TEST coach or activate democoach through the authorized subscription workflow, then rerun the connection and team-report checks. No bypass was used.
