# DelayCam performance spec (moved out of the upload card)

Owner ruling 2026-09-27: upload Analysis = body mechanics only. Bat, ball and
contact are DelayCam performance metrics at 240 fps. Code record:
`src/lib/reportCard/contracts/delaycamPerformance.ts`. Never re-add these to
the upload card; `bhNamingRule.test.ts` and `hittingCardBatch1.test.ts` fail if you do.

Every entry is **blocked**, in order, on (1) the native Swift camera plugin for
240 fps, then (2) Roboflow detectors for D-BAT / D-BALL.

| Metric | Moved from | Requires |
|---|---|---|
| bat_path | upload tile | D-BAT |
| on_plane_pct | upload tile | D-BAT |
| time_to_contact (Blast: start of forward bat move → impact) | upload tile | D-BAT + D-CONTACT |
| bat_speed_contact | upload tile | D-BAT + D-CONTACT |
| barrel segment of sequencing | sequencing | D-BAT |
| head alignment to ball trajectory | eyes_tracking channel (b) | D-BALL |
| barrel-to-ball delivery direction | connection channel (c) | D-BAT + D-BALL |
| true contact frame | every upload window that ended at "contact" | D-BALL trajectory reversal + audio |

Upload windows that used to end at contact now end at **D-SWING-PEAK** — peak
torso rotation speed, a body event. It is NOT contact and no tile may call it contact.
