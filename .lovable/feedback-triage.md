# Feedback Triage — Video Analysis

Source: operator feedback message dated 2026-06-17. Every bullet captured below. No item ships without per-item authorization.

Tags: `copy` / `methodology` / `reliability` / `ux` / `measurement-trust` / `bug` / `governance`.
Tracks: **1.5** (presentation + reliability, no metric formulas) · **2** (metric redesign, needs separate authorization gate) · **BLOCKER** (Phase 1 evidence) · **deferred**.

---

## Issue table

| # | Operator statement | Tag | Current behavior (code) | Decided | Open question | Track |
|---|---|---|---|---|---|---|
| 1 | "Thumbnail generation failed on a video? Idk what that means" | `bug` + `copy` | `AnalyzeVideo.tsx:401-417` calls `generateVideoThumbnail`; on failure surfaces `${'Thumbnail generation failed'}: ${error.message}` as a 5s toast. No retry, no impact on analysis. | — | Rewrite to explain it doesn't block analysis; or hide entirely if non-fatal. | 1.5 |
| 2 | "What do the percentage numbers mean under the number line 1-2-3-4? Is that how confident it is?" | `ux` + `copy` | Number line + circles render in report-card components under `src/components/report-card/`. Source of % not yet traced. **Action item:** document what the value currently represents before deciding what it *should* represent. | — | Choices on table: (a) model confidence, (b) athlete-vs-elite score, (c) phase completeness. Operator wants the code's current meaning explained first. | 1.5 |
| 3 | "Analysis says complete with nothing to show then it generates more out of nowhere" | `bug` + `ux` | `AnalyzeVideo.tsx:492-494`: `setAnalysis(analysisData)` then toast "Analysis complete!". No realtime subscription visible in this file. | — | Need Network capture during repro to determine whether a second payload arrives or UI re-derives state from a delayed source. | 1.5 — investigation paired with §6 of determinism investigation |
| 4 | "P2 Timing knee lift: 'Early = drifts forward' is wrong. Drift forward = P1 fail. Being early in P2 is rewarded." | `copy` | Tile copy lives in report-card explainers (e.g. `src/components/report-card/hammer/TileExplainerSheet.tsx` consumes `ReportCardTileSpec.explainer`). Need to locate the P2 knee-lift spec. | Remove "Early = drifts forward" framing. "Early" in P2 is positive. Drift forward belongs in P1. | What exact replacement text does the operator want? | 1.5 |
| 5 | "Hands outside shoulders at landing — 'Wall drills with a target outside of shoulders' nobody understands" | `copy` | Same explainer system as #4. | Replace with elite-level cue. | What's the operator-preferred cue/drill? | 1.5 |
| 6 | "Sequencing — pauses in real reps are subtle. The point is 'not rushed, not all-at-once'" | `copy` | Sequencing explainer copy lives in the report-card spec for the sequencing tile. | Add: "In game tempo the pauses are subtle and rarely visible to a spectator — the goal is not to be rushed and not to fire everything at once. That's the mark of an elite hitter." | Final wording sign-off. | 1.5 |
| 7 | "Back elbow at contact — wrong frame. Bat should have surpassed elbow at contact if hands stayed back. Should this be combined with hands-stayed-back?" | `methodology` | `src/lib/reportCard/contracts/bp.contract.ts` is pitching, hitting contract has analogous shape. Measurement frame currently labelled "at contact". | Move measurement earlier: **launch frame = full front-foot plant (P3) when athlete is in full sequence; otherwise hands-start frame**. Operator wants side-by-side example frames before final spec. | At which exact frame: heel-plant, hands-start, "elbow ready" (P4)? Operator requested 2–3 real frames per option. | 2 |
| 8 | "Finish & balance must be optimized. Two hands through contact + extension until ball is gone, but a 2-hand finish hold is not what's necessary" | `copy` (immediate) + `methodology` (deeper) | Finish & balance tile copy currently suggests "2-hand finish hold". | Copy fix: remove "2-hand finish hold" framing. Methodology open. | What's the measurable definition of "two hands through contact + extension until ball is gone" from pose? | 1.5 copy / 2 methodology |
| 9 | "Is bat path in/out of zone the same as on-plane %?" | `methodology` | Both metrics exist as separate tiles. Semantic relationship not documented. | — | Are they the same measurement under different names, or two distinct concepts? Operator needs to clarify intent. | 2 |
| 10 | "Consistently undetected: P2 knee lift, P3 release, hands-outside-shoulders. Bat speed and time-to-contact measured once but extremely untrustworthy" | `reliability` | Each metric depends on a chain: phase detection → landmark visibility → camera angle gate. Currently no per-failure attribution is surfaced. | Ship a per-failure diagnostic report tagging which gate failed: camera-angle gate / landing-frame detection / landmark visibility. | Per-tile detection threshold values still to define. | 2 |
| 11 | "Bat speed & time-to-contact — need something elite & consistently working & trustworthy. Can we put a time on it to prove separation?" | `measurement-trust` | Currently single-measurement AI estimate from multimodal call; no kinematic derivation. | **Bat speed → hand speed at launch** (m/s, from wrist-landmark displacement ÷ frame Δt at known fps). **Time-to-contact → hands-to-contact duration in ms** = `frame_count ÷ fps × 1000`. Honest measurement (no physics estimation), discriminative (elite ≈ 130–160 ms, average ≫ 200 ms). | Calibration plan for converting pixels → real-world units; whether to keep tile name "bat speed" or rename to "hand speed". | 2 |
| 12 | "Some analysis failed / Some analysis measured absolutely nothing" | `reliability` | `AnalyzeVideo.tsx:477-490` handles error responses; "measured nothing" likely renders an empty `violations`/metrics object without explicit empty state. | Surface failure state honestly (which stage failed, retry option) instead of empty render. | UX for failure state. | 1.5 surface, 2 root-cause fix |
| 13 | "Same video, multiple uploads → inconsistent results" | `reliability` | See `.lovable/determinism-investigation.md` for full stage breakdown. | This is **Phase 1 BLOCKER-1**. Cause not yet measured — see investigation doc §"Evidence Still Required". | All six evidence items in the investigation doc. | **BLOCKER** |
| 14 | "Analysis doesn't seem trustworthy overall" | `governance` (rollup) | Rollup of #10, #11, #12, #13. | Trust will be restored when (a) determinism investigation closes, (b) #10/#11 per-failure diagnostic ships, (c) #2 confidence % gets a defined meaning. | — | governance — tracked, no standalone work |

---

## Methodology decisions already locked in (recorded for Phase 2 spec writing)

These were answered in the triage conversation and become inputs to any Phase 2 work, but Phase 2 still requires explicit authorization after the determinism investigation completes.

1. **Contact frame** = first frame where bat barrel intersects ball position (visual definition). Risk acknowledged: phone video may not give clean ball tracking — a fallback rule will be needed during Phase 2 spec.
2. **Launch frame** = full front-foot plant (P3) when athlete is in full sequence; hands-start frame when not. Two-tier rule.
3. **Bat speed** → replaced by **hand speed at launch** (wrist-landmark m/s).
4. **Time to contact** → replaced by **hands-to-contact duration in ms** at known fps.
5. **Hands-outside-shoulders consistent undetect** → per-failure diagnostic report classifying camera-angle vs phase-detection vs landmark-visibility.

---

## Open methodology questions (still owed by operator before Phase 2 spec begins)

- Issue #7: which exact launch frame for back elbow — heel plant (P3), hands-start, or "elbow ready" (P4)? Operator asked for side-by-side example frames.
- Issue #8: pose-derivable definition of "two hands through contact + extension until ball is gone".
- Issue #9: bat path vs on-plane % — same metric, or two different concepts?
- Issue #2: confidence % — after the AI documents the current code meaning, operator chooses one of: model confidence / athlete score / phase completeness / something else.

---

## Track summary

- **BLOCKER (Phase 1):** #13 — addressed by `.lovable/determinism-investigation.md`.
- **Phase 1.5 candidates:** #1, #2, #3, #4, #5, #6, #8 (copy half), #12 (surface only). Listed with proposed approach in `.lovable/phase-1.5-scope.md`.
- **Phase 2 candidates (gated on determinism investigation):** #7, #8 (methodology half), #9, #10, #11, #12 (root-cause fix).
- **Governance:** #14.
