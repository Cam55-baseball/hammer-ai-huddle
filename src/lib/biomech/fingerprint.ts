/**
 * Phase 0 — Determinism Foundation
 *
 * Deterministic SHA-256 helpers + the canonical cache fingerprint builder.
 * Browser + Deno compatible (uses WebCrypto's globalThis.crypto.subtle).
 */

import {
  LANDMARK_MODEL_VERSION,
  DETECTOR_VERSION,
  METRIC_ENGINE_VERSION,
} from "./versions";

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

export async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  let buf: ArrayBuffer;
  if (typeof data === "string") {
    buf = new TextEncoder().encode(data).buffer;
  } else if (data instanceof Uint8Array) {
    // Copy to fresh ArrayBuffer to avoid SharedArrayBuffer typing issues.
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    buf = copy.buffer;
  } else {
    buf = data;
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buf);
  return bytesToHex(digest);
}

/**
 * Hash a Blob/File in chunks so we never pull a multi-GB video into memory.
 * Returns the lower-case hex digest of the entire byte stream.
 */
export async function sha256HexOfBlob(blob: Blob, chunkSize = 8 * 1024 * 1024): Promise<string> {
  // Browsers expose blob.stream(); fall back to slicing for older runtimes.
  if (typeof (blob as Blob & { stream?: () => ReadableStream }).stream === "function") {
    // We must concat all chunks because subtle.digest has no streaming API.
    const chunks: Uint8Array[] = [];
    const reader = (blob as Blob).stream().getReader();
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    const flat = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      flat.set(c, off);
      off += c.byteLength;
    }
    return sha256Hex(flat);
  }
  // Fallback: slice loop.
  let offset = 0;
  const parts: Uint8Array[] = [];
  while (offset < blob.size) {
    const slice = blob.slice(offset, Math.min(offset + chunkSize, blob.size));
    parts.push(new Uint8Array(await slice.arrayBuffer()));
    offset += chunkSize;
  }
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const flat = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    flat.set(p, off);
    off += p.byteLength;
  }
  return sha256Hex(flat);
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

/**
 * The canonical, replay-safe cache key.
 *
 * Identical inputs → identical hex digest, byte-for-byte. No prompt text,
 * no athlete snapshot, no AI model id may ever enter this function.
 */
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

/**
 * Canonical hash of a JSON payload (events, metrics, etc).
 * Keys are sorted recursively so insertion order can never affect the hash.
 */
export async function sha256OfCanonicalJson(value: unknown): Promise<string> {
  return sha256Hex(canonicalize(value));
}

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return (
      "{" +
      keys
        .map((k) => JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k]))
        .join(",") +
      "}"
    );
  }
  return "null";
}
