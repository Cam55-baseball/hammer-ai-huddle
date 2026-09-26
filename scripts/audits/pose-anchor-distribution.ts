/**
 * Pose-anchor distribution audit — "prove they are not fake".
 *
 * Runs every built pose-derived anchor over every persisted landmark series
 * given (local `.ndjson.gz` / `.ndjson` files) and prints, per anchor:
 *   - the ACTUAL detected frame indices (and as % of window), per clip
 *   - detection rate
 *   - missingness breakdown by canonical reason
 *   - a repeat check: identical frame index or identical offset from
 *     first_movement across ≥2 different clips is flagged.
 *
 * Usage: bun scripts/audits/pose-anchor-distribution.ts <file...>
 * Options per file via env: DIRECTION_SIGN (1|-1, unset = unknown),
 * THROWING_SIDE (left|right, default right). Plant frames come from D-PLANT.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { decodeLandmarkSeriesText } from "../../src/lib/biomech/pose/landmarkSeriesFormat";
import { detectAllPoseEvents } from "../../src/lib/biomech/anchors/poseEvents";
import { detectFrontFootPlant } from "../../src/lib/biomech/detectors/dPlant";

const files = process.argv.slice(2);
const dir = process.env.DIRECTION_SIGN === "1" ? 1 : process.env.DIRECTION_SIGN === "-1" ? -1 : null;
const side = process.env.THROWING_SIDE === "left" ? "left" : "right";

const table: Record<string, { clip: string; frame: number | null; pct: number | null; reason: string | null; conf: number | null; unc: number | null; offset: number | null }[]> = {};
for (const f of files) {
  const raw = readFileSync(f);
  const text = f.endsWith(".gz") ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
  const s = decodeLandmarkSeriesText(text);
  const plant = detectFrontFootPlant(s, { front_side: "auto" });
  const a = detectAllPoseEvents(s, { direction_sign: dir, throwing_side: side, front_foot_full_plant_frame: plant.front_foot_full_plant?.frame_index ?? null });
  const span = Math.max(1, s.header.window_end_frame - s.header.window_start_frame);
  const fm = a.first_move.frame_index;
  for (const [k, r] of Object.entries(a)) {
    (table[k] ??= []).push({
      clip: f.split("/").slice(-2).join("/"), frame: r.frame_index,
      pct: r.frame_index == null ? null : Math.round(((r.frame_index - s.header.window_start_frame) / span) * 1000) / 10,
      reason: r.missingness?.missing_reason ?? null, conf: r.confidence, unc: r.anchor_uncertainty_ms,
      offset: r.frame_index != null && fm != null ? r.frame_index - fm : null,
    });
  }
}
if (files.length === 0) console.log("No landmark series supplied — nothing to measure. No distribution claimed.");
for (const [k, rows] of Object.entries(table)) {
  const hits = rows.filter((r) => r.frame != null);
  const reasons: Record<string, number> = {};
  rows.forEach((r) => r.reason && (reasons[r.reason] = (reasons[r.reason] ?? 0) + 1));
  const dupFrames = [...new Set(hits.map((h) => h.frame))].filter((v) => hits.filter((h) => h.frame === v).length > 1);
  const dupOffsets = k === "first_move" ? [] : [...new Set(hits.map((h) => h.offset).filter((o) => o != null))].filter((v) => hits.filter((h) => h.offset === v).length > 1);
  console.log(`\n== ${k}: detected ${hits.length}/${rows.length}`);
  console.log("   frames:", rows.map((r) => `${r.clip}=${r.frame ?? "—"}${r.pct != null ? ` (${r.pct}%)` : ""}`).join(", "));
  console.log("   missing by reason:", JSON.stringify(reasons));
  if (dupFrames.length) console.log("   ⚠ REPEATED frame index across clips:", dupFrames);
  if (dupOffsets.length) console.log("   ⚠ REPEATED offset from first movement:", dupOffsets);
}
