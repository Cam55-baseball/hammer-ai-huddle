import type { ReportCardSpec, ReportCardTileSpec } from "../types";
import { readNumber, readBool, readScore100, missingState, scoreMeterState } from "../metricReaders";

/**
 * Baseball Hitting — 15-tile contract mapped to the P1–P4 doctrine.
 *
 * P1 — Hip Load (stability through P2, non-negotiable)
 * P2 — Hand Load (timing-anchored to pitcher's knee lift) + Eyes / Head Tracking
 * P3 — Stride Direction · Heel Plant · P3 Timing to Release
 * P4 — Sequencing · Bat Path · On-Plane % · Time-to-Contact · Bat Speed
 *      Back Elbow at Contact · Hitter's Move Quality (NN) · Finish & Balance
 */
const tiles: ReportCardTileSpec[] = [
  {
    key: "hip_load",
    name: "Hip Load Stability",
    mode: "score_meter",
    standard: "Stable through P2 — no body / head / front-foot drift",
    thresholdChip: "Acceptable 70 · Elite 90",
    phase: "P1 Hip Load",
    nonNegotiable: true,
    explainer: {
      whatWhy:
        "The point of P1 is STABILITY. You pass by NOT drifting forward (body, head, front foot) while the pitcher reaches knee lift. A bigger, balanced back-hip load on top of stability earns elite. Bigger h