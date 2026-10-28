import { probeVideoMetadata, type ProbedVideoMetadata } from "@/lib/biomech/probeVideoMetadata";
import { sha256HexOfBlob } from "@/lib/biomech/fingerprint";

/**
 * What the phone must know about a clip before uploading it for analysis.
 *
 * Since Oct 28 the server watches the uploaded clip itself, so the phone never
 * has to play, decode or pull pictures out of the video. Only the file's
 * fingerprint is required (pure byte hashing, works on every browser). Size,
 * length and frame rate are recorded when the phone can read them quickly,
 * and left unknown (never guessed) when it can't — e.g. iPhone Safari with a
 * black preview.
 */
export interface UploadFacts {
  sha256_hex: string;
  fps_true: number | null;
  fps_source: "container" | "unknown";
  duration_sec: number | null;
  width: number | null;
  height: number | null;
  orientation: ProbedVideoMetadata["orientation"] | null;
  /** Full metadata for optional on-phone enrichment; null when unreadable. */
  probe: ProbedVideoMetadata | null;
}

export async function readUploadFacts(
  file: Blob,
  opts: { probeTimeoutMs?: number; probe?: (f: Blob) => Promise<ProbedVideoMetadata>; hash?: (f: Blob) => Promise<string> } = {},
): Promise<UploadFacts> {
  const probeFn = opts.probe ?? probeVideoMetadata;
  const hashFn = opts.hash ?? sha256HexOfBlob;
  let probe: ProbedVideoMetadata | null = null;
  try {
    probe = await Promise.race([
      probeFn(file),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("probe_timeout")), opts.probeTimeoutMs ?? 12_000)),
    ]);
  } catch (err) {
    console.warn("[upload] clip details unreadable on this phone; the server will watch the clip", err);
  }
  if (probe) {
    return {
      sha256_hex: probe.sha256_hex,
      fps_true: probe.fps_true,
      fps_source: probe.fps_source,
      duration_sec: probe.duration_sec > 0 ? probe.duration_sec : null,
      width: probe.width > 0 ? probe.width : null,
      height: probe.height > 0 ? probe.height : null,
      orientation: probe.width > 0 && probe.height > 0 ? probe.orientation : null,
      probe,
    };
  }
  return {
    sha256_hex: await hashFn(file),
    fps_true: null,
    fps_source: "unknown",
    duration_sec: null,
    width: null,
    height: null,
    orientation: null,
    probe: null,
  };
}
