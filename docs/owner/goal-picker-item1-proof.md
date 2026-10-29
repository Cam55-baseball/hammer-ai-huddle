# Item 1 — goal picker

## Result
Built and verified on a fresh, owner-created, system-isolated TEST player at 390×844.

Root cause: a boolean named `active` shadowed the selected pane, so clicks wrote under an invalid pane key. Selection also conflated rank changes with deselection, and the save did not collect the category order needed by Start. Malformed drafts could mask the canonical saved goals.

The shared onboarding/settings editor now keeps selection separate from priority, saves both goals and category order together, confirms the saved record, refreshes readiness, and refuses blank overwrites after read failures.

## Real UI proof
1. Onboarding: select Barrel control and Plate discipline; make Plate discipline primary; rank all five categories; save and reload. Both retained.
2. Settings: make Barrel control primary; save, reload, reopen. Both retained with ranks 1 and 2.
3. Finish normal TEST equipment, consent and optional assessment steps. Assessment sections were skipped via their real Skip controls; no measurements invented.
4. The remaining TEST-only weekly availability answer was supplied as 6 through the authenticated application client. This was fixture preparation, **not proof of the schedule editor**; no start flag, goal, safety state or training history was injected.
5. Actual Start button enabled; click produced a successful daily generator response (HTTP 200), populated Today cards, and a persisted plan after reload. The ordinary first-player tour was dismissed through Exit demo.

## Goal effect
The real generator returned `goal_direction.ranked` equal to the saved order: hitting, fielding, throwing, speed, power, with `athlete_ranked: true`.
Its existing emphasis resolver consumes the saved category order and category goals; applying that same resolver to the canonical TEST readback gives hitting 1.6, fielding 1.45, throwing 1.3, speed 1.18, power 1.08. The existing sub-goal scorer gives contact 0.49 and plate discipline 0.27 for the final 70/30 ranking. These are verification evidence, not new dose rules or measured outcomes. No safety limits or plan weighting algorithm changed.

## Verification
- Focused 6 files / 28 tests passed, including a regression exercising the actual editor selection, rank and atomic save payload.
- Latest automatic preview confirmation: build OK, 2026-10-29 01:41:59 UTC.
- Private sandbox screenshots: `/tmp/browser/goals/two-goals-settings-proof.png`, `reloaded.png`, `start-enabled.png`, `saved-plan-goal-proof.png`, `plan-reload.png`.
- Chromium phone-size verification only; no Safari claim and no full-suite claim this run.
- TEST account remains system-isolated and excluded from the normal daily job; no destructive cleanup performed.
- Named `create-test-athlete` deployment added only the exact TEST persona. No migration, publication, cron or iOS change; no other round-two item changed.