# AV6 — Exact saved-work Swap boundary — October 21

**Ready to publish: no.** Named authorization used to redeploy only `plan-swap`. No migration, publish, cron or iOS changes.

## Mounted and phone-proven sub-step

- Saved dose and immutable context now have one implementation in `_shared/planSwap`, re-exported by the existing client modules. No copied server/client rules and no Edge Function imports from `src`.
- Actual `LiveSwapSheet` sends its complete self-owned saved row and SHA-256 fingerprint of the source/family catalog. The server rejects mismatched work, instructions, placement, rest, first receipt and explicit null/absence, even when a timestamp was not advanced.
- The live interpreter re-reads both the prescription and catalog after inference. A mismatch refuses the answer. This is a no-write visit boundary, **not current safety/access certification or a transaction lock**.
- Actual TEST player form sign-in → dashboard → Lift — Mobility → Resist-Turning Press → Swap, at **390×844** Chromium phone emulation. Not a physical iPhone proof.
- Exact current request: live HTTP **200**, missing `med_ball`, available `bat`; `memorySaved=false`, `prescriptionChanged=false`. Reviewed through all three questions; unsupported saving remains visibly unavailable.
- Stale-dose request: intercepted only this browser request and increased its expected reps by one; live HTTP **409**, phone displayed “Your exercise changed or could not be checked. Reload your plan. Nothing was saved.” No hosted training row was modified to create this test.
- Changed-catalog request: intercepted only its fingerprint; live HTTP **409**, phone displayed “The exercise choices changed. Close Swap and reload your plan. Nothing was saved.” No hosted catalog was changed.
- TEST prescriptions read back byte-equivalent before/after; no equipment/receipt writes. Password scrambled after every run.
- Evidence: `/tmp/browser/av6/phone.log`, `ai-answer.png`, `stale-dose.png`, `stale-catalog.png`, `no-save.png` in that folder.

## Validation

- Isolated server `deno check` passed before deployment. Submitted source SHA-256: `e38b45b4d0204ee9e445455baa4ef34723406e41104d818475c48cdaa4bfd32e`.
- Changed-path **6 files / 35 tests PASS**; full suite **482 files / 3,844 tests PASS**. After the final safe refusal-message handling change, **2 files / 14 tests PASS** and the full phone flow was rerun.
- Preview build OK at **17:13:06 UTC**. Temporary missing-module errors during relocation were resolved by the re-exports. Initial fingerprint test lacked the test environment's Web Crypto; it now uses Node Web Crypto, not a production fallback.

## Not done

Universal atomic certification/save/Undo and all four positive replacement/memory phone proofs remain unimplemented. Fresh full-day access/safety, applicable session certifiers, exact load equivalence, same-transaction prescription/inventory/memory/log writes and bypass closure still need implementation. The shared athlete/day transaction lock remains a prerequisite, not a lock spanning this asynchronous read-only endpoint.

Every-card/coach-work coverage, equipment-question replacement, remaining coach/admin proofs, actual-plan baseball/softball base counters and three full-go roles, hosted mixed-signal/testing-day cases, and the positive recommendation/re-test pair remain open. Tonight's scheduled outcome cannot be reported before it occurs. No invented measurements or entitlement bypasses were used.