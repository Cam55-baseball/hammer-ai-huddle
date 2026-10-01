# Roadmap
- [ ] Urgent measurement regression: rerun every previously measured clip, identify the exact changed stage, fix the cause without loosening thresholds, and correct any false unmeasurable claim.
- [ ] Demo rebuild: after owner approves the proposed tour story, replace the old demo with a phone-first masked spotlight walkthrough; do not write tour copy before approval.
- [x] Show the owner's exact Analysis Report encouragement as its own standalone card below the upload card on all six empty upload screens, outside the Report Card gate.
- [x] Rename visible Tell Hammer wording to Update Hammer; keep persisted event and database identifiers stable.
- [x] Move phase explainer to a short hitting Report Card card using owner's exact four lines; remove it from Analysis.
- [x] Place Watch this next between detailed analysis and Your prescription; report six-card prerequisites (live upload readbacks still require owner clips and release).
- [ ] Report-card content draft: doctrine-backed hitting tiles, honest reading and failure context, category header/rail, numbered phase labels and phase explainer; owner wording approval pending.
- [x] Analysis/Report Card separation: clean coaching on Analysis, clip-local measured tiles on Report Card, no athlete-facing tracking or camera detection cards; camera and tracking saved with landmark diagnostics.
- [ ] Completed-clip browser readback for both tabs — blocked: the signed-in preview opens at upload, not an existing result; available movement footage is broadcast footage with unreliable subject tracking. Do not fabricate a completed screen result or run the same invalid clip as proof.
- [ ] Staff View display of saved clip diagnostics — blocked: this training-only view has separate athlete access rules; do not expose another athlete's landmark records without an authorized clip-specific read path.
- [ ] Confirm idea-submission delivery to hammersmodality@hammersmodality.org after owner-authorized deployment: current function is not deployed, Resend key available here is invalid, and only inbox owner can confirm arrival.
- [x] Shoulder opening five-signal fusion (side-on)
- [x] Hitting baseball: all 23 tiles built (several ungraded pending owner numbers)
- [x] Hitting softball: shared 23 body-mechanics measurements with softball-specific coaching copy; live upload verification pending. Pitch-release timing tiles refuse without a pitcher release in frame; no windmill release inferred.
- [ ] Owner back-heel reversal: separate tile, root-pattern evidence, athlete-language checks and live function connected; authenticated upload/readback pending
- [ ] Throwing baseball: conservative shuffle vs forward-transfer classifier, gated pose-only runner and four-tile card built; real overhand throw fixture, server storage/readback, final-shuffle anchoring and owner review of throwing standards still needed.
- [ ] Throwing softball: shares pose-only runner and four-tile card with distinct softball coaching copy; same fixture and live-readback blockers.
- [ ] Pitching baseball (remaining tiles)
- [ ] Pitching softball windmill — blocked: no written windmill doctrine

## Hitting upload card — 23 tiles (owner ruling 2026-09-27: body mechanics only)
- [x] Bat/contact metrics moved out of the upload card (BH_UPLOAD_OUT_OF_SCOPE)
- [x] D-SWING-PEAK anchor (not contact)
- [x] 1 hip_load, 2 hand_load (ungraded — owner numbers needed), 3 p2 / 7 p3 (refuse: pitcher not in frame)
- [x] Naming sweep: tile 4 → Head Discipline Through the Swing, tile 10 → Back-Elbow Connection, contact wording removed; DelayCam spec written
- [x] Swing-peak threshold measured (1.5 rad/s); hand-load grip gate (−39.8% was wrist convergence)
- [x] 4 head discipline (pose build)
- [x] Tiles 5–13, 16–21 built (hittingCardTiles.ts); 22 hitters_move built — refuses until all six constituents graded (stride_direction needs two views)
- [ ] Then: throwing BB/SB, pitching BB/SB (softball hitting copy completed)
- [x] Owner doctrine 2026-09-27: hand_load re-spec (behind head pass/fail + ungraded depth), head discipline vs com_at_p2 as P1 fault, root pattern back_leg_did_not_hold_load
- [x] hip_load method approved and built
- [x] Wire tile 17/19/20/head-discipline fails into analysis_fault_findings writer (authenticated readback remains unverified)

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

## 2026-09-29 upload unblock
- [x] Stuck "Uploading": 23.976 fps phone clips rejected silently (floor now 24 with 0.5 tolerance, client + server); clip reading and pose model load now time out with a plain message; button shows the live step and tracking progress.
- [x] Verified signed-in upload end to end (clip a2dc8414): tracked, analysed, one back-leg finding written and rendered.
- [x] Athlete-surface guard test (no digit + °/%) across upload copy, root patterns, 914cf54c finding, analyze/report-card components.
- [ ] Pitching baseball card (next).
- [ ] "Frame-rate check (temporary)" debug panel is visible to athletes — owner to confirm removal.

## 2026-09-29
- [x] Remove temporary frame-rate panel
- [x] Same-clip determinism: duplicate-decode repair + frame-centre seeking (verdicts now match fixture vs live)
- [x] Pitching baseball card: 11 tiles built, all refuse on the three fixtures — UNVALIDATED (no pitching clip)
- [ ] Deploy analyze-video with the repaired series decoder — awaiting owner go-ahead
- [ ] Owner: pitching clip, pitching reasoning in his words, balance-at-landing definition, release-extension band vs noise

## 2026-09-29 throwing reframe (owner)
- [x] Throwing card injury-first: 8 research markers (docs/THROWING-INJURY-RESEARCH.md), both sports, all refuse on fixtures — UNVALIDATED
- [x] Throwing lift floor 0.07 (throwing only)
- [ ] Throwing stride tile from final step — not yet built
- [ ] Softball pitching — blocked: docs/SOFTBALL-PITCHING-DOCTRINE.md not in project
- [ ] Owner: throwing clips (side-on + from behind)

## 2026-09-29 owner decisions (sidearm / keep standards / slot proposal)
- [x] Pitching: hand-below-shoulder gate removed; shared hands-apart gate (gates/releaseHandsApart.ts) used by throwing + pitching; both swings refuse with pitching reason
- [x] Glove swivel permanent refusal; release extension clear-cases only (pass currently unresolvable); eyes-on-target proxy stated in lineage
- [x] Arm slot context (armSlot.ts, staff-only), low-slot emphasis + cues (slotEmphasis.ts) on both cards
- [x] Throwing + baseball pitching wired to live analysis and deployed (analyze-video, incl. repaired-series decoder)
- [ ] Live signed-in throwing/pitching upload readback — needs a real throw/pitch clip from the owner
- [ ] Softball windmill — blocked: docs/SOFTBALL-PITCHING-DOCTRINE.md still not in the repo
