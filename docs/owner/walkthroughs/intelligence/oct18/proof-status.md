# Oct 18 proof status

## Real analysis reruns
Two existing real owner clips per type and sport were downloaded privately and re-uploaded as new copies through the actual phone upload screen. Originals were not changed. All six groups produced **2/2 saved readable reports (100%)**, 12/12 total. Existing real footage was available for all groups; no synthetic analysis footage was used.

Some original MOV/MP4 files could not decode in the sandbox browser. Those initial attempts displayed unsaved “Not measured” reports before the analysis request; they are **not** counted as successful full-pipeline runs. Browser-compatible re-encodings of the same footage completed the full reruns. This proves report delivery, not measurement validity or a 100% success rate for every original phone format.

Both sports: hitting 2/2, pitching 2/2, throwing 2/2. Analysis audit read-backs were confirmed for the instrumented runs. New video copies and test reports were deleted through the existing session cleanup; read-back found zero remaining test video rows. Private report contents are not included here or in screenshots shared by the app.

## Affected-role proof
- `video-tagged-player.png`: kept college test player, 390×844. Saved an at-bat through quick logging; the source badge read “Player-entered”. Attached an owned saved synthetic clip with a timestamp; the badge read “Video-tagged” after server save/read-back. No horizontal overflow or page exceptions. Past-duration tag refused. Test game, both test at-bats, clip row and storage object deleted. The synthetic clip tested tagging only, not analysis.
- `parent-sharing-player.png`: kept parent-run under-13 account, 390×844. Optional sharing changed, survived reload, then was restored with the original timestamp. Ordinary player authorization was refused. Existing health/recruiting scopes were not changed. Linked-parent success still needs proof with an active link.
- Assessment server gate: incomplete assessment refused; a Completed timestamp with no optional answers unlocked Start; an already-started account returned the same start without an assessment. The kept test player's original profile and assessment were restored. UI completion/start proof remains open.
- Player sign-in plan check: authenticated kept player returned 200 and subscribed=true.

## Learning loop
`intel-recheck` and `intel-recheck-job` share the same server comparison and use the first scored clip after “Did you do it?” was saved. Self recheck returned 200. The nightly callback refused missing/invalid job tokens with 401. Its authenticated batch execution is not yet proven; no schedule was created. Exact owner-applied SQL is in `docs/owner/learning-loop-cron.sql`.

## Verification
Full suite: **376 files, 2,969 tests passed**. Preview build: OK. Five-player-type proof and full page audit are unfinished.

Live backend changes this round: assessment gate, parent optional-sharing RPCs, at-bat video evidence fields/RPC/validator. Functions redeployed: `check-subscription`, `parent-consent`, `intel-recheck`; new callback deployed: `intel-recheck-job`. A callback bundling error was corrected by moving the shared helper under `_shared`, then deployment succeeded. No unexplained deployment errors remain. No publish, scheduled-job or iOS changes.