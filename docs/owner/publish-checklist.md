# Hammers — final publish checklist

Updated October 25, 2026, 13:45 UTC (final run of the batch). This one sheet
supersedes every earlier checklist section; history lives in git.

**Global TEST cleanup: certified YES.**
**Ready to publish: NO** — one open item: the positive coach-prescription
"Use instead → focus log → readback" live proof needs a real training day
(Monday Oct 26 plans). Everything else is proven.

## Evidence summary (all verified this batch)

- Full suite: **532 files / 4,226 tests PASS** (single bounded run, 13:39 UTC).
- Preview build: OK (no build errors after all edits).
- Coach override warnings: hosted Cancel path saved nothing (verified 0 rows);
  Okay landed with the full override record (who/when/rule/date/prescription)
  in the prescription, the coach audit trail and the learning-loop input,
  written atomically by the database trigger; Sent workouts shows it.
- Under-18 medical carve-out: arm-rest warning with exact rest-until date;
  Okay rejected without and with a short reason, accepted with a real reason;
  linked parent notified (sent=1, audited). Adults use a plain Okay.
- Phone proofs (390×844, screenshots saved in `.lovable/proofs/coach-warnings-oct25/`):
  16 nonmedical action decisions plus the medical dialog — Okay disabled until
  a 10+ character reason, saves once on Okay, Cancel saves nothing.
- Hard gates stayed hard: consent, connection, legal, same-category, equipment,
  dose and workload caps still block with exact reasons (verified live: the
  workload cap stopped a Use-instead on a recovery Sunday, plan untouched).
- Global TEST cleanup certification:
  (a) zero non-system accounts with test markers — PASS;
  (b) parked/system accounts excluded from stats, rankings, lists, search,
      coach/org/scout views and scheduled jobs (shared `systemAccounts`
      filter; 10+ functions patched and redeployed) — PASS;
  (c) fixed-ID no-new-rows check: 131 leftover rows (written before the
      filter deployed) snapshotted and removed; both state jobs redeployed;
      a live manual batch run processed 159 athletes and wrote **zero** rows
      for any parked account; foundation job rows all predate parking — PASS.
- All TEST proof records from today deleted and verified zero; the three TEST
  personas and kept accounts untouched; re-established TEST coach links kept
  per owner authorization.

## A. Human-only checks before publishing (owner, not blockers for the verdict)

1. Tex completion check on a real phone.
2. Real parent signature flow.
3. Five B exercises on a real plan.
4. iPhone Safari link behavior.
5. Original iPhone HEVC clip upload.

## B. After publishing (follow-up live checks)

1. Monday Oct 26 positive coach-prescription proof on a real training day:
   send → Use instead (no warning expected on a normal day) → focus log →
   readback in Sent workouts, History, the Vault, The General, Discipline,
   the learning loop and "Hammers' plan for this player".
2. First nightly batch after publish: confirm zero rows for parked accounts.
3. Watch coach-rx-safety and plan-swap logs for the first week.

## C. By-role guide

### Player
- Coach workouts arrive in Today with Use instead / Add alongside /
  Save for later. Use instead replaces only the same-category card; the old
  work is marked "Replaced by coach workout", never missed.
- If a guideline warning appears, read the exact rule and date, then choose
  Okay or Cancel action. Cancel saves nothing. You can always decline.
- An accepted override shows "Coach override: …" in the card's Because line.
- Under 18: arm-health and pain warnings need a typed reason, and your parent
  is notified. Consent and safety protections always stay in place.

### Coach
- Send or schedule from My Workouts; team sends check every player.
- Warnings list every rule with exact dates in one pop-up. Okay proceeds
  exactly as prescribed; Cancel action saves nothing. Move and Send again
  use the same check.
- Sent workouts shows each prescription's status, overrides and the player's
  independent response. Every override is in your audit trail.
- Blocks that remain blocks: no consent, no connection, legal gates,
  wrong category, missing equipment, dose and workload caps.

### Organization
- Org admins send like coaches; rosters come from accepted connections only.
- Parked/system accounts never appear in rosters, search, rankings or stats.

### Audit and learning loop
- Every override appends who/when/rule/date/prescription to the audit trail
  and the behavioral learning input atomically. No override is silent.
