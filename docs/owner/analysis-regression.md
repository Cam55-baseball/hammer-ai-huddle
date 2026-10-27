# Why video analysis stopped giving full reports (Oct 27 findings)

Baseline: early October, when every upload got a full coaching report. Changes to the analysis path since then (Oct 1 → Oct 27, about 55 changes, 21 of them on Oct 27):

| What changed | When | Effect on players |
|---|---|---|
| **Clip quality gates** (size under 320 px, under 24 frames a second, under 0.5 s or over 60 s, too many damaged frames) — on the phone AND again on the server | phone gate Sep 26; server copy hardened Oct 18 | A text-app re-shared clip or a slow clip was turned away with "This clip is too blurry…" before the coach ever looked at it. |
| **"Not measured" fallback reports** | Oct 18 | Any gate refusal, failed frame read or failed save became a blank "Hitting report: Not measured" with no strengths, no fixes, no drills. |
| **"Say I couldn't judge" instruction** to the coach | Oct 1, strengthened Oct 27 | The coach was told to say it "couldn't judge" any unclear moment. On soft or partial clips it said that about everything, so reports came back thin ("I couldn't judge your foot plant, swing path or contact"). |
| **Readable-report check needed a number** | Oct 18 | A coaching report without a score counted as a failure and could be replaced by a fallback. Thin reports with no fixes or drills still counted as a success, so they were never retried. |
| **Body-tracking error message** | Oct 18 | When body tracking timed out, the player saw "we couldn't follow one athlete…" in the middle of a normal analysis, which read like a failure. |
| **Save-confirmation message** | Oct 27 | Reports built on the phone (gate refusals) were marked "not saved", so the player saw "Your report is shown here, but its saved copy could not be confirmed…". |
| Scored-grading gate / report-card switch | Oct 18–19 | Not a cause: it only hides numbers from players. Kept. |
| Conversion, saving and routing fixes | Oct 20–27 | Not a cause. Kept as instructed. |

**Root cause in one line:** quality gates and "couldn't judge" instructions added in October replaced the coach's look at the frames with refusals and thin reports, and the success check counted thin reports as finished.

## What was restored (Oct 27)
- The coach always writes a full report from what it can see: what went well, what to work on (why and how to fix), and drills and videos. No angles, numbers or grades are shown or hinted at.
- Only a clip with no readable picture at all is refused. Small, soft, slow, short or long clips are coached.
- An unclear moment gets one short mention; the rest is still coached. A clearer-clip suggestion appears only as an optional tip at the end.
- A thin answer (no fixes or drills, or one that starts "I couldn't judge") is retried; if every try is thin, the best readable coaching is kept, never thrown away.
- Body-tracking time-outs no longer show an error; coaching continues.
- The daily check now passes only on a full coaching report, not on any readable answer.
