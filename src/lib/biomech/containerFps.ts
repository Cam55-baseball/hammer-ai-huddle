/**
 * Encoded frame rate read from the video CONTAINER — not from playback.
 *
 * WHY: the previous probe played the clip and timed the frames the browser
 * painted. That measures the browser's render rate. Mobile Safari throttles
 * playback (hidden element, iframe, Low Power Mode, autoplay blocked), so a
 * 59.94 fps iPhone clip could read under 24 and be rejected. The container
 * already records how many frames the file holds and how far apart they are.
 *
 * WHAT: ISO-BMFF (.mp4 / .mov / .m4v) only.
 *   - Progressive files: the video track's `mdhd` timescale + `stts` sample
 *     deltas (moov/trak/mdia/minf/stbl).
 *   - Fragmented files (what Safari's MediaRecorder writes): `trex` defaults +
 *     every `moof/traf` `tfhd`/`trun` for the video track.
 *   fps = timescale / median sample delta (median, so a variable-frame-rate
 *   clip reads its typical spacing, matching what the old probe meant to do).
 *   fps_avg = frames * timescale / total duration is recorded alongside.
 *
 * WebM / Matroska do not store per-frame spacing in a header; they return
 * `unavailable` with reason `not_iso_bmff`. Nothing is ever assumed.
 *
 * DETERMINISM: pure byte parsing, integer arithmetic until the final divide.
 * Same bytes → same result.
 */

export type ContainerFpsResult =
  | {
      readonly status: "ok";
      readonly fps: number;
      readonly fps_avg: number;
      readonly frame_count: number;
      readonly duration_sec: number;
      readonly timescale: number;
      readonly median_delta: number;
      readonly variable_frame_rate: boolean;
      readonly layout: "progressive" | "fragmented";
    }
  | {
      readonly status: "unavailable";
      readonly reason:
        | "not_iso_bmff"
        | "no_moov"
        | "no_video_track"
        | "no_samples"
        | "moov_too_large"
        | "read_failed"
        | "implausible";
      readonly detail?: string;
    };

/** Random-access byte source. A Blob in the app, a Uint8Array in tests. */
export interface ByteSource {
  readonly size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
}

export function blobSource(blob: Blob): ByteSource {
  return {
    size: blob.size,
    async read(offset, length) {
      const end = Math.min(blob.size, offset + length);
      return new Uint8Array(await blob.slice(offset, end).arrayBuffer());
    },
  };
}

export function bytesSource(bytes: Uint8Array): ByteSource {
  return {
    size: bytes.length,
    async read(offset, length) {
      return bytes.subarray(offset, Math.min(bytes.length, offset + length));
    },
  };
}

const TOP_LEVEL = new Set([
  "ftyp", "styp", "moov", "mdat", "free", "skip", "wide", "uuid", "moof",
  "mfra", "sidx", "pnot", "meta", "pdin", "emsg", "prft",
]);
const MAX_MOOV_BYTES = 64 * 1024 * 1024;
const MAX_TOP_LEVEL_BOXES = 200_000;
/** Deltas differing from the median by more than this share mark VFR. */
const VFR_TOLERANCE = 0.1;

function u32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
}
function u64(b: Uint8Array, o: number): number {
  return u32(b, o) * 4294967296 + u32(b, o + 4);
}
function fourcc(b: Uint8Array, o: number): string {
  return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
}

interface Box { type: string; start: number; end: number; } // payload [start,end)

function children(b: Uint8Array, start: number, end: number): Box[] {
  const out: Box[] = [];
  let o = start;
  while (o + 8 <= end) {
    let size = u32(b, o);
    const type = fourcc(b, o + 4);
    let header = 8;
    if (size === 1) {
      if (o + 16 > end) break;
      size = u64(b, o + 8);
      header = 16;
    } else if (size === 0) {
      size = end - o;
    }
    if (size < header || o + size > end) break;
    out.push({ type, start: o + header, end: o + size });
    o += size;
  }
  return out;
}
const child = (b: Uint8Array, box: Box, type: string) =>
  children(b, box.start, box.end).find((c) => c.type === type) ?? null;

/** Weighted histogram of sample durations: delta → count. */
type Hist = Map<number, number>;
function addHist(h: Hist, delta: number, count: number) {
  if (count <= 0) return;
  h.set(delta, (h.get(delta) ?? 0) + count);
}

interface VideoTrack { trackId: number; timescale: number; stts: Hist; }

function readVideoTracks(b: Uint8Array, moov: Box): { tracks: VideoTrack[]; trex: Map<number, number> } {
  const tracks: VideoTrack[] = [];
  for (const trak of children(b, moov.start, moov.end).filter((c) => c.type === "trak")) {
    const mdia = child(b, trak, "mdia");
    if (!mdia) continue;
    const hdlr = child(b, mdia, "hdlr");
    if (!hdlr || hdlr.end - hdlr.start < 12 || fourcc(b, hdlr.start + 8) !== "vide") continue;
    const mdhd = child(b, mdia, "mdhd");
    if (!mdhd) continue;
    const v = b[mdhd.start];
    const timescale = v === 1 ? u32(b, mdhd.start + 4 + 16) : u32(b, mdhd.start + 4 + 8);
    const tkhd = child(b, trak, "tkhd");
    let trackId = 0;
    if (tkhd) trackId = b[tkhd.start] === 1 ? u32(b, tkhd.start + 4 + 16) : u32(b, tkhd.start + 4 + 8);
    const stts: Hist = new Map();
    const stbl = (() => { const minf = child(b, mdia, "minf"); return minf ? child(b, minf, "stbl") : null; })();
    const sttsBox = stbl ? child(b, stbl, "stts") : null;
    if (sttsBox) {
      const n = u32(b, sttsBox.start + 4);
      for (let i = 0; i < n; i++) {
        const o = sttsBox.start + 8 + i * 8;
        if (o + 8 > sttsBox.end) break;
        addHist(stts, u32(b, o + 4), u32(b, o));
      }
    }
    tracks.push({ trackId, timescale, stts });
  }
  const trex = new Map<number, number>();
  const mvex = child(b, moov, "mvex");
  if (mvex) {
    for (const t of children(b, mvex.start, mvex.end).filter((c) => c.type === "trex")) {
      trex.set(u32(b, t.start + 4), u32(b, t.start + 12));
    }
  }
  return { tracks, trex };
}

function readFragment(b: Uint8Array, moof: Box, trackId: number, trexDefault: number, into: Hist): void {
  for (const traf of children(b, moof.start, moof.end).filter((c) => c.type === "traf")) {
    const tfhd = child(b, traf, "tfhd");
    if (!tfhd) continue;
    const flags = (b[tfhd.start + 1] << 16) | (b[tfhd.start + 2] << 8) | b[tfhd.start + 3];
    if (u32(b, tfhd.start + 4) !== trackId) continue;
    let o = tfhd.start + 8;
    if (flags & 0x01) o += 8;
    if (flags & 0x02) o += 4;
    const defaultDur = flags & 0x08 ? u32(b, o) : trexDefault;
    for (const trun of children(b, traf.start, traf.end).filter((c) => c.type === "trun")) {
      const tf = (b[trun.start + 1] << 16) | (b[trun.start + 2] << 8) | b[trun.start + 3];
      const count = u32(b, trun.start + 4);
      let p = trun.start + 8;
      if (tf & 0x01) p += 4;
      if (tf & 0x04) p += 4;
      if (!(tf & 0x100)) { addHist(into, defaultDur, count); continue; }
      const stride = 4 + (tf & 0x200 ? 4 : 0) + (tf & 0x400 ? 4 : 0) + (tf & 0x800 ? 4 : 0);
      for (let i = 0; i < count && p + 4 <= trun.end; i++, p += stride) addHist(into, u32(b, p), 1);
    }
  }
}

function summarise(h: Hist, timescale: number, layout: "progressive" | "fragmented"): ContainerFpsResult {
  let frames = 0;
  let total = 0;
  for (const [d, c] of h) { frames += c; total += d * c; }
  if (frames < 2 || total <= 0 || timescale <= 0) {
    return { status: "unavailable", reason: "no_samples", detail: `frames=${frames} total=${total} timescale=${timescale}` };
  }
  const sorted = [...h.entries()].filter(([d]) => d > 0).sort((a, b) => a[0] - b[0]);
  const positive = sorted.reduce((s, [, c]) => s + c, 0);
  let acc = 0;
  let median = 0;
  for (const [d, c] of sorted) { acc += c; if (acc * 2 >= positive) { median = d; break; } }
  if (median <= 0) return { status: "unavailable", reason: "no_samples", detail: "no positive sample delta" };
  const fps = Math.round((timescale / median) * 1000) / 1000;
  const fps_avg = Math.round(((frames * timescale) / total) * 1000) / 1000;
  if (!(fps >= 1 && fps <= 1000)) {
    return { status: "unavailable", reason: "implausible", detail: `fps=${fps}` };
  }
  let off = 0;
  for (const [d, c] of sorted) if (Math.abs(d - median) / median > VFR_TOLERANCE) off += c;
  return {
    status: "ok",
    fps,
    fps_avg,
    frame_count: frames,
    duration_sec: Math.round((total / timescale) * 1e6) / 1e6,
    timescale,
    median_delta: median,
    variable_frame_rate: off / frames > 0.05,
    layout,
  };
}

export async function readContainerFps(src: ByteSource): Promise<ContainerFpsResult> {
  try {
    let moov: { offset: number; size: number } | null = null;
    const moofs: Array<{ offset: number; size: number }> = [];
    let o = 0;
    let first = true;
    for (let n = 0; o + 8 <= src.size && n < MAX_TOP_LEVEL_BOXES; n++) {
      const h = await src.read(o, 16);
      if (h.length < 8) break;
      let size = u32(h, 0);
      const type = fourcc(h, 4);
      if (first && !TOP_LEVEL.has(type)) return { status: "unavailable", reason: "not_iso_bmff" };
      first = false;
      if (size === 1) size = h.length >= 16 ? u64(h, 8) : 0;
      else if (size === 0) size = src.size - o;
      if (size < 8) break;
      if (type === "moov") moov = { offset: o, size };
      else if (type === "moof") moofs.push({ offset: o, size });
      o += size;
    }
    if (!moov) return { status: "unavailable", reason: "no_moov" };
    if (moov.size > MAX_MOOV_BYTES) return { status: "unavailable", reason: "moov_too_large", detail: `${moov.size}` };
    const mb = await src.read(moov.offset, moov.size);
    const moovBox = children(mb, 0, mb.length).find((c) => c.type === "moov");
    if (!moovBox) return { status: "unavailable", reason: "read_failed", detail: "moov unreadable" };
    const { tracks, trex } = readVideoTracks(mb, moovBox);
    if (tracks.length === 0) return { status: "unavailable", reason: "no_video_track" };
    const track = tracks[0];
    const sttsFrames = [...track.stts.values()].reduce((s, c) => s + c, 0);
    if (sttsFrames >= 2) return summarise(track.stts, track.timescale, "progressive");
    if (moofs.length === 0) return summarise(track.stts, track.timescale, "progressive");
    const hist: Hist = new Map();
    for (const m of moofs) {
      if (m.size > MAX_MOOV_BYTES) continue;
      const fb = await src.read(m.offset, m.size);
      const box = children(fb, 0, fb.length).find((c) => c.type === "moof");
      if (box) readFragment(fb, box, track.trackId, trex.get(track.trackId) ?? 0, hist);
    }
    return summarise(hist, track.timescale, "fragmented");
  } catch (e) {
    return { status: "unavailable", reason: "read_failed", detail: (e as Error)?.message };
  }
}
