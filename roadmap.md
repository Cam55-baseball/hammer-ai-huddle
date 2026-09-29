# Roadmap
- [x] Shoulder opening five-signal fusion (side-on)
- [x] Hitting baseball: all 22 tiles built (several ungraded pending owner numbers)
- [ ] Hitting softball
- [ ] Front heel landing corrected; athlete-language audit and live pose-finding integration deployed, pending successful authenticated upload/readback
- [ ] Throwing baseball (shuffle vs crow-hop detection for energy angle)
- [ ] Throwing softball
- [ ] Pitching baseball (remaining tiles)
- [ ] Pitching softball windmill — blocked: no written windmill doctrine

## Hitting upload card — 22 tiles (owner ruling 2026-09-27: body mechanics only)
- [x] Bat/contact metrics moved out of the upload card (BH_UPLOAD_OUT_OF_SCOPE)
- [x] D-SWING-PEAK anchor (not contact)
- [x] 1 hip_load, 2 hand_load (ungraded — owner numbers needed), 3 p2 / 7 p3 (refuse: pitcher not in frame)
- [x] Naming sweep: tile 4 → Head Discipline Through the Swing, tile 10 → Back-Elbow Connection, contact wording removed; DelayCam spec written
- [x] Swing-peak threshold measured (1.5 rad/s); hand-load grip gate (−39.8% was wrist convergence)
- [x] 4 head discipline (pose build)
- [x] Tiles 5–13, 16–21 built (hittingCardTiles.ts); 22 hitters_move built — refuses until all six constituents graded (stride_direction needs two views)
- [ ] Then: softball hitting, throwing BB/SB, pitching BB/SB
- [x] Owner doctrine 2026-09-27: hand_load re-spec (behind head pass/fail + ungraded depth), head discipline vs com_at_p2 as P1 fault, root pattern back_leg_did_not_hold_load
- [x] hip_load method approved and built
- [ ] Wire tile 17/19/20/head-discipline fails into analysis_fault_findings writer (keys mapped, no writer emits them yet)

- [x] hip_load position-based estimate (approved 2026-09-28)
- [x] hand_load grip baseline moved (914cf54c)
- [x] Grip fix: hands-set stance + forearm rigidity + one-good-wrist hand point
- [x] Universal segment-validity gate (validity/segmentValidity.ts)
- [x] back-leg root pattern → one finding (pure builder, tested)
- [x] Owner doctrine 2026-09-28: nine tiles re-specified (heel, back elbow, shoulder plane, back knee, hip drift, hands at heel landing, head rise, lead elbow P2 ref, pelvis square)
- [x] Server runner + generated bundle + findings writer (poseTileFindingsServer.ts)
- [x] Call the server runner from analyze-video — deployed with movement preflight before cached or fresh output
- [ ] Owner numbers for ungraded card tiles (CARD_TILE_OWNER_NUMBERS_NEEDED)
- [x] Move tiles 19/20/hip_load/head discipline/hands-outside onto segment validity
