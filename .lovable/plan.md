# Report Card Overhaul — Hitting Doctrine, /100 Meters, Pitching Extraction Fix

## 1. Doctrine: complete hitting philosophy as the system understands it

This is the locked baseline going into the rewrite. Anything you disagree with becomes a follow-up edit.

**Phase 1 — Hip Load (stability-first; non-negotiable PASS gate)**

- Pass rule = **stability through P2**: no body, head, or front-foot drift while the pitcher reaches knee lift.
- Elite band = bigger, balanced back-hip load (more stored power) on top of stability.
- Hands load and stay quiet. A scap load with stability from P1 creates no momentum building/Weight stays back & Head will not drift toward the pitcher.

**Phase 2 — Hand Load (timing-anchored to pitcher's knee lift)**

- Triggered at the pitcher's peak knee lift.
- Bat / scap / knob loads behind the head **after** P1 is stable.
- Pass rule = hands load without dragging body, head, or front foot forward; chest stays square. Will create center line in a hitter, a stable point for head to stay and not drift forward during P3. P2 Leads to P3 becoming the X-Factor and separation, creating more leverage and a shorter step which gives the hitter a longer time to see the ball and be a hitter without worrying about power.

**Phase 3 — Stride / Landing (timing-anchored to pitcher's release point)**

- Begins as the pitcher reaches release.
- Lands sideways, both feet down, chest + shoulders square to the plate, core max-tensioned.
- Hips do NOT turn shoulders Open (Turning shoulders with hips results in a longer swing with capability for more swing and miss. Wider the shoulder turn open from the hips going into ground contact, the less elite the contact ability is). Stride direction within 15° either way of square.

**Phase 4 — Hitter's Move (NN, most important)**

- Knob = fulcrum. Back elbow drives forward first.
- Hands stay back to get in line with ball creating the path, shoulders stay closed for as long as possible, barrel catapults through the ball last after making contact with the ball as being the most elite you can be.
- Contact is lined up with the hands by the hitters as a concerted effort to get on plane with hands; extension is a post-contact byproduct of the swing.
- Severity: hard / soft / elite (existing P4_HARD_CAP=50, SOFT=70, ELITE +5 stays — but it now only affects internal lineage and tile color, not a displayed score).

**Cross-phase truths**

- Eyes track the ball; head does not chase it.
- Style (toe-tap, leg-kick, hover, coil, no-stride) is neutral — outcome is graded.
- Softball slap context relaxes P2 + P3.

If any of this is wrong, we edit before code lands.

## 2. Report Card display rules (all disciplines)

- **Remove** the big letter grade AND the /100 overall score from `FoilGradeCard`. Replace with a discipline header + coverage chip + a small encouragement strip:
  > "You don't need elite mechanics to compete like an all-time great — chase progress, not perfection."
- Keep the foil/holographic shell so it still feels like a spectacle.
- Keep the existing scorecard surface where the overall grade already lives.

## 3. Meters: /100 with two visible bands

- All `score_meter` tiles move from 0–10 → 0–100.
- Each meter draws TWO threshold arcs on the dial:
  - **Acceptable** (green pass band)
  - **Elite** (gold/holographic perfection band)
- `pass_fail` and `raw_pass_fail` tiles stay binary (geometric absolutes — stride direction, sequencing, head-at-release etc).
- Color state: `fail` < acceptable, `pass` ≥ acceptable, `elite` ≥ elite band.
- Tile chip line under each meter says `"Acceptable 70 · Elite 90"` so users see the line.
- Fix the "showing 0%" bug: the chip currently reads from `score10` even when missing — guard with `state.status !== "missing"` and render "—" otherwise.

## 4. Hitting tile expansion

Existing 8 stay (re-thresholded to /100). New tiles added (each with measurement formula for the AI):


| Tile                                                | Phase | Mode             | Acceptable                                                   | Elite                             |
| --------------------------------------------------- | ----- | ---------------- | ------------------------------------------------------------ | --------------------------------- |
| **Hip Load Stability** (replaces single "Hip Load") | P1    | score_meter /100 | 70 (no drift through P2)                                     | 90 (no drift + big balanced load) |
| Hand Load                                           | P2    | score_meter      | 65                                                           | 88                                |
| **P2 Timing to Knee Lift** (new)                    | P2    | pass_fail        | hand load completes within ±150 ms of pitcher peak knee lift | —                                 |
| Stride Direction                                    | P3    | pass_fail        | ≤15° off square                                              | —                                 |
| Heel Plant / Landing                                | P3    | score_meter      | 65                                                           | 88                                |
| **P3 Timing to Release** (new)                      | P3    | pass_fail        | front-foot strike within ±120 ms of pitcher release          | —                                 |
| Sequencing                                          | P4    | pass_fail        | legal order                                                  | —                                 |
| Bat Path                                            | P4    | score_meter      | 65                                                           | 88                                |
| **On-Plane %** (new)                                | P4    | score_meter /100 | 60 %                                                         | 85 %                              |
| **Time-to-Contact** (new, ms)                       | P4    | raw_pass_fail    | ≤175 ms                                                      | ≤150 ms                           |
| **Bat Speed Through Contact** (new, mph proxy)      | P4    | raw_passed       | ≥65 mph proxy                                                | ≥75 mph proxy                     |
| Back Elbow at Contact                               | P4    | raw_passed       | ≥0° past BB                                                  | ≥20° past BB                      |
| Hitter's Move Quality                               | P4    | score_meter      | 70                                                           | 92                                |
| **Eyes / Head Tracking** (new)                      | cross | score_meter      | 70 (no lateral chase)                                        | 90 (rock-steady eyes on ball)     |
| **Finish & Balance** (new)                          | cross | score_meter      | 65                                                           | 88                                |


&nbsp;

## 5. Pitching / Throwing extraction fix (critical)

Root cause today: the model returns `missing: true` too aggressively, the schema is buried at the end of a 250+ field tool call, and there is no retry.

Fixes:

1. **Stronger prompt**: rewrite `buildMetricsPromptBlock` with one worked numeric example per metric ("e.g. plant foot at frame 4, front hip at frame 4, vertical pixels offset → ~22°"). Forbid missing unless physically not in frame for ALL frames; require a specific frame index in `missing_reason`.
2. **Two-pass extraction**: when the first response returns `metrics` where >40 % of keys are missing, immediately fire a second dedicated AI call whose only tool is `return_metrics` (same schema, no scorecard/drills noise). Persist the merged result.
3. **Auto-recompute on save**: in `AnalyzeVideo`, after a successful analyze where metrics still look empty, invoke the existing `recompute-report-card` function once (with a flag so it can't loop).
4. **Camera-angle helper**: a small inline tip block above the upload area for pitching/throwing ("Side-on, full body in frame, mark landing frame for best results") — pure UI.

## 6. Cross-app surfaces

- `SessionDetailDialog`, `ProgressDashboard` trend strip, and the analyze page: now hide the big grade, show discipline + coverage + encouragement strip, render meters /100 with bands.
- No DB schema changes. `ai_analysis.metrics` keys are additive — old records keep working; new keys appear as missing tiles with a "Add sensor / coming soon" reason until measured.

## Technical notes

Files touched (additive only):

- `src/lib/reportCard/disciplines/bh.ts` — full rewrite of tile set + thresholds.
- `src/lib/reportCard/contracts/bh.contract.ts` + `supabase/functions/_shared/reportCardContracts.ts` — add new metric keys (`hip_stability_score_100`, `p2_timing_pass`, `p3_timing_pass`, `on_plane_pct`, `time_to_contact_ms`, `bat_speed_contact_mph`, `eyes_track_score_100`, `finish_balance_score_100`; Blast/Zepp placeholders).
- `src/lib/reportCard/grade.ts` — keep computing internal severity for lineage, but `HammerReportCard` stops rendering it.
- `src/lib/reportCard/types.ts` — `score_meter` now consumes 0–100, add optional `elite` threshold + `eliteBand` status.
- `src/components/report-card/hammer/visuals/RadialMeter.tsx` — render acceptable + elite arcs; add gold elite shimmer when reached.
- `src/components/report-card/hammer/visuals/FoilGradeCard.tsx` → rename to `DisciplineRibbon`, drop letter/score.
- `src/components/report-card/hammer/HammerReportCard.tsx` — wire new ribbon, fix missing-state percentage bug.
- `src/components/report-card/hammer/ReportCardTile.tsx` — render `Acceptable X · Elite Y` chip; missing-state guard.
- `supabase/functions/analyze-video/index.ts` — stronger metrics prompt with examples; two-pass extractor; merge logic.
- `supabase/functions/recompute-report-card/index.ts` — auto-trigger hook + replay-safe idempotency flag.
- `src/pages/AnalyzeVideo.tsx` — camera-angle helper, auto-recompute on empty metrics.

No DB migrations. No edits to `client.ts` / `types.ts` / `.env`. Hitting causal chains + severity caps remain authoritative for internal lineage and roadmap routing — only the UI grade slab is removed.

## Out of scope (next round)

- Softball windmill-specific pitching tiles.
- New scorecard formulas — current scorecard logic continues; we only ensure it can read the new metric keys.