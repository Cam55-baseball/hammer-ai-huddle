# Step 20 — full release report (2026-09-21)

## What went live
Every feature switch set to "all" at 2026-09-21 01:30 UTC, in one flip so no
athlete gets a load jump in week one:

| Switch | Before | After |
| --- | --- | --- |
| Rest-day calculator | self | all |
| Upper-body plyos + Hand & Wrist | off | all |
| Offseason arc | off | all |
| In-season post-game plan | off | all |
| Load-spike protection | off | all |
| Personalization | off | all |
| Staff View | off | all |

Load-spike protection was switched on in the same statement as the offseason arc.
Every row is recorded in the switch audit with the reason and the proofs.

## Release preflight (Step 17 item A)
- Critical notes in the last 60 minutes: 0
- Unacknowledged criticals of any age: 0
- Pending automatic step-down: none

## Proofs
- Full test suite: 1,618 passed, 0 failed (176 files)
- Card matrix: 1,296 / 1,296 cells, 100% cards, 0 empty, fingerprint 1435a0592f8964b2 (unchanged)
- 2,000-season gate sweep: 7,300,000 day-checks equivalent, 0 violations (run 98bf8b6c)
- 20,000-season version sweep: 20,000 seasons, 7,300,000 days, 75,392 deep checks, **0 violations**, 1,040 s (run 594a076a)
- Forced generation after the flip: 3 builds, 3 cards, 0 failed, 0 new watchdog notes, 2.1–4.5 s (cold) / ~2.1 s warm

## Dose-change report (for the record, not a gate)
- Doctrine dose diff: 774,400 athlete/day combinations compared, **0 dose differences**.
  The doctrine file text changed; the doses it produces did not.
- Offseason arc (step 18 diff, docs/wic/proofs/step18-dose-diff.txt):
  Foundation athletes 0 of 16 rows change — byte-identical.
  Heavy-eligible athletes 11 of 16 rows change, main lifts only: fewer, harder
  reps instead of long sets. Weekly hard-set count moves less than 10% on every
  simulated athlete, so no athlete meets the >10% reporting threshold.

## Alarm fixes (part C)
- "A rest day was given lifts" — the check counted arm care, easy mobility and
  light trunk work as lifts. A rest day is a recovery day and those are exactly
  what it should contain. The check now flags only loaded classes; a test covers
  a correct recovery card.
- The generator now builds the recovery template on a rest day (4 light items).
- All 18 false criticals from 00:09–00:16 UTC downgraded to info, acknowledged,
  each carrying its former severity and the reason in its record.
- Generation speed back under the 3.2 s baseline warm.

## Still open for the owner
- Ranking-score visibility: any signed-in user can read every athlete's ranking
  and probability scores. Flagged by the security scan; needs your decision
  (public leaderboard vs. self + linked staff) before it can be closed.
- Bat-speed tagging of Paloff Press, Cable Chops and Med Ball Shot Put.
- A test athlete dated into the offseason, for B2/B4 phone screenshots.
