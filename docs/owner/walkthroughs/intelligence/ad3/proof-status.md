# AD3 — populated team report PASS

- Affected TEST college player entered one marked TEST game, a single, walk, swinging strikeout and one pitch with optional facts blank through the actual Games screen.
- Temporary coach link used `send_connection_request`, player acceptance and `end_connection`; no direct pairing writes. Existing rejected link was returned to rejected.
- Affected TEST coach read the real populated team report at 390×844 in two fresh browser contexts. Report: 1-for-2, 1 BB, 1 K; 1 player and 1 pitch; Player-entered source visible. Missing RBI, errors, pitch result, velocity and inning show Not entered.
- Proof exposed canonical strikeouts missing from the count, missing optional totals shown as zero and unsupported mechanics/plan advice. Corrected the shared team engine; thin standouts now say early read; team observations no longer author training advice.
- Screenshots show the corrected top and details; table scroll is local, no page overflow or page exceptions. Chromium phone emulation, not physical iPhone certification.
- Game tests: 9 files / 52 tests PASS, including 10 report-honesty tests. Latest preview build OK.
- Cleanup: snapshotted and deleted exactly 1 TEST game, 3 TEST at-bats, 1 TEST pitch and 1 temporary TEST request. Verified all zero; temporary link ended, pre-existing rejected status restored. Final fresh coach visit shows honest empty state and remains accessible under the active Coach plan.
- Coach subscription unchanged and kept active for remaining coach proofs. No publish, function redeploy, migration, cron or iOS changes; engine fix is preview-only. Only authorized TEST-data actions touched the live backend.
- Next: B — five-player Intelligence steps 2–5, parent-run logging and both coach modes. C–F and timing-sensitive/physical-device certification remain open.