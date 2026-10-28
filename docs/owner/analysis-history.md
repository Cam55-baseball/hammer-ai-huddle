# Video analysis — the original engine, what changed, and what was put back (Oct 27–28)

## 1. The engine that wrote the January–September reports
- **Where it ran:** the `analyze-video` backend function (same name today).
- **What it sent:** about a dozen still pictures taken from the clip on the player's phone ("frames"), sent as images in one AI request together with the coaching instructions. It did **not** send the whole video file and did **not** need body-tracking dots or measurements.
- **Provider and model:** Google Gemini 2.5 Flash. In January (code snapshot `c3aa72075`) it went through the Lovable AI Gateway chat endpoint. By early September (`2609606ac`) the same request went straight to Google, with a smaller OpenAI model as backup. The saved label `google/gemini-2.5-flash` was kept in both cases, so the label alone doesn't show which route was used.
- **How the request was built:** the coaching instructions for the module and sport (hitting vs pitching/throwing cues), the player's language and the scorecard. The AI was required to answer in one fixed format (`return_analysis`). In September the instructions added trigger → cause → mechanism → result → fix and phase-by-phase walkthroughs.
- **What came back:** a short summary list, written feedback, strengths, drills (title, purpose, steps, reps/sets, equipment, cues), a score and fault list. The report was saved in the video's `ai_analysis` and returned to the phone as one flat answer.
- **How the phone showed it:** the analysis page read either the flat answer or a reused saved copy and showed the summary, feedback, strengths and drills (`src/pages/AnalyzeVideo.tsx`, results panel and report view).

## 2. Every change to that path, Sep 26 → Oct 27
| When | Change | Effect |
|---|---|---|
| Sep 26 | Phone checks before upload: picture under 320 px wide/tall, under 24 frames a second, under 0.5 s or over 60 s | Shrunk (text-app) or slow clips stopped on the phone with "This clip is too blurry to analyze…" and never reached the coach |
| Sep 27 | Removed the "missing frame rate" refusal on the server | Fewer refusals |
| Sep 29 | Server findings from stored body tracking; a movement refusal; missing body tracking treated as a refusal | Clips without tracking could be refused |
| Sep 29–30 | Coaching doctrine, pitching/throwing measurements, softball pitching card | Content only |
| Oct 1 | Tracking/movement refusals removed again; "what to work on" added; "say you couldn't judge" rule; fault keys and honesty check | Soft clips got thin "I couldn't judge…" reports |
| Oct 2–13 | Doctrine, context and wording updates | Content only |
| Oct 18 | Sign-in/pause/hourly limits; "Not measured" stand-in reports; saved-copy checks; a report needed a number to count as readable | Any refusal or failed step became a blank "Not measured" report |
| Oct 19 | Scores hidden from players (report card internal) | Not a cause; kept |
| Oct 27 | Retries and save messages; player position; provider failures/refusals; dispatch only to hitting/pitching/throwing; daily check; visible-coaching rules; server-side size/frame-rate/length/damaged-frame gates turned off; thin-answer retry | Server refusals stopped, but the server still required 3 pictures and still ran body-tracking/measurement steps before the coach |

## 3. What was reinstated (Oct 28)
- **Classic engine first:** the January request again — clip pictures as images, one Gemini 2.5 Flash request through the Lovable AI Gateway, the fixed `return_analysis` answer format. Today's direct-Google route and the backup are only used if the classic call has a passing failure. Today's content rides on top unchanged: philosophy/doctrine, what we look for in each swing, delivery or throw, player position, tagged videos and prescribed drills.
- **Only one gate:** a clip with no readable picture at all. One picture is enough (it was three). No size, blur, frame-rate or length refusals; no "Not measured" reports; no body tracking or measurements needed.
- **Report saved first:** the report is saved before any optional measurement step. If a later step fails, the saved report is still returned — it can never be blocked, delayed or replaced.
- **Every report is labelled** with the engine that wrote it (`analysis_engine: "classic"`).
- **Daily check:** passes only when the classic engine wrote a full coaching report that was saved and reads back.
- **Preview app:** the last "too blurry" refusal mapping removed; the in-app camera needs one readable picture, not three. The next publish carries no size gate.
- **Older apps:** the backend accepts the request the live site and the Oct 22 iPhone build send (same fields as September) and returns the flat report they display.
- Deployed by name: `analyze-video` (three times, last at 00:33 UTC Oct 28) and `analysis-canary`. No migration, publish, schedule or iPhone project change.

## 4. Why the owner saw no report
No uploads came from the main account in the last three days. On the 55cam316 account, every upload that reached the server in those three days finished with a full saved report (outcome "ok"), and several of those rows were our own test runs. The app doesn't record which phone or app version sent an upload, so we can't say for sure which app each attempt came from. The messages the owner quoted — "This clip is too blurry to analyze…", "Hitting report: Not measured" and "saved copy could not be confirmed" — are made **on the phone** by the published site and the Oct 22 iPhone build. Before uploading, those apps check the clip and stop anything under 320 pixels on a side, which is what a clip re-shared through a text app turns into. They then show their own "Not measured" stand-in and mark it "not saved". Those clips never reached the server, which is why the server has no failed rows for them. Clips that did reach the server got reports, but the older apps also showed a misleading "couldn't follow one athlete" note while body tracking ran.

**What still applies to the older apps:** the live site and the iPhone build will keep refusing clips under 320 px on the phone until the preview is published and a new iPhone build is made. Neither was authorized in this run. Every clip those apps do send now gets a classic full report.

## 5. Proof (390×844 phone screen, owner account, owner's real clips; screenshots in the test workspace)
| Clip | Where | Report shown | Engine | Saved first try | Players Club → reopen → reload |
|---|---|---|---|---|---|
| Baseball pitching (444×960) | Preview | Yes, 76 s | classic | Yes | Pass |
| Baseball pitching, text-shrunk (240 px) | Preview | Yes, 73 s | classic | Yes | Pass |
| Softball pitching (720×1280) | Preview | Yes, 93 s | classic | Yes | Pass |
| Baseball hitting (480×270, already shrunk) | Preview | Yes, 76 s | classic | Yes | Pass |
| Softball hitting, text-shrunk (480×270) | Preview | Yes, 77 s | classic | Yes | Pass |
| Softball throwing (3840×2160) | Preview | Yes, 108 s | classic | Yes | Pass |
| Baseball throwing (1920×1080) and text-shrunk copy | Preview | Yes, 71 s / 69 s | classic | Yes | Pass |
| Baseball pitching | Live site | Yes, 69 s | classic | Yes | Pass |
| Softball throwing | Live site | Yes, 102 s | classic | Yes | Pass |
| Softball hitting, text-shrunk | Live site | **No** — blocked on the phone by the old 320 px check | — | — | Needs publish |
| Softball hitting original (1280×720) | Preview and live site | Yes, 82 s / 76 s | classic | Yes | Pass (Oct 28 run 2) |

Notes: the owner's baseball "throwing" clip shows a fielding/baserunning play, and the report honestly says so. The iPhone app was not tested; it sends the same request as the live site. The 11 proof saves were then taken out of the owner's Players Club; nothing was deleted (video IDs: ccfb639a, 533d4ef7, 34bf15f0, a66e41a8, af20e43d, a28bcfda, 147b716f, 47be181e, 90d4282f, a2cf1c27, 35da25b0). The manual daily check came back "idle" because it had already run today, so the new classic requirement first runs on the next scheduled check.

**Oct 28 run 2:** the 20 MB softball hitting clip only stalled because the test browser can't play iPhone-style video, so it converted the clip itself. Real iPhones and Safari play it directly and skip that step. Played in a format the test browser handles, at the same size, it passed on the preview and the live site. The 2 proof saves were taken out of Players Club (380862ee, 67e73e1b). The only gap left: the live site and the Oct 22 iPhone build still refuse clips under 320 px on the phone before anything reaches the server. A backend change can't reach that check. It goes away when the preview is published and a new iPhone build is made.
