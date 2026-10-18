# Data lineage — player snapshot scores (Oct 18)

Traced from the code that writes each number (`hie-analyze` builds the snapshot; `nightly-mpi-process` builds MPI). Rule: anything from video is hidden behind the `report_card` switch.

| Score | Comes from | Video? | Shown now |
|---|---|---|---|
| **MPI** | Latest `mpi_scores.adjusted_global_score` (nightly). Built from logged performance sessions (player and coach grades, drill blocks), scout evaluations and verified stat profiles. | No video input found. | Stays, with source line and updated date. |
| **Movement** | Entered speed sessions: steps per rep, plus session effort (RPE). Formula: stride efficiency × 0.6 + (10 − average effort) × 4, kept between 0 and 100. | No. | Stays, with source line and updated date. |
| **Transfer** | Royal Timing sessions: times a person clocks by hand while watching a video; score = 100 − timing spread. | **Yes — the times come from video playback.** | Hidden: "Grade coming with camera measurement". |
| Decision Speed | Tex Vision drills: reaction time and accuracy. | No. | Stays, with source line. |

## Problems found (not fixed — need the owner's decision; the fixes need a backend redeploy)
1. **Movement fills in guesses**: with no step data it assumes a stride efficiency of 70, and with no effort entries an effort of 5. Those are made-up inputs.
2. **MPI starter score**: players with no performance sessions but a few other logs get a "provisional" MPI of exactly 50 (and 50 for every part). That number isn't measured.
3. Movement and MPI are formulas over entered data, not single measurements, so they don't get a 20–80 grade with a band.

Suggested fix: show "Not enough data" instead of the assumed 70 / 5 and the starter 50. That needs an approved redeploy of the two backend functions.
