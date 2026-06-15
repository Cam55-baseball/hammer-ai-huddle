/**
 * Phase 0 — Determinism Foundation (Deno edge-function port).
 *
 * Byte-identical to src/lib/biomech/{versions,fingerprint}.ts. The cache key
 * is derived ONLY from physical inputs (video bytes, true FPS, calibration,
 * pinned engine versions). Prompt text, athlete context, and AI model id
 * are forbidden inputs.
 */

export const LANDMARK_MODEL_ID = "blazepose_full";
export const LANDMARK_MODEL_VERSION = "blazepose_full@0.0.0-stub";
export const DETECTOR_VERSION = "events@0.0.0-stub";
export const METRIC_ENGINE_VERSION = "metrics@0.0.0-stub";

const HEX = "0123456789abcdef";

function bytesToHex(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    const b = view[i];
    out += HEX[b >> 4] + HEX[b & 0xf];
  }
  return out;
}

export async function sha256Hex(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  let buf: ArrayBuffer;
  if (typeof data === "string") {
    buf = new TextEncoder().encode(data).buffer;
  } else if (data instanceof Uint8Array) {
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    buf = copy.buffer;
  } else {
    buf = data;
  }
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return bytesToHex(digest);
}

export interface CacheFingerprintInputs {
  videoSha256Hex: string;
  fpsTrue: number;
  landingTimeSec: number | null;
  directionSign: -1 | 0 | 1;
  calibrationHpx: number;
  landmarkModelVersion?: string;
  detectorVersion?: string;
  metricEngineVersion?: string;
}

export async function buildCacheFingerprint(inputs: CacheFingerprintInputs): Promise<string> {
  const fps = Number.isFinite(inputs.fpsTrue) ? inputs.fpsTrue.toFixed(6) : "NaN";
  const landing = inputs.landingTimeSec == null ? "null" : inputs.landingTimeSec.toFixed(6);
  const calib = Number.isFinite(inputs.calibrationHpx) ? inputs.calibrationHpx.toFixed(6) : "NaN";
  const parts = [
    inputs.videoSha256Hex,
    inputs.landmarkModelVersion ?? LANDMARK_MODEL_VERSION,
    inputs.detectorVersion ?? DETECTOR_VERSION,
    inputs.metricEngineVersion ?? METRIC_ENGINE_VERSION,
    fps,
    landing,
    String(inputs.directionSign),
    calib,
  ];
  return sha256Hex(parts.join(":"));
}
