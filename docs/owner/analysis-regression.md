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

## Oct 28 — original pipeline re-established from git (owner P0)

**Last version that worked consistently (from git, not today's code):** commit `c3aa72075` (Jan 31, 2026), the same shape through September.
- Phone: `src/lib/frameExtraction.ts` `extractKeyFrames` played the clip in a hidden muted video and took **7 pictures** at 10%, 25%, 40%, 50%, 60%, 75% and 90% of the clip (or −0.4, −0.2, −0.1, 0, +0.1, +0.2, +0.3 s around a marked landing), each saved as a JPEG at 80% quality. No blur, clarity, size or body-tracking checks. 30-second time limit.
- Server: `supabase/functions/analyze-video/index.ts` sent the pictures plus the coaching prompt for the module and sport (philosophy, history, landing note) to **google/gemini-2.5-flash** in one chat call. The call forced one `return_analysis` answer: summary bullets (top takeaway first), feedback, positives, improvements (what, why, how to fix), drills and scorecard.
- Saved into `videos.ai_analysis` and shown on the upload screen; Players Club read the same saved report.

**The exact regression behind the owner's Oct 28 03:47 upload:** the phone no longer sent pictures, so the server sent the whole 17.7 MB clip first. The model rejected it ("Request contains an invalid argument", HTTP 400). The server then saved and showed a report shell ("Hitting report: Not measured", "The analysis service did not finish. Your clip is saved."), and the screen filled it with ongoing-plan items (Tex Vision, tap drill) and an "Estimated · visual coaching from this clip" badge.

**Changes since September on this path** (earlier entries above cover Sep 26–Oct 27): frame-quality/clarity gates and the deterministic probe (`src/lib/frameExtraction.ts`, `src/lib/biomech/probeVideoMetadata.ts`); "Not measured" report structures (`_shared/analysisReliability.ts` `unavailableAnalysis`); body tracking in the path (`src/pages/AnalyzeVideo.tsx`); the model changing to `gemini-3.6-flash` (Oct 14) and back to a "2.5" label that the gateway served as 3.8 (Oct 27); the whole-video-first path (Oct 27); plan and season items mixed into clip recommendations (`AnalysisPrescriptionSection.tsx`, `AnalysisVideoRecommendations.tsx`).

**Model:** `google/gemini-2.5-flash` is retired in the gateway catalog (expired Oct 20, 2026), and calls labeled 2.5 were already being served by `google/gemini-3.8-flash`. That is the model now used, named honestly. It is the closest available match: same family, takes images and video, and it wrote the full reports in the proofs below.

**What was restored (Oct 28):**
- Phone: `extractClassicKeyFrames` uses the exact January sampling, with no gates and no minimum. Pictures are taken while the clip uploads and sent first.
- Server: pictures are tried first. The whole clip is only a backup when there are no pictures or the picture run fails, limited to 60 seconds of a 140-second total.
- Report: what you did well, key findings (top takeaway first), corrections with why and how to fix, "How to check it's working", "What we saw in this clip", and "How this may connect to you" (inferred from profile, season, latest test, readiness and 7-day workload, labeled as inference).
- Drills and videos come only from Hammers libraries matched to this clip's findings. Nothing comes from the ongoing plan, no maintenance filler, no season filler, and written-in drills are hidden.
- No measurement wording, no grade line and no "Estimated" badge in the written analysis (upload screen and Players Club). Report Card untouched.
- A failure shows only "Your analysis didn't finish. Tap Retry." with a Retry button. No report shell is saved.
- No auto-save: uploads are temporary (`videos.temporary_until`, hidden by database rules) until Save to Players Club. `cleanup-temporary-uploads` removes unsaved uploads after 24 hours, logging each one first. The schedule SQL is in `docs/owner/temporary-upload-cleanup-cron.sql` and has NOT been run.

**Known limit:** a whole-clip backup over about 15 MB is rejected by the model (the 17.7 MB clip fails; clips up to 9.8 MB pass). Big clips need the phone's pictures. Real iPhone Safari is expected to read its own camera clips (it did from January to September), but this sandbox cannot confirm it. If both fail, the athlete sees the Retry screen, never a fake report.

**Proof (Oct 28, preview, owner account, phone-sized 390×844 screen; upload → report → Save to Players Club → View → reload → View):**

| Browser engine | Clips (owner originals) | Full report + saved first try + reopens after reload |
|---|---|---|
| Safari (WebKit, iPhone 15 profile) | 3 uploads each of hitting, pitching, throwing in both sports | 17 of 18. The miss: the 17.7 MB hitting clip, Retry screen shown. Runs stopped by test setup or the hourly limit were rerun one at a time. |
| Safari, picture path | 17.7 MB hitting clip, baseball pitching, softball throwing (container rewritten so the test browser can read it; same video data) | 3 of 3, server confirms "input: frames", 7 pictures, about 20 s |
| Chrome | Same 18 | 17 of 18. The same 17.7 MB clip shows Retry. |
| Forced model failure, both engines | | Only "Your analysis didn't finish. Tap Retry." and the Retry button; the upload stayed hidden and temporary with no report |

Every report had: top takeaway, key findings, what you did well, corrections with why and how, "How to check it's working" and "What we saw in this clip". None had measurement wording, a grade line, "From your ongoing plan" or Tex Vision, and none on reopen. The test browsers can't read original `.MOV` files on their own, so every non-rewritten run used the whole-clip backup (0 pictures).

The 38 proof saves were listed in `docs/owner/p0-proof-cleanup-oct28.md`, then hidden (made temporary and unsaved). Nothing was deleted.
