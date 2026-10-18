# Data lineage — player snapshot scores (Oct 18)

Traced from the code that writes each number (`hie-analyze` builds the snapshot; `nightly-mpi-process` builds MPI). Rule: anything from video is hidden behind the `report_card` switch.

| Score | Comes from | Video? | Shown now |
|---|---|---|---|
| **MPI** | Latest `mpi_scores.adjusted_global_score` (nightly). Built from logged performance sessions (player and coach grades, drill blocks), scout evaluations and verified stat profiles. | No video input found. | Stays, with source line and updated date. |
| **Movement** | Entered speed sessions: steps per rep, plus session effort (RPE). Formula: stride efficiency × 0.6 + (10 − average effort) × 4, kept between 0 and 100. | No. | Stays, with source line and updated date. |
| **Transfer** | Royal Timing sessions: times a person clocks by hand while watching a video; score = 100 − timing spread. | **Yes — the times come from video playback.** | Hidden: "Grade coming with camera measurement". |
| Decision Speed | Tex Vision drills: reaction time and accuracy. | No. | Stays, with source line. |

## Problems found — FIXED Oct 18 (owner-approved redeploy of hie-analyze + nightly-mpi-process)
1. **Movement no longer fills in guesses**: the score is only computed when BOTH stride steps and effort (RPE) were actually entered. Missing either → no score, shown as "Not enough data". The assumed 70 / 5 are gone.
2. **MPI starter score removed**: players with no performance sessions get no number at all (was a flat 50 for every part). Surfaces show "Not enough data". The analysis no longer invents "lowest area at 50" weaknesses either — it says "Not enough data yet".
3. Movement and MPI are formulas over entered data, not single measurements, so they don't get a 20–80 grade with a band.

Verified live Oct 18 as the TEST college player: movement, transfer, decision speed and MPI all came back empty, the limiter read "Not enough data yet", and no made-up 50s appeared. One remaining internal default (not a shown number): the plan builder assumes readiness 70 when no check-in exists — it shapes plan intensity, never displays. Flagged for the owner's decision.
